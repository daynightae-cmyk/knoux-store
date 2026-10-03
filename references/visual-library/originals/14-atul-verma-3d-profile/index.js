// Three.js 3D Profile Website for Atul Verma
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";

// ── SETUP ──
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
scene.fog = new THREE.FogExp2(0x000000, 0.015);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(0, 2, 18);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enablePan = false;
controls.minDistance = 8;
controls.maxDistance = 35;
controls.maxPolarAngle = Math.PI * 0.85;

// ── LIGHTS ──
const ambientLight = new THREE.AmbientLight(0x222233, 0.5);
scene.add(ambientLight);

const mainLight = new THREE.DirectionalLight(0xffffff, 1.5);
mainLight.position.set(10, 20, 10);
mainLight.castShadow = true;
mainLight.shadow.mapSize.set(2048, 2048);
scene.add(mainLight);

const fillLight = new THREE.DirectionalLight(0x4488ff, 0.4);
fillLight.position.set(-10, 5, -10);
scene.add(fillLight);

const pointLight1 = new THREE.PointLight(0xffcc00, 2, 30);
pointLight1.position.set(5, 8, 5);
scene.add(pointLight1);

const pointLight2 = new THREE.PointLight(0x00aaff, 1.5, 30);
pointLight2.position.set(-5, 3, -5);
scene.add(pointLight2);

const spotLight = new THREE.SpotLight(0xffffff, 3, 50, Math.PI / 6, 0.5);
spotLight.position.set(0, 20, 0);
spotLight.castShadow = true;
scene.add(spotLight);

// ── MATERIALS ──
const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.8, roughness: 0.2 });
const goldMaterial = new THREE.MeshStandardMaterial({ color: 0xffcc00, metalness: 0.9, roughness: 0.1, emissive: 0xffaa00, emissiveIntensity: 0.3 });
const whiteMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.3, roughness: 0.4 });
const glassMaterial = new THREE.MeshPhysicalMaterial({ color: 0x88ccff, metalness: 0.1, roughness: 0.05, transmission: 0.8, thickness: 0.5, transparent: true, opacity: 0.3 });
const glowMaterial = new THREE.MeshStandardMaterial({ color: 0x00aaff, emissive: 0x0066ff, emissiveIntensity: 1, transparent: true, opacity: 0.8 });

// ── GROUND GRID ──
const gridSize = 100;
const gridGeometry = new THREE.BufferGeometry();
const gridPositions = [];
for (let i = -gridSize / 2; i <= gridSize / 2; i += 2) {
  gridPositions.push(-gridSize / 2, -3, i, gridSize / 2, -3, i);
  gridPositions.push(i, -3, -gridSize / 2, i, -3, gridSize / 2);
}
gridGeometry.setAttribute('position', new THREE.Float32BufferAttribute(gridPositions, 3));
const gridMaterial = new THREE.LineBasicMaterial({ color: 0x1a1a2e, transparent: true, opacity: 0.4 });
scene.add(new THREE.LineSegments(gridGeometry, gridMaterial));

// ── FLOATING PARTICLES ──
const particleCount = 2000;
const particleGeometry = new THREE.BufferGeometry();
const particlePositions = new Float32Array(particleCount * 3);
const particleSizes = new Float32Array(particleCount);
for (let i = 0; i < particleCount; i++) {
  particlePositions[i * 3] = (Math.random() - 0.5) * 80;
  particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 40;
  particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 80;
  particleSizes[i] = Math.random() * 0.05 + 0.01;
}
particleGeometry.setAttribute('position', new THREE.Float32BufferAttribute(particlePositions, 3));
particleGeometry.setAttribute('size', new THREE.Float32BufferAttribute(particleSizes, 1));
const particleMaterial = new THREE.PointsMaterial({ color: 0x4488ff, size: 0.08, transparent: true, opacity: 0.6, sizeAttenuation: true });
const particles = new THREE.Points(particleGeometry, particleMaterial);
scene.add(particles);

