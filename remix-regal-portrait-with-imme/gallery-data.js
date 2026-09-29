// ═══════════════════════════════════════════
//  SELECTED WORK — real project data + abstract card visuals
// ═══════════════════════════════════════════
const PROJECTS = [
  {
    theme: 'Android Experience',
    title: 'KNOuX X',
    desc: 'Advanced Android media experience built around playback, media controls, interaction and a polished viewing workflow.',
    tech: 'Android • Media • UI/UX',
    initials: 'KX'
  },
  {
    theme: 'Windows Systems',
    title: 'KNOuX Repair',
    desc: 'Windows diagnostics, repair and recovery system focused on making complex maintenance tools accessible through a clear user experience.',
    tech: 'Windows • Diagnostics • Recovery',
    initials: 'KR'
  },
  {
    theme: 'Developer Platform',
    title: 'KForge',
    desc: 'Developer workspace and engineering command center for building and managing modern software workflows.',
    tech: 'Development • Workspace • Automation',
    initials: 'KF'
  },
  {
    theme: 'Unified Desktop',
    title: 'KNOuX ONE',
    desc: 'Unified desktop platform bringing multiple productivity, development and system capabilities into one environment.',
    tech: 'Desktop • Productivity • Platform',
    initials: 'K1'
  },
  {
    theme: 'Brand Ecosystem',
    title: 'KNOuX Store',
    desc: 'Central KNOuX web presence connecting products, engineering work and the wider digital product ecosystem.',
    tech: 'knoux.store',
    initials: 'KS',
    link: { label: 'knoux.store', url: 'https://knoux.store' }
  },
  {
    theme: 'Organization',
    title: 'SmartOrganizer',
    desc: 'Local-first Windows organization utility focused on practical file and workspace management.',
    tech: 'Windows • Local-First • Productivity',
    initials: 'SO'
  },
  {
    theme: 'AI Productivity',
    title: 'AI Clipboard Pro',
    desc: 'AI-powered productivity workspace for improving clipboard and content workflows.',
    tech: 'AI • Productivity • Automation',
    initials: 'CP'
  },
  {
    theme: 'Creator Tools',
    title: 'KNOuX REC',
    desc: 'Desktop screen recording system designed for streamlined capture workflows.',
    tech: 'Desktop • Capture • Workflow',
    initials: 'KR'
  },
  {
    theme: 'AI Imaging',
    title: 'Versa AI',
    desc: 'AI image processing platform focused on practical visual workflows.',
    tech: 'AI • Image Processing • Workflow',
    initials: 'VA'
  },
  {
    theme: 'Logistics Platform',
    title: 'Day Night Delivery Services',
    desc: 'UAE delivery and logistics platform covering public web, live tracking, merchant workflows, driver operations and administration.',
    tech: 'daynightae.com',
    initials: 'DN',
    link: { label: 'daynightae.com', url: 'https://daynightae.com' }
  },
  {
    theme: 'Sports Platform',
    title: 'United Olympics Sports',
    desc: 'Multi-sport digital platform covering the public website, player portal, parent portal, coach workflows, administration and e-commerce.',
    tech: 'unitedolympicsports.store',
    initials: 'UO',
    link: { label: 'GitHub Repo', url: 'https://github.com/daynightae-cmyk/United-Olympics-Sports' }
  }
];

function buildGallery() {
  const grid = document.getElementById('gallery-grid');
  if (!grid) return;

  PROJECTS.forEach((p, i) => {
    const card = document.createElement('div');
    card.className = 'gallery-card reveal reveal-delay-' + ((i % 3) + 1);

    const linkHtml = p.link
      ? `<a class="card-link" href="${p.link.url}" target="_blank" rel="noopener">${p.link.label} →</a>`
      : '';

    card.innerHTML = `
      <div class="card-corner tl"></div>
      <div class="card-corner tr"></div>
      <div class="card-visual">
        <canvas class="card-canvas" data-seed="${i}"></canvas>
        <span class="card-initials">${p.initials}</span>
      </div>
      <div class="gallery-card-overlay">
        <span class="card-theme">${p.theme}</span>
        <span class="card-title">${p.title}</span>
        <p class="card-desc">${p.desc}</p>
        <span class="card-tech">${p.tech}</span>
        ${linkHtml}
      </div>
    `;
    grid.appendChild(card);
  });

  document.querySelectorAll('.card-canvas').forEach(canvas => {
    initCardCanvas(canvas);
  });
}

function initCardCanvas(canvas) {
  const ctx = canvas.getContext('2d');
  const seed = parseInt(canvas.dataset.seed, 10) || 0;

  function resize() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const nodes = [];
  const rand = mulberry32(seed + 1);
  for (let i = 0; i < 14; i++) {
    nodes.push({
      x: rand() * 1,
      y: rand() * 1,
      r: rand() * 1.5 + 0.6,
      phase: rand() * Math.PI * 2,
      speed: rand() * 0.4 + 0.15
    });
  }

  function draw(t) {
    if (!canvas.width || !canvas.height) { requestAnimationFrame(draw); return; }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const time = t / 1000;

    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const x = n.x * canvas.width;
      const y = n.y * canvas.height + Math.sin(time * n.speed + n.phase) * 6;
      const alpha = 0.25 + 0.2 * Math.sin(time * n.speed + n.phase);
      ctx.beginPath();
      ctx.arc(x, y, n.r * 1.8, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(166,140,240,${alpha})`;
      ctx.fill();

      for (let j = i + 1; j < nodes.length; j++) {
        const m = nodes[j];
        const mx = m.x * canvas.width;
        const my = m.y * canvas.height + Math.sin(time * m.speed + m.phase) * 6;
        const dist = Math.hypot(x - mx, y - my);
        if (dist < canvas.width * 0.25) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(mx, my);
          ctx.strokeStyle = `rgba(201,203,209,${0.08 * (1 - dist / (canvas.width * 0.25))})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
}

function mulberry32(a) {
  return function() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

buildGallery();
