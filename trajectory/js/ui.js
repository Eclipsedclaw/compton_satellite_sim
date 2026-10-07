// Readout, settings, tabs and target, controls and PNG export
// (the sources table is in sources.js, the ground-track page in groundtrack.js)

// ---------- UI ----------
const $ = id => document.getElementById(id);
const dayEl = $('day'), hourEl = $('hour');
const pad = n => String(n).padStart(2, '0');
const fmtUTC = d => `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
function nowMs(){ return O.day0 + (+dayEl.value * 24 + +hourEl.value) * 3.6e6; }

function state(){
  const ms = nowMs(), st = at(ms);
  st.ms = ms; st.sun = sunVec(jd(ms));
  st.axis = axisFor(ms, st);
  st.nadir = st.zen.map(v => -v);
  const cf = Math.cos(S.fov * D), sf = Math.sin(S.fov * D), cr = Math.cos(rho());
  st.src = SOURCES.map(({ name, v }) => {
    const inFov = dot(v, st.axis) >= cf, occ = dot(v, st.nadir) >= cr;
    return { name, v, inFov, occ, now: inFov && !occ,
             band: S.pointing === 'zenith' ? Math.abs(dot(v, st.h)) <= sf : inFov,
             off: angDeg(v, st.axis) };
  });
  st.axisBlocked = dot(st.axis, st.nadir) >= cr;
  st.earthInFov = angDeg(st.axis, st.nadir) < rho() / D + S.fov;
  let clear = 0; const K = 72;
  for (let k = 0; k < K; k++) {
    const t = ms + (k / K - 0.5) * O.P * 1000, s2 = at(t), ax = axisFor(t, s2);
    if (-dot(ax, s2.zen) < cr) clear++;
  }
  st.clearFrac = clear / K;
  return st;
}

function renderReadout(st){
  const d = new Date(st.ms), bj = new Date(st.ms + 8 * 3.6e6);
  const sunAng = angDeg(st.sun, st.axis).toFixed(1) + '°';
  const lon = wrap180(Math.atan2(st.zen[1], st.zen[0]) / D - gmst(jd(st.ms)));
  const lat = Math.asin(st.zen[2]) / D;
  const elapsed = (st.ms - O.t0) / 864e5;
  const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const inNow = st.src.filter(o => o.now), yn = b => b ? 'yes' : 'no';
  $('rNow').textContent = `${fmtUTC(d)} UTC`;
  $('rBj').textContent = `Beijing time ${pad(bj.getUTCHours())}:${pad(bj.getUTCMinutes())}`;
  const head = [
    ['Since launch', elapsed < 0 ? 'before launch' : elapsed.toFixed(1) + ' days'],
    ['Satellite over', `${Math.abs(lat).toFixed(1)}° ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(1)}° ${lon >= 0 ? 'E' : 'W'}`],
  ];
  let items;
  if (S.page === 'earth') {
    // the track starts at the selected time, so its first point is the satellite now
    const p = st.track[0], until = key => { const q = st.track.find(r => r[key] !== p[key]); return q ? Math.round(q.t / 60) : null; };
    const sh = until('shadow'), sa = until('saa'), lmst = mod(st.ms / 3.6e6 + lon / 15, 24);
    items = [...head,
      ['Orbit since launch', elapsed < 0 ? '—' : String(Math.floor(elapsed * 86400 / O.P) + 1)],
      ['Local solar time below', `${pad(Math.floor(lmst))}:${pad(Math.floor(lmst % 1 * 60))}`],
      ['Earth shadow', p.shadow ? (sh == null ? 'in shadow' : `in shadow, sunlit in ${sh} min`) : (sh == null ? 'sunlit' : `sunlit, shadow in ${sh} min`)],
      ['SAA (approx.)', p.saa ? (sa == null ? 'inside' : `inside, leaves in ${sa} min`) : (sa == null ? 'outside' : `outside, enters in ${sa} min`)],
    ];
  } else items = S.pointing === 'zenith' ? [...head,
    ['Camera axis (RA, Dec)', fmtRaDec(st.axis)],
    ['Sun from camera axis', sunAng],
    ["Sources in today's band", String(st.src.filter(o => o.band).length)],
    ['Sources in view', String(inNow.length)],
  ] : [...head,
    ['Target', pointingLabel(st)],
    ['Sun from camera axis', sunAng],
    ['Earth in field of view', yn(st.earthInFov)],
    ['Target behind Earth now', yn(st.axisBlocked)],
    ['Target clear this orbit', (st.clearFrac * 100).toFixed(0) + '%'],
    ['Sources in view', String(inNow.length)],
  ];
  // two rows on wide screens in both modes, so switching tabs does not move the page
  $('readout').style.setProperty('--cols', Math.ceil(items.length / 2));
  $('readout').innerHTML = items.map(([k, v]) => `<div class="stat"><dt>${esc(k)}</dt><dd title="${esc(v)}">${esc(v)}</dd></div>`).join('');
  $('rFov').innerHTML = inNow.length
    ? inNow.map(o => `<span class="chip now">${esc(o.name)}</span>`).join('')
    : '<span class="status-sub">No listed source is in the field of view right now.</span>';
}

function buildMonths(){
  const box = $('months'); box.innerHTML = '';
  for (let m = 0; m < 13; m++) {
    const t = new Date(O.day0); t.setUTCMonth(t.getUTCMonth() + m, 1); const d = (t - O.day0) / 864e5;
    if (d < 0 || d > 365) continue;
    const s = document.createElement('span'); s.style.left = (d / 365 * 100) + '%';
    if (m % 3) s.className = 'minor';
    s.textContent = t.toLocaleString('en', { month: 'short', timeZone: 'UTC' }); box.appendChild(s);
  }
}

let raf = null;
function render(){
  if (raf) return;
  raf = requestAnimationFrame(() => {
    raf = null;
    const st = state(), d = new Date(st.ms);
    $('dayOut').textContent = `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}`;
    const hh = +hourEl.value; $('hourOut').textContent = `${pad(Math.floor(hh) % 24)}:${pad(Math.floor(hh % 1 * 60))} UTC`;
    if (S.page === 'earth') drawGroundTrack(st); else { drawMap(st); drawSphere(st); renderTable(st); }
    renderReadout(st);
  });
}

function summary(){
  const lt = `${pad(Math.floor(S.ltdn))}:${pad(Math.round(S.ltdn % 1 * 60))}`;
  const l = new Date(O.t0), bj = new Date(O.t0 + 8 * 3.6e6);
  $('summary').textContent = `${S.alt} km, inclination ${S.inc}°, descending node at ${lt} local time, ${pointingPhrase()} with a ±${S.fov}° field of view. Launch from ${S.site} (${S.lat}°, ${S.lon}°) at ${fmtUTC(l)} UTC, ${pad(bj.getUTCHours())}:${pad(bj.getUTCMinutes())} Beijing time. Period ${(O.P/60).toFixed(1)} min.`;
  $('refLabel').textContent = S.coords === 'gal' ? 'Celestial equator' : 'Galactic plane';
  const z = S.pointing === 'zenith';
  $('legCircle').hidden = !z; $('legBand').hidden = !z; $('legEarth').hidden = z;
}

function setup(){
  rates();
  if (!findLaunch()) { $('err').textContent = `A ${S.inc}° orbit never passes over latitude ${S.lat}°, so there is no launch time. Choose a lower site latitude or a different inclination.`; return false; }
  $('err').textContent = Math.abs(O.ssoInc - S.inc) > 0.3 && isFinite(O.ssoInc) ? `Note: at ${S.alt} km a sun-synchronous orbit needs ${O.ssoInc.toFixed(2)}°; with ${S.inc}° the 10:30 crossing time will drift over the year.` : '';
  computeYear(); buildTable(); buildMonths(); summary();
  return true;
}
function goLaunch(){ dayEl.value = 0; const lh = (O.t0 - O.day0) / 3.6e6; hourEl.value = (Math.ceil(lh * 100) / 100).toFixed(2); render(); }

function fillSettings(){
  $('sAlt').value = S.alt; $('sInc').value = S.inc; $('sFov').value = S.fov;
  $('sLtdn').value = `${pad(Math.floor(S.ltdn))}:${pad(Math.round(S.ltdn % 1 * 60))}`;
  $('sSite').value = S.site; $('sLat').value = S.lat; $('sLon').value = S.lon; $('sDate').value = S.date; $('sCoords').value = S.coords;
}
$('apply').addEventListener('click', () => {
  const num = id => parseFloat($(id).value);
  const [lh, lm] = ($('sLtdn').value || '10:30').split(':').map(Number);
  const cand = { alt: num('sAlt'), inc: num('sInc'), fov: num('sFov'), ltdn: lh + lm / 60, site: $('sSite').value.trim() || 'Site', lat: num('sLat'), lon: wrap180(num('sLon')), date: $('sDate').value, coords: $('sCoords').value };
  if ([cand.alt, cand.inc, cand.fov, cand.lat, cand.lon].some(v => !isFinite(v)) || !cand.date) { $('err').textContent = 'Fill in every setting with a number, and pick a launch date.'; return; }
  const old = Object.assign({}, S); Object.assign(S, cand);
  if (!setup()) { Object.assign(S, old); setup(); return; }
  persist(); goLaunch();
});
$('reset').addEventListener('click', () => { S = JSON.parse(JSON.stringify(DEFAULTS)); persist(); fillSettings(); fillEarth(); buildSourceList(); fillPointing(); setup(); goLaunch(); });

// ---------- tabs at the top of the page: the two pointing modes and the ground track ----------
const modeTabs = [...document.querySelectorAll('.mode-tab')];
const currentTab = () => S.page === 'earth' ? 'earth' : S.pointing;
function showMode(){
  const tab = currentTab();
  modeTabs.forEach(t => {
    const on = t.dataset.mode === tab;
    t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1;
    $(t.getAttribute('aria-controls')).hidden = !on;
  });
  document.querySelector('.wrap').dataset.page = S.page;     // CSS shows the sky or the ground-track page
}
function pointingChanged(){ persist(); computeYear(); tableCoverage(); summary(); render(); }
function setMode(mode){
  if (mode === currentTab()) return;
  const repoint = mode !== 'earth' && mode !== S.pointing;   // the ground track keeps the pointing mode for later
  S.page = mode === 'earth' ? 'earth' : 'sky';
  if (repoint) S.pointing = mode;
  showMode();
  if (repoint) pointingChanged(); else { persist(); render(); }
}
modeTabs.forEach((t, k) => {
  t.addEventListener('click', () => setMode(t.dataset.mode));
  t.addEventListener('keydown', e => {
    const to = { ArrowLeft: k - 1, ArrowRight: k + 1, Home: 0, End: modeTabs.length - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    const tab = modeTabs[mod(to, modeTabs.length)]; tab.focus(); setMode(tab.dataset.mode);
  });
});

function fillPointing(){
  const sel = $('pTarget'), add = (box, value, text) => { const o = document.createElement('option'); o.value = value; o.textContent = text; box.appendChild(o); };
  sel.innerHTML = '';
  add(sel, 'sun', 'Sun');
  const grp = document.createElement('optgroup'); grp.label = 'Sources'; sel.appendChild(grp);
  SOURCES.forEach((s, k) => add(grp, String(k), s.name));
  add(sel, 'custom', 'Custom RA/Dec…');
  const t = S.target, sun = t === 'sun';
  const idx = sun ? -1 : SOURCES.findIndex(s => s.name === t.name && Math.abs(s.ra - t.ra) < 1e-6 && Math.abs(s.dec - t.dec) < 1e-6);
  sel.value = sun ? 'sun' : idx >= 0 ? String(idx) : 'custom';
  if (sel.value === 'custom') { $('pRa').value = t.ra; $('pDec').value = t.dec; }
  showMode(); updatePointingUI();
}
function updatePointingUI(){
  const c = $('pTarget').value === 'custom';
  ['pRa', 'pDec', 'pApply'].forEach(id => $(id).hidden = !c);
}
function applyTarget(){
  const v = $('pTarget').value;
  if (v === 'custom') {
    const ra = parseFloat($('pRa').value), dec = parseFloat($('pDec').value);
    if (!isFinite(ra) || !isFinite(dec)) return;
    S.target = { name: 'Custom target', ra: mod(ra, 360), dec: Math.max(-90, Math.min(90, dec)) };
  } else if (v === 'sun') {
    S.target = 'sun';
  } else {
    const { name, ra, dec } = SOURCES[+v]; S.target = { name, ra, dec };
  }
  pointingChanged();
}
$('pTarget').addEventListener('change', () => { updatePointingUI(); if ($('pTarget').value !== 'custom') applyTarget(); });
// a form, so the browser checks the RA/Dec fields and Enter applies them
$('pForm').addEventListener('submit', e => { e.preventDefault(); applyTarget(); });

dayEl.addEventListener('input', render); hourEl.addEventListener('input', render);
$('prev').addEventListener('click', () => { dayEl.value = Math.max(0, +dayEl.value - 1); render(); });
$('next').addEventListener('click', () => { dayEl.value = Math.min(365, +dayEl.value + 1); render(); });
$('toLaunch').addEventListener('click', goLaunch);
let playing = null;
$('play').addEventListener('click', () => {
  if (playing) { clearInterval(playing); playing = null; $('play').textContent = 'Play the year'; return; }
  $('play').textContent = 'Pause';
  playing = setInterval(() => { let d = +dayEl.value + 1; if (d > 365) d = 0; dayEl.value = d; render(); }, 180);
});
document.addEventListener('keydown', e => {
  if (e.target.matches('input, select, textarea, .splitter, [role="tab"]')) return;
  if (e.key === 'ArrowRight') { dayEl.value = Math.min(365, +dayEl.value + 1); render(); }
  if (e.key === 'ArrowLeft') { dayEl.value = Math.max(0, +dayEl.value - 1); render(); }
  if (e.key === 'ArrowUp') { hourEl.value = mod(+hourEl.value + 0.5, 24); render(); }
  if (e.key === 'ArrowDown') { hourEl.value = mod(+hourEl.value - 0.5, 24); render(); }
});
mapCv.addEventListener('pointermove', e => {
  const r = mapCv.getBoundingClientRect(), v = unproj(e.clientX - r.left, e.clientY - r.top);
  if (!v) { $('hover').textContent = 'Hover over the map to read coordinates.'; return; }
  const ra = mod(Math.atan2(v[1], v[0]) / D, 360), dec = Math.asin(v[2]) / D;
  const g = mv(EQ2GAL, v), l = mod(Math.atan2(g[1], g[0]) / D, 360), b = Math.asin(g[2]) / D;
  const ms = nowMs(), st = at(ms), off = angDeg(v, axisFor(ms, st));
  $('hover').textContent = `RA ${(ra/15).toFixed(2)}h (${ra.toFixed(1)}°), Dec ${dec >= 0 ? '+' : ''}${dec.toFixed(1)}°; l ${l.toFixed(1)}°, b ${b >= 0 ? '+' : ''}${b.toFixed(1)}°; ${off.toFixed(1)}° from the camera axis`;
});
mapCv.addEventListener('pointerleave', () => $('hover').textContent = 'Hover over the map to read coordinates.');

// ---------- save ----------
// Plain browser download (self-hosted version)
function saveBlob(blob, name){
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  $('status').textContent = `Saved ${name}`;
}
$('save').addEventListener('click', async () => {
  if (S.page === 'earth') return saveGroundTrack();
  const st = state(), d = new Date(st.ms), scale = 2;
  const W = (MAP.w + SPH.w + 30) * scale, H = (Math.max(MAP.h, SPH.h) + 70) * scale;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const x = cv.getContext('2d');
  x.fillStyle = C.panel; x.fillRect(0, 0, W, H);
  x.fillStyle = C.ink; x.font = `600 ${16*scale}px ${FONT}`;
  x.fillText(`${S.site} launch, ${fmtUTC(d)} UTC, pointing: ${pointingLabel(st)} (FoV ±${S.fov}°)`, 14*scale, 26*scale);
  x.fillStyle = C.muted; x.font = `${12*scale}px ${FONT}`;
  const names = f => st.src.filter(f).map(o => o.name).join(', ') || 'none';
  const more = S.pointing === 'zenith' ? `In today's band: ${names(o => o.band)}` : `Target clear of Earth for ${(st.clearFrac * 100).toFixed(0)}% of this orbit`;
  x.fillText(`In field of view: ${names(o => o.now)}   ${more}`, 14*scale, 46*scale);
  x.drawImage(mapCv, 0, 0, mapCv.width, mapCv.height, 10*scale, 60*scale, MAP.w*scale, MAP.h*scale);
  x.drawImage(sphCv, 0, 0, sphCv.width, sphCv.height, (MAP.w + 20)*scale, 60*scale, SPH.w*scale, SPH.h*scale);
  const name = `sky_track_${S.site.replace(/[^A-Za-z0-9_-]/g, '')}_${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}_${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}UTC.png`;
  cv.toBlob(blob => { if (blob) saveBlob(blob, name); else $('status').textContent = 'The image could not be created.'; }, 'image/png');
});
