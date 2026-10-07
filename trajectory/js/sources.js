// Source list (catalog plus each user's own changes) and the sources table

// ---------- source list ----------
// The catalog comes from data/sources.js. What each user added (S.added) or removed
// (S.hidden, by name) is saved separately, so catalog edits reach every user.
const CATALOG_LOADED = typeof SOURCE_CATALOG !== 'undefined';
const CATALOG = checkCatalog(CATALOG_LOADED ? SOURCE_CATALOG : []);
let SOURCES = [];   // what the page shows: copies of the records, plus v (unit vector) and, for added ones, their index in S.added

function checkCatalog(list){
  const names = new Set();
  return (Array.isArray(list) ? list : []).filter(s => {
    const ok = s && typeof s.name === 'string' && s.name !== '' && !names.has(s.name)
      && Number.isFinite(s.ra) && Number.isFinite(s.dec) && Math.abs(s.dec) <= 90;
    if (ok) names.add(s.name); else console.warn('data/sources.js: skipped a record without a unique name or a valid ra and dec:', s);
    return ok;
  });
}
function buildSourceList(){
  const hidden = new Set(S.hidden);
  SOURCES = CATALOG.filter(s => !hidden.has(s.name)).map(s => ({ ...s }))
    .concat(S.added.map((s, k) => ({ ...s, added: k })));
  SOURCES.forEach(s => s.v = radec(s.ra, s.dec));
}
function sourcesChanged(){ persist(); buildSourceList(); computeYear(); buildTable(); fillPointing(); render(); }
function removeSource(s){
  if (s.added !== undefined) S.added.splice(s.added, 1); else S.hidden.push(s.name);
  sourcesChanged();
}

// ---------- table ----------
// One row per entry of SOURCES, built when the list changes. The year strips are drawn
// only when the coverage changes; the current day is a CSS marker placed by --day.
let srcRows = [], srcNow = [], srcCover = [];
let srcSort = null, srcDir = 1;                 // sort column (null: catalog order) and direction
const SORT_FIRST = { name: 1, ra: 1 };          // first click sorts these up and the other columns down
const COVER_KEYS = ['days', 'time'];

