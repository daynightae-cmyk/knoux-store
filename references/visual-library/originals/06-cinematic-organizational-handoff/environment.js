import * as THREE from 'three';

/* ============================================================
   WATER — flowing, reflective surface
   Uses a real planar reflection: the scene is re-rendered from a
   mirrored camera into a render target, then blended onto the
   surface with a flow-distorted UV offset and Fresnel falloff.
   ============================================================ */
export function createWater(P, opts = {}) {
  const group = new THREE.Group();
  group.name = 'waterSurface';

  const W = 620, D = 480, SEG_X = 128, SEG_Z = 96;
  const LEVEL = opts.level ?? 0;

  /* ---- reflection render target + mirrored camera ---- */
  const quality = opts.quality ?? 1;
  const rtSize = Math.round(512 * quality);
  const reflectionRT = new THREE.WebGLRenderTarget(rtSize, rtSize, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    type: THREE.UnsignedByteType,
    depthBuffer: true
  });
  reflectionRT.texture.name = 'waterReflectionTexture';

  const reflectCamera = new THREE.PerspectiveCamera();
  reflectCamera.name = 'waterReflectCamera';

  /* ---- normal/flow map generated procedurally ---- */
  const flowTex = rippleNormalTexture();
  flowTex.wrapS = flowTex.wrapT = THREE.RepeatWrapping;

  /* ---- surface shader ---- */
  const uniforms = {
    uTime: { value: 0 },
    uReflection: { value: reflectionRT.texture },
    uFlow: { value: flowTex },
    uWaterColor: { value: new THREE.Color(P.water ?? 0x070c14) },
    uDeepColor: { value: new THREE.Color(0x030509) },
    uSheenColor: { value: new THREE.Color(0x9fc0e8) },
    uMoonDir: { value: new THREE.Vector3(-0.45, 0.35, -0.82).normalize() },
    uReflectStrength: { value: 0.62 },
    uFlowSpeed: { value: 0.055 },
    uFogColor: { value: new THREE.Color(P.bg ?? 0x05070b) },
    uFogDensity: { value: 0.0085 }
  };

  const surfaceMat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: true,
    side: THREE.FrontSide,
    vertexShader: /* glsl */`
      uniform float uTime;
      varying vec2 vUv;
      varying vec3 vWorld;
      varying vec4 vProj;
      varying float vWave;

      float wave(vec3 p, float t){
        float h = 0.0;
        h += sin(p.x * 0.055 + t * 0.55) * 0.30;
        h += sin(p.z * 0.082 - t * 0.42) * 0.24;
        h += sin((p.x + p.z) * 0.032 + t * 0.78) * 0.18;
        h += sin(p.x * 0.21 - p.z * 0.13 + t * 1.25) * 0.07;
        return h;
      }

      void main(){
        vUv = uv;
        vec3 p = position;
        float h = wave(p, uTime);
        p.y += h;
        vWave = h;
        vec4 world = modelMatrix * vec4(p, 1.0);
        vWorld = world.xyz;
        vec4 mvp = projectionMatrix * viewMatrix * world;
        vProj = mvp;
        gl_Position = mvp;
      }
    `,
    fragmentShader: /* glsl */`
      uniform float uTime;
      uniform sampler2D uReflection;
      uniform sampler2D uFlow;
      uniform vec3 uWaterColor;
      uniform vec3 uDeepColor;
      uniform vec3 uSheenColor;
      uniform vec3 uMoonDir;
      uniform float uReflectStrength;
      uniform float uFlowSpeed;
      uniform vec3 uFogColor;
      uniform float uFogDensity;

      varying vec2 vUv;
      varying vec3 vWorld;
      varying vec4 vProj;
      varying float vWave;

      void main(){
        /* two counter-scrolling normal samples = continuous current */
        vec2 f1 = vUv * vec2(9.0, 7.0) + vec2(uTime * uFlowSpeed, uTime * uFlowSpeed * 0.35);
        vec2 f2 = vUv * vec2(5.0, 4.0) - vec2(uTime * uFlowSpeed * 0.62, uTime * uFlowSpeed * 0.18);
        vec3 n1 = texture2D(uFlow, f1).rgb * 2.0 - 1.0;
        vec3 n2 = texture2D(uFlow, f2).rgb * 2.0 - 1.0;
        vec3 nrm = normalize(vec3(n1.x + n2.x, 3.4, n1.z + n2.z));

        /* screen-space reflection lookup, distorted by the surface normal */
        vec2 screenUv = (vProj.xy / vProj.w) * 0.5 + 0.5;
        vec2 distort = nrm.xz * 0.045;
        vec3 refl = texture2D(uReflection, clamp(screenUv + distort, 0.001, 0.999)).rgb;

        vec3 viewDir = normalize(cameraPosition - vWorld);
        float fres = pow(1.0 - clamp(dot(viewDir, nrm), 0.0, 1.0), 3.0);
        fres = clamp(fres, 0.06, 1.0);

        /* depth tint: darker away from the camera */
        float dist = length(cameraPosition.xz - vWorld.xz);
        vec3 base = mix(uWaterColor, uDeepColor, smoothstep(40.0, 260.0, dist));

        vec3 col = mix(base, refl, fres * uReflectStrength);

        /* moon specular glints riding the crests */
        vec3 halfV = normalize(uMoonDir + viewDir);
        float spec = pow(max(dot(nrm, halfV), 0.0), 220.0);
        col += uSheenColor * spec * 1.5;

        /* foam-lit crest highlight */
        float crest = smoothstep(0.26, 0.50, vWave);
        col += uSheenColor * crest * 0.055;

        /* exp2 fog to match scene.fog */
        float fogF = 1.0 - exp(-uFogDensity * uFogDensity * dist * dist);
        col = mix(col, uFogColor, clamp(fogF, 0.0, 1.0));

        gl_FragColor = vec4(col, 0.94);
      }
    `
  });

  const geo = new THREE.PlaneGeometry(W, D, SEG_X, SEG_Z);
  geo.rotateX(-Math.PI / 2);
  const surface = new THREE.Mesh(geo, surfaceMat);
  surface.name = 'waterFlowSurface';
  surface.position.y = LEVEL;
  surface.renderOrder = 1;
  group.add(surface);

  /* Wire ripple overlay keeps the generative language of the scene */
  const wireGeo = new THREE.PlaneGeometry(W, D, 88, 64);
  wireGeo.rotateX(-Math.PI / 2);
  const wireBase = Float32Array.from(wireGeo.attributes.position.array);
  const wireMat = new THREE.MeshBasicMaterial({
    color: 0x2f5578, wireframe: true, transparent: true, opacity: 0.1, depthWrite: false
  });
  const wire = new THREE.Mesh(wireGeo, wireMat);
  wire.name = 'waterRipples';
  wire.position.y = LEVEL + 0.06;
  wire.renderOrder = 2;
  group.add(wire);

  const wireArr = wireGeo.attributes.position.array;

  /* Moon path sheen lying flat on the water */
  const sheenMat = new THREE.MeshBasicMaterial({
    map: softTexture(2.0),
    color: 0x8fb0d8, transparent: true, opacity: 0.16,
    depthWrite: false, blending: THREE.AdditiveBlending, fog: false
  });
  const sheen = new THREE.Mesh(new THREE.PlaneGeometry(34, 210), sheenMat);
  sheen.name = 'moonSheen';
  sheen.rotation.x = -Math.PI / 2;
  sheen.position.set(-52, LEVEL + 0.12, -70);
  sheen.renderOrder = 3;
  group.add(sheen);

  /* ---- planar reflection pass ---- */
  const reflectMatrix = new THREE.Matrix4().set(
    1, 0, 0, 0,
    0, -1, 0, 2 * LEVEL,
    0, 0, 1, 0,
    0, 0, 0, 1
  );
  const clipPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -LEVEL + 0.08);
  let skip = 0;

  function renderReflection(renderer, scene, camera) {
    /* render at half rate on low quality to stay performance friendly */
    if (quality < 0.8) { skip = (skip + 1) % 2; if (skip) return; }

    surface.visible = false;
    wire.visible = false;
    sheen.visible = false;

    reflectCamera.copy(camera);
    reflectCamera.matrixAutoUpdate = false;
    reflectCamera.matrix.copy(camera.matrixWorld).premultiply(reflectMatrix);
    reflectCamera.matrix.decompose(reflectCamera.position, reflectCamera.quaternion, reflectCamera.scale);
    reflectCamera.updateMatrixWorld(true);
    reflectCamera.projectionMatrix.copy(camera.projectionMatrix);

    const prevTarget = renderer.getRenderTarget();
    const prevClip = renderer.clippingPlanes;
    renderer.clippingPlanes = [clipPlane];
    renderer.setRenderTarget(reflectionRT);
    renderer.clear();
    renderer.render(scene, reflectCamera);
    renderer.setRenderTarget(prevTarget);
    renderer.clippingPlanes = prevClip;

    surface.visible = true;
    wire.visible = true;
    sheen.visible = true;
  }

  return {
    group,
    renderReflection,
    update(dt, et) {
      uniforms.uTime.value = et;

      for (let i = 0; i < wireArr.length; i += 3) {
        const x = wireBase[i], z = wireBase[i + 2];
        wireArr[i + 1] =
          Math.sin(x * 0.055 + et * 0.55) * 0.30 +
          Math.sin(z * 0.082 - et * 0.42) * 0.24 +
          Math.sin((x + z) * 0.032 + et * 0.78) * 0.18;
      }
      wireGeo.attributes.position.needsUpdate = true;

      sheenMat.opacity = 0.1 + Math.sin(et * 0.5) * 0.015;
    },
    dispose() {
      reflectionRT.dispose();
      flowTex.dispose();
    }
  };
}

