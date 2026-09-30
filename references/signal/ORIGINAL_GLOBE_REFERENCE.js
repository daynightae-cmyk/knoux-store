// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.3;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

// Black background
scene.background = new THREE.Color(0x000000);

// Controls
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 2.5;
controls.maxDistance = 50;

// Lighting - subtle for white text on black
const sunDirectionalLight = new THREE.DirectionalLight(0xffffff, 2.0);
sunDirectionalLight.position.set(15, 10, 20);
scene.add(sunDirectionalLight);

const ambientFillLight = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambientFillLight);

const backLight = new THREE.DirectionalLight(0xffffff, 1.0);
backLight.position.set(-10, -5, -15);
scene.add(backLight);

// Characters to use
const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

// SVG icon paths (Lucide-style icons used by shadcn/ui)
const iconPaths = [
  // Search
  'M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z',
  // Heart
  'M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z',
  // Star
  'M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14 2 9.27l6.91-1.01L12 2z',
  // Settings/Gear
  'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1.08-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1.08 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001.08 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1.08z',
  // Home
  'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9zM9 22V12h6v10',
  // User
  'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z',
  // Mail
  'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6',
  // Bell
  'M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0',
  // Lock
  'M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 0110 0v4',
  // Eye
  'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 100-6 3 3 0 000 6z',
  // Zap/Lightning
  'M13 2L3 14h9l-1 10 10-12h-9l1-10z',
  // Globe
  'M12 22a10 10 0 100-20 10 10 0 000 20zM2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z',
  // Code
  'M16 18l6-6-6-6M8 6l-6 6 6 6',
  // Terminal
  'M4 17l6-6-6-6M12 19h8',
  // Cloud
  'M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z',
  // Sun
  'M12 17a5 5 0 100-10 5 5 0 000 10zM12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42',
  // Moon
  'M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z',
  // Music
  'M9 18V5l12-2v13M9 18a3 3 0 11-6 0 3 3 0 016 0zM21 16a3 3 0 11-6 0 3 3 0 016 0z',
  // Camera
  'M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2zM12 17a4 4 0 100-8 4 4 0 000 8z',
  // Wifi
  'M5 12.55a11 11 0 0114.08 0M1.42 9a16 16 0 0121.16 0M8.53 16.11a6 6 0 016.95 0M12 20h.01',
  // Battery
  'M17 6H5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V8a2 2 0 00-2-2zM23 13v-2',
  // Bookmark
  'M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z',
  // Compass
  'M12 22a10 10 0 100-20 10 10 0 000 20zM16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z',
  // Cpu
  'M18 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2zM9 9h6v6H9V9zM9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3',
  // Shield
  'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  // Layers
  'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  // Box
  'M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16zM3.27 6.96L12 12.01l8.73-5.05M12 22.08V12',
  // Hexagon
  'M21 16.05V7.95a2 2 0 00-1-1.73l-7-4.03a2 2 0 00-2 0l-7 4.03a2 2 0 00-1 1.73v8.1a2 2 0 001 1.73l7 4.03a2 2 0 002 0l7-4.03a2 2 0 001-1.73z',
  // Triangle
  'M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z',
  // Circle
  'M12 22a10 10 0 100-20 10 10 0 000 20z',
  // Square
  'M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2z',
  // Hash
  'M4 9h16M4 15h16M10 3l-2 18M16 3l-2 18',
  // At sign
  'M12 16a4 4 0 100-8 4 4 0 000 8zM16 12v1.5a2.5 2.5 0 005 0V12a9 9 0 10-5.63 8.36',
  // Anchor
  'M12 8a3 3 0 100-6 3 3 0 000 6zM12 8v14M5 12H2a10 10 0 0020 0h-3',
  // Award
  'M12 15a7 7 0 100-14 7 7 0 000 14zM8.21 13.89L7 23l5-3 5 3-1.21-9.12',
  // Crosshair
  'M12 22a10 10 0 100-20 10 10 0 000 20zM22 12h-4M6 12H2M12 6V2M12 22v-4',
  // Feather
  'M20.24 12.24a6 6 0 00-8.49-8.49L5 10.5V19h8.5zM16 8L2 22M17.5 15H9',
  // Gift
  'M20 12v10H4V12M2 7h20v5H2V7zM12 22V7M12 7H7.5a2.5 2.5 0 110-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 100-5C13 2 12 7 12 7z',
  // Infinity
  'M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.133-8-12.739-8-4.585 0-4.585 8 0 8 5.606 0 7.644-8 12.74-8z',
  // Key
  'M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4',
  // Rocket
  'M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09zM12 15l-3-3M22 2l-7.5 7.5M15 12s1.28-3.77 2.3-4.8a4 4 0 015.66 5.66C21.77 13.72 18 15 18 15',
  // Sparkles
  'M12 3l1.912 5.813L20 10l-6.088 1.187L12 17l-1.912-5.813L4 10l6.088-1.187L12 3zM5 3l.75 2.25L8 6l-2.25.75L5 9l-.75-2.25L2 6l2.25-.75L5 3zM19 17l.75 2.25L22 20l-2.25.75L19 23l-.75-2.25L16 20l2.25-.75L19 17z',
];

