import 'server-only';
import { estimateTokens } from './contract';
import type { ContextSelection, ContextBundle } from './types';

/**
 * Context manager. Builds a safe context bundle for AI requests.
 *
 * Enforces exclusions server-side — not just UI hiding:
 * - .env* files (secrets)
 * - private tokens / credential files
 * - node_modules
 * - .next (build artifacts)
 * - binary artifacts
 * - .git directory
 *
 * Never automatically sends the entire repository. The user selects what
 * to include.
 */

const EXCLUSION_PATTERNS = [
  /\.env/i,
  /\.env\./i,
  /node_modules/i,
  /\.next/i,
  /\.git\//i,
  /\.nuxt/i,
  /\.svelte-kit/i,
  /dist\//i,
  /build\//i,
  /\.DS_Store/i,
  /package-lock\.json$/i,
  /yarn\.lock$/i,
  /pnpm-lock\.yaml$/i,
  /\.png$/i,
  /\.jpg$/i,
  /\.jpeg$/i,
  /\.gif$/i,
  /\.ico$/i,
  /\.svg$/i,
  /\.pdf$/i,
  /\.zip$/i,
  /\.tar$/i,
  /\.gz$/i,
  /\.woff$/i,
  /\.woff2$/i,
  /\.ttf$/i,
  /\.eot$/i,
  /\.mp4$/i,
  /\.mp3$/i,
  /\.webm$/i,
  /\.dat$/i,
  /\.bin$/i,
  /\.exe$/i,
  /\.dll$/i,
  /\.so$/i,
  /\.dylib$/i,
  /secret/i,
  /credential/i,
  /\.pem$/i,
  /\.key$/i,
  /\.p12$/i,
  /\.pfx$/i,
];

const MAX_FILE_BYTES = 100_000; // ~25K tokens per file
const MAX_TOTAL_BYTES = 500_000; // ~125K tokens total

function isExcluded(path: string): boolean {
  return EXCLUSION_PATTERNS.some((pattern) => pattern.test(path));
}

export function buildContextBundle(
  selections: ContextSelection[],
  fileContents: Map<string, string>,
): ContextBundle {
  const entries: ContextBundle['entries'] = [];
  let totalBytes = 0;
  let excludedCount = 0;

  for (const selection of selections) {
    if (selection.type === 'pasted' || selection.type === 'instructions') {
      // User-pasted content is always included
      const content = selection.path ? (fileContents.get(selection.path) ?? '') : '';
      const bytes = Buffer.byteLength(content, 'utf-8');
      const tokens = estimateTokens(content);
      totalBytes += bytes;
      entries.push({ path: selection.path, content, lines: content.split('\n').length, excluded: false, exclusionReason: null });
      continue;
    }

    if (selection.type === 'git-diff') {
      const content = fileContents.get('__git_diff__') ?? '';
      const bytes = Buffer.byteLength(content, 'utf-8');
      totalBytes += bytes;
      entries.push({ path: null, content, lines: content.split('\n').length, excluded: false, exclusionReason: null });
      continue;
    }

    // File or directory entries
    const path = selection.path ?? '';
    if (isExcluded(path)) {
      excludedCount++;
      entries.push({ path, content: '', lines: 0, excluded: true, exclusionReason: 'File matches exclusion pattern (secrets, build artifacts, or binary).' });
      continue;
    }

    const content = fileContents.get(path);
    if (content === undefined) {
      entries.push({ path, content: '', lines: 0, excluded: true, exclusionReason: 'File content not provided.' });
      continue;
    }

    const truncated = content.length > MAX_FILE_BYTES ? content.slice(0, MAX_FILE_BYTES) + '\n... [truncated]' : content;
    const bytes = Buffer.byteLength(truncated, 'utf-8');

    if (totalBytes + bytes > MAX_TOTAL_BYTES) {
      entries.push({ path, content: '', lines: 0, excluded: true, exclusionReason: 'Total context bundle exceeds size limit.' });
      excludedCount++;
      continue;
    }

    totalBytes += bytes;
    entries.push({ path, content: truncated, lines: truncated.split('\n').length, excluded: false, exclusionReason: null });
  }

  const totalTokenEstimate = entries.reduce((sum, e) => sum + estimateTokens(e.content), 0);

  return {
    entries,
    totalTokenEstimate,
    totalBytes,
    excludedCount,
  };
}

export function isPathExcluded(path: string): boolean {
  return isExcluded(path);
}

export function formatContextForPrompt(bundle: ContextBundle): string {
  const parts: string[] = [];
  for (const entry of bundle.entries) {
    if (entry.excluded) continue;
    if (entry.path) {
      parts.push(`--- ${entry.path} ---\n${entry.content}`);
    } else {
      parts.push(entry.content);
    }
  }
  return parts.join('\n\n');
}
