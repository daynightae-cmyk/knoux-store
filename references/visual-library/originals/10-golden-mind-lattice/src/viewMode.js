// ViewMode — the "View Blueprint / View Brain" toggle UI.
//
// Injects a single understated button at bottom-centre of the screen.
// The button text morphs between the two states.

export function buildViewModeButton(onToggle) {
  const btn = document.createElement('button');
  btn.id = 'sc-view-btn';
  btn.innerHTML = `
    <span id="sc-view-label">View Blueprint</span>
    <span class="sc-view-arrow">&#8645;</span>
  `;
  document.body.appendChild(btn);

  const style = document.createElement('style');
  style.textContent = `
    #sc-view-btn {
      position: fixed;
      bottom: 22px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 10;
      background: none;
      border: 1px solid rgba(189,152,101,.28);
      color: #9C7F55;
      font-family: Inter, system-ui, sans-serif;
      font-size: 9px;
      letter-spacing: .34em;
      text-transform: uppercase;
      font-weight: 400;
      padding: 9px 22px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 10px;
      transition: color 400ms ease, border-color 400ms ease;
      white-space: nowrap;
    }
    #sc-view-btn:hover {
      color: #FBF1E8;
      border-color: rgba(189,152,101,.62);
    }
    .sc-view-arrow {
      font-size: 13px;
      line-height: 1;
      opacity: .7;
    }
    /* Blueprint mode overlay label */
    #sc-blueprint-label {
      position: fixed;
      top: 24px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 6;
      font-family: Inter, system-ui, sans-serif;
      font-size: 8.5px;
      letter-spacing: .42em;
      text-transform: uppercase;
      color: #7C6544;
      pointer-events: none;
      user-select: none;
      opacity: 0;
      transition: opacity 600ms ease;
      white-space: nowrap;
    }
    #sc-blueprint-label.is-on { opacity: 1; }

    /* Column headers shown only in blueprint mode */
    .sc-bp-col-label {
      position: fixed;
      z-index: 6;
      font-family: Inter, system-ui, sans-serif;
      font-size: 8px;
      letter-spacing: .3em;
      text-transform: uppercase;
      color: #4E4130;
      pointer-events: none;
      user-select: none;
      opacity: 0;
      transition: opacity 800ms ease;
      white-space: nowrap;
      transform: translateX(-50%);
    }
    .sc-bp-col-label.is-on { opacity: 1; }

    /* Row labels */
    .sc-bp-row-label {
      position: fixed;
      z-index: 6;
      font-family: Inter, system-ui, sans-serif;
      font-size: 7.5px;
      letter-spacing: .22em;
      text-transform: uppercase;
      color: #4E4130;
      pointer-events: none;
      user-select: none;
      opacity: 0;
      transition: opacity 800ms ease;
      white-space: nowrap;
    }
    .sc-bp-row-label.is-on { opacity: 1; }
  `;
  document.head.appendChild(style);

  // Overlay title
  const overlay = document.createElement('div');
  overlay.id = 'sc-blueprint-label';
  overlay.textContent = 'Archetypal Blueprint® — Flat View';
  document.body.appendChild(overlay);

  // Column labels (positioned via JS after render)
  const COL_LABELS = [
    { text: 'Transcendental Path', key: 'path' },
    { text: 'Feminine',            key: 'fem' },
    { text: 'Essence',             key: 'mid' },
    { text: 'Masculine',           key: 'masc' },
  ];
  const colEls = {};
  COL_LABELS.forEach(({ text, key }) => {
    const el = document.createElement('div');
    el.className = 'sc-bp-col-label';
    el.textContent = text;
    document.body.appendChild(el);
    colEls[key] = el;
  });

  // Row labels
  const ROW_LABELS = [
    { text: 'Incarnation Pyramid', key: 'inc', side: 'right' },
    { text: 'Soul Pyramid',        key: 'soul', side: 'right' },
  ];
  const rowEls = {};
  ROW_LABELS.forEach(({ text, key }) => {
    const el = document.createElement('div');
    el.className = 'sc-bp-row-label';
    el.textContent = text;
    document.body.appendChild(el);
    rowEls[key] = el;
  });

  let isBlueprint = false;

  btn.addEventListener('click', () => {
    isBlueprint = onToggle();
    document.getElementById('sc-view-label').textContent =
      isBlueprint ? 'View Brain' : 'View Blueprint';
    overlay.classList.toggle('is-on', isBlueprint);
    Object.values(colEls).forEach((el) => el.classList.toggle('is-on', isBlueprint));
    Object.values(rowEls).forEach((el) => el.classList.toggle('is-on', isBlueprint));
  });

  return {
    // Called from animate() to reposition column/row labels in screen space.
    updateLabels(camera, colScreenPositions, rowScreenPositions) {
      if (!isBlueprint) return;

      const W = window.innerWidth, H = window.innerHeight;
      Object.entries(colScreenPositions).forEach(([key, sp]) => {
        const el = colEls[key];
        if (!el) return;
        el.style.left = (sp.x * W) + 'px';
        el.style.top  = (sp.y * H - 28) + 'px';
      });
      Object.entries(rowScreenPositions).forEach(([key, sp]) => {
        const el = rowEls[key];
        if (!el) return;
        el.style.right = (W - sp.x * W + 16) + 'px';
        el.style.top   = (sp.y * H) + 'px';
        el.style.transform = 'translateY(-50%)';
      });
    },
  };
}