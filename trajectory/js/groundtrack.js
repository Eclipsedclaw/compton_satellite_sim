// Ground-track page: the satellite over Earth, like compton_satellite_earth_trajectory.py

// ---------- track ----------
const SAA = { lon: -50, lat: -26, a: 45, b: 18 };   // approximate SAA ellipse at ~500 km [deg], as SAA in the Python script
const TRACK_STEP = 10;                              // s, as STEP_S in the Python script
const inSAA = (lat, lon) => (wrap180(lon - SAA.lon) / SAA.a) ** 2 + ((lat - SAA.lat) / SAA.b) ** 2 <= 1;
// near the launch time the track starts exactly at launch, so the ticks are minutes since launch
const trackStart = ms => Math.abs(ms - O.t0) < 60e3 ? O.t0 : ms;

// nOrb orbits from ms0, one point every TRACK_STEP s; shadow is a cylinder of radius RE
function groundTrack(ms0, nOrb){
  const k2 = (RE / (RE + S.alt)) ** 2, n = Math.ceil(nOrb * O.P / TRACK_STEP), pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i * TRACK_STEP, ms = ms0 + t * 1e3, j = jd(ms), z = at(ms).zen, c = dot(z, sunVec(j));
    const lon = wrap180(Math.atan2(z[1], z[0]) / D - gmst(j)), lat = Math.asin(z[2]) / D;
    pts.push({ t, lon, lat, shadow: c < 0 && 1 - c * c < k2, saa: inSAA(lat, lon), orbit: Math.min(Math.floor(t / O.P), nOrb - 1) });
  }
  return pts;
}
// per orbit: percentage of the time sunlit and in the SAA
function orbitStats(pts, nOrb){
  const s = Array.from({ length: nOrb }, () => ({ n: 0, lit: 0, saa: 0 }));
  for (const p of pts) { const o = s[p.orbit]; o.n++; if (!p.shadow) o.lit++; if (p.saa) o.saa++; }
  return s.map(o => ({ lit: 100 * o.lit / o.n, saa: 100 * o.saa / o.n }));
}

// ---------- world map ----------
// data/world.js: each ring or line is a first point and then steps, in 0.1 deg; decoded once to degrees
const WORLD_LOADED = typeof WORLD_LAND !== 'undefined';
function decodeWorld(rows){
  return rows.map(r => {
    const out = new Float32Array(r.length);
    for (let k = 0, lon = 0, lat = 0; k < r.length; k += 2) { lon += r[k]; lat += r[k + 1]; out[k] = lon / 10; out[k + 1] = lat / 10; }
    return out;
  });
}
const LAND = WORLD_LOADED ? decodeWorld(WORLD_LAND) : [], BORDERS = WORLD_LOADED ? decodeWorld(WORLD_BORDERS) : [];

const earthCv = document.getElementById('earth');
let EAR, lastTrack = null, earthLegendHtml = '';
const orbitColor = k => C['orbit' + (k % 5 + 1)];
// plate carree rectangle inside a w x h canvas, with room for the axis labels
function earthRect(w, h){
  const ml = 40, mr = 10, mt = 6, mb = 22, mw = Math.max(1, Math.min(w - ml - mr, (h - mt - mb) * 2)), mh = mw / 2;
  return { x0: ml + (w - ml - mr - mw) / 2, y0: mt + (h - mt - mb - mh) / 2, w: mw, h: mh };
}

