// 3D celestial sphere

// ---------- sphere ----------
let az = -60 * D, el = 20 * D;
function basis(){ return { er: [-Math.sin(az), Math.cos(az), 0], eu: [-Math.sin(el)*Math.cos(az), -Math.sin(el)*Math.sin(az), Math.cos(el)], dv: [Math.cos(el)*Math.cos(az), Math.cos(el)*Math.sin(az), Math.sin(el)] }; }
function drawSphere(st){
  const x = SPH.x, w = SPH.w, h = SPH.h, r = Math.min(w, h) * 0.42, cx = w/2, cy = h/2 + 4, B = basis();
  const P = v => [cx + r*dot(v, B.er), cy - r*dot(v, B.eu), dot(v, B.dv)];
  x.clearRect(0, 0, w, h);
  x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fillStyle = C.paper; x.fill(); x.strokeStyle = C.line; x.lineWidth = 1; x.stroke();
  function line(pts, color, lw, dash, backAlpha = 0.22){
    for (const front of [false, true]) {
      x.beginPath(); let on = false;
      for (const v of pts) { const q = P(v); if ((q[2] >= 0) !== front) { on = false; continue; } on ? x.lineTo(q[0], q[1]) : x.moveTo(q[0], q[1]); on = true; }
      x.globalAlpha = front ? 1 : backAlpha; x.strokeStyle = color; x.lineWidth = lw; x.setLineDash(front ? (dash || []) : [2, 3]); x.stroke();
    }
    x.globalAlpha = 1; x.setLineDash([]);
  }
  for (const b of [-60, -30, 30, 60]) line([...Array(121)].map((_, k) => radec(k*3, b)), C.grid, 1);
  for (let l = 0; l < 360; l += 30) line([...Array(61)].map((_, k) => radec(l, -90 + k*3)), C.grid, 1);
  line(eqLine, C.muted, 1.2);
  line(galPlane, C.muted, 1.5, [1.5, 3]);
  if (S.pointing === 'zenith') {
    for (const sg of [1, -1]) line(smallCircle(st.h.map(v => v*sg), 90 - S.fov, 180), C.ink, 1, [5, 4]);
    line([...Array(181)].map((_, k) => orbitVec(k / 180 * 2 * Math.PI, st.raan)), C.axis, 2.5);
  } else {
    line(smallCircle(st.nadir, rho() / D, 180), C.muted, 2);
  }
  line(smallCircle(st.axis, S.fov, 90), C.fov, 2);
  const np = P([0,0,1]); x.fillStyle = C.muted; x.font = `11px ${FONT}`;
  if (np[2] >= 0) x.fillText('N pole', np[0] + 5, np[1] - 4);
  [[0, '0h'], [90, '6h'], [180, '12h'], [270, '18h']].forEach(([ra, t]) => { const q = P(radec(ra, 0)); if (q[2] >= 0) x.fillText(t, q[0] + 3, q[1] + 12); });
  const sq = P(st.sun); x.globalAlpha = sq[2] >= 0 ? 1 : 0.3; x.beginPath(); x.arc(sq[0], sq[1], 7, 0, 7); x.fillStyle = C.sun; x.fill(); x.strokeStyle = C.ink; x.stroke(); x.globalAlpha = 1;
  if (sq[2] >= 0) sunLabel(x, sq[0], sq[1], w, 11);
  x.font = `11px ${FONT}`;
  st.src.forEach(o => { if (isGC(o)) return; const q = P(o.v); if (q[2] < 0) return; star(x, q[0], q[1], o.now ? 8 : 6, o.now ? C.fov : o.band ? C.axis : C.panel, C.ink); x.fillStyle = C.ink; x.fillText(o.name, q[0] + 7, q[1] - 5); });
  const gq = P(GC_VEC); if (gq[2] >= 0) gcMarker(x, gq[0], gq[1], 6, gcNow(st), w, 11);
  const zq = P(st.axis); x.globalAlpha = zq[2] >= 0 ? 1 : 0.35; x.beginPath(); x.arc(zq[0], zq[1], 5.5, 0, 7); x.fillStyle = C.axis; x.fill(); x.strokeStyle = C.panel; x.lineWidth = 2; x.stroke(); x.globalAlpha = 1;
}
let drag = null;
sphCv.addEventListener('pointerdown', e => { drag = [e.clientX, e.clientY, az, el]; sphCv.setPointerCapture(e.pointerId); });
sphCv.addEventListener('pointermove', e => { if (!drag) return; az = drag[2] - (e.clientX - drag[0]) * 0.01; el = Math.max(-1.45, Math.min(1.45, drag[3] + (e.clientY - drag[1]) * 0.01)); render(); });
sphCv.addEventListener('pointerup', () => drag = null);
