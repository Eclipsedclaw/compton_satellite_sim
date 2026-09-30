// All-sky Mollweide map

// ---------- Mollweide map ----------
const mapCv = document.getElementById('map'), sphCv = document.getElementById('sphere');
let MAP, SPH;
function mollTheta(phi){
  if (Math.abs(phi) > Math.PI/2 - 1e-9) return Math.sign(phi) * Math.PI / 2;
  let th = phi;
  for (let k = 0; k < 25; k++) { const f = 2*th + Math.sin(2*th) - Math.PI*Math.sin(phi); th -= f / (2 + 2*Math.cos(2*th)); }
  return th;
}
function frameVec(v){ return S.coords === 'gal' ? mv(EQ2GAL, v) : v; }
function proj(v){
  const w = frameVec(v);
  const lon = Math.atan2(w[1], w[0]), lat = Math.asin(Math.max(-1, Math.min(1, w[2])));
  const lam = -(mod(lon + Math.PI, 2*Math.PI) - Math.PI), th = mollTheta(lat);
  const s = mapScale();
  return [MAP.w/2 + s * 2*R2/Math.PI * lam * Math.cos(th), MAP.h/2 - s * R2 * Math.sin(th), lam];
}
function mapScale(){ const p = 14; return Math.min((MAP.w - 2*p) / (4*R2), (MAP.h - 2*p) / (2*R2)); }
function unproj(px, py){
  const s = mapScale(), x = (px - MAP.w/2) / s, y = -(py - MAP.h/2) / s;
  if (Math.abs(y) > R2) return null;
  const th = Math.asin(y / R2), lam = Math.PI * x / (2 * R2 * Math.cos(th));
  if (Math.abs(lam) > Math.PI) return null;
  const lat = Math.asin((2*th + Math.sin(2*th)) / Math.PI), lon = -lam;
  let v = [Math.cos(lat)*Math.cos(lon), Math.cos(lat)*Math.sin(lon), Math.sin(lat)];
  if (S.coords === 'gal') v = mtv(EQ2GAL, v);
  return v;
}
function mapPath(x, pts){
  let prev = null; x.beginPath();
  for (const v of pts) { const q = proj(v);
    if (prev && Math.abs(q[2] - prev[2]) < Math.PI) x.lineTo(q[0], q[1]); else x.moveTo(q[0], q[1]);
    prev = q; }
}
function strokeMap(pts, color, w, dash){ const x = MAP.x; mapPath(x, pts); x.strokeStyle = color; x.lineWidth = w; x.setLineDash(dash || []); x.stroke(); x.setLineDash([]); }
const eqLine = [...Array(361)].map((_, k) => radec(k, 0));
const galPlane = [...Array(361)].map((_, k) => mtv(EQ2GAL, [Math.cos(k*D), Math.sin(k*D), 0]));
function frameLine(lonDeg, latDeg){ const v = [Math.cos(latDeg*D)*Math.cos(lonDeg*D), Math.cos(latDeg*D)*Math.sin(lonDeg*D), Math.sin(latDeg*D)]; return S.coords === 'gal' ? mtv(EQ2GAL, v) : v; }

let MASK = null;

function buildMask(){
  const f = 3, mw = Math.ceil(MAP.w / f), mh = Math.ceil(MAP.h / f);
  const vecs = new Float32Array(mw * mh * 3), ok = new Uint8Array(mw * mh);
  for (let j = 0; j < mh; j++) for (let i = 0; i < mw; i++) {
    const v = unproj((i + 0.5) * f, (j + 0.5) * f), k = j * mw + i;
    if (v) { ok[k] = 1; vecs[3*k] = v[0]; vecs[3*k+1] = v[1]; vecs[3*k+2] = v[2]; }
  }
  const cv = document.createElement('canvas'); cv.width = mw; cv.height = mh;
  const ctx = cv.getContext('2d');
  MASK = { f, mw, mh, vecs, ok, cv, ctx, img: ctx.createImageData(mw, mh), coords: S.coords, w: MAP.w, h: MAP.h };
}
function drawEarthMask(nadir){
  if (!MASK || MASK.coords !== S.coords || MASK.w !== MAP.w || MASK.h !== MAP.h) buildMask();
  const { mw, mh, vecs, ok, img, f } = MASK, d = img.data, cr = Math.cos(rho()), [r, g, b] = hexRgb(C.muted);
  for (let k = 0; k < mw * mh; k++) {
    const o = 4 * k, blocked = ok[k] && (vecs[3*k]*nadir[0] + vecs[3*k+1]*nadir[1] + vecs[3*k+2]*nadir[2]) >= cr;
    d[o] = r; d[o+1] = g; d[o+2] = b; d[o+3] = blocked ? 80 : 0;
  }
  MASK.ctx.putImageData(img, 0, 0);
  MAP.x.imageSmoothingEnabled = true;
  MAP.x.drawImage(MASK.cv, 0, 0, mw * f, mh * f);
}