function drawEarth(x, w, h, trk, sat){
  const R = earthRect(w, h), X = lon => R.x0 + (lon + 180) / 360 * R.w, Y = lat => R.y0 + (90 - lat) / 180 * R.h;
  const path = (rows, close) => { for (const r of rows) { x.moveTo(X(r[0]), Y(r[1])); for (let k = 2; k < r.length; k += 2) x.lineTo(X(r[k]), Y(r[k + 1])); if (close) x.closePath(); } };
  x.clearRect(0, 0, w, h);
  x.fillStyle = C.ocean; x.fillRect(R.x0, R.y0, R.w, R.h);
  x.save(); x.beginPath(); x.rect(R.x0, R.y0, R.w, R.h); x.clip();
  x.beginPath(); path(LAND, true); x.fillStyle = C.land; x.fill('evenodd');
  // coastlines: the land outlines without the cuts along the date line and the south pole
  const edge = (lon, lat) => Math.abs(lon) > 179.95 || lat < -89.95;
  x.beginPath();
  for (const r of LAND) for (let k = 0; k < r.length; k += 2) {
    if (k && !(edge(r[k - 2], r[k - 1]) && edge(r[k], r[k + 1]))) x.lineTo(X(r[k]), Y(r[k + 1])); else x.moveTo(X(r[k]), Y(r[k + 1]));
  }
  x.strokeStyle = C.coast; x.lineWidth = 0.6; x.stroke();
  x.beginPath(); path(BORDERS, false); x.strokeStyle = C.borders; x.lineWidth = 0.5; x.stroke();
  // grid every 30 deg
  x.beginPath();
  for (let l = -150; l < 180; l += 30) { x.moveTo(X(l), R.y0); x.lineTo(X(l), R.y0 + R.h); }
  for (let b = -60; b <= 60; b += 30) { x.moveTo(R.x0, Y(b)); x.lineTo(R.x0 + R.w, Y(b)); }
  x.strokeStyle = C.muted; x.globalAlpha = 0.45; x.lineWidth = 0.6; x.setLineDash([3, 3]); x.stroke(); x.setLineDash([]); x.globalAlpha = 1;
  // SAA
  x.beginPath(); x.ellipse(X(SAA.lon), Y(SAA.lat), SAA.a / 360 * R.w, SAA.b / 180 * R.h, 0, 0, 2 * Math.PI);
  x.fillStyle = C['saa-soft']; x.fill(); x.strokeStyle = C.saa; x.lineWidth = 1; x.setLineDash([4, 3]); x.stroke(); x.setLineDash([]);
  drawTrack(x, X, Y, trk);
  x.restore();
  x.strokeStyle = C.muted; x.lineWidth = 1; x.strokeRect(R.x0, R.y0, R.w, R.h);
  // axis labels (fewer on narrow maps)
  const ls = R.w < 420 ? 90 : R.w < 760 ? 60 : 30;
  x.fillStyle = C.muted; x.font = `11px ${FONT}`; x.textAlign = 'center';
  for (let l = -180; l <= 180; l += ls) x.fillText(`${Math.abs(l)}°${l < 0 && l > -180 ? 'W' : l > 0 && l < 180 ? 'E' : ''}`, X(l), R.y0 + R.h + 15);
  x.textAlign = 'right';
  for (let b = -60; b <= 60; b += 30) x.fillText(`${Math.abs(b)}°${b > 0 ? 'N' : b < 0 ? 'S' : ''}`, R.x0 - 5, Y(b) + 4);
  // minute ticks
  x.textBaseline = 'middle';
  for (const p of trk) if (p.t > 0 && p.t % (S.tickMin * 60) === 0) {
    const px = X(p.lon), py = Y(p.lat), flip = px > R.x0 + R.w - 30;
    x.beginPath(); x.arc(px, py, 2.6, 0, 7); x.fillStyle = C.ink; x.fill();
    x.textAlign = flip ? 'right' : 'left';
    haloText(x, String(p.t / 60), flip ? px - 6 : px + 6, py, C.ink, C.panel, `10.5px ${FONT}`, 3);
  }
  // launch site, then the satellite at the start of the track
  const sx = X(wrap180(S.lon)), sy = Y(S.lat), flip = sx > R.x0 + R.w - 90;
  star(x, sx, sy, 9, C.sun, C.ink);
  x.textAlign = flip ? 'right' : 'left';
  haloText(x, S.site, flip ? sx - 11 : sx + 11, sy - 9, C.ink, C.panel, `600 12px ${FONT}`, 3);
  x.textAlign = 'left'; x.textBaseline = 'alphabetic';
  if (sat && trk.length > 1) {
    const a = trk[0], b = trk[1], ang = Math.abs(b.lon - a.lon) < 180 ? Math.atan2(Y(b.lat) - Y(a.lat), X(b.lon) - X(a.lon)) : 0;
    satGlyph(x, X(a.lon), Y(a.lat), ang);
  }
  return R;
}
// solid in sunlight, dashed in Earth's shadow, one colour per orbit
function drawTrack(x, X, Y, trk){
  x.lineWidth = 2; x.lineJoin = 'round';
  let key = null;
  for (let i = 1; i < trk.length; i++) {
    const a = trk[i - 1], b = trk[i], k = a.orbit * 2 + (a.shadow ? 1 : 0);
    if (k !== key) {
      if (key !== null) x.stroke();
      x.beginPath(); x.moveTo(X(a.lon), Y(a.lat)); key = k;
      x.strokeStyle = orbitColor(a.orbit); x.setLineDash(a.shadow ? [4, 4] : []); x.lineCap = a.shadow ? 'butt' : 'round';
    }
    if (Math.abs(b.lon - a.lon) > 180) {          // across the date line: to the map edge, then on from the other edge
      const bl = b.lon - 360 * Math.sign(b.lon - a.lon), e = bl > a.lon ? 180 : -180;
      const lat = a.lat + (e - a.lon) / (bl - a.lon) * (b.lat - a.lat);
      x.lineTo(X(e), Y(lat)); x.moveTo(X(-e), Y(lat));
    }
    x.lineTo(X(b.lon), Y(b.lat));
  }
  if (key !== null) x.stroke();
  x.setLineDash([]); x.lineCap = 'butt';
}
// small satellite: body and two solar panels across the direction of motion
function satGlyph(x, cx, cy, ang, s = 1){
  x.save(); x.translate(cx, cy); x.rotate(ang); x.scale(s, s);
  x.beginPath(); x.arc(0, 0, 12, 0, 7); x.globalAlpha = 0.8; x.fillStyle = C.panel; x.fill(); x.globalAlpha = 1;
  x.fillStyle = C.axis; x.strokeStyle = C.ink; x.lineWidth = 1;
  for (const y0 of [-11, 4]) { x.fillRect(-3, y0, 6, 7); x.strokeRect(-3, y0, 6, 7); }
  x.fillStyle = C.ink; x.fillRect(-3.5, -3.5, 7, 7);
  x.restore();
}

