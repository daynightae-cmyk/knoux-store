import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 10000);
camera.position.set(0, 80, 180);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const root = document.getElementById('root') ?? document.body;
root.appendChild(renderer.domElement);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 20;
controls.maxDistance = 600;

// Starfield
function createStarfield() {
  const starsGeo = new THREE.BufferGeometry();
  const count = 12000;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const r = 800 + Math.random() * 2000;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
    const temp = Math.random();
    if (temp < 0.3) { colors[i*3] = 0.8; colors[i*3+1] = 0.85; colors[i*3+2] = 1.0; }
    else if (temp < 0.6) { colors[i*3] = 1.0; colors[i*3+1] = 0.95; colors[i*3+2] = 0.8; }
    else { colors[i*3] = 1.0; colors[i*3+1] = 1.0; colors[i*3+2] = 1.0; }
    sizes[i] = 0.5 + Math.random() * 1.5;
  }
  starsGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  starsGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  starsGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  const starsMat = new THREE.PointsMaterial({ size: 1.2, vertexColors: true, sizeAttenuation: true, transparent: true, opacity: 0.9 });
  const stars = new THREE.Points(starsGeo, starsMat);
  stars.name = 'starfield';
  scene.add(stars);
}
createStarfield();

// Sun
const sunGroup = new THREE.Group();
sunGroup.name = 'sunGroup';
scene.add(sunGroup);

const sunGeo = new THREE.SphereGeometry(10, 64, 64);
const sunMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
const sun = new THREE.Mesh(sunGeo, sunMat);
sun.name = 'sun';
sunGroup.add(sun);

// Sun glow
const sunGlowGeo = new THREE.SphereGeometry(12, 64, 64);
const sunGlowMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.25, side: THREE.BackSide });
const sunGlow = new THREE.Mesh(sunGlowGeo, sunGlowMat);
sunGlow.name = 'sunGlow';
sunGroup.add(sunGlow);

const sunGlow2Geo = new THREE.SphereGeometry(15, 64, 64);
const sunGlow2Mat = new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.08, side: THREE.BackSide });
const sunGlow2 = new THREE.Mesh(sunGlow2Geo, sunGlow2Mat);
sunGlow2.name = 'sunGlow2';
sunGroup.add(sunGlow2);

// Sun light
const sunLight = new THREE.PointLight(0xffffff, 3, 1000, 0.5);
sunLight.name = 'sunLight';
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
scene.add(sunLight);

const ambientLight = new THREE.AmbientLight(0x222233, 0.3);
ambientLight.name = 'ambientLight';
scene.add(ambientLight);

// Procedural texture generation
function createPlanetTexture(canvas, colors, noiseScale) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const imageData = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const nx = x / w * noiseScale;
      const ny = y / h * noiseScale;
      let val = Math.sin(nx * 12.9898 + ny * 78.233) * 43758.5453;
      val = val - Math.floor(val);
      const val2 = Math.sin((nx + 5.3) * 15.27 + (ny + 2.1) * 91.12) * 31415.9265;
      const v2 = val2 - Math.floor(val2);
      const mixed = val * 0.6 + v2 * 0.4;
      const bandVal = (Math.sin(ny * 6 + mixed * 3) + 1) / 2;
      const colorIdx = Math.min(Math.floor(bandVal * colors.length), colors.length - 1);
      const c = colors[colorIdx];
      const brightness = 0.85 + mixed * 0.3;
      const idx = (y * w + x) * 4;
      imageData.data[idx] = Math.min(255, c[0] * brightness);
      imageData.data[idx+1] = Math.min(255, c[1] * brightness);
      imageData.data[idx+2] = Math.min(255, c[2] * brightness);
      imageData.data[idx+3] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

function makePlanetCanvas(colors, noiseScale = 4) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  createPlanetTexture(canvas, colors, noiseScale);
  return new THREE.CanvasTexture(canvas);
}

