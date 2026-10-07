// Colours, canvas sizing and markers shared by the map and the sphere

// ---------- styles ----------
let C = {};
function readColors(){
  const cs = getComputedStyle(document.documentElement);
  ['paper','panel','ink','muted','line','grid','axis','axis-soft','fov','fov-soft','sun','off','gc',
   'ocean','land','coast','borders','saa','saa-soft','orbit1','orbit2','orbit3','orbit4','orbit5'].forEach(k => C[k] = cs.getPropertyValue('--' + k).trim());
}
function fit(cv){
  const r = cv.getBoundingClientRect(), d = devicePixelRatio || 1;
  cv.width = Math.max(1, Math.round(r.width * d)); cv.height = Math.max(1, Math.round(r.height * d));
  const x = cv.getContext('2d'); x.setTransform(d, 0, 0, d, 0, 0);
  return { x, w: r.width, h: r.height };
}
const FONT = 'system-ui, -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", "Noto Sans", sans-serif';

function hexRgb(h){ const m = /^#?([0-9a-f]{6})$/i.exec(h || ''); if (!m) return [128, 128, 128]; const n = parseInt(m[1], 16); return [n >> 16, (n >> 8) & 255, n & 255]; }

// ---------- Sun label and Galactic Center marker ----------
const GC_VEC = radec(266.417, -29.008);
const isGC = o => dot(o.v, GC_VEC) > Math.cos(0.5 * D);          // within 0.5° of Sgr A*
function isDarkTheme(){ const [r, g, b] = hexRgb(C.paper); return r + g + b < 384; }
function haloText(x, text, tx, ty, fill, halo, font, lw = 3.5){
  x.font = font; x.lineJoin = 'round'; x.lineWidth = lw; x.strokeStyle = halo; x.strokeText(text, tx, ty);
  x.fillStyle = fill; x.fillText(text, tx, ty);
}
function sunLabel(x, px, py, w, fs){
  const flip = px > w - 60, dark = isDarkTheme();
  x.textAlign = flip ? 'right' : 'left'; x.textBaseline = 'middle';
  haloText(x, 'SUN', flip ? px - 12 : px + 12, py, C.sun, dark ? C.paper : C.ink, `800 ${fs}px ${FONT}`, dark ? 3.5 : 2.5);
  x.textAlign = 'left'; x.textBaseline = 'alphabetic';
}
function gcMarker(x, px, py, r, now, w, fs){
  x.beginPath(); x.arc(px, py, r, 0, 7); x.fillStyle = now ? C.fov : C.panel; x.fill();
  x.lineWidth = 2; x.strokeStyle = C.gc; x.stroke();
  x.beginPath(); x.arc(px, py, r * 0.38, 0, 7); x.fillStyle = C.gc; x.fill();
  x.beginPath();
  for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) { x.moveTo(px + dx*r*1.15, py + dy*r*1.15); x.lineTo(px + dx*r*1.8, py + dy*r*1.8); }
  x.stroke();
  const flip = px > w - 120, tx = flip ? px - r*2 - 2 : px + r*2 + 2;
  x.textAlign = flip ? 'right' : 'left';
  haloText(x, 'Galactic Center', tx, py + r + fs, C.gc, C.panel, `700 ${fs}px ${FONT}`);
  x.textAlign = 'left';
}
function gcNow(st){ return dot(GC_VEC, st.axis) >= Math.cos(S.fov * D) && dot(GC_VEC, st.nadir) < Math.cos(rho()); }

function star(x, cx, cy, r, fill, stroke){
  x.beginPath();
  for (let k = 0; k < 10; k++) { const a = -Math.PI/2 + k * Math.PI / 5, rr = k % 2 ? r * 0.45 : r; x.lineTo(cx + rr*Math.cos(a), cy + rr*Math.sin(a)); }
  x.closePath(); x.fillStyle = fill; x.fill(); x.strokeStyle = stroke; x.lineWidth = 1; x.stroke();
}