// ── BARCODE STRIPS (Right side decoration) ──
const barcodeGroup = new THREE.Group();
for (let i = 0; i < 30; i++) {
  const width = Math.random() * 0.15 + 0.05;
  const height = Math.random() * 8 + 4;
  const bar = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, 0.1),
    new THREE.MeshStandardMaterial({
      color: Math.random() > 0.3 ? 0x222222 : 0x444444,
      metalness: 0.7,
      roughness: 0.3,
      emissive: Math.random() > 0.8 ? 0x111122 : 0x000000,
      emissiveIntensity: 0.5
    })
  );
  bar.position.set(i * 0.35 - 5, 0, 0);
  barcodeGroup.add(bar);
}
barcodeGroup.position.set(14, 2, -5);
barcodeGroup.rotation.y = -0.3;
scene.add(barcodeGroup);

// ── CENTRAL PLATFORM ──
const platformGeometry = new THREE.CylinderGeometry(3, 3.5, 0.3, 64);
const platformMaterial = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9, roughness: 0.1 });
const platform = new THREE.Mesh(platformGeometry, platformMaterial);
platform.position.y = -2.5;
platform.castShadow = true;
platform.receiveShadow = true;
scene.add(platform);

// Platform ring
const ringGeometry = new THREE.TorusGeometry(3.2, 0.05, 16, 100);
const ring = new THREE.Mesh(ringGeometry, goldMaterial);
ring.rotation.x = Math.PI / 2;
ring.position.y = -2.35;
scene.add(ring);

// Outer ring
const outerRing = new THREE.Mesh(new THREE.TorusGeometry(4, 0.03, 16, 100), glowMaterial);
outerRing.rotation.x = Math.PI / 2;
outerRing.position.y = -2.4;
scene.add(outerRing);

// ── AVATAR (Stylized 3D Figure) ──
const avatarGroup = new THREE.Group();

// Body
const bodyGeometry = new THREE.CapsuleGeometry(0.5, 1.2, 16, 32);
const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, metalness: 0.6, roughness: 0.3 });
const body = new THREE.Mesh(bodyGeometry, bodyMat);
body.position.y = 0;
avatarGroup.add(body);

// Head
const headGeometry = new THREE.SphereGeometry(0.5, 32, 32);
const headMat = new THREE.MeshStandardMaterial({ color: 0xf4c078, metalness: 0.1, roughness: 0.6 });
const head = new THREE.Mesh(headGeometry, headMat);
head.position.y = 1.3;
avatarGroup.add(head);

// Eyes
const eyeGeo = new THREE.SphereGeometry(0.06, 16, 16);
const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x4488ff, emissiveIntensity: 0.5 });
const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
leftEye.position.set(-0.15, 1.35, 0.45);
avatarGroup.add(leftEye);
const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
rightEye.position.set(0.15, 1.35, 0.45);
avatarGroup.add(rightEye);

// Pupils
const pupilGeo = new THREE.SphereGeometry(0.03, 16, 16);
const pupilMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
const lp = new THREE.Mesh(pupilGeo, pupilMat);
lp.position.set(-0.15, 1.35, 0.5);
avatarGroup.add(lp);
const rp = new THREE.Mesh(pupilGeo, pupilMat);
rp.position.set(0.15, 1.35, 0.5);
avatarGroup.add(rp);

// Hair
const hairGeo = new THREE.SphereGeometry(0.52, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.55);
const hairMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.3, roughness: 0.7 });
const hair = new THREE.Mesh(hairGeo, hairMat);
hair.position.y = 1.35;
avatarGroup.add(hair);

// Graduation cap
const capBase = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 0.9), new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.5 }));
capBase.position.y = 1.82;
capBase.rotation.y = Math.PI / 4;
avatarGroup.add(capBase);

const capTop = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.15, 8), goldMaterial.clone());
capTop.position.y = 1.92;
avatarGroup.add(capTop);

const tassel = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), goldMaterial);
tassel.position.set(0.3, 1.85, 0.3);
avatarGroup.add(tassel);

avatarGroup.position.y = -1.2;
scene.add(avatarGroup);

// ── ACHIEVEMENT CARDS ──
const achievements = [
  { title: "10th BOARDS", score: "90%", subtitle: "Outstanding Performance", color: 0xffcc00, icon: "🏆" },
  { title: "12th BOARDS", score: "93%", subtitle: "Academic Excellence", color: 0xff6600, icon: "🎓" },
  { title: "JEE MAINS", score: "94%ile", subtitle: "Qualified • Kota, Rajasthan", color: 0x00ccff, icon: "⚡" },
  { title: "GATE EXAM", score: "QUALIFIED", subtitle: "National Level Achievement", color: 0x00ff88, icon: "🚀" },
  { title: "SEMESTER SGPA", score: "10.0", subtitle: "Perfect Score", color: 0xff00ff, icon: "💎" },
  { title: "B.TECH", score: "PURSUING", subtitle: "Uttaranchal University, Dehradun", color: 0x8844ff, icon: "🎯" }
];