function fmtFlux(v){
  if (v == null || v === '' || !isFinite(v)) return '—';
  v = +v;                                       // a catalog export may give numbers as strings
  return (v !== 0 && (Math.abs(v) < 0.01 || Math.abs(v) >= 1e4)) ? v.toExponential(2) : v.toPrecision(3);
}
function buildTable(){
  srcRows = SOURCES.map(s => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td class="src-name"></td><td>${s.ra.toFixed(2)}°, ${s.dec >= 0 ? '+' : ''}${s.dec.toFixed(2)}°</td><td class="num">${fmtFlux(s.fBat)}</td><td class="num">${fmtFlux(s.fLat)}</td><td class="state"></td>
      <td><div class="strip"><canvas width="365" height="1" aria-label="Days in view over the year"></canvas></div></td><td class="num"></td><td class="num"></td>
      <td><button class="rm" type="button">✕</button></td>`;
    const nm = tr.cells[0];
    nm.textContent = s.name;
    if (s.note) { nm.title = String(s.note); nm.classList.add('has-note'); }
    if (s.added !== undefined) nm.insertAdjacentHTML('beforeend', ' <span class="tag">added</span>');
    const rm = tr.querySelector('.rm');
    rm.setAttribute('aria-label', `Remove ${s.name}`);
    rm.title = s.added !== undefined ? 'Delete this source' : 'Remove from your list (it can be restored)';
    rm.addEventListener('click', () => removeSource(s));
    const strip = tr.querySelector('.strip');
    strip.addEventListener('click', e => { const r = strip.getBoundingClientRect(); dayEl.value = Math.min(364, Math.floor((e.clientX - r.left) / r.width * 365)); render(); });
    return tr;
  });
  srcNow = [];
  $('srcTable').style.setProperty('--months', monthLines());
  tableCoverage();
}
// after computeYear(): day counts, time in view and strips
function tableCoverage(){
  srcCover = SOURCES.map((s, k) => ({ days: yearSeen[k].reduce((a, b) => a + b, 0), time: yearFrac[k].reduce((a, b) => a + b, 0) / 365 * 100 }));
  srcRows.forEach((tr, k) => { tr.cells[6].textContent = srcCover[k].days; tr.cells[7].textContent = srcCover[k].time.toFixed(1) + '%'; });
  paintStrips(); arrangeTable();
}
function paintStrips(){ srcRows.forEach((tr, k) => paintStrip(tr.querySelector('canvas'), yearSeen[k], yearFrac[k])); }
// one pixel per day; CSS stretches the 365 x 1 canvas over the cell
function paintStrip(cv, seen, frac){
  const x = cv.getContext('2d');
  x.globalAlpha = 1; x.fillStyle = C.off; x.fillRect(0, 0, 365, 1);
  x.fillStyle = C.axis;
  for (let d = 0; d < 365; d++) if (seen[d]) {
    x.globalAlpha = fracMax > 0 ? 0.35 + 0.65 * Math.min(1, frac[d] / fracMax) : 0.35;
    x.fillRect(d, 0, 1, 1);
  }
  x.globalAlpha = 1;
}
// month boundaries over the strips: one CSS gradient shared by every row
function monthLines(){
  const stops = [];
  for (let m = 0; m <= 12; m++) {
    const t = new Date(O.day0); t.setUTCMonth(t.getUTCMonth() + m, 1);
    const p = Math.round((t - O.day0) / 864e5) / 365 * 100, at = p.toFixed(3) + '%';
    if (p > 0 && p < 100) stops.push(`transparent ${at}, var(--panel) ${at}, var(--panel) calc(${at} + 1px), transparent calc(${at} + 1px)`);
  }
  return stops.length ? `linear-gradient(to right, ${stops.join(', ')})` : 'none';
}

// filter and sort: reorders the rows, hides those that do not match
const srcKey = t => String(t).toLowerCase().replace(/[\s_+-]/g, '');   // so "cyg x1" finds "Cyg X-1"
function arrangeTable(){
  const q = srcKey($('srcFilter').value), order = SOURCES.map((s, k) => k);
  if (srcSort) {
    const val = k => COVER_KEYS.includes(srcSort) ? srcCover[k][srcSort] : SOURCES[k][srcSort];
    order.sort((a, b) => {
      const x = val(a), y = val(b);
      if (x == null || y == null) return (x == null) - (y == null);          // blanks last either way
      return srcDir * (typeof x === 'string' ? x.localeCompare(y, 'en', { numeric: true }) : x - y);
    });
  }
  const frag = document.createDocumentFragment(); let shown = 0;
  order.forEach(k => {
    const hit = !q || srcKey(SOURCES[k].name).includes(q);
    srcRows[k].hidden = !hit; if (hit) shown++;
    frag.appendChild(srcRows[k]);
  });
  $('srcBody').replaceChildren(frag);
  document.querySelectorAll('#srcTable .sort').forEach(b => {
    const th = b.closest('th');
    if (b.dataset.key === srcSort) th.setAttribute('aria-sort', srcDir > 0 ? 'ascending' : 'descending'); else th.removeAttribute('aria-sort');
  });
  const n = SOURCES.length, hidden = new Set(S.hidden), gone = CATALOG.filter(s => hidden.has(s.name)).length;
  $('srcCount').textContent = `${q ? `${shown} of ${n}` : n} source${n === 1 ? '' : 's'}`
    + (CATALOG_LOADED ? '' : '. The catalog data/sources.js did not load, so only your own sources are listed.');
  $('srcRestore').hidden = !gone;
  $('srcRestore').textContent = `Restore ${gone} removed catalog source${gone === 1 ? '' : 's'}`;
}

// every frame: the "Now" column and the current-day marker
function renderTable(st){
  $('srcTable').style.setProperty('--day', (Math.min(+dayEl.value, 364) / 365).toFixed(5));
  if (srcRows.length !== st.src.length) return;
  st.src.forEach((o, k) => {
    if (srcRows[k].hidden) return;
    const html = o.now ? '<span class="chip now">in view now</span>'
      : (o.inFov && o.occ) ? '<span class="chip">behind Earth</span>'
      : (S.pointing === 'zenith' && o.band) ? '<span class="chip band">in band today</span>'
      : `<span class="chip">${o.off.toFixed(0)}° away</span>`;
    if (srcNow[k] !== html) { srcRows[k].cells[4].innerHTML = html; srcNow[k] = html; }
  });
}

document.querySelectorAll('#srcTable .sort').forEach(b => b.addEventListener('click', () => {
  const key = b.dataset.key, first = SORT_FIRST[key] || -1;
  if (srcSort !== key) { srcSort = key; srcDir = first; }
  else if (srcDir === first) srcDir = -first;
  else srcSort = null;                        // third click: back to catalog order
  arrangeTable();
}));
$('srcFilter').addEventListener('input', () => { arrangeTable(); render(); });
$('srcRestore').addEventListener('click', () => { S.hidden = []; sourcesChanged(); });
$('addForm').addEventListener('submit', e => {
  e.preventDefault();
  const ra = parseFloat($('aRa').value), dec = parseFloat($('aDec').value), name = $('aName').value.trim();
  if (!name || !isFinite(ra) || !isFinite(dec)) return;
  const fb = parseFloat($('aFbat').value), fl = parseFloat($('aFlat').value);
  S.added.push({ name, ra: mod(ra, 360), dec: Math.max(-90, Math.min(90, dec)),
                 fBat: isFinite(fb) ? fb : null, fLat: isFinite(fl) ? fl : null });
  e.target.reset(); sourcesChanged();
});
