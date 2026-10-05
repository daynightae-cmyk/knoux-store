// Abstract Brain Model with Neural Connections
// Scroll-triggered movement and particle system
// Uses real brain GLB model

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020208);
scene.fog = new THREE.FogExp2(0x020208, 0.008);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(0, 2, 35);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
document.body.appendChild(renderer.domElement);

// Orbit controls (must be after renderer is created)
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enablePan = false;
controls.minDistance = 10;
controls.maxDistance = 60;
controls.target.set(0, 0, 0);
controls.autoRotate = false;

// Loading overlay
const loadingOverlay = document.createElement('div');
loadingOverlay.style.cssText = `
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background: #020208; display: flex; align-items: center; justify-content: center;
  z-index: 1000; font-family: 'Inter', system-ui, sans-serif; transition: opacity 1s;
`;
loadingOverlay.innerHTML = `
  <div style="text-align:center;">
    <div style="color:rgba(255,255,255,0.3); font-size:11px; letter-spacing:3px; text-transform:uppercase;">Loading Neural Model</div>
    <div id="load-progress" style="color:rgba(140,180,255,0.5); font-size:10px; letter-spacing:2px; margin-top:10px;">0%</div>
  </div>
`;
document.body.appendChild(loadingOverlay);

// Post processing
const composer = new THREE.EffectComposer(renderer);
const renderPass = new THREE.RenderPass(scene, camera);
composer.addPass(renderPass);

const bloomPass = new THREE.UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.5, 0.4, 0.85
);
bloomPass.threshold = 0.4;
bloomPass.strength = 0.45;
bloomPass.radius = 0.3;
composer.addPass(bloomPass);

const smaaPass = new THREE.SMAAPass(window.innerWidth, window.innerHeight);
composer.addPass(smaaPass);

// Lights
const ambientLight = new THREE.AmbientLight(0x222222, 0.5);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0x888888, 0.3);
dirLight.position.set(10, 20, 10);
scene.add(dirLight);

const pointLight1 = new THREE.PointLight(0xaaaaaa, 0.6, 50);
pointLight1.position.set(5, 8, 5);
scene.add(pointLight1);

const pointLight2 = new THREE.PointLight(0x888888, 0.4, 50);
pointLight2.position.set(-5, -3, -5);
scene.add(pointLight2);

// Brain neuron generation - populated from GLB model
const neurons = [];
const neuronMeshes = [];
const connections = [];

// Sample points from mesh surface
function samplePointsFromMesh(mesh, count) {
  const points = [];
  const geometry = mesh.geometry;
  if (!geometry) return points;

  const posAttr = geometry.attributes.position;
  if (!posAttr) return points;

  const indexAttr = geometry.index;
  const worldMatrix = mesh.matrixWorld;

  const triangles = [];
  let totalArea = 0;
  const vA = new THREE.Vector3(), vB = new THREE.Vector3(), vC = new THREE.Vector3();
  const triCount = indexAttr ? indexAttr.count / 3 : posAttr.count / 3;

  for (let i = 0; i < triCount; i++) {
    let a, b, c;
    if (indexAttr) {
      a = indexAttr.getX(i * 3);
      b = indexAttr.getX(i * 3 + 1);
      c = indexAttr.getX(i * 3 + 2);
    } else {
      a = i * 3; b = i * 3 + 1; c = i * 3 + 2;
    }

    vA.fromBufferAttribute(posAttr, a).applyMatrix4(worldMatrix);
    vB.fromBufferAttribute(posAttr, b).applyMatrix4(worldMatrix);
    vC.fromBufferAttribute(posAttr, c).applyMatrix4(worldMatrix);

    const ab = new THREE.Vector3().subVectors(vB, vA);
    const ac = new THREE.Vector3().subVectors(vC, vA);
    const area = ab.cross(ac).length() * 0.5;

    totalArea += area;
    triangles.push({
      a: vA.clone(), b: vB.clone(), c: vC.clone(),
      area, cumulativeArea: totalArea
    });
  }

  for (let i = 0; i < count; i++) {
    const r = Math.random() * totalArea;
    let tri = triangles[0];
    for (let t = 0; t < triangles.length; t++) {
      if (triangles[t].cumulativeArea >= r) {
        tri = triangles[t];
        break;
      }
    }
    let u = Math.random(), v = Math.random();
    if (u + v > 1) { u = 1 - u; v = 1 - v; }
    const point = new THREE.Vector3()
      .addScaledVector(tri.a, 1 - u - v)
      .addScaledVector(tri.b, u)
      .addScaledVector(tri.c, v);
    points.push(point);
  }
  return points;
}

