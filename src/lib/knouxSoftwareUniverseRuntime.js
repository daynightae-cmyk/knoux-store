import * as THREE from 'three';

const PRODUCTS = [
  { id: 'knoux-one', name: 'KNOUX ONE', slogan: 'One Core. Total Command.', role: 'Unified command layer for the KNOuX software stack.', image: '/knoux-universe/knoux-one.webp' },
  { id: 'knoux-forge', name: 'KNOuX Forge', slogan: 'Build. Shape. Ship.', role: 'Engineering workspace for building and shipping software.', image: '/knoux-universe/knoux-forge.webp' },
  { id: 'knoux-repair', name: 'KNOuX Repair', slogan: 'Fix Smart. Work Better.', role: 'Repair and maintenance surface for healthier Windows workflows.', image: '/knoux-universe/knoux-repair.webp' },
  { id: 'knoux-smartorganizer', name: 'KNOuX SmartOrganizer', slogan: 'Organize Everything Beautifully.', role: 'Visual organization layer for files, tasks, and working context.', image: '/knoux-universe/knoux-smartorganizer.webp' },
  { id: 'knoux-rec', name: 'KNOuX REC', slogan: 'Capture. Cut. Create.', role: 'Capture and recording workspace for fast content creation.', image: '/knoux-universe/knoux-rec.webp' },
  { id: 'knoux-player-x', name: 'KNOuX Player X', slogan: 'Play Smooth. Control More.', role: 'Focused media playback with a control-first experience.', image: '/knoux-universe/knoux-player-x.webp' },
  { id: 'knoux-clipboard-ai', name: 'KNOuX Clipboard AI', slogan: 'Capture Context. Recall Instantly.', role: 'Clipboard intelligence for retaining and reusing working context.', image: '/knoux-universe/knoux-clipboard-ai.webp' },
  { id: 'knoux-signal', name: 'KNOuX Signal', slogan: 'Connect. Notify. Respond.', role: 'Phone identity, reputation and consent-based community intelligence.', image: '/knoux-universe/knoux-signal.webp' },
  { id: 'knoux-quill', name: 'KNOuX Quill', slogan: 'Write Sharp. Publish Clear.', role: 'Research writing experiment with six specialised writing modes.', image: '/knoux-universe/knoux-quill.webp' },
  { id: 'knoux-crypt', name: 'KNOuX Crypt', slogan: 'Secure Everything. Unlock Trust.', role: 'Research encryption concept; design evidence exists, not a verified build.', image: '/knoux-universe/knoux-crypt.webp' },
];

const CLEANUPS = new WeakMap();

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));

function splitHero(root) {
  const el = root.querySelector('[data-ksu-split]');
  if (!el || el.dataset.splitDone) return;
  el.dataset.splitDone = 'true';
  const nodes = [...el.childNodes];
  el.textContent = '';
  nodes.forEach((node) => {
    if (node.nodeName === 'BR') {
      el.appendChild(document.createElement('br'));
      return;
    }
    [...(node.textContent || '')].forEach((char) => {
      if (char === ' ') {
        el.appendChild(document.createTextNode(' '));
        return;
      }
      const wrap = document.createElement('span');
      wrap.className = 'ksu-cw';
      const inner = document.createElement('span');
      inner.className = 'ksu-char';
      inner.textContent = char;
      wrap.appendChild(inner);
      el.appendChild(wrap);
    });
  });
  requestAnimationFrame(() => {
    root.querySelectorAll('.ksu-char').forEach((char, i) => {
      char.style.transitionDelay = `${Math.min(i * 18, 420)}ms`;
      char.style.transform = 'translateY(0)';
    });
  });
}

function buildRail(root) {
  const rail = root.querySelector('.ksu-rail');
  rail.innerHTML = '';
  PRODUCTS.forEach((product, index) => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.ksuProduct = String(index);
    btn.setAttribute('aria-pressed', index === 0 ? 'true' : 'false');
    btn.setAttribute('aria-label', `Show ${product.name}`);

    const img = document.createElement('img');
    img.src = product.image;
    img.alt = product.name;
    img.loading = 'eager';
    img.decoding = 'async';
    btn.append(img, document.createTextNode(product.name.replace('KNOuX ', '')));
    li.appendChild(btn);
    rail.appendChild(li);
  });
}

