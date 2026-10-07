// Startup, resizable panels and resize handling (must load last)

// ---------- start ----------
// canvases on the page that is not shown have no size; they are fitted again when shown
function fitAll(){ MAP = fit(mapCv); SPH = fit(sphCv); EAR = fit(earthCv); }
function resize(){ fitAll(); render(); }
// the year strips keep their colours in pixels, so they are repainted with the theme
const themeChanged = () => { readColors(); paintStrips(); render(); };
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', themeChanged);
new MutationObserver(themeChanged).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
readColors(); fillSettings(); fillEarth(); buildSourceList(); fillPointing();
if (!setup()) { S = JSON.parse(JSON.stringify(DEFAULTS)); fillSettings(); fillEarth(); buildSourceList(); fillPointing(); setup(); }
fitAll();
goLaunch();

// ---------- resizable panels ----------
const stageEl = document.querySelector('.stage'), splitEl = $('splitter');
const SPLIT_KEY = KEY + '-split', SPLIT_DEFAULT = 2.1 / 3.1;
function setSplit(r){
  r = Math.min(0.85, Math.max(0.4, r));          // map gets 40–85% of the width
  stageEl.style.setProperty('--left', r + 'fr');
  stageEl.style.setProperty('--right', (1 - r) + 'fr');
  splitEl.setAttribute('aria-valuenow', Math.round(r * 100));
  return r;
}
let splitR = SPLIT_DEFAULT;
try { const v = parseFloat(localStorage.getItem(SPLIT_KEY)); if (isFinite(v)) splitR = v; } catch (e) {}
splitR = setSplit(splitR);
const saveSplit = () => { try { localStorage.setItem(SPLIT_KEY, String(splitR)); } catch (e) {} };
splitEl.addEventListener('pointerdown', e => {
  e.preventDefault(); splitEl.setPointerCapture(e.pointerId); splitEl.classList.add('dragging');
  const move = ev => { const r = stageEl.getBoundingClientRect(); splitR = setSplit((ev.clientX - r.left) / r.width); };
  const up = () => { splitEl.removeEventListener('pointermove', move); splitEl.removeEventListener('pointerup', up); splitEl.classList.remove('dragging'); saveSplit(); };
  splitEl.addEventListener('pointermove', move); splitEl.addEventListener('pointerup', up);
});
splitEl.addEventListener('dblclick', () => { splitR = setSplit(SPLIT_DEFAULT); saveSplit(); });
splitEl.addEventListener('keydown', e => {
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
  e.preventDefault(); splitR = setSplit(splitR + (e.key === 'ArrowRight' ? 0.02 : -0.02)); saveSplit();
});
// redraw the canvases sharply whenever their size changes
if (window.ResizeObserver) {
  const ro = new ResizeObserver(resize);
  ro.observe(mapCv); ro.observe(sphCv); ro.observe(earthCv);
}

addEventListener('resize', resize);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => render());