// Neuron parameters
const neuronCount = 450;
const neuronGeom = new THREE.SphereGeometry(0.08, 8, 8);
const neuronMat = new THREE.MeshBasicMaterial({ color: 0xcccccc, transparent: true, opacity: 0.9 });

let brainModel = null;
let brainMeshGroup = new THREE.Group();
scene.add(brainMeshGroup);

let instancedNeurons = null;
const dummy = new THREE.Object3D();

const connectionGroup = new THREE.Group();
scene.add(connectionGroup);
const connectionPairs = [];
const connectionData = [];

const tendrilGroup = new THREE.Group();
scene.add(tendrilGroup);

// Connection shaders
const connectionVertShader = `
  attribute float alpha;
  attribute float signal;
  varying float vAlpha;
  varying float vSignal;
  void main() {
    vAlpha = alpha;
    vSignal = signal;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const connectionFragShader = `
  uniform vec3 baseColor;
  uniform vec3 signalColor;
  varying float vAlpha;
  varying float vSignal;
  void main() {
    vec3 col = mix(baseColor, signalColor, vSignal);
    float a = vAlpha + vSignal * 0.7;
    gl_FragColor = vec4(col, a);
  }
`;

function populateNeurons(surfacePoints, centerOffset) {
  // Surface neurons
  for (let i = 0; i < surfacePoints.length; i++) {
    const pos = surfacePoints[i].clone();
    pos.x += (Math.random() - 0.5) * 0.3;
    pos.y += (Math.random() - 0.5) * 0.3;
    pos.z += (Math.random() - 0.5) * 0.3;
    neurons.push({
      pos: pos.clone(),
      basePos: pos.clone(),
      phase: Math.random() * Math.PI * 2,
      speed: 0.3 + Math.random() * 0.5,
      pulsePhase: Math.random() * Math.PI * 2,
      layer: 'surface'
    });
  }

  // Interior neurons
  const interiorCount = Math.floor(neuronCount * 0.35);
  for (let i = 0; i < interiorCount; i++) {
    const idx = Math.floor(Math.random() * surfacePoints.length);
    const pos = surfacePoints[idx].clone();
    const depth = 0.3 + Math.random() * 0.5;
    pos.lerp(centerOffset, 1 - depth);
    neurons.push({
      pos: pos.clone(),
      basePos: pos.clone(),
      phase: Math.random() * Math.PI * 2,
      speed: 0.2 + Math.random() * 0.4,
      pulsePhase: Math.random() * Math.PI * 2,
      layer: 'interior'
    });
  }
}

function createInstancedNeurons() {
  instancedNeurons = new THREE.InstancedMesh(neuronGeom, neuronMat, neurons.length);

  neurons.forEach((n, i) => {
    dummy.position.copy(n.pos);
    dummy.scale.setScalar(0.5 + Math.random() * 1.5);
    dummy.updateMatrix();
    instancedNeurons.setMatrixAt(i, dummy.matrix);

    const c = new THREE.Color();
    const roll = Math.random();
    const light = 0.35 + Math.random() * 0.4;
    c.setHSL(0, 0, light);
    instancedNeurons.setColorAt(i, c);
    n.colorType = roll;
  });
  instancedNeurons.instanceColor.needsUpdate = true;
  scene.add(instancedNeurons);
}

function buildConnections() {
  const maxConnectionDist = 6.5;
  for (let i = 0; i < neurons.length; i++) {
    let nearCount = 0;
    for (let j = i + 1; j < neurons.length; j++) {
      if (nearCount > 5) break;
      const dist = neurons[i].pos.distanceTo(neurons[j].pos);
      if (dist < maxConnectionDist && Math.random() < 0.45) {
        connectionPairs.push([i, j, dist]);
        nearCount++;
      }
    }
  }
  for (let i = 0; i < 60; i++) {
    const a = Math.floor(Math.random() * neurons.length);
    const b = Math.floor(Math.random() * neurons.length);
    if (a !== b) {
      const dist = neurons[a].pos.distanceTo(neurons[b].pos);
      if (dist > 6 && dist < 18) {
        connectionPairs.push([a, b, dist]);
      }
    }
  }
}

function buildConnectionLines() {
  connectionPairs.forEach(([i, j, dist]) => {
    const p1 = neurons[i].pos;
    const p2 = neurons[j].pos;
    const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);

    const normal = new THREE.Vector3().subVectors(p2, p1).cross(new THREE.Vector3(0, 1, 0)).normalize();
    mid.add(normal.multiplyScalar((Math.random() - 0.5) * 1.5));

    const curve = new THREE.QuadraticBezierCurve3(p1, mid, p2);
    const points = curve.getPoints(16);

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const alphas = new Float32Array(points.length);
    const signals = new Float32Array(points.length);

    points.forEach((_, k) => {
      const t = k / (points.length - 1);
      alphas[k] = Math.sin(t * Math.PI) * 0.3;
      signals[k] = 0;
    });

    geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
    geometry.setAttribute('signal', new THREE.BufferAttribute(signals, 1));

    const ni = neurons[i];
    const nj = neurons[j];
    let baseCol, sigCol;
    baseCol = new THREE.Color().setHSL(0, 0, 0.15 + Math.random() * 0.1);
    sigCol = new THREE.Color().setHSL(0, 0, 0.5 + Math.random() * 0.2);

    const material = new THREE.ShaderMaterial({
      vertexShader: connectionVertShader,
      fragmentShader: connectionFragShader,
      uniforms: {
        baseColor: { value: baseCol },
        signalColor: { value: sigCol }
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const line = new THREE.Line(geometry, material);
    connectionGroup.add(line);

    connectionData.push({
      line, geometry, points,
      signalProgress: -1,
      signalSpeed: 0.5 + Math.random() * 1.5,
      signalDelay: Math.random() * 8,
      neuronI: i, neuronJ: j
    });
  });
}

function buildTendrils() {
  for (let t = 0; t < 80; t++) {
    const startNeuron = neurons[Math.floor(Math.random() * neurons.length)];
    if (startNeuron.layer !== 'surface') continue;

    const dir = startNeuron.pos.clone().normalize();
    dir.x += (Math.random() - 0.5) * 0.8;
    dir.y += (Math.random() - 0.5) * 0.8;
    dir.z += (Math.random() - 0.5) * 0.8;
    dir.normalize();

    const length = 3 + Math.random() * 12;
    const segments = 12;
    const pts = [];

    for (let s = 0; s <= segments; s++) {
      const frac = s / segments;
      const p = startNeuron.pos.clone().add(dir.clone().multiplyScalar(frac * length));
      p.x += (Math.random() - 0.5) * frac * 3;
      p.y += (Math.random() - 0.5) * frac * 3;
      p.z += (Math.random() - 0.5) * frac * 3;
      pts.push(p);
    }

    const curve = new THREE.CatmullRomCurve3(pts);
    const cPoints = curve.getPoints(20);
    const tGeom = new THREE.BufferGeometry().setFromPoints(cPoints);

    const alphas = new Float32Array(cPoints.length);
    cPoints.forEach((_, k) => {
      const f = k / (cPoints.length - 1);
      alphas[k] = (1 - f) * 0.15 * (0.3 + Math.random() * 0.7);
    });
    tGeom.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
    const signals = new Float32Array(cPoints.length).fill(0);
    tGeom.setAttribute('signal', new THREE.BufferAttribute(signals, 1));

    const tMat = new THREE.ShaderMaterial({
      vertexShader: connectionVertShader,
      fragmentShader: connectionFragShader,
      uniforms: {
        baseColor: { value: new THREE.Color(0x333333) },
        signalColor: { value: new THREE.Color(0x888888) }
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const tendril = new THREE.Line(tGeom, tMat);
    tendrilGroup.add(tendril);
  }
}

// Ambient particles
const particleCount = 2000;
const particleGeom = new THREE.BufferGeometry();
const particlePositions = new Float32Array(particleCount * 3);
const particleColors = new Float32Array(particleCount * 3);
const particleSizes = new Float32Array(particleCount);
const particleData = [];

for (let i = 0; i < particleCount; i++) {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const r = 12 + Math.random() * 40;

  particlePositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
  particlePositions[i * 3 + 1] = r * Math.cos(phi);
  particlePositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

  const c = new THREE.Color();
  const roll = Math.random();
  c.setHSL(0, 0, 0.25 + Math.random() * 0.3);

  particleColors[i * 3] = c.r;
  particleColors[i * 3 + 1] = c.g;
  particleColors[i * 3 + 2] = c.b;

  particleSizes[i] = 0.3 + Math.random() * 1.5;

  particleData.push({
    baseR: r,
    theta, phi,
    speed: 0.02 + Math.random() * 0.05,
    drift: (Math.random() - 0.5) * 0.01
  });
}

particleGeom.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
particleGeom.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
particleGeom.setAttribute('size', new THREE.BufferAttribute(particleSizes, 1));

const particleVertShader = `
  attribute float size;
  varying vec3 vColor;
  void main() {
    vColor = color;
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (150.0 / -mvPos.z);
    gl_Position = projectionMatrix * mvPos;
  }