/* Low-lying cloud banks: soft additive sprites drifting between islands */
export function createClouds(P, spanX) {
  const group = new THREE.Group();
  group.name = 'cloudBanks';
  const tex = softTexture();
  const items = [];

  for (let i = 0; i < 26; i++) {
    const mat = new THREE.SpriteMaterial({
      map: tex,
      color: i % 4 === 0 ? 0x3d5878 : 0x24374d,
      transparent: true,
      opacity: 0.12 + Math.random() * 0.16,
      depthWrite: false,
      blending: THREE.NormalBlending
    });
    const s = new THREE.Sprite(mat);
    const w = 34 + Math.random() * 46;
    s.scale.set(w, w * (0.22 + Math.random() * 0.14), 1);
    s.position.set(
      (Math.random() - 0.5) * spanX * 1.35,
      1.6 + Math.random() * 7.5,
      -14 + Math.random() * 26
    );
    s.name = `cloud_${i}`;
    group.add(s);
    items.push({ sprite: s, speed: 0.25 + Math.random() * 0.6, phase: Math.random() * 100 });
  }

  const limit = spanX * 0.75;
  return {
    group,
    update(dt, et) {
      for (const it of items) {
        it.sprite.position.x += it.speed * dt;
        if (it.sprite.position.x > limit) it.sprite.position.x = -limit;
        it.sprite.position.y += Math.sin(et * 0.3 + it.phase) * dt * 0.16;
      }
    }
  };
}

