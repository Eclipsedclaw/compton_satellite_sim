// Readout, sources table, settings, pointing, controls and PNG export

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
  st.src = S.sources.map(([name, ra, dec]) => {
    const v = radec(ra, dec), inFov = dot(v, st.axis) >= cf, occ = dot(v, st.nadir) >= cr;
    return { name, ra, dec, v, inFov, occ, now: inFov && !occ,
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
  const sunAng = angDeg(st.sun, st.axis);
  const lon = wrap180(Math.atan2(st.zen[1], st.zen[0]) / D - gmst(jd(st.ms)));
  const lat = Math.asin(st.zen[2]) / D;
  const elapsed = (st.ms - O.t0) / 864e5;
  const z = S.pointing === 'zenith';
  const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const inNow = st.src.filter(o => o.now);
  $('rNow').textContent = `${fmtUTC(d)} UTC`;
  $('rBj').textContent = `Beijing time ${pad(bj.getUTCHours())}:${pad(bj.getUTCMinutes())}`;
  const items = [
    ['Since launch', elapsed < 0 ? 'before launch' : elapsed.toFixed(1) + ' days'],
    ['Satellite over', `${Math.abs(lat).toFixed(1)}° ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(1)}° ${lon >= 0 ? 'E' : 'W'}`],
    ['Pointing', pointingLabel()],
    ['Sun from camera axis', sunAng.toFixed(1) + '°'],
    ['Earth in field of view', st.earthInFov ? 'yes' : 'no'],
    ['Axis behind Earth now', z ? '— (zenith)' : (st.axisBlocked ? 'yes' : 'no')],
    ['Axis clear this orbit', z ? '— (zenith)' : (st.clearFrac * 100).toFixed(0) + '%'],
    ['Sources in view', String(inNow.length)],
  ];
  $('readout').innerHTML = items.map(([k, v]) => `<div class="stat"><dt>${esc(k)}</dt><dd title="${esc(v)}">${esc(v)}</dd></div>`).join('');
  $('rFov').innerHTML = inNow.length
    ? inNow.map(o => `<span class="chip now">${esc(o.name)}</span>`).join('')
    : '<span class="status-sub">No listed source is in the field of view right now.</span>';
}

function renderTable(st){
  const tb = $('srcBody');
  if (tb.children.length !== S.sources.length) buildTable();
  st.src.forEach((o, k) => {
    const row = tb.children[k];
    row.querySelector('.state').innerHTML = o.now ? '<span class="chip now">in view now</span>'
      : (o.inFov && o.occ) ? '<span class="chip">behind Earth</span>'
      : (S.pointing === 'zenith' && o.band) ? '<span class="chip band">in band today</span>'
      : `<span class="chip">${o.off.toFixed(0)}° away</span>`;
    drawStrip(row.querySelector('canvas'), yearSeen[k], yearFrac[k]);
  });
}
function fmtFlux(v){
  if (v == null || !isFinite(v)) return '—';
  return (v !== 0 && (Math.abs(v) < 0.01 || Math.abs(v) >= 1e4)) ? v.toExponential(2) : v.toPrecision(3);
}
function buildTable(){
  const tb = $('srcBody'); tb.innerHTML = '';
  S.sources.forEach(([name, ra, dec, fBat, fLat], k) => {
    const tr = document.createElement('tr');
    const n = yearSeen[k] ? yearSeen[k].reduce((a, b) => a + b, 0) : 0;
    const avg = yearFrac[k] ? yearFrac[k].reduce((a, b) => a + b, 0) / 365 * 100 : 0;
    tr.innerHTML = `<td></td><td>${ra.toFixed(2)}°, ${dec >= 0 ? '+' : ''}${dec.toFixed(2)}°</td><td class="num">${fmtFlux(fBat)}</td><td class="num">${fmtFlux(fLat)}</td><td class="state"></td>
      <td><canvas class="strip" aria-label="Days in band over the year"></canvas></td><td class="num">${n}</td><td class="num">${avg.toFixed(1)}%</td>
      <td><button class="rm" type="button" aria-label="Remove source">✕</button></td>`;
    tr.children[0].textContent = name;
    tr.querySelector('.rm').addEventListener('click', () => { S.sources.splice(k, 1); persist(); computeYear(); buildTable(); fillPointing(); render(); });
    const cv = tr.querySelector('canvas');
    cv.addEventListener('click', e => { const r = cv.getBoundingClientRect(); dayEl.value = Math.min(364, Math.floor((e.clientX - r.left) / r.width * 365)); render(); });
    tb.appendChild(tr);
  });
}
function drawStrip(cv, seen, frac){
  const F = fit(cv), x = F.x, cw = F.w / 365;
  x.clearRect(0, 0, F.w, F.h);
  for (let d = 0; d < 365; d++) {
    x.fillStyle = C.off; x.fillRect(d * cw, 3, Math.max(cw, 1) + 0.3, F.h - 6);
    if (seen[d]) {
      x.globalAlpha = fracMax > 0 ? 0.35 + 0.65 * Math.min(1, frac[d] / fracMax) : 0.35;
      x.fillStyle = C.axis; x.fillRect(d * cw, 3, Math.max(cw, 1) + 0.3, F.h - 6);
      x.globalAlpha = 1;
    }
  }
  for (let m = 0; m < 12; m++) {
    const t = new Date(O.day0); t.setUTCMonth(t.getUTCMonth() + m, 1); const d = Math.round((t - O.day0) / 864e5);
    if (d > 0 && d < 365) { x.fillStyle = C.panel; x.fillRect(d * cw - 0.5, 3, 1, F.h - 6); }
  }
  const cd = +dayEl.value; x.fillStyle = C.fov; x.fillRect(Math.min(cd, 364) * cw - 1, 0, 3, F.h);
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
    drawMap(st); drawSphere(st); renderReadout(st); renderTable(st);
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
$('reset').addEventListener('click', () => { S = JSON.parse(JSON.stringify(DEFAULTS)); persist(); fillSettings(); fillPointing(); setup(); goLaunch(); });

function fillPointing(){
  const sel = $('pTarget'); sel.innerHTML = '';
  S.sources.forEach(([n], k) => { const o = document.createElement('option'); o.value = String(k); o.textContent = n; sel.appendChild(o); });
  const c = document.createElement('option'); c.value = 'custom'; c.textContent = 'Custom RA/Dec…'; sel.appendChild(c);
  const idx = S.sources.findIndex(t => t[0] === S.target[0] && Math.abs(t[1] - S.target[1]) < 1e-6 && Math.abs(t[2] - S.target[2]) < 1e-6);
  sel.value = idx >= 0 ? String(idx) : 'custom';
  if (idx < 0) { $('pRa').value = S.target[1]; $('pDec').value = S.target[2]; }
  $('pMode').value = S.pointing;
  updatePointingUI();
}
function updatePointingUI(){
  const t = $('pMode').value === 'target', c = t && $('pTarget').value === 'custom';
  $('pTarget').hidden = !t;
  ['pRa', 'pDec', 'pApply'].forEach(id => $(id).hidden = !c);
}
function applyPointing(){
  const mode = $('pMode').value;
  if (mode === 'target') {
    const v = $('pTarget').value;
    if (v === 'custom') {
      const ra = parseFloat($('pRa').value), dec = parseFloat($('pDec').value);
      if (!isFinite(ra) || !isFinite(dec)) { $('status').textContent = 'Enter the target RA and Dec in degrees, then press Point here.'; return; }
      S.target = ['Custom target', mod(ra, 360), Math.max(-90, Math.min(90, dec))];
    } else {
      S.target = S.sources[+v].slice();
    }
  }
  S.pointing = mode;
  $('status').textContent = '';
  persist(); computeYear(); buildTable(); summary(); render();
}
$('pMode').addEventListener('change', () => { updatePointingUI(); if ($('pMode').value !== 'target' || $('pTarget').value !== 'custom') applyPointing(); });
$('pTarget').addEventListener('change', () => { updatePointingUI(); if ($('pTarget').value !== 'custom') applyPointing(); });
$('pApply').addEventListener('click', applyPointing);
$('addForm').addEventListener('submit', e => {
  e.preventDefault();
  const ra = parseFloat($('aRa').value), dec = parseFloat($('aDec').value), name = $('aName').value.trim();
  if (!name || !isFinite(ra) || !isFinite(dec)) return;
  const fb = parseFloat($('aFbat').value), fl = parseFloat($('aFlat').value);
  S.sources.push([name, mod(ra, 360), Math.max(-90, Math.min(90, dec)),
                  isFinite(fb) ? fb : null, isFinite(fl) ? fl : null]); persist();
  e.target.reset(); computeYear(); buildTable(); fillPointing(); render();
});

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
    if (e.target.matches('input, select, textarea, .splitter')) return;
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
  const st = state(), d = new Date(st.ms), scale = 2;
  const W = (MAP.w + SPH.w + 30) * scale, H = (Math.max(MAP.h, SPH.h) + 70) * scale;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const x = cv.getContext('2d');
  x.fillStyle = C.panel; x.fillRect(0, 0, W, H);
  x.fillStyle = C.ink; x.font = `600 ${16*scale}px ${FONT}`;
  x.fillText(`${S.site} launch, ${fmtUTC(d)} UTC, pointing: ${pointingLabel()} (FoV ±${S.fov}°)`, 14*scale, 26*scale);
  x.fillStyle = C.muted; x.font = `${12*scale}px ${FONT}`;
  x.fillText(`In field of view: ${st.src.filter(o => o.now).map(o => o.name).join(', ') || 'none'}   In today's band: ${st.src.filter(o => o.band).map(o => o.name).join(', ') || 'none'}`, 14*scale, 46*scale);
  x.drawImage(mapCv, 0, 0, mapCv.width, mapCv.height, 10*scale, 60*scale, MAP.w*scale, MAP.h*scale);
  x.drawImage(sphCv, 0, 0, sphCv.width, sphCv.height, (MAP.w + 20)*scale, 60*scale, SPH.w*scale, SPH.h*scale);
  const name = `sky_track_${S.site.replace(/[^A-Za-z0-9_-]/g, '')}_${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}_${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}UTC.png`;
  cv.toBlob(blob => { if (blob) saveBlob(blob, name); else $('status').textContent = 'The image could not be created.'; }, 'image/png');
});