`;

const particleFragShader = `
  varying vec3 vColor;
  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
    float a = smoothstep(0.5, 0.0, d) * 0.4;
    gl_FragColor = vec4(vColor, a);
  }
`;

const particleMaterial = new THREE.ShaderMaterial({
  vertexShader: particleVertShader,
  fragmentShader: particleFragShader,
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  vertexColors: true
});

const particles = new THREE.Points(particleGeom, particleMaterial);
scene.add(particles);

// Core glow
const coreGlowGeom = new THREE.SphereGeometry(3, 32, 32);
const coreGlowMat = new THREE.ShaderMaterial({
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vWorldPos;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    varying vec3 vNormal;
    varying vec3 vWorldPos;
    uniform vec3 cameraPosition;
    void main() {
      vec3 viewDir = normalize(cameraPosition - vWorldPos);
      float rim = 1.0 - max(dot(viewDir, vNormal), 0.0);
      rim = pow(rim, 2.0);
      vec3 col = mix(vec3(0.1, 0.1, 0.1), vec3(0.3, 0.3, 0.3), rim);
      gl_FragColor = vec4(col, rim * 0.1);
    }
  `,
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  side: THREE.BackSide
});
const coreGlow = new THREE.Mesh(coreGlowGeom, coreGlowMat);
scene.add(coreGlow);