const cardGroups = [];

function createCard(data, index) {
  const group = new THREE.Group();
  
  // Card base
  const cardGeo = new THREE.BoxGeometry(3.2, 2, 0.08);
  const cardMat = new THREE.MeshPhysicalMaterial({
    color: 0x0a0a12,
    metalness: 0.8,
    roughness: 0.15,
    clearcoat: 1,
    clearcoatRoughness: 0.1,
  });
  const card = new THREE.Mesh(cardGeo, cardMat);
  card.castShadow = true;
  group.add(card);

  // Card border glow
  const borderGeo = new THREE.BoxGeometry(3.3, 2.1, 0.06);
  const borderMat = new THREE.MeshStandardMaterial({
    color: data.color,
    emissive: data.color,
    emissiveIntensity: 0.5,
    transparent: true,
    opacity: 0.3,
  });
  const border = new THREE.Mesh(borderGeo, borderMat);
  border.position.z = -0.02;
  group.add(border);

  // Accent line at top
  const lineGeo = new THREE.BoxGeometry(3.0, 0.04, 0.09);
  const lineMat = new THREE.MeshStandardMaterial({ color: data.color, emissive: data.color, emissiveIntensity: 1 });
  const line = new THREE.Mesh(lineGeo, lineMat);
  line.position.y = 0.9;
  line.position.z = 0.01;
  group.add(line);

  // Small decoration dots
  for (let d = 0; d < 3; d++) {
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 8, 8),
      new THREE.MeshStandardMaterial({ color: data.color, emissive: data.color, emissiveIntensity: 2 })
    );
    dot.position.set(-1.2 + d * 0.15, 0.75, 0.05);
    group.add(dot);
  }

  // Score orb
  const orbGeo = new THREE.SphereGeometry(0.25, 32, 32);
  const orbMat = new THREE.MeshPhysicalMaterial({
    color: data.color,
    emissive: data.color,
    emissiveIntensity: 0.8,
    metalness: 0.9,
    roughness: 0.1,
    clearcoat: 1,
  });
  const orb = new THREE.Mesh(orbGeo, orbMat);
  orb.position.set(1.2, 0.4, 0.2);
  group.add(orb);

  group.userData = { ...data, index };
  return group;
}

const cardRadius = 7;
achievements.forEach((data, i) => {
  const card = createCard(data, i);
  const angle = (i / achievements.length) * Math.PI * 2 - Math.PI / 2;
  card.position.set(
    Math.cos(angle) * cardRadius,
    0.5 + Math.sin(i * 0.5) * 0.3,
    Math.sin(angle) * cardRadius
  );
  card.lookAt(0, 0.5, 0);
  cardGroups.push(card);
  scene.add(card);
});

// ── CONNECTING CURVES ──
achievements.forEach((_, i) => {
  const angle = (i / achievements.length) * Math.PI * 2 - Math.PI / 2;
  const endX = Math.cos(angle) * cardRadius;
  const endZ = Math.sin(angle) * cardRadius;
  
  const curve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(endX * 0.5, 3 + Math.random() * 2, endZ * 0.5),
    new THREE.Vector3(endX * 0.85, 0.5, endZ * 0.85)
  );
  
  const tubeGeo = new THREE.TubeGeometry(curve, 30, 0.015, 8, false);
  const tubeMat = new THREE.MeshStandardMaterial({
    color: achievements[i].color,
    emissive: achievements[i].color,
    emissiveIntensity: 0.6,
    transparent: true,
    opacity: 0.5
  });
  scene.add(new THREE.Mesh(tubeGeo, tubeMat));
});

// ── ROTATING TEXT RING ──
const textRingGroup = new THREE.Group();
const ringText = "  ATUL VERMA • B.TECH STUDENT • UTTARANCHAL UNIVERSITY • DEHRADUN • GATE QUALIFIED • JEE MAINS 94%ile • 10 SGPA • ACADEMIC EXCELLENCE •";
const textRadius = 5;
const charCount = ringText.length;