// Create icon texture from SVG path with glow
function createIconTexture(pathData, glowColor, glowIntensity, strokeColor) {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, size, size);

  // Scale and center the 24x24 viewBox path into the canvas
  const scale = (size * 0.55) / 24;
  const offset = size * 0.225;

  ctx.save();
  ctx.translate(offset, offset);
  ctx.scale(scale, scale);

  // Main icon stroke (no glow)
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = strokeColor || `rgba(255, 255, 255, 0.85)`;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const mainPath = new Path2D(pathData);
  ctx.stroke(mainPath);

  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Create canvas textures for each character (for typed text)
function createCharTexture(char) {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  
  // Glow layers
  for (let g = 5; g >= 1; g--) {
    ctx.fillStyle = `rgba(180, 210, 255, ${0.04 * g})`;
    ctx.font = `bold ${90 + g * 6}px -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(char, size / 2, size / 2 + 4);
  }
  
  // Main character
  ctx.fillStyle = '#ffffff';
  ctx.font = `600 90px -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(char, size / 2, size / 2 + 4);
  
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Glow color palettes for variety
const glowPalettes = [
  { r: 140, g: 180, b: 255 },  // Cool blue
  { r: 180, g: 140, b: 255 },  // Lavender
  { r: 140, g: 255, b: 200 },  // Mint
  { r: 255, g: 180, b: 140 },  // Warm peach
  { r: 200, g: 200, b: 255 },  // Soft periwinkle
  { r: 255, g: 220, b: 180 },  // Warm gold
];

// Dark/Light mode state
let isDarkMode = true;

function getIconStrokeColor() {
  return isDarkMode ? 'rgba(255, 255, 255, 0.85)' : 'rgba(30, 30, 30, 0.85)';
}

function rebuildAllIconTextures() {
  const stroke = getIconStrokeColor();
  for (let i = 0; i < letterSprites.length; i++) {
    const l = letterSprites[i];
    if (!l.highlighted) {
      const iconPath = iconPaths[Math.floor(Math.random() * iconPaths.length)];
      l.sprite.material.map = createIconTexture(iconPath, l.glowPalette, 0.7, stroke);
      l.sprite.material.needsUpdate = true;
    }
  }
}

function applyTheme() {
  if (isDarkMode) {
    scene.background = new THREE.Color(0x000000);
    searchBar.style.background = 'rgba(255, 255, 255, 0.08)';
    searchBar.style.border = '1px solid rgba(255, 255, 255, 0.15)';
    searchInput.style.color = 'rgba(255, 255, 255, 0.9)';
    searchInput.style.caretColor = 'rgba(255, 255, 255, 0.7)';
    generateBtn.style.background = 'rgba(255, 255, 255, 0.12)';
    generateBtn.style.color = 'rgba(255, 255, 255, 0.9)';
    generateBtn.style.border = '1px solid rgba(255, 255, 255, 0.15)';
    promptLabel.style.color = 'rgba(255, 255, 255, 0.35)';
    toggleBtn.style.background = 'rgba(255, 255, 255, 0.08)';
    toggleBtn.style.border = '1px solid rgba(255, 255, 255, 0.15)';
    toggleBtn.style.color = 'rgba(255, 255, 255, 0.7)';
    toggleBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>`;
    sunDirectionalLight.intensity = 2.0;
    ambientFillLight.intensity = 0.8;
    backLight.intensity = 1.0;
    centerGlow.intensity = 0.5;
    // No blending changes needed for non-transparent sprites
  } else {
    scene.background = new THREE.Color(0xf5f5f5);
    searchBar.style.background = 'rgba(255, 255, 255, 0.9)';
    searchBar.style.border = '1px solid rgba(0, 0, 0, 0.12)';
    searchInput.style.color = 'rgba(0, 0, 0, 0.85)';
    searchInput.style.caretColor = 'rgba(0, 0, 0, 0.5)';
    generateBtn.style.background = 'rgba(0, 0, 0, 0.85)';
    generateBtn.style.color = 'rgba(255, 255, 255, 0.95)';
    generateBtn.style.border = '1px solid rgba(0, 0, 0, 0.12)';
    promptLabel.style.color = 'rgba(0, 0, 0, 0.35)';
    toggleBtn.style.background = 'rgba(0, 0, 0, 0.06)';
    toggleBtn.style.border = '1px solid rgba(0, 0, 0, 0.12)';
    toggleBtn.style.color = 'rgba(0, 0, 0, 0.6)';
    toggleBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
    sunDirectionalLight.intensity = 1.5;
    ambientFillLight.intensity = 1.2;
    backLight.intensity = 0.6;
    centerGlow.intensity = 0.1;
    // No blending changes needed for non-transparent sprites
  }
  rebuildAllIconTextures();
}

// Globe group
const globeGroup = new THREE.Group();
scene.add(globeGroup);

// Add subtle point light at center for bloom feel
const centerGlow = new THREE.PointLight(0x4466ff, 0.5, 6);
centerGlow.position.set(0, 0, 0);
globeGroup.add(centerGlow);

// Sphere radius
const radius = 2.0;

// Store all letter sprites with their base positions
const letterSprites = [];

// Create icons distributed on sphere surface using fibonacci sphere
const totalLetters = 500;
const goldenAngle = Math.PI * (3 - Math.sqrt(5));

for (let i = 0; i < totalLetters; i++) {
  const y = 1 - (i / (totalLetters - 1)) * 2; // -1 to 1
  const radiusAtY = Math.sqrt(1 - y * y);
  const theta = goldenAngle * i;

  const x = Math.cos(theta) * radiusAtY;
  const z = Math.sin(theta) * radiusAtY;

  const iconPath = iconPaths[Math.floor(Math.random() * iconPaths.length)];
  const palette = glowPalettes[Math.floor(Math.random() * glowPalettes.length)];
  const glowIntensity = 0.6 + Math.random() * 0.8;
  const texture = createIconTexture(iconPath, palette, glowIntensity);

  const spriteMaterial = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: 1.0,
    depthWrite: false,
    sizeAttenuation: true,
  });

  const sprite = new THREE.Sprite(spriteMaterial);

  const scale = 0.2 + Math.random() * 0.2;
  sprite.scale.set(scale, scale, scale);

  sprite.position.set(x * radius, y * radius, z * radius);

  letterSprites.push({
    sprite,
    baseX: x,
    baseY: y,
    baseZ: z,
    radius: radius,
    phaseOffset: Math.random() * Math.PI * 2,
    floatSpeed: 0.3 + Math.random() * 0.5,
    floatAmount: 0.02 + Math.random() * 0.04,
    glowPalette: palette,
  });

  globeGroup.add(sprite);
}

// Add a second layer — slightly larger radius for depth
const outerLetters = 200;
const outerRadius = 2.35;

for (let i = 0; i < outerLetters; i++) {
  const y = 1 - (i / (outerLetters - 1)) * 2;
  const radiusAtY = Math.sqrt(1 - y * y);
  const theta = goldenAngle * i + 0.5;

  const x = Math.cos(theta) * radiusAtY;
  const z = Math.sin(theta) * radiusAtY;

  const iconPath = iconPaths[Math.floor(Math.random() * iconPaths.length)];
  const palette = glowPalettes[Math.floor(Math.random() * glowPalettes.length)];
  const texture = createIconTexture(iconPath, palette, 0.4);

  const spriteMaterial = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
    sizeAttenuation: true,
  });

  const sprite = new THREE.Sprite(spriteMaterial);
  const scale = 0.14 + Math.random() * 0.14;
  sprite.scale.set(scale, scale, scale);
  sprite.position.set(x * outerRadius, y * outerRadius, z * outerRadius);

  letterSprites.push({
    sprite,
    baseX: x,
    baseY: y,
    baseZ: z,
    radius: outerRadius,
    phaseOffset: Math.random() * Math.PI * 2,
    floatSpeed: 0.2 + Math.random() * 0.4,
    floatAmount: 0.015 + Math.random() * 0.03,
    glowPalette: palette,
  });

  globeGroup.add(sprite);
}

// Load Inter font
const fontLink = document.createElement('link');
fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap';
fontLink.rel = 'stylesheet';
document.head.appendChild(fontLink);

// Add placeholder style
const placeholderStyle = document.createElement('style');
placeholderStyle.textContent = `
  .prompt-input::placeholder { color: rgba(255, 255, 255, 0.3); }
  .prompt-input:focus::placeholder { color: rgba(255, 255, 255, 0.2); }
  .light-mode .prompt-input::placeholder { color: rgba(0, 0, 0, 0.3); }
  .light-mode .prompt-input:focus::placeholder { color: rgba(0, 0, 0, 0.2); }
`;
document.head.appendChild(placeholderStyle);

// Prompt label removed
const promptLabel = { style: {} }; // dummy to avoid errors in applyTheme

// Prompt bar container
const searchBar = document.createElement('div');
searchBar.style.cssText = `
  position: fixed;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 380px;
  height: 44px;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  display: flex;
  align-items: center;
  padding: 0 6px 0 16px;
  box-sizing: border-box;
  z-index: 10;
  gap: 8px;
`;

// Search icon in bar
const searchIcon = document.createElement('div');
searchIcon.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.4"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;
searchIcon.style.cssText = `flex-shrink: 0; display: flex; align-items: center; color: rgba(255,255,255,0.5);`;
searchBar.appendChild(searchIcon);

const searchInput = document.createElement('input');
searchInput.type = 'text';
searchInput.placeholder = 'A rocket launching into space...';
searchInput.className = 'prompt-input';
searchInput.style.cssText = `
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 14px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.9);
  letter-spacing: 0.2px;
  caret-color: rgba(255, 255, 255, 0.7);
  min-width: 0;
`;
searchBar.appendChild(searchInput);

// Generate button
const generateBtn = document.createElement('button');
generateBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`;
generateBtn.style.cssText = `
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.9);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, transform 0.15s;
  padding: 0;
`;
generateBtn.addEventListener('mouseenter', () => {
  generateBtn.style.background = isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.95)';
  generateBtn.style.transform = 'scale(1.05)';
});
generateBtn.addEventListener('mouseleave', () => {
  generateBtn.style.background = isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.85)';
  generateBtn.style.transform = 'scale(1)';
});
generateBtn.addEventListener('click', () => {
  updateGlobeFromText(searchInput.value);
});
searchBar.appendChild(generateBtn);
document.body.appendChild(searchBar);

// Dark/Light mode toggle button
const toggleBtn = document.createElement('button');
toggleBtn.style.cssText = `
  position: fixed;
  top: 16px;
  right: 16px;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  transition: background 0.2s;
  padding: 0;
`;
toggleBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>`;
toggleBtn.addEventListener('mouseenter', () => {
  toggleBtn.style.background = isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)';
});
toggleBtn.addEventListener('mouseleave', () => {
  toggleBtn.style.background = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
});
toggleBtn.addEventListener('click', () => {
  isDarkMode = !isDarkMode;
  applyTheme();
});
document.body.appendChild(toggleBtn);

// Cache for character textures and icon textures
const textureCache = {};
function getCachedCharTexture(char) {
  if (!textureCache[char]) {
    textureCache[char] = createCharTexture(char);
  }
  return textureCache[char];
}

function getRandomIconTexture(palette) {
  const iconPath = iconPaths[Math.floor(Math.random() * iconPaths.length)];
  return createIconTexture(iconPath, palette || glowPalettes[Math.floor(Math.random() * glowPalettes.length)], 0.7, getIconStrokeColor());
}

// Track current typed text and animate letters to show it
let currentText = '';
let targetPositions = null;
let transitionProgress = 1;
const transitionSpeed = 3.0;

// Create text layout positions on the sphere surface
function getTextTargetPositions(text) {
  if (!text || text.length === 0) return null;

  const positions = [];
  const textChars = text.split('');
  const charSpacing = 0.35;
  const totalWidth = (textChars.length - 1) * charSpacing;
  const startX = -totalWidth / 2;

  // Map text chars onto the sphere equator band
  textChars.forEach((char, idx) => {
    // Position along equator using longitude
    const angle = (startX + idx * charSpacing) / radius;
    positions.push({
      char: char,
      x: Math.sin(angle),
      y: 0,
      z: Math.cos(angle),
      index: idx,
    });
  });

  return positions;
}

// Shuffle/reshuffle icons on the globe — each sprite gets a new random icon and new random position
function shuffleGlobe() {
  const stroke = getIconStrokeColor();
  for (let i = 0; i < letterSprites.length; i++) {
    const l = letterSprites[i];

    // Assign new random icon
    const iconPath = iconPaths[Math.floor(Math.random() * iconPaths.length)];
    l.sprite.material.map = createIconTexture(iconPath, l.glowPalette, 0.7, stroke);
    l.sprite.material.needsUpdate = true;

    // Assign new random position on the sphere using fibonacci-like distribution
    const newY = (Math.random() * 2 - 1);
    const radiusAtY = Math.sqrt(1 - newY * newY);
    const newTheta = Math.random() * Math.PI * 2;
    const newX = Math.cos(newTheta) * radiusAtY;
    const newZ = Math.sin(newTheta) * radiusAtY;

    // Store as targets for smooth transition
    l.targetBaseX = newX;
    l.targetBaseY = newY;
    l.targetBaseZ = newZ;
  }
  transitionProgress = 0;
}

// Update the globe when text changes — just reshuffle, don't replace icons
function updateGlobeFromText(text) {
  currentText = text;
  shuffleGlobe();
}



// Prevent orbit controls from capturing keyboard events on input
searchInput.addEventListener('keydown', (e) => {
  e.stopPropagation();
  if (e.key === 'Enter') {
    updateGlobeFromText(searchInput.value);
  }
});

// Camera position
camera.position.set(0, 0, 5.5);
controls.target.set(0, 0, 0);
controls.update();

// Initialize theme
applyTheme();

// Clock
const clock = new THREE.Clock();

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  // Globe rotation - slow and dramatic like the earth reference
  globeGroup.rotation.y = elapsed * 0.08;

  // Update transition progress
  if (transitionProgress < 1) {
    transitionProgress = Math.min(1, transitionProgress + delta * transitionSpeed);
  }
  const t = transitionProgress * transitionProgress * (3 - 2 * transitionProgress); // smoothstep

  // Animate each letter
  for (let i = 0; i < letterSprites.length; i++) {
    const l = letterSprites[i];
    const float = Math.sin(elapsed * l.floatSpeed + l.phaseOffset) * l.floatAmount;

    if (l.targetBaseX !== undefined) {
      // Smoothly interpolate base positions toward targets
      l.baseX += (l.targetBaseX - l.baseX) * 0.05;
      l.baseY += (l.targetBaseY - l.baseY) * 0.05;
      l.baseZ += (l.targetBaseZ - l.baseZ) * 0.05;
    }

    const r = l.radius + float;
    l.sprite.position.set(l.baseX * r, l.baseY * r, l.baseZ * r);
  }

  controls.update();
  renderer.render(scene, camera);
}
animate();

// Handle resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});