// ---------- page ----------
const EARTH_HINT = 'Hover over the map to read coordinates and times along the track. Map data: Natural Earth.';
function drawGroundTrack(st){
  const start = trackStart(st.ms), trk = groundTrack(start, S.nOrbits);
  st.track = trk; lastTrack = { start, trk };
  drawEarth(EAR.x, EAR.w, EAR.h, trk, true);
  const pct = v => `<b class="pct">${v.toFixed(0)}%</b>`, atLaunch = start === O.t0;
  const html = orbitStats(trk, S.nOrbits).map((o, k) => `<span><i class="sw" style="background:var(--orbit${k % 5 + 1})"></i>Orbit ${k + 1}: ${pct(o.lit)} sunlit, ${pct(o.saa)} in SAA</span>`).join('')
    + '<span><i class="sw sw-dash"></i>In Earth shadow</span><span><i class="sw sw-saa"></i>SAA (approx.)</span>'
    + `<span><i class="sw sw-dot"></i>Minutes ${atLaunch ? 'since launch' : 'from the selected time'} (every ${S.tickMin})</span>`
    + '<span><i class="sw-star">★</i>Launch site</span>'
    + '<span><svg class="sw-sat" viewBox="-12 -12 24 24"><rect x="-3" y="-11" width="6" height="7"/><rect x="-3" y="4" width="6" height="7"/><rect class="body" x="-3.5" y="-3.5" width="7" height="7"/></svg>Satellite now</span>'
    + (WORLD_LOADED ? '' : '<span>The world map data/world.js did not load.</span>');
  if (html !== earthLegendHtml) { $('earthLegend').innerHTML = html; earthLegendHtml = html; }
}
function fillEarth(){ $('eOrbits').value = S.nOrbits; $('eTick').value = S.tickMin; }
$('eOrbits').addEventListener('change', () => {
  S.nOrbits = Math.min(16, Math.max(1, Math.round(+$('eOrbits').value) || 3));
  $('eOrbits').value = S.nOrbits; persist(); render();
});
$('eTick').addEventListener('change', () => { S.tickMin = +$('eTick').value; persist(); render(); });

earthCv.addEventListener('pointermove', e => {
  if (!lastTrack || !EAR) return;
  const r = earthCv.getBoundingClientRect(), R = earthRect(EAR.w, EAR.h);
  const lon = (e.clientX - r.left - R.x0) / R.w * 360 - 180, lat = 90 - (e.clientY - r.top - R.y0) / R.h * 180;
  if (Math.abs(lon) > 180 || Math.abs(lat) > 90) { $('earthHover').textContent = EARTH_HINT; return; }
  let best = null, bd = 9;                       // the nearest track point within 3 deg
  for (const p of lastTrack.trk) { const dl = wrap180(p.lon - lon) * Math.cos(lat * D), db = p.lat - lat; if (dl * dl + db * db < bd) { bd = dl * dl + db * db; best = p; } }
  let text = `${Math.abs(lat).toFixed(1)}° ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(1)}° ${lon >= 0 ? 'E' : 'W'}`;
  if (best) {
    const t = new Date(lastTrack.start + best.t * 1e3);
    text += `; track: +${(best.t / 60).toFixed(1)} min (${pad(t.getUTCHours())}:${pad(t.getUTCMinutes())} UTC), orbit ${best.orbit + 1}, ${best.shadow ? 'in Earth shadow' : 'sunlit'}${best.saa ? ', in the SAA' : ''}`;
  }
  $('earthHover').textContent = text;
});
earthCv.addEventListener('pointerleave', () => $('earthHover').textContent = EARTH_HINT);
$('earthHover').textContent = EARTH_HINT;