for (let i = 0; i < charCount; i++) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 40px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(ringText[i], 32, 32);
  
  const texture = new THREE.CanvasTexture(canvas);
  const charMat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0.7, side: THREE.DoubleSide });
  const charGeo = new THREE.PlaneGeometry(0.3, 0.3);
  const charMesh = new THREE.Mesh(charGeo, charMat);
  
  const angle = (i / charCount) * Math.PI * 2;
  charMesh.position.set(Math.cos(angle) * textRadius, -2.2, Math.sin(angle) * textRadius);
  charMesh.rotation.y = -angle + Math.PI / 2;
  charMesh.rotation.x = -Math.PI / 6;
  textRingGroup.add(charMesh);
}
scene.add(textRingGroup);

// ── DIAGONAL BANNER TEXT ──
const bannerTexts = ["INTERNET BUILDER", "CREATIVE CODER", "TECH DABBLER"];
bannerTexts.forEach((text, bi) => {
  const bannerGroup = new THREE.Group();
  const spacing = 0.5;
  
  for (let i = 0; i < text.length; i++) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 80;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 56px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text[i], 32, 40);
    
    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0.15, side: THREE.DoubleSide });
    const geo = new THREE.PlaneGeometry(0.45, 0.55);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.x = i * spacing - (text.length * spacing) / 2;
    bannerGroup.add(mesh);
  }
  
  bannerGroup.position.set(5, -1 + bi * 2.5, -8);
  bannerGroup.rotation.z = -Math.PI / 6;
  bannerGroup.rotation.y = -0.3;
  scene.add(bannerGroup);
});

