/* Canvas-2D degradation: same islands, same sequencing, no WebGL. */
export function createFallback2D(canvas, steps, config, reduced) {
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1;
  let current = 0, camX = 0, camTargetX = 0;
  let travel = null;
  const SPACING = 340;

  const nodes = steps.map((s, i) => ({
    x: i * SPACING,
    y: -i * 34,
    team: s.team,
    seed: i * 37.1
  }));

  const motes = Array.from({ length: 90 }, () => ({
    x: Math.random() * 2200 - 400,
    y: Math.random() * 600 - 300,
    r: Math.random() * 1.4 + 0.3,
    s: Math.random() * 0.4 + 0.1
  }));

  const payload = Array.from({ length: 60 }, () => ({
    a: Math.random() * Math.PI * 2,
    r: 10 + Math.random() * 16,
    sp: 0.4 + Math.random() * 0.8
  }));

  function resize() {
    dpr = Math.min(window.devicePixelRatio, 2);
    W = canvas.clientWidth || window.innerWidth;
    H = canvas.clientHeight || window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    camTargetX = nodes[current].x;
    if (reduced) camX = camTargetX;
  }
  window.addEventListener('resize', resize);
  resize();

  function goTo(next, prev) {
    current = next;
    camTargetX = nodes[next].x;
    if (next !== prev) {
      travel = { t: 0, dur: reduced ? 0.25 : config.travelDuration, from: prev, to: next };
    }
    if (reduced) camX = camTargetX;
  }

  function mountain(n, cx, cy, active, done, t) {
    const w = 150, h = 80;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.lineWidth = 1;
    const alpha = active ? 0.65 : done ? 0.34 : 0.2;
    ctx.strokeStyle = active ? `rgba(111,180,255,${alpha})` : `rgba(140,170,205,${alpha})`;

    for (let r = 0; r < 6; r++) {
      const k = r / 5;
      ctx.beginPath();
      for (let s = 0; s <= 28; s++) {
        const a = (s / 28) * Math.PI * 2;
        const noise = Math.sin(a * 3 + n.seed) * 0.12 + Math.sin(a * 6 + r) * 0.05;
        const rx = w * k * (1 + noise);
        const ry = w * k * 0.32 * (1 + noise);
        const py = -h * Math.pow(1 - k, 2) + Math.sin(a * 3 + n.seed) * 6 * k;
        const px = Math.cos(a) * rx;
        const pz = Math.sin(a) * ry;
        if (s === 0) ctx.moveTo(px, pz + py); else ctx.lineTo(px, pz + py);
      }
      ctx.closePath();
      ctx.stroke();
    }
    for (let s = 0; s < 14; s++) {
      const a = (s / 14) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(0, -h);
      ctx.lineTo(Math.cos(a) * w, Math.sin(a) * w * 0.32);
      ctx.stroke();
    }

    ctx.font = '500 11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = active ? 'rgba(242,245,248,.92)' : 'rgba(150,165,185,.5)';
    ctx.fillText(n.team.toUpperCase(), 0, 30);
    ctx.restore();
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const et = now / 1000;

    camX += (camTargetX - camX) * (reduced ? 1 : 0.05);

    ctx.fillStyle = '#06080c';
    ctx.fillRect(0, 0, W, H);

    const baseY = H * 0.62;
    const ox = W * 0.5 - camX;

    ctx.save();
    for (const m of motes) {
      if (!reduced) m.y -= m.s * dt * 20;
      if (m.y < -320) m.y = 320;
      ctx.beginPath();
      ctx.arc(ox * 0.35 + m.x, baseY + m.y, m.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(159,208,255,.18)';
      ctx.fill();
    }
    ctx.restore();

    for (let i = 0; i < nodes.length - 1; i++) {
      const a = nodes[i], b = nodes[i + 1];
      ctx.beginPath();
      ctx.setLineDash([4, 8]);
      ctx.lineDashOffset = reduced ? 0 : -et * 22;
      ctx.moveTo(ox + a.x, baseY + a.y - 80);
      ctx.quadraticCurveTo(ox + (a.x + b.x) / 2, baseY + Math.min(a.y, b.y) - 190, ox + b.x, baseY + b.y - 80);
      ctx.strokeStyle = i < current ? 'rgba(111,180,255,.42)' : 'rgba(90,120,155,.2)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash([]);
    }

    nodes.forEach((n, i) => mountain(n, ox + n.x, baseY + n.y, i === current, i < current, et));

    let px, py, disp = 0;
    if (travel) {
      travel.t += dt / travel.dur;
      const t = Math.min(travel.t, 1);
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const a = nodes[travel.from], b = nodes[travel.to];
      const mx = (a.x + b.x) / 2, my = Math.min(a.y, b.y) - 110;
      const it = 1 - e;
      px = ox + it * it * a.x + 2 * it * e * mx + e * e * b.x;
      py = baseY + it * it * (a.y - 80) + 2 * it * e * my + e * e * (b.y - 80);
      disp = t < 0.22 ? t / 0.22 : t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1;
      if (t >= 1) travel = null;
    } else {
      px = ox + nodes[current].x;
      py = baseY + nodes[current].y - 80 + (reduced ? 0 : Math.sin(et) * 4);
    }

    for (const p of payload) {
      const a = p.a + (reduced ? 0 : et * p.sp);
      const r = 7 + p.r * disp;
      ctx.beginPath();
      ctx.arc(px + Math.cos(a) * r, py + Math.sin(a) * r * 0.72, 1.3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(159,208,255,${0.85 - disp * 0.35})`;
      ctx.fill();
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return { goTo };
}