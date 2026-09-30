// Default settings, version and saved user state (S)

const DEFAULTS = {
  alt: 525, inc: 97.5, ltdn: 10.5, fov: 20, site: 'QingDao', lat: 36.5, lon: 120,
  date: '2026-11-01', coords: 'eq',
  pointing: 'zenith', target: ['Galactic Ctr', 266.417, -29.008],
    sources: [
    // name, RA, Dec, F_BAT (14-195 keV), F_LAT (4FGL-DR2)   [1e-11 erg cm^-2 s^-1]
    // Values: Tsuji et al. 2021, ApJ 916, 28, Tables 1 and 2
    ['Crab', 83.633, 22.015, 2300, 16],          // F_LAT: synchrotron nebula component only
    ['Vela', 128.836, -45.176, 18, 940],
    ['Geminga', 98.476, 17.770, null, null],
    ['PSR B0656+14', 104.950, 14.239, null, null],
    ['PSR B1055-52', 164.496, -52.450, null, null],
    ['PSR B1509-58', 228.481, -59.136, 26, 5.3], // F_LAT of MSH 15-52 (extended)
    ['PSR B1951+32', 298.3, 32.89, 0.92, 15],
    ['Cyg X-1', 299.590, 35.202, 1700, 0.65],
    ['LS 5039', 276.6, -14.85, 3.3, 27],
    ['LSI +61 303', 40.16, 61.24, 3.2, 47],
    ['3C 273', 187.278, 2.052, 42, 11],
    ['3C 279', 194.1, -5.799, 3.9, 45],
    ['3C 454.3', 343.491, 16.148, 16, 100],
    ['CTA 102', 338.2, 11.71, 3.0, 49],
    ['4C +21.35', 186.2, 21.4, 2.5, 20],
    ['PKS 0208-512', 32.692, -51.017, null, null],
    ['PKS 0528+134', 82.74, 13.57, 1.8, 2.2],
    ['PKS 1622-297', 246.6, -29.86, 1.6, 3.9],
    ['Cen A', 201.365, -43.019, 130, 6.3],
    ['Galactic Ctr', 266.417, -29.008, 11, 42]
  ]
};

// --------- state ----------
// VERSION comes from version.js
const KEY = 'compton-sky-planner-v' + VERSION;
document.getElementById('appVersion').textContent = 'v' + VERSION;

let S = JSON.parse(JSON.stringify(DEFAULTS));
try { const s = localStorage.getItem(KEY); if (s) S = Object.assign(S, JSON.parse(s)); } catch (e) {}
function persist(){ try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