// Planet data
const planetData = [
  {
    name: 'Mercury', radius: 1.2, distance: 22, speed: 0.015, rotSpeed: 0.002, tilt: 0.03,
    colors: [[169,169,169],[130,130,130],[105,105,105],[90,90,90]], noiseScale: 8
  },
  {
    name: 'Venus', radius: 2.0, distance: 32, speed: 0.012, rotSpeed: -0.001, tilt: 2.64,
    colors: [[218,165,32],[200,150,50],[230,180,70],[210,170,40]], noiseScale: 5
  },
  {
    name: 'Earth', radius: 2.2, distance: 44, speed: 0.01, rotSpeed: 0.008, tilt: 0.41,
    colors: [[30,80,180],[40,120,60],[30,100,50],[25,70,160],[200,200,210],[35,90,170]], noiseScale: 6,
    hasMoon: true, hasAtmosphere: true
  },
  {
    name: 'Mars', radius: 1.6, distance: 58, speed: 0.008, rotSpeed: 0.007, tilt: 0.44,
    colors: [[180,60,30],[160,50,25],[200,80,40],[140,45,20]], noiseScale: 7
  },
  {
    name: 'Jupiter', radius: 6.0, distance: 82, speed: 0.004, rotSpeed: 0.015, tilt: 0.05,
    colors: [[200,160,110],[180,130,80],[220,180,130],[160,120,70],[190,150,100],[170,130,90]], noiseScale: 3
  },
  {
    name: 'Saturn', radius: 5.0, distance: 110, speed: 0.003, rotSpeed: 0.013, tilt: 0.47,
    colors: [[210,190,140],[190,170,120],[220,200,150],[200,180,130]], noiseScale: 3,
    hasRing: true
  },
  {
    name: 'Uranus', radius: 3.5, distance: 140, speed: 0.002, rotSpeed: 0.01, tilt: 1.71,
    colors: [[150,210,220],[130,200,210],[170,220,230],[140,195,205]], noiseScale: 4
  },
  {
    name: 'Neptune', radius: 3.3, distance: 168, speed: 0.0015, rotSpeed: 0.011, tilt: 0.49,
    colors: [[50,80,200],[40,70,180],[70,100,220],[60,90,210]], noiseScale: 4
  }
];

const planets = [];

planetData.forEach((data, index) => {
  // Orbit group
  const orbitGroup = new THREE.Group();
  orbitGroup.name = `orbitGroup_${data.name}`;
  scene.add(orbitGroup);

  // Orbit line
  const orbitCurve = new THREE.EllipseCurve(0, 0, data.distance, data.distance, 0, 2 * Math.PI, false, 0);
  const orbitPoints = orbitCurve.getPoints(128);
  const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPoints.map(p => new THREE.Vector3(p.x, 0, p.y)));
  const orbitLine = new THREE.Line(orbitGeo, new THREE.LineBasicMaterial({ color: 0x333355, transparent: true, opacity: 0.35 }));
  orbitLine.name = `orbit_${data.name}`;
  scene.add(orbitLine);

  // Planet mesh
  const texture = makePlanetCanvas(data.colors, data.noiseScale);
  const planetGeo = new THREE.SphereGeometry(data.radius, 48, 48);
  const planetMat = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.75, metalness: 0.1 });
  const planet = new THREE.Mesh(planetGeo, planetMat);
  planet.name = `planet_${data.name}`;
  planet.castShadow = true;
  planet.receiveShadow = true;
  planet.rotation.z = data.tilt;
  orbitGroup.add(planet);

  const planetObj = { mesh: planet, group: orbitGroup, data, angle: Math.random() * Math.PI * 2, moons: [] };

  // Atmosphere for Earth
  if (data.hasAtmosphere) {
    const atmosGeo = new THREE.SphereGeometry(data.radius * 1.06, 48, 48);
    const atmosMat = new THREE.MeshBasicMaterial({ color: 0x4488ff, transparent: true, opacity: 0.15, side: THREE.FrontSide });
    const atmosphere = new THREE.Mesh(atmosGeo, atmosMat);
    atmosphere.name = `atmosphere_${data.name}`;
    orbitGroup.add(atmosphere);
    planetObj.atmosphere = atmosphere;
  }

  // Earth's Moon
  if (data.hasMoon) {
    const moonGeo = new THREE.SphereGeometry(0.5, 32, 32);
    const moonTex = makePlanetCanvas([[180,180,180],[150,150,150],[160,160,160],[140,140,140]], 10);
    const moonMat = new THREE.MeshStandardMaterial({ map: moonTex, roughness: 0.9 });
    const moon = new THREE.Mesh(moonGeo, moonMat);
    moon.name = `moon_${data.name}`;
    moon.castShadow = true;
    orbitGroup.add(moon);
    planetObj.moons.push({ mesh: moon, distance: 5, speed: 0.03, angle: 0 });
  }

  // Saturn's ring
  if (data.hasRing) {
    const ringGeo = new THREE.RingGeometry(data.radius * 1.3, data.radius * 2.2, 80);
    // Color the ring
    const ringColors = [];
    const posAttr = ringGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i), z = posAttr.getY(i);
      const dist = Math.sqrt(x*x + z*z);
      const t = (dist - data.radius * 1.3) / (data.radius * 0.9);
      const band = Math.sin(t * 20) * 0.3 + 0.7;
      ringColors.push(0.82 * band, 0.72 * band, 0.55 * band);
    }
    ringGeo.setAttribute('color', new THREE.Float32BufferAttribute(ringColors, 3));
    const ringMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, transparent: true, opacity: 0.75 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.name = `ring_${data.name}`;
    ring.rotation.x = -Math.PI / 2 + data.tilt;
    orbitGroup.add(ring);
    planetObj.ring = ring;
  }

  // Jupiter moons
  if (data.name === 'Jupiter') {
    const moonNames = ['Io', 'Europa', 'Ganymede', 'Callisto'];
    const moonColors = [
      [[220,200,80],[200,180,60]],
      [[200,210,220],[180,190,200]],
      [[160,150,140],[140,130,120]],
      [[120,110,100],[100,95,85]]
    ];
    moonNames.forEach((mn, mi) => {
      const mGeo = new THREE.SphereGeometry(0.35 + mi * 0.1, 24, 24);
      const mTex = makePlanetCanvas(moonColors[mi], 8);
      const mMat = new THREE.MeshStandardMaterial({ map: mTex, roughness: 0.8 });
      const mMesh = new THREE.Mesh(mGeo, mMat);
      mMesh.name = `moon_${mn}`;
      orbitGroup.add(mMesh);
      planetObj.moons.push({ mesh: mMesh, distance: 8 + mi * 2, speed: 0.02 - mi * 0.003, angle: mi * 1.5 });
    });
  }

  planets.push(planetObj);
});

