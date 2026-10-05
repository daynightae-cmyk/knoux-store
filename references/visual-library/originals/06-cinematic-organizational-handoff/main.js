import { FLOW_STEPS, CONFIG } from './config.js';
import { createScene3D } from './scene3d.js';
import { createFallback2D } from './fallback2d.js';
import { createUI } from './ui.js';

const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) { return false; }
}

const state = { index: 0, autoplay: false, reduced: prefersReduced };

let visual = null;
const canvas3d = document.getElementById('hf-canvas');
const canvas2d = document.getElementById('hf-fallback');

if (webglAvailable()) {
  try {
    visual = createScene3D(canvas3d, FLOW_STEPS, CONFIG, prefersReduced);
  } catch (e) {
    console.warn('3D init failed, using 2D fallback', e);
    visual = null;
  }
}

if (!visual) {
  canvas3d.hidden = true;
  canvas3d.style.display = 'none';
  canvas2d.hidden = false;
  visual = createFallback2D(canvas2d, FLOW_STEPS, CONFIG, prefersReduced);
}

const ui = createUI(FLOW_STEPS, CONFIG, state, {
  onChange(next, prev) { visual.goTo(next, prev); }
});

visual.goTo(0, 0);
ui.render(0);