// Raycaster for hover interaction
const raycaster = new THREE.Raycaster();
raycaster.params.Points = { threshold: 4.0 };
const mouse = new THREE.Vector2(-999, -999);
let hoveredNeuronIndex = -1;
let prevHoveredNeuronIndex = -1;
const neuronScales = new Float32Array(neuronCount * 2).fill(1); // current scale per neuron
const neuronTargetScales = new Float32Array(neuronCount * 2).fill(1);
const hoverRadius = 12.0; // neurons within this radius of hovered one also enlarge
const hoverScaleFactor = 4.0;
const hoverNeighborScale = 2.8;

// Pulse wave state
let pulseWaveActive = false;
let pulseWaveOrigin = new THREE.Vector3();
let pulseWaveTime = 0;
const pulseWaveSpeed = 18.0; // units per second
const pulseWaveWidth = 4.0;  // width of the ripple band
const pulseWaveMaxRadius = 40.0;
const pulseWaveDuration = pulseWaveMaxRadius / pulseWaveSpeed;

renderer.domElement.addEventListener('mousemove', (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
});

renderer.domElement.addEventListener('mouseleave', () => {
  mouse.set(-999, -999);
  hoveredNeuronIndex = -1;
});

// Cursor style
renderer.domElement.style.cursor = 'default';