// ── HTML OVERLAY ──
const overlay = document.createElement('div');
overlay.innerHTML = `
<style>
  @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Inter:wght@300;400;600;700;900&display=swap');
  
  * { margin: 0; padding: 0; box-sizing: border-box; }
  
  #profile-overlay {
    position: fixed; top: 0; left: 0;
    width: 100%; height: 100%;
    pointer-events: none; z-index: 10;
    font-family: 'Inter', sans-serif;
  }
  
  .top-bar {
    position: absolute; top: 0; left: 0; right: 0;
    padding: 20px 30px;
    display: flex; justify-content: space-between; align-items: center;
    background: linear-gradient(180deg, rgba(0,0,0,0.8) 0%, transparent 100%);
  }
  
  .logo {
    font-family: 'Space Mono', monospace;
    font-size: 14px; color: #fff;
    letter-spacing: 3px;
    text-transform: uppercase;
    display: flex; align-items: center; gap: 10px;
  }
  
  .logo-icon {
    width: 24px; height: 24px;
    border: 2px solid #ffcc00;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 10px;
  }
  
  .nav-links {
    display: flex; flex-direction: column; gap: 4px;
    font-family: 'Space Mono', monospace;
    font-size: 10px; color: #666;
    letter-spacing: 2px; text-transform: uppercase;
    text-align: right;
  }
  
  .nav-links span:hover { color: #ffcc00; cursor: pointer; pointer-events: all; }
  
  .hero-section {
    position: absolute; left: 30px; top: 50%;
    transform: translateY(-50%);
    max-width: 320px;
  }
  
  .hero-label {
    font-family: 'Space Mono', monospace;
    font-size: 9px; color: #ffcc00;
    letter-spacing: 4px; text-transform: uppercase;
    margin-bottom: 8px;
  }
  
  .hero-name {
    font-size: 42px; font-weight: 900;
    color: #fff; line-height: 1;
    letter-spacing: -1px;
    margin-bottom: 6px;
  }
  
  .hero-title {
    font-size: 13px; color: #888;
    font-weight: 300; letter-spacing: 1px;
    margin-bottom: 16px; line-height: 1.5;
  }
  
  .hero-stats {
    display: flex; gap: 20px;
  }
  
  .stat { text-align: center; }
  
  .stat-value {
    font-family: 'Space Mono', monospace;
    font-size: 22px; font-weight: 700;
    color: #ffcc00;
  }
  
  .stat-label {
    font-size: 8px; color: #555;
    letter-spacing: 2px; text-transform: uppercase;
    margin-top: 2px;
  }
  
  .bottom-bar {
    position: absolute; bottom: 0; left: 0; right: 0;
    padding: 20px 30px;
    display: flex; justify-content: space-between; align-items: flex-end;
    background: linear-gradient(0deg, rgba(0,0,0,0.8) 0%, transparent 100%);
  }
  
  .scroll-hint {
    font-family: 'Space Mono', monospace;
    font-size: 9px; color: #444;
    letter-spacing: 2px; writing-mode: vertical-lr;
    text-orientation: mixed;
    animation: pulse 2s ease-in-out infinite;
  }
  
  @keyframes pulse { 0%,100% { opacity: 0.3; } 50% { opacity: 1; } }
  
  .card-info {
    position: absolute; right: 30px; top: 50%;
    transform: translateY(-50%);
    max-width: 280px;
    background: rgba(10,10,18,0.85);
    border: 1px solid rgba(255,204,0,0.15);
    border-radius: 8px;
    padding: 20px;
    backdrop-filter: blur(10px);
    pointer-events: all;
    opacity: 0;
    transition: all 0.4s ease;
  }
  
  .card-info.visible { opacity: 1; }
  
  .card-info-title {
    font-family: 'Space Mono', monospace;
    font-size: 10px; color: #ffcc00;
    letter-spacing: 3px; text-transform: uppercase;
    margin-bottom: 4px;
  }
  
  .card-info-score {
    font-size: 36px; font-weight: 900; color: #fff;
    margin-bottom: 4px;
  }
  
  .card-info-sub {
    font-size: 11px; color: #666; letter-spacing: 1px;
  }
  
  .achievement-timeline {
    position: absolute; left: 30px; bottom: 80px;
    display: flex; gap: 8px; align-items: flex-end;
  }
  
  .timeline-bar {
    width: 4px; border-radius: 2px;
    background: linear-gradient(180deg, #ffcc00 0%, #ff6600 100%);
    opacity: 0.4;
    transition: all 0.3s ease;
  }
  
  .vertical-line {
    position: absolute; left: 50%; top: 0; bottom: 0;
    width: 1px;
    background: linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.05) 30%, rgba(255,255,255,0.05) 70%, transparent 100%);
  }
  
  .side-text {
    position: absolute; left: 15px; top: 50%;
    transform: translateY(-50%) rotate(-90deg);
    font-family: 'Space Mono', monospace;
    font-size: 8px; color: #333;
    letter-spacing: 4px; text-transform: uppercase;
    white-space: nowrap;
  }
  
  @media (max-width: 768px) {
    .hero-name { font-size: 28px; }
    .hero-section { max-width: 220px; left: 15px; }
    .card-info { right: 15px; max-width: 200px; }
    .nav-links { display: none; }
  }
</style>

<div id="profile-overlay">
  <div class="vertical-line"></div>
  <div class="side-text">Atul Verma — Portfolio 2024</div>
  
  <div class="top-bar">
    <div class="logo">
      <div class="logo-icon">∞</div>
      AV
    </div>
    <div class="nav-links">
      <span>EMAIL</span>
      <span>LINKEDIN</span>
      <span>GITHUB</span>
      <span>RESUME</span>
    </div>
  </div>
  
  <div class="hero-section">
    <div class="hero-label">⚡ B.Tech Student</div>
    <div class="hero-name">ATUL<br/>VERMA</div>
    <div class="hero-title">
      Uttaranchal University, Dehradun<br/>
      GATE Qualified • JEE Mains Qualified
    </div>
    <div class="hero-stats">
      <div class="stat">
        <div class="stat-value">10.0</div>
        <div class="stat-label">SGPA</div>
      </div>
      <div class="stat">
        <div class="stat-value">94%</div>
        <div class="stat-label">JEE Mains</div>
      </div>
      <div class="stat">
        <div class="stat-value">93%</div>
        <div class="stat-label">12th Board</div>
      </div>
      <div class="stat">
        <div class="stat-value">90%</div>
        <div class="stat-label">10th Board</div>
      </div>
    </div>
  </div>
  
  <div class="card-info" id="cardInfo">
    <div class="card-info-title" id="ciTitle">ACHIEVEMENT</div>
    <div class="card-info-score" id="ciScore">--</div>
    <div class="card-info-sub" id="ciSub">Hover over a card</div>
  </div>
  
  <div class="achievement-timeline">
    ${[90, 93, 94, 80, 100, 70].map((h, i) => `<div class="timeline-bar" style="height:${h * 0.5}px;animation-delay:${i * 0.1}s"></div>`).join('')}
  </div>
  
  <div class="bottom-bar">
    <div style="font-family:'Space Mono',monospace;font-size:8px;color:#333;letter-spacing:2px;">
      © 2024 ATUL VERMA — ALL RIGHTS RESERVED
    </div>
    <div class="scroll-hint">DRAG TO EXPLORE ↓</div>
  </div>
</div>
`;
document.body.appendChild(overlay);

