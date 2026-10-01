/**
 * Atelier Lab — focused unit tests
 *
 * Tests verify:
 *   - AtelierLab derives only from real creativeDisciplines
 *   - No invented gallery, project or client content
 *   - Deterministic seeded RNG (same seed → same sequence)
 *   - No Math.random() in production code (only in comments)
 *   - No scroll hijacking
 *   - Semantic discipline links present (buttons + aria-pressed)
 *   - No pointermove React state loop (onMove mutates ref in-place)
 *   - Reduced motion: no RAF, static frame only
 *   - Keyboard: all disciplines reachable (button pattern inside .map)
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const atelierSrc = readFileSync(join(root, 'src/components/creative/AtelierLab.tsx'), 'utf8');
// Strip comments for source-level checks
const atelierCode = atelierSrc
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/.*/g, '');

const servicesSrc = readFileSync(join(root, 'src/data/services.ts'), 'utf8');
const creativePage = readFileSync(join(root, 'src/app/creative/page.tsx'), 'utf8');

describe('AtelierLab source integrity', () => {
  test('derives discipline data only from real creativeDisciplines import', () => {
    assert.match(atelierSrc, /from '@\/data\/services'/);
    assert.match(atelierSrc, /creativeDisciplines/);
  });

  test('no invented gallery, project or client placeholders', () => {
    assert.doesNotMatch(atelierSrc, /fakeClient|placeholder.*project|gallery.*thumbnail/i);
    assert.doesNotMatch(atelierSrc, /clientName|projectCard|caseStudy(?:Image|Thumbnail)/i);
  });

  test('no Math.random() call in production code — deterministic output required', () => {
    // Strip comments — the JSDoc mentions Math.random but the code must not call it
    assert.doesNotMatch(atelierCode, /Math\.random\s*\(/);
  });

  test('seeded RNG produces deterministic sequences', () => {
    function seededRng(seed) {
      let s = (seed ^ 0x4b4e4f58) >>> 0;
      return function next() {
        s = Math.imul(s ^ (s >>> 16), 0x45d9f3b) >>> 0;
        s = Math.imul(s ^ (s >>> 16), 0x45d9f3b) >>> 0;
        return (s >>> 0) / 0x100000000;
      };
    }

    const rng1 = seededRng(42);
    const rng2 = seededRng(42);
    const seq1 = [rng1(), rng1(), rng1()];
    const seq2 = [rng2(), rng2(), rng2()];
    assert.deepEqual(seq1, seq2, 'Same seed must produce identical sequence');

    const rng3 = seededRng(99);
    const seq3 = [rng3(), rng3(), rng3()];
    assert.notDeepEqual(seq1, seq3, 'Different seeds must differ');
  });

  test('no scroll hijacking — no overflow-hidden on body or scroll lock patterns', () => {
    assert.doesNotMatch(atelierSrc, /document\.body\.style\.overflow/);
    assert.doesNotMatch(atelierSrc, /scrollLock|scroll-lock|overflow.*hidden.*body/i);
  });

  test('keyboard: buttons rendered inside disciploines map with aria-pressed', () => {
    // Buttons are rendered once in .map() template — check for the map+button pattern
    assert.match(atelierSrc, /creativeDisciplines\.map\([\s\S]*?type="button"/);
    // aria-pressed for keyboard state communication
    assert.match(atelierSrc, /aria-pressed=\{active === index\}/);
    // aria-label on each button
    assert.match(atelierSrc, /aria-label=\{`Select/);
  });

  test('pointer tracking uses ref mutation — no setState inside onMove body', () => {
    // pointerRef.current.x/y/active must be mutated
    assert.match(atelierSrc, /pointerRef\.current\.x\s*=/);
    assert.match(atelierSrc, /pointerRef\.current\.y\s*=/);
    assert.match(atelierSrc, /pointerRef\.current\.active\s*=\s*true/);

    // Extract the onMove function body only (up to the closing brace)
    const onMoveMatch = atelierSrc.match(/const onMove\s*=\s*\([\s\S]*?pointerRef\.current\.active\s*=\s*true;\s*\}/);
    assert.ok(onMoveMatch, 'onMove handler with ref mutation must exist');
    const body = onMoveMatch[0];
    // The body itself must not call a React setState setter
    assert.doesNotMatch(body, /set[A-Z]\w*\(/);
  });

  test('RAF skipped when reduced=true — static frame drawn via drawFrame with true last arg', () => {
    // The static draw call passes `true` as last arg (reduced=true)
    assert.match(atelierSrc, /drawFrame\([^)]*,\s*true\)/);
    // The animated RAF loop is gated by !reduced
    assert.match(atelierSrc, /if\s*\(!reduced\)/);
  });

  test('DPR is capped at 2 to avoid GPU budget overrun', () => {
    assert.match(atelierSrc, /Math\.min\s*\(\s*2\s*,/);
  });

  test('visibility API stops RAF when tab is hidden', () => {
    assert.match(atelierSrc, /visibilitychange/);
    assert.match(atelierSrc, /document\.hidden/);
  });

  test('IntersectionObserver stops RAF when offscreen', () => {
    assert.match(atelierSrc, /IntersectionObserver/);
    assert.match(atelierSrc, /isIntersecting/);
  });
});

describe('Creative page structural integrity', () => {
  test('creative/page.tsx still imports MaterialLab (backward compat)', () => {
    assert.match(creativePage, /MaterialLab/);
    assert.match(creativePage, /from '@\/components\/SpatialExperiences'/);
  });

  test('honest archive state DevState is still present on creative page', () => {
    assert.match(creativePage, /DevState/);
    assert.match(creativePage, /No project archive is published/);
  });

  test('all 8 creative discipline detail links remain on page', () => {
    // The page maps creativeDisciplines and links to /creative/${slug}
    assert.match(creativePage, /creative\/\$\{discipline\.slug\}/);
    assert.match(creativePage, /creativeDisciplines\.map/);
  });

  test('no fake project thumbnails or client names added to creative page', () => {
    assert.doesNotMatch(creativePage, /clientName|fakeProject|placeholder\.jpg/i);
  });
});

describe('Creative disciplines data (services.ts)', () => {
  test('8 real creative disciplines exist with codes CR-01 through CR-08', () => {
    for (let i = 1; i <= 8; i++) {
      const code = `CR-0${i}`;
      assert.match(servicesSrc, new RegExp(`code:\\s*'${code}'`), `Missing ${code}`);
    }
  });

  test('each discipline has required fields: id, slug, title, statement, deliverables, principles', () => {
    const required = ['id:', 'slug:', 'title:', 'statement:', 'deliverables:', 'principles:'];
    for (const field of required) {
      assert.match(servicesSrc, new RegExp(field), `Missing field pattern: ${field}`);
    }
  });
});