// Scroll tracking
let scrollProgress = 0;
let targetScroll = 0;
const maxScroll = 3000;

document.body.style.height = (window.innerHeight + maxScroll) + 'px';
document.body.style.margin = '0';
document.body.style.overflow = 'auto';

renderer.domElement.style.position = 'fixed';
renderer.domElement.style.top = '0';
renderer.domElement.style.left = '0';
renderer.domElement.style.zIndex = '1';

window.addEventListener('scroll', () => {
  targetScroll = window.scrollY / maxScroll;
  targetScroll = Math.min(Math.max(targetScroll, 0), 1);
});

// HUD
const hud = document.createElement('div');
hud.style.cssText = `
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  pointer-events: none; z-index: 10;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
`;
document.body.appendChild(hud);

// Title
const title = document.createElement('div');
title.style.cssText = `
  position: fixed; top: 40px; left: 50%; transform: translateX(-50%);
  color: rgba(255,255,255,0.15); font-size: 10px; letter-spacing: 6px;
  text-transform: uppercase; text-align: center;
`;
title.textContent = 'NEURAL CORTEX MAPPING';
hud.appendChild(title);

// Data labels
const labels = [
  { text: 'SYNAPTIC DENSITY', x: '40px', y: '50%', align: 'left' },
  { text: 'NEURAL PATHWAYS', x: 'calc(100% - 40px)', y: '50%', align: 'right' },
  { text: 'CORTEX ACTIVITY', x: '50%', y: 'calc(100% - 40px)', align: 'center' },
];

labels.forEach(l => {
  const el = document.createElement('div');
  el.style.cssText = `
    position: fixed; left: ${l.x}; top: ${l.y};
    color: rgba(200,200,200,0.12); font-size: 9px; letter-spacing: 3px;
    text-transform: uppercase; text-align: ${l.align};
    transform: translate(${l.align === 'center' ? '-50%' : l.align === 'right' ? '-100%' : '0'}, -50%);
  `;
  el.textContent = l.text;
  hud.appendChild(el);
});

// Scroll indicator
const scrollInd = document.createElement('div');
scrollInd.style.cssText = `
  position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%);
  color: rgba(255,255,255,0.15); font-size: 9px; letter-spacing: 4px;
  text-transform: uppercase; transition: opacity 1s;
`;
scrollInd.textContent = 'SCROLL TO ACTIVATE';
hud.appendChild(scrollInd);

// Depth indicator bar
const depthBar = document.createElement('div');
depthBar.style.cssText = `
  position: fixed; right: 30px; top: 50%; transform: translateY(-50%);
  width: 1px; height: 120px; background: rgba(200,200,200,0.08);
`;
const depthFill = document.createElement('div');
depthFill.style.cssText = `
  width: 100%; height: 0%; background: rgba(200,200,200,0.25);
  transition: height 0.3s;
`;
depthBar.appendChild(depthFill);
hud.appendChild(depthBar);

// Load brain GLB model
const dracoLoader = new THREE.DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
const gltfLoader = new THREE.GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

let modelReady = false;