function drawMap(st){
  const x = MAP.x, w = MAP.w, h = MAP.h, s = mapScale();
  x.clearRect(0, 0, w, h);
  x.beginPath(); x.ellipse(w/2, h/2, 2*R2*s, R2*s, 0, 0, 2*Math.PI); x.fillStyle = C.paper; x.fill();
  x.save(); x.clip();
  for (let b = -60; b <= 60; b += 30) strokeMap([...Array(181)].map((_, k) => frameLine(-180 + 2*k + 1e-6, b)), C.grid, 1);
  for (let l = 0; l < 360; l += 30) strokeMap([...Array(91)].map((_, k) => frameLine(l + 1e-6, -90 + 2*k)), C.grid, 1);
  strokeMap(S.coords === 'gal' ? eqLine : galPlane, C.muted, 1.5, [1.5, 3]);
  if (S.pointing === 'zenith') {
    // today's band edges and circle
    for (const sg of [1, -1]) strokeMap(smallCircle(st.h.map(v => v*sg), 90 - S.fov, 240), C.ink, 1, [5, 4]);
    strokeMap([...Array(241)].map((_, k) => orbitVec(k / 240 * 2 * Math.PI, st.raan)), C.axis, 2.5);
  } else {
    // region of the sky hidden behind Earth right now
    drawEarthMask(st.nadir);
    strokeMap(smallCircle(st.nadir, rho() / D, 240), C.muted, 1);
  }
  // FoV now
  const fc = smallCircle(st.axis, S.fov, 120), q = fc.map(proj);
  const split = q.some((p, k) => k && Math.abs(p[2] - q[k-1][2]) > Math.PI);
  if (!split) { x.beginPath(); q.forEach((p, k) => k ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.closePath(); x.fillStyle = C['fov-soft']; x.fill(); }
  strokeMap(fc, C.fov, 2);
  x.restore();
  x.beginPath(); x.ellipse(w/2, h/2, 2*R2*s, R2*s, 0, 0, 2*Math.PI); x.strokeStyle = C.line; x.lineWidth = 1; x.stroke();
  // labels
  x.fillStyle = C.muted; x.font = `11px ${FONT}`; x.textAlign = 'center';
  for (let l = 30; l < 360; l += 30) { if (l === 180) continue; const p = proj(frameLine(l, 0)); x.fillText(S.coords === 'gal' ? `${l}°` : `${l/15}h`, p[0], p[1] + 13); }
  x.textAlign = 'right';
  for (const b of [-60, -30, 30, 60]) { const p = proj(frameLine(180 - 1e-6, b)); x.fillText(`${b > 0 ? '+' : ''}${b}°`, p[0] - 4, p[1] + 4); }
  x.textAlign = 'left';
  // sun
  const sp = proj(st.sun); x.beginPath(); x.arc(sp[0], sp[1], 8, 0, 7); x.fillStyle = C.sun; x.fill(); x.strokeStyle = C.ink; x.lineWidth = 1; x.stroke();
   sunLabel(x, sp[0], sp[1], w, 12);
  // sources
  x.font = `12px ${FONT}`;
  st.src.forEach(o => {
    if (isGC(o)) return;
    const p = proj(o.v); star(x, p[0], p[1], o.now ? 9 : 7, o.now ? C.fov : o.band ? C.axis : C.panel, C.ink);
    const flip = p[0] > w - 80, tx = flip ? p[0] - 9 : p[0] + 9;
    x.textAlign = flip ? 'right' : 'left';
    x.lineWidth = 3; x.strokeStyle = C.panel; x.strokeText(o.name, tx, p[1] - 6);
    x.fillStyle = C.ink; x.fillText(o.name, tx, p[1] - 6);
    x.textAlign = 'left';
  });
  const gp = proj(GC_VEC); gcMarker(x, gp[0], gp[1], 7, gcNow(st), w, 12);
  // camera axis
  const zp = proj(st.axis); x.beginPath(); x.arc(zp[0], zp[1], 5.5, 0, 7); x.fillStyle = C.axis; x.fill(); x.strokeStyle = C.panel; x.lineWidth = 2; x.stroke();
}