// ── RAYCASTER FOR INTERACTION ──
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let hoveredCard = null;

window.addEventListener('mousemove', (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
});

// ── CLOCK ──
const clock = new THREE.Clock();
let autoRotate = true;
let autoRotateAngle = 0;

controls.addEventListener('start', () => { autoRotate = false; });
controls.addEventListener('end', () => { setTimeout(() => { autoRotate = true; }, 3000); });

// ── ANIMATION LOOP ──
function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();
  const delta = clock.getDelta();

  // Auto rotate camera around scene
  if (autoRotate) {
    autoRotateAngle += 0.001;
    camera.position.x = Math.sin(autoRotateAngle) * 18;
    camera.position.z = Math.cos(autoRotateAngle) * 18;
    camera.position.y = 2 + Math.sin(t * 0.2) * 1;
    camera.lookAt(0, 0, 0);
  }

  // Avatar float
  avatarGroup.position.y = -1.2 + Math.sin(t * 1.5) * 0.15;
  avatarGroup.rotation.y = Math.sin(t * 0.5) * 0.2;

  // Card animations
  cardGroups.forEach((card, i) => {
    const angle = (i / achievements.length) * Math.PI * 2 - Math.PI / 2 + t * 0.1;
    card.position.x = Math.cos(angle) * cardRadius;
    card.position.z = Math.sin(angle) * cardRadius;
    card.position.y = 0.5 + Math.sin(t * 0.8 + i) * 0.3;
    card.lookAt(0, 0.5, 0);
  });

  // Text ring rotation
  textRingGroup.rotation.y = t * 0.15;

  // Outer ring pulse
  outerRing.scale.setScalar(1 + Math.sin(t * 2) * 0.02);
  outerRing.material.opacity = 0.5 + Math.sin(t * 3) * 0.3;

  // Particle drift
  const posArr = particles.geometry.attributes.position.array;
  for (let i = 0; i < particleCount; i++) {
    posArr[i * 3 + 1] += Math.sin(t + i * 0.1) * 0.002;
  }
  particles.geometry.attributes.position.needsUpdate = true;
  particles.rotation.y = t * 0.02;

  // Point light orbit
  pointLight1.position.x = Math.sin(t * 0.5) * 8;
  pointLight1.position.z = Math.cos(t * 0.5) * 8;
  pointLight2.position.x = Math.cos(t * 0.3) * 6;
  pointLight2.position.z = Math.sin(t * 0.3) * 6;

  // Raycasting for card interaction
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(cardGroups, true);
  
  const cardInfoEl = document.getElementById('cardInfo');
  
  if (intersects.length > 0) {
    let parent = intersects[0].object;
    while (parent.parent && !parent.userData.title) parent = parent.parent;
    
    if (parent.userData.title) {
      if (hoveredCard !== parent) {
        hoveredCard = parent;
        document.getElementById('ciTitle').textContent = parent.userData.title;
        document.getElementById('ciScore').textContent = parent.userData.score;
        document.getElementById('ciScore').style.color = '#' + parent.userData.color.toString(16).padStart(6, '0');
        document.getElementById('ciSub').textContent = parent.userData.subtitle;
        cardInfoEl.classList.add('visible');
        cardInfoEl.style.borderColor = 'rgba(' + 
          ((parent.userData.color >> 16) & 0xff) + ',' +
          ((parent.userData.color >> 8) & 0xff) + ',' +
          (parent.userData.color & 0xff) + ',0.3)';
      }
    }
  } else {
    if (hoveredCard) {
      hoveredCard = null;
      cardInfoEl.classList.remove('visible');
    }
  }

  controls.update();
  renderer.render(scene, camera);
}

animate();

// ── RESIZE ──
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});