// Use the Lee Perry Smith head as a brain proxy
gltfLoader.load(
  'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/LeePerrySmith/LeePerrySmith.glb',
  (gltf) => {
    brainModel = gltf.scene;

    // Scale and center
    const box = new THREE.Box3().setFromObject(brainModel);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const targetSize = 16;
    const scaleFactor = targetSize / maxDim;

    brainModel.scale.setScalar(scaleFactor);
    brainModel.position.sub(center.multiplyScalar(scaleFactor));
    brainModel.updateMatrixWorld(true);

    // Collect all meshes
    const allMeshes = [];
    brainModel.traverse((child) => {
      if (child.isMesh) {
        allMeshes.push(child);

        // Make the brain mesh translucent cortex style
        child.material = new THREE.MeshPhysicalMaterial({
          color: 0x222222,
          transparent: true,
          opacity: 0.05,
          roughness: 0.8,
          metalness: 0.1,
          side: THREE.DoubleSide,
          depthWrite: false
        });

        // Add wireframe clone
        const wfClone = child.clone();
        wfClone.material = new THREE.MeshBasicMaterial({
          color: 0x444444,
          wireframe: true,
          transparent: true,
          opacity: 0.03,
          depthWrite: false
        });
        brainMeshGroup.add(wfClone);
      }
    });

    brainMeshGroup.add(brainModel);

    // Sample surface points from all meshes
    const surfacePointsPerMesh = Math.ceil((neuronCount * 0.65) / Math.max(allMeshes.length, 1));
    const allSurfacePoints = [];

    allMeshes.forEach(mesh => {
      const pts = samplePointsFromMesh(mesh, surfacePointsPerMesh);
      allSurfacePoints.push(...pts);
    });

    // Compute center for interior neurons
    const modelCenter = new THREE.Vector3();
    allSurfacePoints.forEach(p => modelCenter.add(p));
    modelCenter.divideScalar(Math.max(allSurfacePoints.length, 1));

    // Populate neurons
    populateNeurons(allSurfacePoints, modelCenter);

    // Build all visuals
    createInstancedNeurons();
    buildConnections();
    buildConnectionLines();
    buildTendrils();

    // Done loading
    modelReady = true;

    if (document.getElementById('load-progress')) {
      document.getElementById('load-progress').textContent = '100%';
    }

    setTimeout(() => {
      loadingOverlay.style.opacity = '0';
      setTimeout(() => {
        loadingOverlay.remove();
      }, 1000);
    }, 300);
  },
  (xhr) => {
    if (xhr.total > 0) {
      const pct = Math.round((xhr.loaded / xhr.total) * 100);
      if (document.getElementById('load-progress')) {
        document.getElementById('load-progress').textContent = pct + '%';
      }
    }
  },
  (error) => {
    console.error('Error loading brain model:', error);
    // Fallback: generate parametric brain
    fallbackBrain();
  }
);

// Fallback parametric brain if GLB fails
function fallbackBrain() {
  const fallbackPoints = [];
  for (let i = 0; i < neuronCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const baseR = 6 + Math.random() * 2;
    const x = baseR * Math.sin(phi) * Math.cos(theta) * (1 + 0.15 * Math.sin(theta * 3));
    const y = baseR * Math.cos(phi) * 0.85 + 1;
    const z = baseR * Math.sin(phi) * Math.sin(theta) * (1 + 0.1 * Math.cos(phi * 2));
    fallbackPoints.push(new THREE.Vector3(x, y, z));
  }

  const modelCenter = new THREE.Vector3();
  fallbackPoints.forEach(p => modelCenter.add(p));
  modelCenter.divideScalar(fallbackPoints.length);

  populateNeurons(fallbackPoints, modelCenter);
  createInstancedNeurons();
  buildConnections();
  buildConnectionLines();
  buildTendrils();

  modelReady = true;
  loadingOverlay.style.opacity = '0';
  setTimeout(() => loadingOverlay.remove(), 1000);
}

