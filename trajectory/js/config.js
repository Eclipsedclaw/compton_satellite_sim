// Default settings, version and saved user state (S)
// The source catalog is in data/sources.js; it is not part of S.

const DEFAULTS = {
  alt: 525, inc: 97.5, ltdn: 10.5, fov: 20, site: 'QingDao', lat: 36.5, lon: 120,
  date: '2026-11-01', coords: 'eq',
  // pointing: 'zenith' or 'target'; target: { name, ra, dec } of a fixed target, or 'sun' to track the Sun
  pointing: 'zenith', target: { name: 'Galactic Ctr', ra: 266.417, dec: -29.008 },
  // this user's changes to the catalog: sources they added, and names of catalog sources they removed
  added: [], hidden: [],
  // page: 'sky' (the two pointing modes) or 'earth' (ground track); orbits and tick spacing [min] of the ground track
  page: 'sky', nOrbits: 3, tickMin: 10,
};

// --------- state ----------
// VERSION comes from version.js
const KEY = 'compton-sky-planner-v' + VERSION;
document.getElementById('appVersion').textContent = 'v' + VERSION;

let S = JSON.parse(JSON.stringify(DEFAULTS));
try { const s = localStorage.getItem(KEY); if (s) S = Object.assign(S, JSON.parse(s)); } catch (e) {}
// older saves kept the whole source list and the target as an array; keep only what this version reads
delete S.sources;
if (!Array.isArray(S.added)) S.added = [];
S.added = S.added.filter(s => s && typeof s.name === 'string' && Number.isFinite(s.ra) && Number.isFinite(s.dec));
if (!Array.isArray(S.hidden)) S.hidden = [];
if (S.pointing !== 'target') S.pointing = 'zenith';
if (S.target !== 'sun' && !(S.target && Number.isFinite(S.target.ra) && Number.isFinite(S.target.dec))) S.target = Object.assign({}, DEFAULTS.target);
if (S.page !== 'earth') S.page = 'sky';
S.nOrbits = Math.min(16, Math.max(1, Math.round(S.nOrbits) || DEFAULTS.nOrbits));
if (![5, 10, 15, 30].includes(S.tickMin)) S.tickMin = DEFAULTS.tickMin;
function persist(){ try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
