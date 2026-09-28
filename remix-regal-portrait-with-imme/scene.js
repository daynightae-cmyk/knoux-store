// ═══════════════════════════════════════════
//  AMBIENT BACKGROUND PARTICLES
// ═══════════════════════════════════════════
const bgCanvas = document.getElementById('bg-canvas');
const bgCtx = bgCanvas.getContext('2d');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function resizeBg() {
  bgCanvas.width = window.innerWidth;
  bgCanvas.height = window.innerHeight;
}
resizeBg();
window.addEventListener('resize', resizeBg);

const bgParticleCount = window.innerWidth < 620 ? 60 : 120;
const particles = [];
for (let i = 0; i < bgParticleCount; i++) {
  const isViolet = Math.random() > 0.6;
  particles.push({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    r: Math.random() * 1.4 + 0.3,
    vx: (Math.random() - 0.5) * 0.25,
    vy: (Math.random() - 0.5) * 0.25,
    alpha: Math.random() * 0.5 + 0.1,
    isViolet,
    pulse: Math.random() * Math.PI * 2,
    pulseSpeed: Math.random() * 0.02 + 0.01
  });
}

let mouseX = window.innerWidth / 2, mouseY = window.innerHeight / 2;
window.addEventListener('mousemove', e => { mouseX = e.clientX; mouseY = e.clientY; });

function drawBg(t) {
  bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);

  const grad = bgCtx.createRadialGradient(
    mouseX, mouseY, 50,
    window.innerWidth / 2, window.innerHeight / 2, Math.max(window.innerWidth, window.innerHeight)
  );
  grad.addColorStop(0, 'rgba(30,20,50,0.15)');
  grad.addColorStop(1, 'rgba(5,3,8,0.05)');
  bgCtx.fillStyle = grad;
  bgCtx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);

  for (const p of particles) {
    if (!reducedMotion) {
      p.x += p.vx;
      p.y += p.vy;
      p.pulse += p.pulseSpeed;
    }

    if (p.x < 0) p.x = bgCanvas.width;
    if (p.x > bgCanvas.width) p.x = 0;
    if (p.y < 0) p.y = bgCanvas.height;
    if (p.y > bgCanvas.height) p.y = 0;

    const a = p.alpha * (0.6 + 0.4 * Math.sin(p.pulse));
    bgCtx.beginPath();
    bgCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    bgCtx.fillStyle = p.isViolet
      ? `rgba(166,140,240,${a})`
      : `rgba(201,203,209,${a})`;
    bgCtx.fill();
  }

  requestAnimationFrame(drawBg);
}
requestAnimationFrame(drawBg);

// ═══════════════════════════════════════════
//  HERO CANVAS — restrained computational field (orbit rings)
// ═══════════════════════════════════════════
const heroCanvas = document.getElementById('hero-canvas');
const hCtx = heroCanvas.getContext('2d');

function resizeHero() {
  heroCanvas.width = heroCanvas.offsetWidth;
  heroCanvas.height = heroCanvas.offsetHeight;
}
resizeHero();
window.addEventListener('resize', resizeHero);

const sparkleCount = window.innerWidth < 620 ? 28 : 55;
const sparkles = [];
for (let i = 0; i < sparkleCount; i++) {
  sparkles.push({
    angle: Math.random() * Math.PI * 2,
    radius: Math.random() * 180 + 90,
    speed: (Math.random() - 0.5) * 0.006,
    size: Math.random() * 2.4 + 0.8,
    alpha: Math.random(),
    alphaDir: Math.random() > 0.5 ? 1 : -1,
    alphaSpeed: Math.random() * 0.015 + 0.004,
    violet: Math.random() > 0.55
  });
}

function drawHero(t) {
  if (!heroCanvas.width || !heroCanvas.height) { requestAnimationFrame(drawHero); return; }
  hCtx.clearRect(0, 0, heroCanvas.width, heroCanvas.height);

  const cx = heroCanvas.width / 2;
  const cy = heroCanvas.height / 2;
  const time = reducedMotion ? 0 : t / 1000;

  [200, 270, 340].forEach((r, i) => {
    hCtx.beginPath();
    hCtx.ellipse(cx, cy, r, r * 0.35, time * (0.08 + i * 0.03) * (i % 2 ? -1 : 1), 0, Math.PI * 2);
    hCtx.strokeStyle = `rgba(166,140,240,${0.09 - i * 0.02})`;
    hCtx.lineWidth = 1;
    hCtx.stroke();
  });

  for (const s of sparkles) {
    if (!reducedMotion) {
      s.angle += s.speed;
      s.alpha += s.alphaDir * s.alphaSpeed;
      if (s.alpha > 1) { s.alpha = 1; s.alphaDir = -1; }
      if (s.alpha < 0) { s.alpha = 0; s.alphaDir = 1; }
    }

    const x = cx + Math.cos(s.angle) * s.radius;
    const y = cy + Math.sin(s.angle) * s.radius * 0.4;
    const grd = hCtx.createRadialGradient(x, y, 0, x, y, s.size * 2);
    const color = s.violet ? '166,140,240' : '244,242,239';
    grd.addColorStop(0, `rgba(${color},${s.alpha})`);
    grd.addColorStop(1, `rgba(${color},0)`);
    hCtx.beginPath();
    hCtx.arc(x, y, s.size * 2, 0, Math.PI * 2);
    hCtx.fillStyle = grd;
    hCtx.fill();
  }

  requestAnimationFrame(drawHero);
}
requestAnimationFrame(drawHero);