// ---------- save ----------
// the same map at a fixed size, with a title and a legend box like the Python figure
function saveGroundTrack(){
  const ms = trackStart(nowMs()), trk = groundTrack(ms, S.nOrbits), stats = orbitStats(trk, S.nOrbits), atLaunch = ms === O.t0;
  const w = 1200, h = 618, top = 34, scale = 2, d = new Date(ms), l = new Date(O.t0), bj = new Date(O.t0 + 8 * 3.6e6);
  const cv = document.createElement('canvas'); cv.width = w * scale; cv.height = (h + top) * scale;
  const x = cv.getContext('2d'); x.scale(scale, scale);
  x.fillStyle = C.panel; x.fillRect(0, 0, w, h + top);
  const lt = `${pad(Math.floor(S.ltdn))}:${pad(Math.round(S.ltdn % 1 * 60))}`;
  x.fillStyle = C.ink; x.font = `600 15px ${FONT}`; x.textAlign = 'center';
  x.fillText(`${atLaunch ? `First ${S.nOrbits} orbits` : `${S.nOrbits} orbits from ${fmtUTC(d)} UTC`}: ${S.alt} km, i = ${S.inc}°, LTDN ${lt}  |  launch ${fmtUTC(l)} UTC (${pad(bj.getUTCHours())}:${pad(bj.getUTCMinutes())} BJT) from ${S.site}`, w / 2, 22);
  x.textAlign = 'left'; x.translate(0, top);
  const R = drawEarth(x, w, h, trk, !atLaunch);
  const rows = [
    ...stats.map((o, k) => ['line', orbitColor(k), `Orbit ${k + 1}: ${o.lit.toFixed(0)}% sunlit, ${o.saa.toFixed(0)}% in SAA`]),
    ['dash', C.muted, 'In Earth shadow'], ['saa', C.saa, 'SAA (approx.)'],
    ['dot', C.ink, `Minutes ${atLaunch ? 'since launch' : 'from the start'} (every ${S.tickMin})`], ['star', C.sun, 'Launch site'],
    ...(atLaunch ? [] : [['sat', null, `Satellite at ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`]]),
  ];
  x.font = `12px ${FONT}`;
  const lh = 18, pd = 8, sw = 26, bw = 2 * pd + sw + 6 + Math.max(...rows.map(r => x.measureText(r[2]).width)), bh = 2 * pd + rows.length * lh - 4;
  const bx = R.x0 + 8, by = R.y0 + R.h - 8 - bh;
  x.globalAlpha = 0.92; x.fillStyle = C.panel; x.fillRect(bx, by, bw, bh); x.globalAlpha = 1;
  x.strokeStyle = C.line; x.lineWidth = 1; x.strokeRect(bx, by, bw, bh);
  rows.forEach(([kind, color, text], k) => {
    const cy = by + pd + 7 + k * lh, cx = bx + pd + sw / 2;
    x.beginPath();
    if (kind === 'line' || kind === 'dash') { x.moveTo(cx - sw / 2, cy); x.lineTo(cx + sw / 2, cy); x.strokeStyle = color; x.lineWidth = 2; x.setLineDash(kind === 'dash' ? [4, 4] : []); x.stroke(); x.setLineDash([]); }
    else if (kind === 'saa') { x.ellipse(cx, cy, sw / 2, 5, 0, 0, 7); x.fillStyle = C['saa-soft']; x.fill(); x.strokeStyle = color; x.lineWidth = 1; x.setLineDash([3, 2]); x.stroke(); x.setLineDash([]); }
    else if (kind === 'dot') { x.arc(cx, cy, 2.6, 0, 7); x.fillStyle = color; x.fill(); }
    else if (kind === 'star') star(x, cx, cy, 7, color, C.ink);
    else satGlyph(x, cx, cy, 0, 0.6);
    x.fillStyle = C.ink; x.textBaseline = 'middle'; x.fillText(text, bx + pd + sw + 6, cy); x.textBaseline = 'alphabetic';
  });
  const name = `ground_track_${S.site.replace(/[^A-Za-z0-9_-]/g, '')}_${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}_${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}UTC.png`;
  cv.toBlob(blob => { if (blob) saveBlob(blob, name); else $('status').textContent = 'The image could not be created.'; }, 'image/png');
}
