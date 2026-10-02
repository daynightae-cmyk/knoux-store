/**
 * Adapted from developer-portrait-local/particle-portrait.js, not a generated
 * replacement: the recovered photo supplies the luminance and Sobel edges.
 * One 2D surface; bounded sampling, 30fps, no work offscreen or in hidden tabs.
 */
export function mountFounderPortrait(canvas: HTMLCanvasElement, image: HTMLImageElement) {
  const context = canvas.getContext('2d');
  if (!context || !image.naturalWidth) return undefined;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const sampleWidth = coarse ? 160 : 220;
  const sampleHeight = sampleWidth;
  const sample = document.createElement('canvas');
  sample.width = sampleWidth;
  sample.height = sampleHeight;
  const sampleContext = sample.getContext('2d', { willReadFrequently: true });
  if (!sampleContext) return undefined;
  sampleContext.drawImage(image, 0, 0, sampleWidth, sampleHeight);
  let pixels: Uint8ClampedArray;
  try { pixels = sampleContext.getImageData(0, 0, sampleWidth, sampleHeight).data; }
  catch { return undefined; }
  const luminance = new Float32Array(sampleWidth * sampleHeight);
  for (let i = 0; i < luminance.length; i++) {
    luminance[i] = .299 * pixels[i * 4] + .587 * pixels[i * 4 + 1] + .114 * pixels[i * 4 + 2];
  }
  let seed = 254654069;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const particles: { tx: number; ty: number; x: number; y: number; size: number; phase: number; speed: number; alpha: number; color: string }[] = [];
  const budget = coarse ? 2000 : 5500;
  for (let y = 1; y < sampleHeight - 1; y += 2) {
    for (let x = 1; x < sampleWidth - 1; x += 2) {
      const i = y * sampleWidth + x;
      const l = luminance[i];
      const gx = -luminance[i - sampleWidth - 1] + luminance[i - sampleWidth + 1]
        - 2 * luminance[i - 1] + 2 * luminance[i + 1]
        - luminance[i + sampleWidth - 1] + luminance[i + sampleWidth + 1];
      const gy = -luminance[i - sampleWidth - 1] - 2 * luminance[i - sampleWidth] - luminance[i - sampleWidth + 1]
        + luminance[i + sampleWidth - 1] + 2 * luminance[i + sampleWidth] + luminance[i + sampleWidth + 1];
      const edge = Math.hypot(gx, gy);
      const probability = edge > 18 ? 1 : edge > 8 ? .75 : y / sampleHeight < .62 && l > 20 && l < 235 ? .55 : .28;
      if (random() > probability * (coarse ? .55 : 1)) continue;
      const tx = x / sampleWidth * 2 - 1;
      const ty = y / sampleHeight * 2 - 1;
      particles.push({ tx, ty, x: tx + (random() - .5) * 1.8, y: ty + (random() - .5) * 1.8 - .3,
        size: edge > 15 ? random() * .6 + .9 : random() * .5 + .5,
        phase: random() * Math.PI * 2, speed: random() * .6 + .3,
        alpha: Math.min(.9, .5 + .5 * (1 - Math.abs(l - 128) / 128)),
        color: l < 90 ? '145,132,169' : l < 170 ? '201,203,209' : '244,242,239',
      });
    }
  }
  // Evenly thin the complete sample rather than truncating the lower face.
  const points = particles.filter((_, i) => i % Math.max(1, Math.ceil(particles.length / budget)) === 0);
  canvas.dataset.particleCount = String(points.length);
  let width = 0, height = 0, frame = 0, visibilityFrame = 0, generation = 0, elapsed = 0, lastTime = 0, lastDraw = 0, disposed = false;
  let pointerX = -9999, pointerY = -9999;
  let draws = 0;
  const paint = (progress: number) => {
    context.clearRect(0, 0, width, height);
    const eased = 1 - Math.pow(1 - progress, 3);
    const scale = Math.min(width, height) * .46;
    for (const p of points) {
      let px = width / 2 + (p.x + (p.tx - p.x) * eased) * scale;
      let py = height / 2 + (p.y + (p.ty - p.y) * eased) * scale;
      if (!reduced.matches && progress >= 1) py += Math.sin(elapsed / 1000 * p.speed + p.phase) * 1.1;
      if (!coarse && !reduced.matches) {
        const dx = px - pointerX, dy = py - pointerY, distance = Math.hypot(dx, dy);
        if (distance < 70) {
          const force = (1 - distance / 70) * 6;
          px += dx / (distance || 1) * force;
          py += dy / (distance || 1) * force;
        }
      }
      context.beginPath();
      context.arc(px, py, p.size, 0, Math.PI * 2);
      context.fillStyle = `rgba(${p.color},${p.alpha})`;
      context.fill();
    }
    canvas.dataset.drawCount = String(++draws);
  };
  const stop = () => {
    generation++;
    cancelAnimationFrame(frame);
    frame = 0;
    lastTime = 0;
  };
  const animate = (time: number, token: number) => {
    if (disposed || token !== generation) return;
    // A queued callback must not revive a stopped loop. Check the preference
    // at the drawing boundary as well as listening for its change event.
    if (reduced.matches || document.hidden) { sync(); return; }
    elapsed += lastTime ? Math.min(time - lastTime, 80) : 0;
    lastTime = time;
    if (time - lastDraw >= 1000 / 30) {
      const progress = Math.min(1, elapsed / 2200);
      paint(progress);
      canvas.dataset.renderState = progress < 1 ? 'assembling' : 'animated';
      lastDraw = time;
    }
    frame = requestAnimationFrame(nextTime => animate(nextTime, token));
  };
  const sync = () => {
    stop();
    // Seed visibility from the current geometry, including at image load and
    // resize. An initial async observer entry can describe the pre-hydration
    // layout and otherwise leave an in-view portrait parked as offscreen.
    const bounds = canvas.getBoundingClientRect();
    const visibleWidth = Math.max(0, Math.min(bounds.right, innerWidth) - Math.max(bounds.left, 0));
    const visibleHeight = Math.max(0, Math.min(bounds.bottom, innerHeight) - Math.max(bounds.top, 0));
    const visible = bounds.width > 0 && bounds.height > 0
      && visibleWidth * visibleHeight / (bounds.width * bounds.height) >= .05;
    if (!visible || document.hidden) {
      canvas.dataset.renderState = 'paused';
      canvas.dataset.pauseReason = visible ? 'hidden' : 'offscreen';
      return;
    }
    delete canvas.dataset.pauseReason;
    if (reduced.matches) {
      elapsed = 2200;
      paint(1);
      canvas.dataset.renderState = 'static';
    } else {
      const token = generation;
      frame = requestAnimationFrame(time => animate(time, token));
    }
  };
  const resize = () => {
    const bounds = canvas.getBoundingClientRect();
    width = bounds.width;
    height = bounds.height;
    const dpr = Math.min(devicePixelRatio || 1, coarse ? 1.5 : 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    // A completed static frame is immediately available before entering view.
    if (width && height) paint(1);
    sync();
  };
  const move = (event: PointerEvent) => {
    const bounds = canvas.getBoundingClientRect();
    pointerX = event.clientX - bounds.left;
    pointerY = event.clientY - bounds.top;
  };
  const leave = () => { pointerX = pointerY = -9999; };
  // Coalesce smooth/anchor scrolling into one geometry check per frame. This
  // also covers a delayed observer notification without an offscreen loop.
  const scroll = () => {
    if (visibilityFrame) return;
    visibilityFrame = requestAnimationFrame(() => { visibilityFrame = 0; sync(); });
  };
  const intersection = new IntersectionObserver(sync, { threshold: .05 });
  const observer = new ResizeObserver(resize);
  // The frame has a stable aspect ratio before the image/canvas is hydrated.
  intersection.observe(canvas.parentElement ?? canvas);
  observer.observe(canvas);
  reduced.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('scroll', scroll, { passive: true });
  if (!coarse) { canvas.addEventListener('pointermove', move); canvas.addEventListener('pointerleave', leave); }
  resize();
  return () => {
    disposed = true;
    stop();
    cancelAnimationFrame(visibilityFrame);
    intersection.disconnect();
    observer.disconnect();
    reduced.removeEventListener('change', sync);
    document.removeEventListener('visibilitychange', sync);
    window.removeEventListener('scroll', scroll);
    canvas.removeEventListener('pointermove', move);
    canvas.removeEventListener('pointerleave', leave);
    delete canvas.dataset.particleCount;
    canvas.dataset.renderState = 'paused';
  };
}