function setInfo(root, index) {
  const product = PRODUCTS[index];
  const info = root.querySelector('.ksu-info');
  info.querySelector('.ksu-info-badge').textContent = `${String(index + 1).padStart(2, '0')} / ${String(PRODUCTS.length).padStart(2, '0')}`;
  info.querySelector('.ksu-info-name').textContent = product.name;
  info.querySelector('.ksu-info-slogan').textContent = product.slogan;
  info.querySelector('.ksu-info-role').textContent = product.role;
  root.querySelectorAll('[data-ksu-product]').forEach((button) => {
    if (button.closest('.ksu-rail')) button.setAttribute('aria-pressed', Number(button.dataset.ksuProduct) === index ? 'true' : 'false');
  });
}

function wireStaticControls(root) {
  if (root.dataset.ksuStaticWired === 'true') return;
  root.dataset.ksuStaticWired = 'true';
  let selectedIndex = 0;
  const select = (index) => {
    selectedIndex = clamp(index, 0, PRODUCTS.length - 1);
    setInfo(root, selectedIndex);
  };
  root.querySelectorAll('[data-ksu-product]').forEach((button) => {
    button.addEventListener('click', () => select(Number(button.dataset.ksuProduct)));
  });
  root.querySelector('.ksu-info-link')?.addEventListener('click', () => {
    root.dispatchEvent(new CustomEvent('knoux:product-select', {
      bubbles: true,
      detail: { ...PRODUCTS[selectedIndex], index: selectedIndex },
    }));
  });
  root.querySelector('.ksu-stage')?.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      select(selectedIndex + 1);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      select(selectedIndex - 1);
    }
  });
}

function staticFallback(root, reason = 'Reduced motion or WebGL unavailable') {
  root.classList.add('ksu--static');
  root.dataset.ksuFallback = reason;
  root.querySelector('.ksu-info')?.classList.add('is-on');
  root.querySelector('.ksu-loader')?.classList.add('is-done');
  setInfo(root, 0);
  wireStaticControls(root);
}