/* Moon: disc + soft halo on a transparent plane (no sprite banding) */
export function createMoon(P) {
  const group = new THREE.Group();
  group.name = 'moon';
  group.position.set(-78, 40, -140);

  /* Halo: linear-space alpha ramp, depth-tested so it cannot draw over
     the terrain as a block. Steep falloff keeps it a soft bloom. */
  const haloTex = softTexture(3.4);
  haloTex.colorSpace = THREE.NoColorSpace;
  const haloMat = new THREE.MeshBasicMaterial({
    map: haloTex,
    color: 0x7f9ec4,
    transparent: true,
    opacity: 0.2,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    fog: false
  });
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(34, 34), haloMat);
  halo.name = 'moonHalo';
  halo.renderOrder = 0;
  group.add(halo);

  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(8.4, 64),
    new THREE.MeshBasicMaterial({
      color: P.moon, transparent: true, opacity: 0.92,
      depthWrite: false, depthTest: true, fog: false
    })
  );
  disc.name = 'moonDisc';
  disc.position.z = 0.5;
  disc.renderOrder = 1;
  group.add(disc);

  return {
    group,
    update(dt, et) {
      haloMat.opacity = 0.19 + Math.sin(et * 0.4) * 0.02;
    }
  };
}

/* Procedural ripple normal map — tileable, used as the flow/current map */
function rippleNormalTexture(S = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const img = g.createImageData(S, S);
  const d = img.data;

  const height = new Float32Array(S * S);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const u = (x / S) * Math.PI * 2;
      const v = (y / S) * Math.PI * 2;
      height[y * S + x] =
        Math.sin(u * 3 + Math.sin(v * 2) * 0.8) * 0.5 +
        Math.sin(v * 4 - Math.sin(u * 3) * 0.6) * 0.35 +
        Math.sin((u + v) * 5) * 0.18;
    }
  }

  const at = (x, y) => height[((y + S) % S) * S + ((x + S) % S)];
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const dx = at(x + 1, y) - at(x - 1, y);
      const dy = at(x, y + 1) - at(x, y - 1);
      const nx = -dx * 0.5, nz = -dy * 0.5, ny = 1.0;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      const i = (y * S + x) * 4;
      d[i] = Math.round(((nx / len) * 0.5 + 0.5) * 255);
      d[i + 1] = Math.round(((ny / len) * 0.5 + 0.5) * 255);
      d[i + 2] = Math.round(((nz / len) * 0.5 + 0.5) * 255);
      d[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.NoColorSpace;
  t.needsUpdate = true;
  return t;
}

/* Radial falloff texture — premultiplied-safe, smooth to the edge so it
   never renders as a hard-edged block under additive blending. */
function softTexture(power = 2.6) {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const img = g.createImageData(S, S);
  const d = img.data;
  const half = S / 2;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const dx = (x - half) / half;
      const dy = (y - half) / half;
      const r = Math.sqrt(dx * dx + dy * dy);
      const a = r >= 1 ? 0 : Math.pow(1 - r, power);
      const i = (y * S + x) * 4;
      d[i] = 255; d[i + 1] = 255; d[i + 2] = 255;
      d[i + 3] = Math.round(a * 255);
    }
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}