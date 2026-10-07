// Physical constants, vector math, orbit propagation and pointing

const D = Math.PI / 180, MU = 398600.4418, RE = 6378.137, J2 = 1.08263e-3, R2 = Math.SQRT2;
const EQ2GAL = [[-0.0548755604,-0.8734370902,-0.4838350155],[0.4941094279,-0.4448296300,0.7469822445],[-0.8676661490,-0.1980763734,0.4559837762]];

// ---------- math ----------
const mod = (a, b) => ((a % b) + b) % b;
const wrap180 = x => mod(x + 180, 360) - 180;
const dot = (a, b) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
const jd = ms => ms / 864e5 + 2440587.5;
const gmst = j => mod(280.46061837 + 360.98564736629 * (j - 2451545), 360);
const msun = j => mod(280.460 + 0.9856474 * (j - 2451545), 360);
function sunVec(j){
  const d = j - 2451545, g = mod(357.528 + 0.9856003*d, 360) * D, L = mod(280.460 + 0.9856474*d, 360);
  const lam = (L + 1.915*Math.sin(g) + 0.020*Math.sin(2*g)) * D, eps = (23.439 - 4e-7*d) * D;
  return [Math.cos(lam), Math.cos(eps)*Math.sin(lam), Math.sin(eps)*Math.sin(lam)];
}
const radec = (ra, dec) => [Math.cos(dec*D)*Math.cos(ra*D), Math.cos(dec*D)*Math.sin(ra*D), Math.sin(dec*D)];
const mv = (M, v) => M.map(r => r[0]*v[0] + r[1]*v[1] + r[2]*v[2]);
const mtv = (M, v) => [0,1,2].map(j => M[0][j]*v[0] + M[1][j]*v[1] + M[2][j]*v[2]);

let O = {};
function rates(){
  const a = RE + S.alt, n = Math.sqrt(MU / a**3), i = S.inc * D, k = (RE / a)**2;
  O.i = i;
  O.raanDot = -1.5 * n * J2 * k * Math.cos(i);
  O.uDot = n * (1 + 0.75 * J2 * k * (6 - 8 * Math.sin(i)**2));
  O.P = 2 * Math.PI / O.uDot;
  O.ssoInc = Math.acos(-(2*Math.PI/(365.2422*86400)) / (1.5 * n * J2 * k)) / D;
}
const raanDeg = j => msun(j) + (S.ltdn - 12) * 15 + 180;
function findLaunch(){
  const [y, m, d] = S.date.split('-').map(Number);
  const day0 = Date.UTC(y, m - 1, d);
  O.day0 = day0;
  const s = Math.sin(S.lat * D) / Math.sin(O.i);
  if (Math.abs(s) > 1) return false;
  const uS = Math.PI - Math.asin(s);
  const dra = Math.atan2(Math.cos(O.i) * Math.sin(uS), Math.cos(uS)) / D;
  const f = sec => { const j = jd(day0 + sec * 1000); return wrap180(raanDeg(j) + dra - gmst(j) - S.lon); };
  let lo = null, hi = null, prev = f(0);
  for (let t = 60; t <= 86400; t += 60) {
    const cur = f(t);
    if (prev > 0 && cur <= 0 && prev - cur < 10) { lo = t - 60; hi = t; break; }
    prev = cur;
  }
  if (lo === null) return false;
  for (let k = 0; k < 40; k++) { const mid = (lo + hi) / 2; if (f(mid) > 0) lo = mid; else hi = mid; }
  O.t0 = day0 + (lo + hi) / 2 * 1000;
  O.u0 = uS;
  O.raan0 = raanDeg(jd(O.t0)) * D;
  return true;
}
function orbitVec(u, raan){
  const i = O.i;
  return [Math.cos(raan)*Math.cos(u) - Math.sin(raan)*Math.sin(u)*Math.cos(i),
          Math.sin(raan)*Math.cos(u) + Math.cos(raan)*Math.sin(u)*Math.cos(i),
          Math.sin(u)*Math.sin(i)];
}
const normalVec = raan => [Math.sin(O.i)*Math.sin(raan), -Math.sin(O.i)*Math.cos(raan), Math.cos(O.i)];
function at(ms){
  const t = (ms - O.t0) / 1000;
  const raan = O.raan0 + O.raanDot * t;
  return { raan, zen: orbitVec(O.u0 + O.uDot * t, raan), h: normalVec(raan) };
}
function smallCircle(ax, rDeg, n = 180){
  const t = Math.abs(ax[2]) < 0.9 ? [0,0,1] : [1,0,0];
  let e1 = [ax[1]*t[2]-ax[2]*t[1], ax[2]*t[0]-ax[0]*t[2], ax[0]*t[1]-ax[1]*t[0]];
  const L = Math.hypot(...e1); e1 = e1.map(v => v / L);
  const e2 = [ax[1]*e1[2]-ax[2]*e1[1], ax[2]*e1[0]-ax[0]*e1[2], ax[0]*e1[1]-ax[1]*e1[0]];
  const r = rDeg * D, out = [];
  for (let k = 0; k <= n; k++) { const a = k / n * 2 * Math.PI;
    out.push([0,1,2].map(j => Math.cos(r)*ax[j] + Math.sin(r)*(Math.cos(a)*e1[j] + Math.sin(a)*e2[j]))); }
  return out;
}

// ---------- pointing ----------
// S.pointing is the mode tab: 'zenith' or 'target'.
// S.target is { name, ra, dec } of a fixed target, or 'sun' to track the Sun.
const rho = () => Math.asin(RE / (RE + S.alt));            // Earth's angular radius seen from orbit
function axisFor(ms, st){
  if (S.pointing === 'zenith') return st.zen;
  return S.target === 'sun' ? sunVec(jd(ms)) : radec(S.target.ra, S.target.dec);
}
function fmtRaDec(v){
  const ra = mod(Math.atan2(v[1], v[0]) / D, 360), dec = Math.asin(Math.max(-1, Math.min(1, v[2]))) / D;
  return `${ra.toFixed(2)}°, ${dec >= 0 ? '+' : ''}${dec.toFixed(2)}°`;
}
function pointingLabel(st){
  if (S.pointing === 'zenith') return 'Zenith';
  return `${S.target === 'sun' ? 'Sun' : S.target.name} (${fmtRaDec(st.axis)})`;
}
function pointingPhrase(){
  if (S.pointing === 'zenith') return 'zenith-pointing camera';
  return S.target === 'sun' ? 'camera tracking the Sun' : `camera fixed on ${S.target.name}`;
}
const angDeg = (a, b) => Math.acos(Math.max(-1, Math.min(1, dot(a, b)))) / D;