async function initUniverse(root) {
  if (!root || root.dataset.ksuInitialized === 'true') return;
  root.dataset.ksuInitialized = 'true';
  buildRail(root);
  splitHero(root);
  setInfo(root, 0);

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) {
    staticFallback(root, 'prefers-reduced-motion');
    return;
  }

  const canvas = root.querySelector('.ksu-canvas');
  const loader = root.querySelector('.ksu-loader');
  const loaderFill = root.querySelector('.ksu-loader-fill');
  const loaderPct = root.querySelector('.ksu-loader-pct');
  const info = root.querySelector('.ksu-info');
  const progressEl = root.querySelector('.ksu-progress');
  const dots = [...root.querySelectorAll('.ksu-dot')];

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  } catch (error) {
    console.warn('[KNOuX Universe] WebGL init failed:', error);
    staticFallback(root, 'webgl-init-failed');
    return;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x070708, 0);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x070708, 0.045);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80);
  camera.position.set(0, 0.1, 9.2);

  const world = new THREE.Group();
  scene.add(world);

  const haloMaterial = new THREE.MeshBasicMaterial({ color: 0xc9bdf2, transparent: true, opacity: 0.18, depthWrite: false });
  const halo = new THREE.Mesh(new THREE.TorusGeometry(3.28, 0.014, 8, 256), haloMaterial);
  halo.rotation.x = Math.PI * 0.5;
  world.add(halo);

  const halo2 = new THREE.Mesh(
    new THREE.TorusGeometry(3.62, 0.006, 8, 256),
    new THREE.MeshBasicMaterial({ color: 0x8b5cf6, transparent: true, opacity: 0.22, depthWrite: false })
  );
  halo2.rotation.x = Math.PI * 0.5;
  world.add(halo2);

  const particleCount = window.innerWidth < 700 ? 750 : 1500;
  const positions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    const radius = 3.7 + Math.random() * 8.5;
    const theta = Math.random() * Math.PI * 2;
    const u = Math.random() * 2 - 1;
    const s = Math.sqrt(1 - u * u);
    positions[i * 3] = Math.cos(theta) * s * radius;
    positions[i * 3 + 1] = u * radius * 0.55;
    positions[i * 3 + 2] = Math.sin(theta) * s * radius;
  }
  const pGeometry = new THREE.BufferGeometry();
  pGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const particles = new THREE.Points(
    pGeometry,
    new THREE.PointsMaterial({ color: 0xc9bdf2, size: 0.018, transparent: true, opacity: 0.5, depthWrite: false, sizeAttenuation: true })
  );
  world.add(particles);

  const productGroup = new THREE.Group();
  world.add(productGroup);
  const planeGeometry = new THREE.PlaneGeometry(3.35, 3.35, 1, 1);
  const textureLoader = new THREE.TextureLoader();
  const meshes = [];
  const step = (Math.PI * 2) / PRODUCTS.length;
  let completed = 0;

  const loaded = await Promise.allSettled(PRODUCTS.map(async (product, index) => {
    const texture = await textureLoader.loadAsync(product.image);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0.2, depthWrite: false, toneMapped: false });
    const mesh = new THREE.Mesh(planeGeometry, material);
    const angle = index * step;
    mesh.position.set(Math.sin(angle) * 4.15, Math.sin(angle * 2) * 0.28, Math.cos(angle) * 2.45);
    mesh.rotation.y = angle;
    mesh.userData.index = index;
    productGroup.add(mesh);
    meshes[index] = mesh;

    completed += 1;
    const pct = Math.round((completed / PRODUCTS.length) * 100);
    loaderFill.style.width = `${pct}%`;
    loaderPct.textContent = `${pct}%`;
    return mesh;
  }));

  const failures = loaded.filter((result) => result.status === 'rejected');
  if (failures.length) {
    console.warn('[KNOuX Universe] Texture loading failed, switching to static mode.', failures);
    renderer.dispose();
    staticFallback(root, 'texture-load-failed');
    return;
  }

  loader.classList.add('is-done');
  setTimeout(() => loader.remove(), 700);

  let rootTop = 0;
  let rootHeight = 1;
  let targetProduct = 0;
  let smoothProduct = 0;
  let selectedIndex = 0;
  let progress = 0;
  let isVisible = true;
  let lastTime = performance.now();
  let disposed = false;

  const measure = () => {
    const rect = root.getBoundingClientRect();
    rootTop = window.scrollY + rect.top;
    rootHeight = Math.max(root.offsetHeight, window.innerHeight + 1);
    const width = root.clientWidth || window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };

  const indexToPageY = (index) => {
    const ratio = index / (PRODUCTS.length - 1);
    const p = lerp(0.13, 0.84, ratio);
    return rootTop + p * Math.max(1, rootHeight - window.innerHeight);
  };

  const selectByIndex = (index, smooth = true) => {
    const safe = clamp(index, 0, PRODUCTS.length - 1);
    window.scrollTo({ top: indexToPageY(safe), behavior: smooth ? 'smooth' : 'auto' });
  };

  root.querySelectorAll('[data-ksu-product]').forEach((button) => {
    button.addEventListener('click', () => selectByIndex(Number(button.dataset.ksuProduct)));
  });
  root.querySelector('[data-ksu-jump]')?.addEventListener('click', () => selectByIndex(Number(root.querySelector('[data-ksu-jump]').dataset.ksuJump)));

  root.querySelector('.ksu-info-link')?.addEventListener('click', () => {
    root.dispatchEvent(new CustomEvent('knoux:product-select', { bubbles: true, detail: { ...PRODUCTS[selectedIndex], index: selectedIndex } }));
  });

  root.querySelector('.ksu-stage')?.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      selectByIndex(selectedIndex + 1);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      selectByIndex(selectedIndex - 1);
    }
  });

  const observer = new IntersectionObserver(([entry]) => { isVisible = entry.isIntersecting; }, { rootMargin: '100px' });
  observer.observe(root);

  const updateFromScroll = () => {
    const travel = Math.max(1, rootHeight - window.innerHeight);
    progress = clamp((window.scrollY - rootTop) / travel, 0, 1);
    progressEl.style.width = `${progress * 100}%`;

    const local = clamp((progress - 0.13) / (0.84 - 0.13), 0, 1);
    targetProduct = local * (PRODUCTS.length - 1);
    const nextIndex = clamp(Math.round(targetProduct), 0, PRODUCTS.length - 1);
    if (nextIndex !== selectedIndex) {
      selectedIndex = nextIndex;
      setInfo(root, selectedIndex);
    }

    info.classList.toggle('is-on', progress > 0.1 && progress < 0.94);
    const sectionStops = [0.03, 0.25, 0.5, 0.73, 0.91];
    let active = 0;
    sectionStops.forEach((stop, i) => { if (progress >= stop) active = i; });
    dots.forEach((dot, i) => dot.classList.toggle('is-active', i === active));
  };

  const onScroll = () => updateFromScroll();
  const onResize = () => { measure(); updateFromScroll(); };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize, { passive: true });
  measure();
  updateFromScroll();

  const animate = (now) => {
    if (disposed) return;
    const dt = Math.min(0.05, (now - lastTime) / 1000 || 0.016);
    lastTime = now;
    if (!isVisible) { requestAnimationFrame(animate); return; }

    smoothProduct = damp(smoothProduct, targetProduct, 7.5, dt);
    productGroup.rotation.y = -smoothProduct * step;
    productGroup.rotation.x = Math.sin(progress * Math.PI) * 0.04;
    world.rotation.z = Math.sin(now * 0.00012) * 0.018;
    particles.rotation.y += dt * 0.012;
    particles.rotation.z -= dt * 0.005;
    halo.rotation.z += dt * 0.035;
    halo2.rotation.z -= dt * 0.022;

    meshes.forEach((mesh, index) => {
      const relative = (index - smoothProduct) * step;
      const facing = (Math.cos(relative) + 1) * 0.5;
      const focus = Math.pow(facing, 5);
      const scale = 0.68 + focus * 0.42;
      mesh.scale.setScalar(scale);
      mesh.material.opacity = 0.07 + Math.pow(facing, 2.4) * 0.93;
      mesh.position.y = Math.sin(index * 1.9 + now * 0.00045) * 0.11 + Math.sin(relative * 2) * 0.18;
    });

    camera.position.x = Math.sin(progress * Math.PI * 2) * 0.18;
    camera.position.y = 0.1 + Math.sin(progress * Math.PI) * 0.12;
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
    if (!disposed) requestAnimationFrame(animate);
  };

  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onResize);
    observer.disconnect();
    meshes.forEach((mesh) => {
      mesh?.material?.map?.dispose?.();
      mesh?.material?.dispose?.();
    });
    planeGeometry.dispose();
    pGeometry.dispose();
    particles.material.dispose();
    halo.geometry.dispose();
    halo.material.dispose();
    halo2.geometry.dispose();
    halo2.material.dispose();
    renderer.dispose();
    CLEANUPS.delete(root);
    delete root.dataset.ksuInitialized;
  };
  CLEANUPS.set(root, cleanup);
  requestAnimationFrame(animate);
}

function destroyUniverse(root) {
  CLEANUPS.get(root)?.();
}

function bootAll() {
  document.querySelectorAll('[data-ksu]').forEach((root) => {
    initUniverse(root).catch((error) => {
      console.error('[KNOuX Universe] Fatal init error:', error);
      staticFallback(root, 'runtime-error');
    });
  });
}

export { initUniverse, destroyUniverse, PRODUCTS };
globalThis.KNOuXUniverse = { init: initUniverse, destroy: destroyUniverse, products: PRODUCTS };

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootAll, { once: true });
else bootAll();
