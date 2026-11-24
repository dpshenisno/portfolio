import { WaveController } from './vendor/distortion-waves/controller.js';
import { snapshot } from './vendor/distortion-waves/capture.js';

// One viewport-sized lens, using the MIT engine from libraries.dev/waves.
// Do not wrap the document: that would change fixed/sticky positioning.
const button = document.querySelector('.contact-floating');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let controller, layer, content, active = false, dirty = true, revision = 0;
let preparing = null, generation = 0, releaseTimer = 0;

function options() {
  return {
    type: 'vertical', palette: 'colorful', live: false, prewarm: false,
    reducedMotion: 'system', cornerRadius: 0,
    resolution: Math.min(devicePixelRatio || 1, 1.35, Math.sqrt(2500000 / (innerWidth * innerHeight))),
    waveStyle: {
      anticipation: .36, travel: 1.64, linger: -.24,
      rimFade: 2.1, hairlineLinger: .24, hairlineFade: 1.6,
      particleLife: 2.1, particleCount: 26,
      amplitude: 28, aberration: .7, blur: 12,
      lensWidth: 130, rimStrength: .62, hairlineOpacity: .5
    },
    capture: captureViewport,
    onFinish() { active = false; scheduleRelease(); }
  };
}

async function captureViewport({ width, height, scale }) {
  // Place the body's direct children at their real viewport coordinates.
  // Normal flow can be scrolled while fixed descendants stay viewport-fixed.
  // Their computed sizes preserve the existing typography and image crops.
  const positions = new Map();
  for (const child of document.body.children) {
    if (child === layer) continue;
    const r = child.getBoundingClientRect();
    positions.set(child, { position: 'absolute', left: r.left + 'px', top: r.top + 'px',
      right: 'auto', bottom: 'auto', margin: '0',
      width: getComputedStyle(child).width, height: getComputedStyle(child).height });
  }
  const background = getComputedStyle(document.body).getPropertyValue('--bg').trim() || '#FDFDFC';
  const picture = await snapshot(document.body, {
    width, height, scale, background,
    skip: el => el === layer || el === button || el.matches('.cursor,[data-dw-skip],.site-color-wave'),
    force: el => el === document.body ? {
      position: 'relative', width: width + 'px', height: height + 'px',
      'min-height': '0', margin: '0', padding: '0', transform: 'none', overflow: 'hidden'
    } : positions.get(el)
  });
  return picture.canvas;
}

function ensure() {
  if (controller) return controller;
  layer = document.createElement('div');
  layer.className = 'contact-wave-layer';
  layer.setAttribute('aria-hidden', 'true');
  layer.setAttribute('data-dw-skip', '');
  content = document.createElement('div');
  layer.append(content);
  document.body.append(layer);
  controller = new WaveController(layer, content);
  controller.update(options());
  dirty = true;
  return controller;
}

function scheduleRelease() {
  clearTimeout(releaseTimer);
  // Release WebGL textures/context shortly after use; no idle animation loop.
  releaseTimer = setTimeout(stop, 5000);
}

function prepare() {
  if (!button || reduced.matches || document.hidden) return Promise.resolve();
  clearTimeout(releaseTimer);
  const engine = ensure();
  if (dirty) {
    layer.dataset.captureRevision = String(++revision);
    engine.update(options());
    dirty = false;
  }
  if (!preparing) {
    const current = generation;
    preparing = engine.prepare().catch(() => {}).finally(() => {
      if (generation === current) { preparing = null; if (!active) scheduleRelease(); }
    });
  }
  return preparing;
}

function play() {
  if (!button || reduced.matches || document.hidden) return false;
  try {
    void prepare();
    active = true;
    controller.play({ source: button });
    return true;
  } catch {
    stop();
    return false; // Keep Telegram usable if the browser refuses the renderer.
  }
}

function stop() {
  clearTimeout(releaseTimer);
  generation++;
  controller?.destroy();
  layer?.remove();
  controller = layer = content = null;
  preparing = null;
  active = false;
  dirty = true;
}

function invalidate() { dirty = true; if (active) stop(); }
function prewarm() { try { void prepare(); } catch { stop(); } }
button?.addEventListener('pointerenter', prewarm);
button?.addEventListener('focus', prewarm);
button?.addEventListener('pointerdown', prewarm, { passive: true });
addEventListener('scroll', invalidate, { passive: true });
addEventListener('resize', invalidate, { passive: true });
document.addEventListener('click', event => {
  if (event.target.closest('.project-pill,.theme')) invalidate();
});
new MutationObserver(invalidate).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
reduced.addEventListener('change', stop);
document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
addEventListener('pagehide', stop);
window.portfolioContactWave = { play, stop };
