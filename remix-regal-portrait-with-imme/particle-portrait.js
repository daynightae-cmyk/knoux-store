// ═══════════════════════════════════════════
//  PARTICLE PORTRAIT — reconstructs the uploaded portrait
//  from sampled pixel data into a point cloud of particles.
//  The source <img> is never rendered visibly; only this
//  canvas is shown.
// ═══════════════════════════════════════════
(function () {
  const canvas = document.getElementById('portrait-canvas');
  const sourceImg = document.getElementById('portrait-source');
  if (!canvas || !sourceImg) return;
  const ctx = canvas.getContext('2d');

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = window.matchMedia('(pointer: coarse)').matches;
  const isMobile = window.innerWidth < 620;

  let particles = [];
  let W = 0, H = 0;
  let assembled = reducedMotion;
  let startTime = null;
  let pointerX = -9999, pointerY = -9999;
  let pointerActive = false;

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = rect.width;
    H = rect.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // Luminance-based edge estimate using a simple Sobel-lite kernel
  function computeEdgeMap(data, w, h) {
    const edge = new Float32Array(w * h);
    const lum = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) {
      const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
      lum[i] = 0.299 * r + 0.587 * g + 0.114 * b;
    }
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = y * w + x;
        const gx =
          -lum[idx - w - 1] + lum[idx - w + 1] +
          -2 * lum[idx - 1] + 2 * lum[idx + 1] +
          -lum[idx + w - 1] + lum[idx + w + 1];
        const gy =
          -lum[idx - w - 1] - 2 * lum[idx - w] - lum[idx - w + 1] +
          lum[idx + w - 1] + 2 * lum[idx + w] + lum[idx + w + 1];
        edge[idx] = Math.sqrt(gx * gx + gy * gy);
      }
    }
    return { edge, lum };
  }

  function buildParticlesFromImage() {
    resizeCanvas();

    const sampleW = 220;
    const sampleH = Math.round(sampleW * (sourceImg.naturalHeight / sourceImg.naturalWidth));

    const off = document.createElement('canvas');
    off.width = sampleW;
    off.height = sampleH;
    const offCtx = off.getContext('2d');

    // Crop intelligently: center-weighted toward upper portion (face/upper body)
    const srcAspect = sourceImg.naturalWidth / sourceImg.naturalHeight;
    const dstAspect = sampleW / sampleH;
    let sx, sy, sw, sh;
    if (srcAspect > dstAspect) {
      sh = sourceImg.naturalHeight;
      sw = sh * dstAspect;
      sx = (sourceImg.naturalWidth - sw) / 2;
      sy = 0;
    } else {
      sw = sourceImg.naturalWidth;
      sh = sw / dstAspect;
      sx = 0;
      sy = (sourceImg.naturalHeight - sh) * 0.15;
    }
    offCtx.drawImage(sourceImg, sx, sy, sw, sh, 0, 0, sampleW, sampleH);

    let imgData;
    try {
      imgData = offCtx.getImageData(0, 0, sampleW, sampleH);
    } catch (e) {
      console.warn('Portrait particle sampling failed:', e);
      return;
    }
    const data = imgData.data;
    const { edge, lum } = computeEdgeMap(data, sampleW, sampleH);

    const perfDensity = isMobile ? 0.55 : 1;
    const baseStep = isMobile ? 2 : 1;

    const newParticles = [];

    for (let y = 0; y < sampleH; y += baseStep) {
      for (let x = 0; x < sampleW; x += baseStep) {
        const idx = y * sampleW + x;
        const pxIdx = idx * 4;
        const alpha = data[pxIdx + 3];
        if (alpha < 40) continue;

        const l = lum[idx];
        const e = edge[idx];

        // upper region (face) gets higher density weighting
        const yRatio = y / sampleH;
        const isFaceZone = yRatio < 0.62;
        const isUpperBody = yRatio >= 0.62;

        // density decision: keep edges & mid-tones, thin out flat dark/bright zones
        let keepProb = 0.18;
        if (e > 18) keepProb = 1.0;
        else if (e > 8) keepProb = 0.75;
        else if (isFaceZone && l > 20 && l < 235) keepProb = 0.55;
        else if (isUpperBody) keepProb = 0.28;

        keepProb *= perfDensity;

        if (Math.random() > keepProb) continue;

        const nx = (x / sampleW) * 2 - 1; // -1..1
        const ny = (y / sampleH) * 2 - 1;

        const r = data[pxIdx], g = data[pxIdx + 1], b = data[pxIdx + 2];

        // color scheme: white/silver/violet based on luminance
        let colorMode = 'white';
        if (l < 90) colorMode = 'violet';
        else if (l < 170) colorMode = 'silver';

        newParticles.push({
          tx: nx, ty: ny,
          x: nx + (Math.random() - 0.5) * 1.8,
          y: ny + (Math.random() - 0.5) * 1.8 - 0.3,
          size: e > 15 ? (Math.random() * 0.6 + 0.9) : (Math.random() * 0.5 + 0.5),
          colorMode,
          srcLum: l,
          floatPhase: Math.random() * Math.PI * 2,
          floatSpeed: Math.random() * 0.6 + 0.3,
          vx: 0, vy: 0
        });
      }
    }

    particles = newParticles;
  }

  function colorFor(p, alpha) {
    if (p.colorMode === 'violet') return `rgba(166,140,240,${alpha})`;
    if (p.colorMode === 'silver') return `rgba(201,203,209,${alpha})`;
    return `rgba(244,242,239,${alpha})`;
  }

  function animate(t) {
    if (startTime === null) startTime = t;
    const elapsed = (t - startTime) / 1000;

    ctx.clearRect(0, 0, W, H);

    const assembleDuration = 2.2;
    let progress = assembled ? 1 : Math.min(1, elapsed / assembleDuration);
    // ease out cubic
    const eased = 1 - Math.pow(1 - progress, 3);

    const cx = W / 2, cy = H / 2;
    const scale = Math.min(W, H) * 0.46;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      const curX = p.x + (p.tx - p.x) * eased;
      const curY = p.y + (p.ty - p.y) * eased;

      let px = cx + curX * scale;
      let py = cy + curY * scale * 1.05;

      // subtle breathing float once assembled
      if (progress > 0.98) {
        const breathe = Math.sin(elapsed * p.floatSpeed + p.floatPhase) * 1.1;
        py += breathe;
      }

      // restrained pointer interaction (desktop only)
      if (pointerActive && !isTouch) {
        const dx = px - pointerX;
        const dy = py - pointerY;
        const dist = Math.hypot(dx, dy);
        const radius = 70;
        if (dist < radius) {
          const force = (1 - dist / radius) * 6;
          px += (dx / (dist || 1)) * force;
          py += (dy / (dist || 1)) * force;
        }
      }

      const alpha = 0.35 + 0.5 * (1 - Math.abs(p.srcLum - 128) / 128) + 0.15;
      ctx.beginPath();
      ctx.arc(px, py, p.size, 0, Math.PI * 2);
      ctx.fillStyle = colorFor(p, Math.min(0.9, alpha));
      ctx.fill();
    }

    if (progress >= 1) assembled = true;

    requestAnimationFrame(animate);
  }

  let resizeTimer = null;
  function handleResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resizeCanvas();
    }, 200);
  }
  window.addEventListener('resize', handleResize);

  if (!isTouch) {
    const frameEl = canvas.parentElement;
    frameEl.addEventListener('mousemove', e => {
      const rect = canvas.getBoundingClientRect();
      pointerX = e.clientX - rect.left;
      pointerY = e.clientY - rect.top;
      pointerActive = true;
    });
    frameEl.addEventListener('mouseleave', () => { pointerActive = false; });
  }

  function start() {
    buildParticlesFromImage();
    requestAnimationFrame(animate);
  }

  if (sourceImg.complete && sourceImg.naturalWidth > 0) {
    start();
  } else {
    sourceImg.addEventListener('load', start);
    sourceImg.addEventListener('error', () => {
      console.warn('Portrait source failed to load — particle portrait unavailable.');
    });
  }
})();
