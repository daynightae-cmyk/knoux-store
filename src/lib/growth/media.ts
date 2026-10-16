/**
 * KNOuX Growth — media asset validation and resolution.
 *
 * Pure functions, no I/O. The route layer performs storage + DB writes;
 * this module decides what is acceptable and what a reference means.
 */

export const MEDIA_BUCKET = 'growth-media';

export const ALLOWED_MIME = {
  'image/jpeg': { kind: 'IMAGE' as const, maxBytes: 10 * 1024 * 1024 },
  'image/png': { kind: 'IMAGE' as const, maxBytes: 10 * 1024 * 1024 },
  'image/webp': { kind: 'IMAGE' as const, maxBytes: 10 * 1024 * 1024 },
  'video/mp4': { kind: 'VIDEO' as const, maxBytes: 100 * 1024 * 1024 },
} as const;

export type AllowedMime = keyof typeof ALLOWED_MIME;

export function isAllowedMime(mime: string): mime is AllowedMime {
  return Object.hasOwn(ALLOWED_MIME, mime);
}

/** Tenant path: "<clientId>/<assetId>-<safe-name>". First segment is the tenant. */
export function tenantPath(clientId: string, assetId: string, fileName: string): string {
  return `${clientId}/${assetId}-${safeFileName(fileName)}`;
}

/** Strip path traversal, control chars and overlong names. Never returns empty. */
export function safeFileName(name: string): string {
  const base = (name.split(/[\\/]/).pop() ?? 'asset').replace(/[^\w.\-() ]+/g, '_').trim().slice(0, 120);
  return base || 'asset';
}

export type MediaValidation =
  | { ok: true; kind: 'IMAGE' | 'VIDEO' }
  | { ok: false; reason: string };

export function validateUpload(input: { mimeType: string; byteSize: number; clientId: string; fileName: string }): MediaValidation {
  if (!input.clientId || /[/\\]/.test(input.clientId)) return { ok: false, reason: 'A valid client workspace is required.' };
  if (!isAllowedMime(input.mimeType)) {
    return { ok: false, reason: 'Only JPEG, PNG, WebP images and MP4 video are accepted.' };
  }
  const limit = ALLOWED_MIME[input.mimeType].maxBytes;
  if (!Number.isSafeInteger(input.byteSize) || input.byteSize <= 0) return { ok: false, reason: 'File size is invalid.' };
  if (input.byteSize > limit) {
    return { ok: false, reason: `File exceeds the ${Math.round(limit / 1024 / 1024)}MB limit for ${input.mimeType}.` };
  }
  if (!safeFileName(input.fileName)) return { ok: false, reason: 'File name is invalid.' };
  return { ok: true, kind: ALLOWED_MIME[input.mimeType].kind };
}

export type ResolvedMedia =
  | { state: 'RESOLVED'; url: string; kind: 'IMAGE' | 'VIDEO'; mimeType: string }
  | { state: 'EMPTY' }
  | { state: 'UNRESOLVED'; reference: string };

/** Pure projection: a creative's media state given an optional signed URL. */
export function resolveMediaState(input: {
  mediaAssetId?: string | null;
  signedUrl?: string | null;
  mimeType?: string | null;
  legacyAssetRef?: string | null;
}): ResolvedMedia {
  if (input.signedUrl && input.mediaAssetId) {
    const kind = input.mimeType === 'video/mp4' ? 'VIDEO' : 'IMAGE';
    return { state: 'RESOLVED', url: input.signedUrl, kind, mimeType: input.mimeType ?? 'image/jpeg' };
  }
  if (input.mediaAssetId) return { state: 'UNRESOLVED', reference: input.mediaAssetId };
  if (input.legacyAssetRef) return { state: 'UNRESOLVED', reference: input.legacyAssetRef };
  return { state: 'EMPTY' };
}