// Asteroid belt (between Mars and Jupiter)
const asteroidCount = 800;
const asteroidGeo = new THREE.BufferGeometry();
const asteroidPositions = new Float32Array(asteroidCount * 3);
const asteroidSizes = new Float32Array(asteroidCount);
const asteroidAngles = new Float32Array(asteroidCount);
const asteroidDistances = new Float32Array(asteroidCount);
const asteroidYOffsets = new Float32Array(asteroidCount);

for (let i = 0; i < asteroidCount; i++) {
  const angle = Math.random() * Math.PI * 2;
  const dist = 67 + Math.random() * 10;
  const y = (Math.random() - 0.5) * 4;
  asteroidAngles[i] = angle;
  asteroidDistances[i] = dist;
  asteroidYOffsets[i] = y;
  asteroidPositions[i * 3] = Math.cos(angle) * dist;
  asteroidPositions[i * 3 + 1] = y;
  asteroidPositions[i * 3 + 2] = Math.sin(angle) * dist;
  asteroidSizes[i] = 0.3 + Math.random() * 0.7;
}
asteroidGeo.setAttribute('position', new THREE.BufferAttribute(asteroidPositions, 3));
const asteroidMat = new THREE.PointsMaterial({ color: 0x887766, size: 0.5, sizeAttenuation: true });
const asteroids = new THREE.Points(asteroidGeo, asteroidMat);
asteroids.name = 'asteroidBelt';
scene.add(asteroids);

// Planet labels (CSS overlay)
const labelContainer = document.createElement('div');
labelContainer.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:10;';
root.appendChild(labelContainer);

const labels = [];
planetData.forEach((data) => {
  const label = document.createElement('div');
  label.textContent = data.name;
  label.style.cssText = `
    position:absolute; color:#ccc; font-family:'Inter',sans-serif; font-size:11px;
    letter-spacing:1px; text-transform:uppercase; pointer-events:none;
    text-shadow:0 0 6px rgba(100,150,255,0.5); white-space:nowrap; opacity:0.8;
  `;
  labelContainer.appendChild(label);
  labels.push(label);
});

// HUD
const hud = document.createElement('div');
hud.style.cssText = `
  position:fixed; top:16px; left:16px; z-index:20; font-family:'Inter',sans-serif;
  color:#aab; font-size:12px; line-height:1.8; pointer-events:none;
  background:rgba(8,8,20,0.6); border:1px solid rgba(80,80,120,0.3);
  border-radius:8px; padding:14px 18px; backdrop-filter:blur(4px);
`;
hud.innerHTML = `
  <div style="font-size:15px;color:#dde;margin-bottom:6px;letter-spacing:2px;">☀ SOLAR SYSTEM</div>
  <div style="color:#778;">Scroll to zoom · Drag to orbit</div>
  <div style="margin-top:8px;color:#667;" id="speedLabel">Speed: 1.0×</div>
`;
root.appendChild(hud);

