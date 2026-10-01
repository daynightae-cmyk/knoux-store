/**
 * Labs Experiment Chamber V2 — Focused Contract Tests
 *
 * Verifies:
 *   - Only real labExperiments from data/software.ts are rendered (exactly 2: Quill, Crypt)
 *   - Quill and Crypt remain 'research' status (never promoted to production/release)
 *   - No fake experiments, metrics, models, or releases
 *   - Selector uses button elements with aria-pressed and visible focus
 *   - Hash synchronization supported (#lab-quill, #lab-crypt)
 *   - Deterministic visual state (no Math.random in component source)
 *   - Pointer interaction updates mutable ref without React state loops
 *   - Lifecycle cleanup (cancelAnimationFrame, observers disconnect, listeners removed)
 *   - Reduced motion path (static frame, no continuous loop)
 *   - WebGL fallback to Canvas 2D exists
 *   - Reference files remain read-only / untouched
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const softwareSrc = readFileSync(join(root, 'src/data/software.ts'), 'utf8');
const fieldSrc = readFileSync(join(root, 'src/components/labs/LabMaterialField.tsx'), 'utf8');
const chamberSrc = readFileSync(join(root, 'src/components/labs/ExperimentChamberV2.tsx'), 'utf8');
const spatialSrc = readFileSync(join(root, 'src/components/SpatialExperiences.tsx'), 'utf8');
const labsPageSrc = readFileSync(join(root, 'src/app/labs/page.tsx'), 'utf8');

// Strip comments for source checks
const fieldCode = fieldSrc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');
const chamberCode = chamberSrc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');

describe('Canonical Labs Truth & Integrity', () => {
  test('exactly two real lab experiments exist: LAB-01 Quill and LAB-02 Crypt', () => {
    assert.match(softwareSrc, /id:\s*'lab-quill'/);
    assert.match(softwareSrc, /code:\s*'LAB-01'/);
    assert.match(softwareSrc, /name:\s*'KNOuX Quill'/);

    assert.match(softwareSrc, /id:\s*'lab-crypt'/);
    assert.match(softwareSrc, /code:\s*'LAB-02'/);
    assert.match(softwareSrc, /name:\s*'KNOuX Crypt'/);

    // No third experiment defined
    assert.doesNotMatch(softwareSrc, /code:\s*'LAB-03'/);
  });

  test('both experiments are marked research — never released or production', () => {
    const quillMatch = softwareSrc.match(/id:\s*'lab-quill'[\s\S]*?status:\s*'(\w+)'/);
    const cryptMatch = softwareSrc.match(/id:\s*'lab-crypt'[\s\S]*?status:\s*'(\w+)'/);

    assert.ok(quillMatch, 'quill record must exist');
    assert.ok(cryptMatch, 'crypt record must exist');
    assert.equal(quillMatch[1], 'research');
    assert.equal(cryptMatch[1], 'research');
  });

  test('no fake scientific metrics, models or benchmark claims added', () => {
    assert.doesNotMatch(chamberCode, /benchmark|accuracy|throughput|flops|parameters|mflops/i);
    assert.doesNotMatch(fieldCode, /benchmark|accuracy|throughput|flops|parameters/i);
  });

  test('honest PROTOTYPE FIELD / NOT A RELEASE badge is present', () => {
    assert.match(chamberSrc, /PROTOTYPE FIELD \/ NOT A RELEASE/);
  });
});

describe('ExperimentChamber Component Architecture', () => {
  test('derives data from canonical labExperiments', () => {
    assert.match(chamberSrc, /from '@\/data\/software'/);
    assert.match(chamberSrc, /labExperiments/);
  });

  test('hash synchronization is implemented for #lab-quill and #lab-crypt', () => {
    assert.match(chamberSrc, /window\.location\.hash/);
    assert.match(chamberSrc, /hashchange/);
    assert.match(chamberSrc, /replaceState/);
  });

  test('selector uses semantic button elements with aria-pressed', () => {
    assert.match(chamberSrc, /<button[\s\S]*?aria-pressed=\{active === index\}/);
    assert.match(chamberSrc, /type="button"/);
    assert.match(chamberSrc, /role="group"/);
    assert.match(chamberSrc, /aria-label="Choose a lab experiment"/);
  });

  test('SpatialExperiences.tsx delegates ExperimentChamber to ExperimentChamberV2', () => {
    assert.match(spatialSrc, /import \{ ExperimentChamberV2 \} from '@\/components\/labs\/ExperimentChamberV2'/);
    assert.match(spatialSrc, /export function ExperimentChamber\(\)\s*\{\s*return <ExperimentChamberV2 \/>;\s*\}/);
  });

  test('labs/page.tsx still renders ExperimentChamber and disclosures', () => {
    assert.match(labsPageSrc, /<ExperimentChamber \/>/);
    assert.match(labsPageSrc, /VIEW EXPERIMENT EVIDENCE/);
    assert.match(labsPageSrc, /VIEW UNPUBLISHED REPOSITORIES/);
  });
});

describe('Science Lab SDF Dot-Matrix Visual Field Engine', () => {
  test('uses raw Three.js with PlaneGeometry and ShaderMaterial', () => {
    assert.match(fieldSrc, /import \* as THREE from 'three'/);
    assert.match(fieldSrc, /new THREE\.PlaneGeometry\(2,\s*2\)/);
    assert.match(fieldSrc, /new THREE\.ShaderMaterial/);
  });

  test('implements procedural SDF for Quill (linguistic flow) and Crypt (encryption volumes)', () => {
    assert.match(fieldSrc, /sdQuill/);
    assert.match(fieldSrc, /sdCrypt/);
    assert.match(fieldSrc, /sceneSDF/);
  });

  test('implements dot-matrix grid quantization in fragment shader', () => {
    assert.match(fieldSrc, /uDotSize/);
    assert.match(fieldSrc, /uDotGap/);
    assert.match(fieldSrc, /uScanlines/);
    assert.match(fieldSrc, /cellCenter/);
  });

  test('no Math.random() in component production code', () => {
    assert.doesNotMatch(fieldCode, /Math\.random\s*\(/);
    assert.doesNotMatch(chamberCode, /Math\.random\s*\(/);
  });

  test('pointer interaction mutates ref without React setState per frame', () => {
    assert.match(fieldSrc, /pointerRef\.current\.targetX\s*=/);
    assert.match(fieldSrc, /pointerRef\.current\.targetY\s*=/);
    assert.match(fieldSrc, /pointerRef\.current\.pressed\s*=/);

    // No setState in pointer handlers
    const moveBlock = fieldSrc.match(/const onPointerMove\s*=\s*\([\s\S]*?\};\s*const onPointerDown/);
    assert.ok(moveBlock);
    assert.doesNotMatch(moveBlock[0], /set[A-Z]\w*\(/);
  });

  test('adaptive GPU quality tiers are defined with pixelRatio capped at <= 1.5', () => {
    assert.match(fieldSrc, /detectGpuTier/);
    assert.match(fieldSrc, /QUALITY_PRESETS/);
    assert.match(fieldSrc, /Math\.min\([^)]*1\.5\)/);
  });

  test('IntersectionObserver and visibility API pause animation loop', () => {
    assert.match(fieldSrc, /IntersectionObserver/);
    assert.match(fieldSrc, /isIntersecting/);
    assert.match(fieldSrc, /visibilitychange/);
    assert.match(fieldSrc, /document\.hidden/);
  });

  test('reduced-motion path renders single static frame without continuous RAF loop', () => {
    assert.match(fieldSrc, /prefers-reduced-motion/);
    assert.match(fieldSrc, /if\s*\(reducedMotion\)\s*\{[\s\S]*?renderFrame\(1\.0\);/);
  });

  test('robust WebGL fallback to Canvas 2D exists', () => {
    assert.match(fieldSrc, /webGlSupported/);
    assert.match(fieldSrc, /render2DFallback/);
    assert.match(fieldSrc, /fallbackCanvasRef/);
  });

  test('lifecycle cleanup releases all GPU resources on unmount', () => {
    assert.match(fieldSrc, /cancelAnimationFrame\(rafId\)/);
    assert.match(fieldSrc, /ro\.disconnect\(\)/);
    assert.match(fieldSrc, /io\.disconnect\(\)/);
    assert.match(fieldSrc, /geometry\.dispose\(\)/);
    assert.match(fieldSrc, /material\?\.dispose\(\)/);
    assert.match(fieldSrc, /renderer\?\.dispose\(\)/);
  });
});

describe('Reference File Isolation & Immutability', () => {
  test('authorized reference 02 files are isolated from runtime and not mutated', () => {
    // Production components must never import runtime code from references
    assert.doesNotMatch(fieldSrc, /from ['"].*references\//);
    assert.doesNotMatch(chamberSrc, /from ['"].*references\//);

    const refPath = join(root, 'references/visual-library/originals/02-science-lab-sdf-dot-matrix/index.js');
    if (existsSync(refPath)) {
      const refContent = readFileSync(refPath, 'utf8');
      assert.match(refContent, /OrbitControls/);
      assert.match(refContent, /sceneCompound/);
    }
  });
});