// ═══════════════════════════════════════════
//  PHILOSOPHY CANVAS — halo rings + engineering glyphs
// ═══════════════════════════════════════════
const philoCanvas = document.getElementById('philosophy-canvas');
const pCtx = philoCanvas.getContext('2d');

function resizePhilo() {
  philoCanvas.width = philoCanvas.offsetWidth || 700;
  philoCanvas.height = philoCanvas.offsetHeight || 420;
}
resizePhilo();
window.addEventListener('resize', resizePhilo);

let philoAngle = 0;
const glyphs = ['{ }', '</>', '01', 'AI', 'API'];

function drawPhilo(t) {
  if (!philoCanvas.width) { requestAnimationFrame(drawPhilo); return; }
  pCtx.clearRect(0, 0, philoCanvas.width, philoCanvas.height);

  const cx = philoCanvas.width / 2;
  const cy = philoCanvas.height / 2;
  const time = reducedMotion ? 0 : t;
  philoAngle = time / 2200;

  for (let ring = 0; ring < 4; ring++) {
    const r = 140 + ring * 36;
    const alpha = (0.1 - ring * 0.018) * (0.5 + 0.5 * Math.sin(time / 1100 + ring));
    pCtx.setLineDash([10, 7]);
    pCtx.lineDashOffset = -time / 120 * (ring % 2 ? 1 : -1);
    pCtx.beginPath();
    pCtx.ellipse(cx, cy, r, r * 0.5, 0, 0, Math.PI * 2);
    pCtx.strokeStyle = `rgba(166,140,240,${Math.max(0, alpha)})`;
    pCtx.lineWidth = ring === 0 ? 2 : 1;
    pCtx.stroke();
  }
  pCtx.setLineDash([]);
  pCtx.lineDashOffset = 0;

  for (let i = 0; i < glyphs.length; i++) {
    const angle = (i / glyphs.length) * Math.PI * 2 + philoAngle * 0.3;
    const r = 200;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r * 0.5;
    const alpha = 0.2 + 0.12 * Math.sin(time / 900 + i);
    pCtx.font = `12px 'Space Mono', monospace`;
    pCtx.fillStyle = `rgba(201,203,209,${alpha})`;
    pCtx.textAlign = 'center';
    pCtx.textBaseline = 'middle';
    pCtx.fillText(glyphs[i], x, y);
  }

  requestAnimationFrame(drawPhilo);
}
requestAnimationFrame(drawPhilo);

// ═══════════════════════════════════════════
//  3D TILT on philosophy card
// ═══════════════════════════════════════════
const tiltCard = document.getElementById('tilt-card');
const tiltInner = document.getElementById('tilt-inner');

if (tiltCard && !reducedMotion) {
  tiltCard.addEventListener('mousemove', e => {
    const rect = tiltCard.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    tiltInner.style.transform = `rotateY(${x * 10}deg) rotateX(${-y * 10}deg)`;
  });
  tiltCard.addEventListener('mouseleave', () => {
    tiltInner.style.transform = 'rotateY(0deg) rotateX(0deg)';
  });
}

// ═══════════════════════════════════════════
//  SCROLL REVEAL
// ═══════════════════════════════════════════
const reveals = document.querySelectorAll('.reveal');
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('visible'); }
  });
}, { threshold: 0.15 });
reveals.forEach(el => observer.observe(el));

// ═══════════════════════════════════════════
//  PARALLAX on hero content
// ═══════════════════════════════════════════
const heroContent = document.querySelector('.hero-content');
if (!reducedMotion) {
  window.addEventListener('scroll', () => {
    const scrolled = window.scrollY;
    if (heroContent) {
      heroContent.style.transform = `translateY(${scrolled * 0.25}px)`;
      heroContent.style.opacity = Math.max(0, 1 - scrolled / 650);
    }
  });
}

// ═══════════════════════════════════════════
//  Mouse parallax on hero portrait frame (desktop only)
// ═══════════════════════════════════════════
const portraitFrame = document.querySelector('.portrait-frame');
const portraitGlow = document.querySelector('.portrait-glow');
const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;

if (!isTouchDevice && !reducedMotion) {
  document.addEventListener('mousemove', e => {
    const dx = (e.clientX - window.innerWidth / 2) / window.innerWidth;
    const dy = (e.clientY - window.innerHeight / 2) / window.innerHeight;
    if (portraitFrame) {
      portraitFrame.style.transform = `translate(${dx * 10}px, ${dy * 6}px)`;
    }
    if (portraitGlow) {
      portraitGlow.style.transform = `translate(${dx * 16}px, ${dy * 10}px) scale(1)`;
    }
  });
}