// Speed control
let speedMultiplier = 1;
const speedControl = document.createElement('div');
speedControl.style.cssText = `
  position:fixed; bottom:20px; left:50%; transform:translateX(-50%); z-index:20;
  font-family:'Inter',sans-serif; display:flex; gap:8px; align-items:center;
  background:rgba(8,8,20,0.6); border:1px solid rgba(80,80,120,0.3);
  border-radius:8px; padding:10px 16px; backdrop-filter:blur(4px);
`;
const speedBtns = [
  { label: '0.5×', val: 0.5 },
  { label: '1×', val: 1 },
  { label: '2×', val: 2 },
  { label: '5×', val: 5 },
];
speedBtns.forEach(b => {
  const btn = document.createElement('button');
  btn.textContent = b.label;
  btn.style.cssText = `
    background:${b.val === 1 ? 'rgba(80,80,160,0.5)' : 'rgba(40,40,70,0.5)'};
    border:1px solid rgba(80,80,120,0.4); color:#aab; padding:5px 12px;
    border-radius:5px; cursor:pointer; font-family:'Inter',sans-serif; font-size:12px;
  `;
  btn.addEventListener('click', () => {
    speedMultiplier = b.val;
    document.getElementById('speedLabel').textContent = `Speed: ${b.val}×`;
    speedControl.querySelectorAll('button').forEach(el => el.style.background = 'rgba(40,40,70,0.5)');
    btn.style.background = 'rgba(80,80,160,0.5)';
  });
  speedControl.appendChild(btn);
});
root.appendChild(speedControl);

// Temp vector for label projection
const tempVec = new THREE.Vector3();

// Animation
const clock = new THREE.Clock();

function animate() {
  const delta = clock.getDelta();
  const time = clock.getElapsedTime();
  controls.update();

  // Sun pulse
  const pulse = 1 + Math.sin(time * 2) * 0.04;
  sun.scale.set(pulse, pulse, pulse);
  sunGlowMat.opacity = 0.2 + Math.sin(time * 3) * 0.08;

  // Update planets
  planets.forEach((p, i) => {
    p.angle += p.data.speed * speedMultiplier * 0.5;
    const x = Math.cos(p.angle) * p.data.distance;
    const z = Math.sin(p.angle) * p.data.distance;
    p.mesh.position.set(x, 0, z);
    p.mesh.rotation.y += p.data.rotSpeed * speedMultiplier;

    if (p.atmosphere) {
      p.atmosphere.position.copy(p.mesh.position);
    }
    if (p.ring) {
      p.ring.position.copy(p.mesh.position);
    }

    // Moons
    p.moons.forEach(m => {
      m.angle += m.speed * speedMultiplier;
      m.mesh.position.set(
        x + Math.cos(m.angle) * m.distance,
        Math.sin(m.angle * 0.5) * 0.5,
        z + Math.sin(m.angle) * m.distance
      );
    });

    // Labels
    tempVec.set(x, p.data.radius + 2, z);
    tempVec.project(camera);
    const lx = (tempVec.x * 0.5 + 0.5) * window.innerWidth;
    const ly = (-tempVec.y * 0.5 + 0.5) * window.innerHeight;
    if (tempVec.z < 1 && tempVec.z > 0) {
      labels[i].style.display = 'block';
      labels[i].style.left = `${lx}px`;
      labels[i].style.top = `${ly}px`;
      labels[i].style.transform = 'translate(-50%, -100%)';
    } else {
      labels[i].style.display = 'none';
    }
  });

  // Rotate asteroids slowly
  const asteroidPosAttr = asteroids.geometry.attributes.position;
  for (let i = 0; i < asteroidCount; i++) {
    asteroidAngles[i] += 0.0005 * speedMultiplier;
    asteroidPosAttr.setX(i, Math.cos(asteroidAngles[i]) * asteroidDistances[i]);
    asteroidPosAttr.setZ(i, Math.sin(asteroidAngles[i]) * asteroidDistances[i]);
  }
  asteroidPosAttr.needsUpdate = true;

  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});