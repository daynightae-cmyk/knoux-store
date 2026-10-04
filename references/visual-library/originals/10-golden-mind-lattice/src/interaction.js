// Sphinx Code — interaction layer.
// Owns the information panel DOM, the hemisphere axis labels, the position
// navigation, and the rotation timing constants.
//
//   idle      -> slow gravitational drift inside a flattering azimuth band
//   hovering  -> drift slows dramatically
//   selected  -> drift stops, camera eases so the node faces the viewer
//   after ~9s of no interaction -> idle motion gradually resumes.

import * as THREE from 'three';

export const IDLE_PERIOD = 30;
export const IDLE_SPEED = (Math.PI * 2) / IDLE_PERIOD;
export const HOVER_SPEED_FACTOR = 0.10;
export const RESUME_DELAY = 9.0;

export function injectStyles(cfg) {
  const bg = cfg && cfg.transparent ? 'transparent' : (cfg ? cfg.background : '#22201F');
  const style = document.createElement('style');
  style.id = 'sphinx-styles';
  style.textContent = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@200;300;400;500&display=swap');

  *{margin:0;padding:0;box-sizing:border-box;}
  html,body{height:100%;overflow:hidden;background:${bg};}
  body{font-family:Inter,system-ui,-apple-system,sans-serif;
    -webkit-font-smoothing:antialiased;-webkit-tap-highlight-color:transparent;}
  body.sc-transparent, body.sc-transparent #root{background:transparent;}
  #root{position:fixed;inset:0;width:100%;height:100%;}
  canvas{display:block;touch-action:none;}

  /* ============================== brand hud ============================ */
  #sphinx-hud{
    position:fixed;top:24px;left:26px;color:#BD9865;
    pointer-events:none;user-select:none;max-width:calc(100% - 52px);z-index:4;
  }
  .sc-brand{font-size:12px;letter-spacing:.42em;font-weight:400;color:#FBF1E8;}
  .sc-sub{margin-top:7px;font-size:9.5px;letter-spacing:.22em;font-weight:300;
    color:#7C6544;text-transform:uppercase;}

  #sphinx-legend{
    position:fixed;bottom:22px;left:26px;
    font-size:9px;letter-spacing:.18em;color:#6B583D;text-transform:uppercase;
    pointer-events:none;user-select:none;z-index:4;
  }
  .sc-leg-row{display:flex;align-items:center;gap:9px;margin-bottom:7px;}
  .sc-swatch{width:14px;height:1px;display:inline-block;}
  .sc-swatch.sc-inc{background:#BD9865;}
  .sc-swatch.sc-soul{background:#F2DFB8;}
  .sc-swatch.sc-path{background:#FBF1E8;opacity:.55;}
  .sc-leg-hint{margin-top:12px;color:#4E4130;letter-spacing:.2em;}

  /* embed mode strips all chrome */
  body.sc-embed #sphinx-hud,
  body.sc-embed #sphinx-legend,
  body.sc-embed #sc-blueprint-label{display:none !important;}
  body.sc-embed.sc-no-blueprint #sc-view-btn{display:none !important;}

  /* ============================ story mode ============================= */
  #sc-story-bar{
    position:fixed;left:clamp(24px,4vw,64px);bottom:clamp(22px,3.4vh,40px);
    width:clamp(200px,20vw,280px);z-index:5;pointer-events:none;user-select:none;
    opacity:0;transition:opacity 800ms ease;
  }
  #sc-story-bar.is-on{opacity:1;}
  .sc-story-track{height:1px;width:100%;background:rgba(189,152,101,.18);overflow:hidden;}
  .sc-story-fill{
    height:100%;width:100%;background:#BD9865;transform:scaleX(0);
    transform-origin:left center;transition:transform 80ms linear;
  }
  #sc-story-bar.is-paused .sc-story-fill{background:#5A4A32;}
  .sc-story-meta{
    margin-top:9px;display:flex;justify-content:space-between;align-items:baseline;
    gap:8px;
  }
  /* Pyramid name — warm gold, slightly more visible */
  .sc-story-state{
    font-family:'Inter',sans-serif;
    font-size:7.5px;letter-spacing:.30em;text-transform:uppercase;
    color:#BD9865;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
    transition:color 600ms ease;
  }
  #sc-story-bar.is-paused .sc-story-state{color:#5A4A32;}
  /* Step counter — dimmer, right-aligned */
  .sc-story-count{
    font-family:'Inter',sans-serif;
    font-size:7.5px;letter-spacing:.22em;text-transform:uppercase;
    color:#7A6245;white-space:nowrap;flex-shrink:0;
  }

  #sc-story-chip{
    position:fixed;left:clamp(24px,4vw,64px);bottom:calc(clamp(22px,3.4vh,40px) + 42px);
    z-index:6;display:inline-flex;align-items:center;gap:9px;
    padding:8px 14px;border:1px solid rgba(189,152,101,.22);background:none;
    font-family:inherit;font-size:8.5px;letter-spacing:.3em;text-transform:uppercase;
    color:#7C6544;cursor:pointer;
    transition:color 400ms ease,border-color 400ms ease;
  }
  #sc-story-chip:hover{color:#FBF1E8;border-color:rgba(189,152,101,.5);}
  #sc-story-chip.is-on{color:#BD9865;border-color:rgba(189,152,101,.5);}
  .sc-chip-dot{
    width:4px;height:4px;border-radius:50%;background:#4E4130;
    transition:background 400ms ease,box-shadow 400ms ease;
  }
  #sc-story-chip.is-on .sc-chip-dot{
    background:#BD9865;animation:sc-chip-pulse 2.6s ease-in-out infinite;
  }
  @keyframes sc-chip-pulse{
    0%,100%{opacity:.35;}
    50%{opacity:1;}
  }

  body.sc-mobile #sc-story-bar{
    left:14px;right:14px;bottom:auto;top:calc(env(safe-area-inset-top,0px) + 58px);
    width:auto;max-width:220px;
  }
  body.sc-mobile #sc-story-chip{
    left:auto;right:14px;top:calc(env(safe-area-inset-top,0px) + 52px);bottom:auto;
    padding:7px 11px;font-size:8px;letter-spacing:.24em;
  }
  body.sc-tablet #sc-story-bar{bottom:auto;top:24px;left:auto;right:clamp(20px,3vw,32px);width:clamp(180px,18vw,240px);}
  body.sc-tablet #sc-story-chip{bottom:auto;top:24px;left:clamp(20px,3vw,32px);}

  /* =================== pyramid transition marker ======================= */
  /* Announces the crossing from the Incarnation Pyramid (A–H) into the      */
  /* Soul Pyramid (I–P) as story mode walks the blueprint.                   */
  #sc-pyr-marker{
    position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);
    z-index:7;pointer-events:none;user-select:none;text-align:center;
    opacity:0;
  }
  #sc-pyr-marker.is-on{animation:sc-pyr-in 3400ms cubic-bezier(.22,.61,.36,1) forwards;}
  @keyframes sc-pyr-in{
    0%{opacity:0;}
    14%{opacity:1;}
    74%{opacity:1;}
    100%{opacity:0;}
  }
  .sc-pyr-from,.sc-pyr-to{
    font-size:clamp(9px,1vw,10.5px);letter-spacing:.36em;text-transform:uppercase;
    font-weight:300;white-space:nowrap;
  }
  .sc-pyr-from{color:#6B583D;}
  .sc-pyr-to{color:#BD9865;}
  .sc-pyr-arrow{
    margin:13px auto;width:1px;height:26px;
    background:linear-gradient(180deg,rgba(189,152,101,.10),rgba(189,152,101,.85));
    transform-origin:top;
  }
  #sc-pyr-marker.is-on .sc-pyr-arrow{animation:sc-pyr-line 3400ms cubic-bezier(.22,.61,.36,1) forwards;}
  @keyframes sc-pyr-line{
    0%{transform:scaleY(0);}
    30%{transform:scaleY(1);}
    100%{transform:scaleY(1);}
  }
  .sc-pyr-glyph{
    margin:0 auto 14px;width:16px;height:14px;
    border-left:1px solid rgba(189,152,101,.55);
    border-right:1px solid rgba(189,152,101,.55);
    border-bottom:1px solid rgba(189,152,101,.55);
  }
  body.sc-mobile .sc-pyr-from,body.sc-mobile .sc-pyr-to{letter-spacing:.24em;font-size:8.5px;}

  /* ======================= hemisphere axis labels ====================== */
  .sc-axis{
    position:fixed;pointer-events:none;user-select:none;z-index:3;
    font-size:8.5px;letter-spacing:.34em;font-weight:300;text-transform:uppercase;
    color:#6B583D;transform:translate(-50%,-50%);
    opacity:0;transition:opacity 700ms ease,color 700ms ease;white-space:nowrap;
  }
  .sc-axis.is-on{opacity:1;color:#BD9865;}
  .sc-axis.is-dim{opacity:.34;}

  /* ========================= information panel ========================= */
  /* Suspended in the field: no card, no fill, only fine gold rules.       */
  #sphinx-panel{
    position:fixed;top:50%;right:clamp(24px,4vw,64px);transform:translateY(-50%);
    width:clamp(280px,26vw,380px);
    z-index:5;user-select:none;
    opacity:0;pointer-events:none;
    transition:opacity 900ms cubic-bezier(.22,.61,.36,1);
  }
  #sphinx-panel.is-visible{opacity:1;pointer-events:auto;}

  .sp-rule{height:1px;width:100%;
    background:linear-gradient(90deg,rgba(189,152,101,0) 0%,rgba(189,152,101,.5) 10%,
      rgba(189,152,101,.5) 90%,rgba(189,152,101,0) 100%);}

  .sp-body{padding:30px 0 28px;}

  .sp-label{
    font-size:9px;letter-spacing:.32em;font-weight:400;color:#9C7F55;
    text-transform:uppercase;display:flex;align-items:baseline;gap:10px;
    flex-wrap:wrap;
  }
  .sp-label .sp-pos{color:#BD9865;}
  .sp-label .sp-div{color:#4E4130;}
  .sp-label .sp-pyr{color:#7C6544;}

  .sp-title{
    margin-top:22px;font-size:clamp(20px,2.1vw,29px);line-height:1.14;
    font-weight:200;letter-spacing:.045em;color:#FBF1E8;text-transform:uppercase;
    text-wrap:balance;
  }

  .sp-meta{
    margin-top:18px;display:flex;gap:18px;flex-wrap:wrap;
    font-size:8.5px;letter-spacing:.26em;font-weight:300;color:#6B583D;
    text-transform:uppercase;
  }
  .sp-meta span b{font-weight:400;color:#9C7F55;}

  .sp-desc{
    margin-top:24px;font-size:13px;line-height:1.92;font-weight:300;
    letter-spacing:.015em;color:rgba(251,241,232,.66);max-width:44ch;
  }

  .sp-counter{
    margin-top:26px;font-size:9px;letter-spacing:.26em;font-weight:300;
    color:#6B583D;text-transform:uppercase;
  }

  .sp-action{
    margin-top:30px;display:inline-flex;align-items:center;gap:12px;
    font-size:9.5px;letter-spacing:.3em;font-weight:400;color:#BD9865;
    text-transform:uppercase;background:none;border:none;padding:6px 0;
    font-family:inherit;cursor:pointer;
    transition:color 420ms ease,gap 420ms ease;
  }
  .sp-action:hover{color:#FBF1E8;gap:18px;}
  .sp-action .sp-arrow{font-size:12px;line-height:1;}

  /* ===================== position navigation (always on) ================ */
  #sphinx-nav{
    position:fixed;right:clamp(24px,4vw,64px);bottom:clamp(24px,4vh,48px);
    z-index:5;user-select:none;
    opacity:.9;transition:opacity 600ms ease;
  }
  .sp-index-tag{
    font-size:7.5px;letter-spacing:.28em;color:#4E4130;text-transform:uppercase;
    margin-bottom:8px;
  }
  .sp-index-row{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px;}
  .sp-index-row:last-child{margin-bottom:0;}
  #sphinx-nav button{
    position:relative;
    width:24px;height:24px;padding:0;border:1px solid rgba(189,152,101,.22);
    background:none;color:#7C6544;font-family:inherit;font-size:9px;
    letter-spacing:.04em;cursor:pointer;border-radius:0;
    transition:color 300ms ease,border-color 300ms ease,background 300ms ease;
  }
  #sphinx-nav button:hover{color:#FBF1E8;border-color:rgba(189,152,101,.58);}
  #sphinx-nav button.is-active{color:#1A1817;background:#BD9865;border-color:#BD9865;}
  #sphinx-nav button:active{transform:translateY(0.5px);}

  /* the press flare: a square of gold that expands out of the button and
     dissolves — the visual echo of the node resonating in the brain */
  #sphinx-nav button::after{
    content:'';position:absolute;inset:-1px;border:1px solid #BD9865;
    opacity:0;pointer-events:none;transform:scale(1);
  }
  #sphinx-nav button.is-flare::after{animation:sc-flare 720ms cubic-bezier(.16,.84,.44,1) forwards;}
  @keyframes sc-flare{
    0%{opacity:.95;transform:scale(1);}
    100%{opacity:0;transform:scale(2.5);}
  }
  #sphinx-nav button.is-flare{color:#FBF1E8;}

  /* title reveal pulse when a new position is consulted */
  @keyframes sc-title-in{
    0%{opacity:0;transform:translateY(6px);letter-spacing:.16em;}
    100%{opacity:1;transform:translateY(0);letter-spacing:.045em;}
  }
  .sp-title.is-flash{animation:sc-title-in 900ms cubic-bezier(.22,.61,.36,1);}
  @keyframes sc-rule-sweep{
    0%{opacity:.35;}
    35%{opacity:1;}
    100%{opacity:.35;}
  }
  #sphinx-panel.is-flash .sp-rule{animation:sc-rule-sweep 1000ms ease;}

  @media (prefers-reduced-motion: reduce){
    #sphinx-nav button.is-flare::after,
    .sp-title.is-flash,
    #sphinx-panel.is-flash .sp-rule{animation:none;}
  }

  /* ============================== tablet =============================== */
  body.sc-tablet #sphinx-panel{
    top:auto;bottom:clamp(96px,14vh,150px);right:clamp(20px,3vw,32px);
    left:clamp(20px,3vw,32px);transform:none;width:auto;
  }
  body.sc-tablet .sp-title{font-size:22px;}
  body.sc-tablet .sp-desc{font-size:12px;line-height:1.8;max-width:60ch;}
  body.sc-tablet #sphinx-nav{
    left:clamp(20px,3vw,32px);right:clamp(20px,3vw,32px);bottom:20px;
  }
  body.sc-tablet .sp-index-row{gap:7px;}
  body.sc-tablet #sphinx-nav button{width:26px;height:26px;}
  body.sc-tablet #sphinx-legend{display:none;}

  /* ============================== mobile =============================== */
  /* Brain above, copy below — a stacked composition, not a shrunk desktop. */
  body.sc-mobile #sphinx-hud{top:16px;left:18px;}
  body.sc-mobile .sc-brand{font-size:10px;letter-spacing:.34em;}
  body.sc-mobile .sc-sub{font-size:8px;}
  body.sc-mobile #sphinx-legend{display:none;}
  body.sc-mobile .sc-axis{display:none;}

  body.sc-mobile #sphinx-panel{
    top:auto;bottom:0;left:0;right:0;transform:none;width:auto;
    padding:0 18px calc(env(safe-area-inset-bottom,0px) + 84px);
    max-height:50vh;overflow-y:auto;overscroll-behavior:contain;
    -webkit-overflow-scrolling:touch;
    opacity:1;pointer-events:auto;
  }
  body.sc-mobile #sphinx-panel .sp-body{padding:18px 0 14px;}
  body.sc-mobile #sphinx-panel:not(.is-visible) .sp-body,
  body.sc-mobile #sphinx-panel:not(.is-visible) .sp-rule{opacity:.28;}
  body.sc-mobile .sp-label{font-size:8px;letter-spacing:.26em;gap:8px;}
  body.sc-mobile .sp-title{margin-top:12px;font-size:17px;letter-spacing:.04em;}
  body.sc-mobile .sp-meta{margin-top:12px;gap:12px;font-size:7.5px;}
  body.sc-mobile .sp-desc{margin-top:14px;font-size:12px;line-height:1.75;}
  body.sc-mobile .sp-counter{margin-top:16px;font-size:8px;}
  body.sc-mobile .sp-action{margin-top:18px;font-size:9px;}

  body.sc-mobile #sphinx-nav{
    left:0;right:0;bottom:0;padding:10px 14px calc(env(safe-area-inset-bottom,0px) + 10px);
    display:flex;gap:10px;justify-content:center;align-items:flex-start;
    background:linear-gradient(180deg,rgba(0,0,0,0) 0%,rgba(0,0,0,.28) 60%);
  }
  body.sc-mobile .sp-index-tag{display:none;}
  body.sc-mobile .sp-index-row{
    gap:5px;margin-bottom:0;flex-wrap:nowrap;
  }
  body.sc-mobile #sphinx-nav button{
    width:30px;height:30px;font-size:10px;
    border-color:rgba(189,152,101,.3);
  }

  /* Larger hit targets on any touch device */
  @media (hover:none){
    #sphinx-nav button{min-width:30px;min-height:30px;}
    .sp-action{padding:10px 0;}
  }
  `;
  document.head.appendChild(style);
}

// Floating FEMININE / MASCULINE hemisphere labels tracked in screen space.
export function buildAxisLabels() {
  const mk = (text) => {
    const el = document.createElement('div');
    el.className = 'sc-axis';
    el.textContent = text;
    document.body.appendChild(el);
    return el;
  };
  const fem = mk('Feminine');
  const mas = mk('Masculine');
  const anchorF = new THREE.Vector3(-0.1, 0.35, -1.34);
  const anchorM = new THREE.Vector3(-0.1, 0.35, 1.34);
  const v = new THREE.Vector3();
  let cam = null;

  function place(el, anchor, brain, active) {
    if (!cam) return;
    v.copy(anchor).applyMatrix4(brain.matrixWorld).project(cam);
    const behind = v.z > 1;
    el.style.left = ((v.x * 0.5 + 0.5) * window.innerWidth) + 'px';
    el.style.top = ((-v.y * 0.5 + 0.5) * window.innerHeight) + 'px';
    el.classList.toggle('is-on', active && !behind);
    el.classList.toggle('is-dim', !active && !behind);
    if (behind) { el.classList.remove('is-on', 'is-dim'); }
  }

  return {
    update(camera, renderer, brain, axis) {
      cam = camera;
      place(fem, anchorF, brain, axis === 'FEMININE');
      place(mas, anchorM, brain, axis === 'MASCULINE');
    },
  };
}

export function buildPanel(letters, onSelect, onExplore) {
  const panel = document.createElement('div');
  panel.id = 'sphinx-panel';
  panel.innerHTML = `
    <div class="sp-rule"></div>
    <div class="sp-body">
      <div class="sp-label">
        <span class="sp-pos" id="sp-pos">Position</span>
        <span class="sp-div">/</span>
        <span class="sp-pyr" id="sp-pyr">Archetypal Blueprint</span>
      </div>
      <div class="sp-title" id="sp-title">Select a position</div>
      <div class="sp-meta">
        <span>Axis &middot; <b id="sp-axis">&mdash;</b></span>
        <span>Field &middot; <b id="sp-hemi">&mdash;</b></span>
      </div>
      <div class="sp-desc" id="sp-desc"></div>
      <div class="sp-counter" id="sp-counter"></div>
      <button class="sp-action" id="sp-action" type="button">
        <span>Explore this position</span><span class="sp-arrow">&#8594;</span>
      </button>
    </div>
    <div class="sp-rule"></div>
  `;
  document.body.appendChild(panel);

  // Navigation lives outside the panel so it is always available — this is
  // essential on touch devices where there is no hover affordance.
  const nav = document.createElement('div');
  nav.id = 'sphinx-nav';
  document.body.appendChild(nav);

  const buttons = {};
  const groups = [
    ['Incarnation', letters.slice(0, 8)],
    ['Soul', letters.slice(8)],
  ];
  groups.forEach(([tag, set]) => {
    const wrap = document.createElement('div');
    const label = document.createElement('div');
    label.className = 'sp-index-tag';
    label.textContent = tag;
    wrap.appendChild(label);
    const row = document.createElement('div');
    row.className = 'sp-index-row';
    set.forEach((L) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = L;
      b.dataset.letter = L;
      b.setAttribute('aria-label', 'Position ' + L);
      b.addEventListener('click', () => onSelect(L));
      row.appendChild(b);
      buttons[L] = b;
    });
    wrap.appendChild(row);
    nav.appendChild(wrap);
  });

  panel.querySelector('#sp-action').addEventListener('click', onExplore);

  const els = {
    panel,
    pos: panel.querySelector('#sp-pos'),
    pyr: panel.querySelector('#sp-pyr'),
    title: panel.querySelector('#sp-title'),
    axis: panel.querySelector('#sp-axis'),
    hemi: panel.querySelector('#sp-hemi'),
    desc: panel.querySelector('#sp-desc'),
    counter: panel.querySelector('#sp-counter'),
    action: panel.querySelector('#sp-action'),
    buttons,
  };

  // Restart a CSS animation reliably by forcing a reflow between removals.
  function replay(el, cls) {
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  }

  let lastLetter = null;

  return {
    els,
    // Fire the nav button's gold flare — used on click and by story mode.
    flare(letter) {
      const b = buttons[letter];
      if (!b) return;
      replay(b, 'is-flare');
      setTimeout(() => b.classList.remove('is-flare'), 760);
    },
    show(data) {
      const changed = data.letter !== lastLetter;
      lastLetter = data.letter;

      els.panel.classList.add('is-visible');
      els.pos.textContent = 'Position ' + data.letter;
      els.pyr.textContent = data.pyramid;
      els.title.textContent = data.title;
      els.axis.textContent = data.axis || '—';
      els.hemi.textContent = data.hemisphere || '—';
      els.desc.textContent = data.description;
      els.counter.textContent = 'Counterpart · Position ' + data.counterpart;
      els.action.style.display = '';

      if (changed) {
        replay(els.title, 'is-flash');
        replay(els.panel, 'is-flash');
        setTimeout(() => els.panel.classList.remove('is-flash'), 1040);
      }

      Object.keys(buttons).forEach((L) => {
        buttons[L].classList.toggle('is-active', L === data.letter);
      });
    },
    hide() {
      lastLetter = null;
      els.panel.classList.remove('is-visible');
      els.pos.textContent = 'Position';
      els.pyr.textContent = 'Archetypal Blueprint';
      els.title.textContent = 'Select a position';
      els.axis.textContent = '—';
      els.hemi.textContent = '—';
      els.desc.textContent = 'Sixteen consciousness positions mapped across the hemispheres. Choose one to reveal its structure.';
      els.counter.textContent = '';
      els.action.style.display = 'none';
      Object.keys(buttons).forEach((L) => buttons[L].classList.remove('is-active'));
    },
  };
}

// Shortest-path angle interpolation helper.
export function shortAngle(from, to) {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function damp(current, target, lambda, dt) {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}