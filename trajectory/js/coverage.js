// Year-long visibility of each source (table strips)

// ---------- year strips ----------
// yearSeen[s][d] = 1 if source s is in view at some time on day d
// yearFrac[s][d] = fraction of an orbit (around noon UTC) the source is in view and not behind Earth
let yearSeen = [], yearFrac = [], fracMax = 0;
function computeYear(){
  const sinF = Math.sin(S.fov * D), cf = Math.cos(S.fov * D), cr = Math.cos(rho()), K = 48;
  const vs = S.sources.map(([, ra, dec]) => radec(ra, dec));
  yearSeen = vs.map(() => new Uint8Array(365));
  yearFrac = vs.map(() => new Float32Array(365));
  for (let d = 0; d < 365; d++) {
    if (S.pointing === 'zenith') {
      for (const hh of [0, 6, 12, 18]) {
        const st = at(O.day0 + (d * 24 + hh) * 3.6e6);
        vs.forEach((v, s) => { if (Math.abs(dot(v, st.h)) <= sinF) yearSeen[s][d] = 1; });
      }
    }
    const mid = O.day0 + (d * 24 + 12) * 3.6e6;
    for (let k = 0; k < K; k++) {
      const ms = mid + (k / K - 0.5) * O.P * 1000, st = at(ms), ax = axisFor(ms, st);
      vs.forEach((v, s) => { if (dot(v, ax) >= cf && -dot(v, st.zen) < cr) yearFrac[s][d] += 1 / K; });
    }
    if (S.pointing !== 'zenith') vs.forEach((v, s) => { if (yearFrac[s][d] > 0) yearSeen[s][d] = 1; });
  }
  fracMax = 0;
  yearFrac.forEach(a => a.forEach(f => { if (f > fracMax) fracMax = f; }));
}