// Clock and animation
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const time = clock.getElapsedTime();
  const delta = clock.getDelta();

  scrollProgress += (targetScroll - scrollProgress) * 0.05;

  // Scroll indicator fade
  scrollInd.style.opacity = scrollProgress > 0.05 ? '0' : '1';
  depthFill.style.height = (scrollProgress * 100) + '%';

  if (!modelReady) {
    composer.render();
    return;
  }

  // Rotate brain group (slow auto-rotation only, orbit controls handle the rest)
  const baseRotY = time * 0.08;
  brainMeshGroup.rotation.y = baseRotY;
  if (instancedNeurons) instancedNeurons.rotation.y = baseRotY;
  connectionGroup.rotation.y = baseRotY;
  tendrilGroup.rotation.y = baseRotY;

  // Update orbit controls
  controls.update();

  // Raycaster hover detection on instanced neurons — proximity-based fallback
  prevHoveredNeuronIndex = hoveredNeuronIndex;
  if (instancedNeurons && mouse.x !== -999) {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(instancedNeurons, false);
    if (intersects.length > 0) {
      hoveredNeuronIndex = intersects[0].instanceId;
      renderer.domElement.style.cursor = 'pointer';
    } else {
      // Proximity fallback: find closest neuron to the ray within a generous threshold
      let closestIdx = -1;
      let closestDist = 5.0; // world-space proximity threshold
      const ray = raycaster.ray;
      const tmpVec = new THREE.Vector3();
      for (let i = 0; i < neurons.length; i++) {
        // Transform neuron pos by the instanced mesh rotation
        tmpVec.copy(neurons[i].pos).applyEuler(instancedNeurons.rotation);
        const d = ray.distanceToPoint(tmpVec);
        if (d < closestDist) {
          closestDist = d;
          closestIdx = i;
        }
      }
      if (closestIdx >= 0) {
        hoveredNeuronIndex = closestIdx;
        renderer.domElement.style.cursor = 'pointer';
      } else {
        hoveredNeuronIndex = -1;
        renderer.domElement.style.cursor = 'default';
      }
    }
  } else {
    hoveredNeuronIndex = -1;
  }

  // Trigger pulse wave when hovering a new neuron
  if (hoveredNeuronIndex >= 0 && hoveredNeuronIndex !== prevHoveredNeuronIndex) {
    pulseWaveActive = true;
    pulseWaveTime = 0;
    pulseWaveOrigin.copy(neurons[hoveredNeuronIndex].pos);
  }

  // Advance pulse wave
  if (pulseWaveActive) {
    pulseWaveTime += 0.016;
    if (pulseWaveTime > pulseWaveDuration + 0.5) {
      pulseWaveActive = false;
    }
  }

  // Compute target scales based on hover
  if (instancedNeurons) {
    for (let i = 0; i < neurons.length; i++) {
      neuronTargetScales[i] = 1.0;
    }

    if (hoveredNeuronIndex >= 0 && hoveredNeuronIndex < neurons.length) {
      neuronTargetScales[hoveredNeuronIndex] = hoverScaleFactor;
      const hovPos = neurons[hoveredNeuronIndex].pos;
      for (let i = 0; i < neurons.length; i++) {
        if (i === hoveredNeuronIndex) continue;
        const dist = neurons[i].pos.distanceTo(hovPos);
        if (dist < hoverRadius) {
          const falloff = 1 - (dist / hoverRadius);
          neuronTargetScales[i] = Math.max(neuronTargetScales[i], 1 + (hoverNeighborScale - 1) * falloff);
        }
      }
    }
  }

  // Update neuron positions (subtle breathing + hover scale)
  if (instancedNeurons) {
    for (let i = 0; i < neurons.length; i++) {
      const n = neurons[i];
      const breathe = Math.sin(time * n.speed + n.phase) * 0.15;
      dummy.position.copy(n.basePos);
      dummy.position.addScaledVector(n.basePos.clone().normalize(), breathe);
      n.pos.copy(dummy.position);

      // Smooth lerp toward target hover scale
      neuronScales[i] += (neuronTargetScales[i] - neuronScales[i]) * 0.25;

      const pulse = 0.5 + Math.sin(time * 2 + n.pulsePhase) * 0.5;
      const s = (0.5 + pulse * 1.5) * (1 + scrollProgress * 0.5) * neuronScales[i];
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      instancedNeurons.setMatrixAt(i, dummy.matrix);

      // Brighten hovered neurons
      if (neuronScales[i] > 1.02) {
        const brighten = Math.min((neuronScales[i] - 1) / (hoverScaleFactor - 1), 1);
        const c = new THREE.Color();
        c.setHSL(0, 0, 0.4 + brighten * 0.45);
        instancedNeurons.setColorAt(i, c);
      }
    }
    instancedNeurons.instanceMatrix.needsUpdate = true;
    if (instancedNeurons.instanceColor) instancedNeurons.instanceColor.needsUpdate = true;
  }

  // Update connection signals + pulse wave
  const pulseRadius = pulseWaveActive ? pulseWaveTime * pulseWaveSpeed : -1;

  connectionData.forEach(cd => {
    cd.signalDelay -= 0.016;
    if (cd.signalDelay <= 0) {
      cd.signalProgress += 0.016 * cd.signalSpeed;
      if (cd.signalProgress > 1.3) {
        cd.signalProgress = -0.3;
        cd.signalDelay = 1 + Math.random() * 6;
      }
    }

    const signalAttr = cd.geometry.getAttribute('signal');
    const alphaAttr = cd.geometry.getAttribute('alpha');

    for (let k = 0; k < cd.points.length; k++) {
      const t = k / (cd.points.length - 1);
      const dist = Math.abs(t - cd.signalProgress);
      let sig = Math.max(0, 1 - dist * 5) * (0.5 + scrollProgress * 0.5);

      // Pulse wave boost: check distance of this point from pulse origin
      if (pulseWaveActive && pulseRadius > 0) {
        const ptDist = cd.points[k].distanceTo(pulseWaveOrigin);
        const waveDelta = Math.abs(ptDist - pulseRadius);
        if (waveDelta < pulseWaveWidth) {
          const waveFalloff = 1 - (waveDelta / pulseWaveWidth);
          const fadeOut = Math.max(0, 1 - pulseWaveTime / pulseWaveDuration);
          const pulseBoost = waveFalloff * waveFalloff * fadeOut * 1.2;
          sig = Math.min(1.0, sig + pulseBoost);
        }
      }

      signalAttr.array[k] = sig;
    }
    signalAttr.needsUpdate = true;
  });

  // Update particles
  for (let i = 0; i < particleCount; i++) {
    const pd = particleData[i];
    pd.theta += pd.speed * 0.01;
    pd.phi += pd.drift * 0.01;
    const r = pd.baseR + Math.sin(time * 0.3 + pd.theta) * 2;
    particlePositions[i * 3] = r * Math.sin(pd.phi) * Math.cos(pd.theta);
    particlePositions[i * 3 + 1] = r * Math.cos(pd.phi);
    particlePositions[i * 3 + 2] = r * Math.sin(pd.phi) * Math.sin(pd.theta);
  }
  particleGeom.attributes.position.needsUpdate = true;

  // Core glow pulse
  const glowScale = 2.5 + Math.sin(time * 0.5) * 0.3 + scrollProgress * 1.0;
  coreGlow.scale.setScalar(glowScale);

  // Point lights animation
  pointLight1.position.x = Math.sin(time * 0.3) * 8;
  pointLight1.position.z = Math.cos(time * 0.3) * 8;
  pointLight2.position.x = Math.sin(time * 0.2 + 2) * 6;
  pointLight2.position.z = Math.cos(time * 0.2 + 2) * 6;

  // Bloom intensity on scroll
  bloomPass.strength = 0.45 + scrollProgress * 0.25;

  composer.render();
}

animate();

// Prevent scroll from interfering when pointer is on canvas
renderer.domElement.addEventListener('wheel', (e) => {
  e.stopPropagation();
}, { passive: true });

// Handle resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  bloomPass.setSize(window.innerWidth, window.innerHeight);
});