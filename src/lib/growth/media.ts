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
  'video/mp4': { kind: 'VIDEO' as const, maxBytes: 20 * 1024 * 1024 },
} as const;

export type AllowedMime = keyof typeof ALLOWED_MIME;

export const validMediaClient = (value: string) => /^[a-zA-Z0-9_-]{1,120}$/.test(value);

/** Reject MIME spoofing before storage; decoding/transcoding remains a separate step. */
export function matchesMediaSignature(bytes: Uint8Array, mime: string): boolean {
  const at = (offset: number, values: number[]) => values.every((value, i) => bytes[offset + i] === value);
  if (mime === 'image/jpeg') return bytes.length >= 12 && at(0, [255, 216, 255]) && at(bytes.length - 2, [255, 217]);
  if (mime === 'image/png') return bytes.length >= 45 && at(0, [137, 80, 78, 71, 13, 10, 26, 10]) && at(8, [0, 0, 0, 13]) && at(12, [73, 72, 68, 82]) && at(bytes.length - 8, [73, 69, 78, 68]) && new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(16) > 0 && new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(20) > 0;
  if (mime === 'image/webp') return bytes.length >= 20 && at(0, [82, 73, 70, 70]) && at(8, [87, 69, 66, 80]) && new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(4, true) + 8 === bytes.length && ['VP8 ', 'VP8L', 'VP8X'].includes(String.fromCharCode(...bytes.slice(12, 16)));
  if (mime === 'video/mp4') return bytes.length >= 24 && at(4, [102, 116, 121, 112]) && ['isom', 'iso2', 'mp41', 'mp42', 'avc1', 'M4V '].includes(String.fromCharCode(...bytes.slice(8, 12)));
  return false;
}

/** Enforce the cap on actual streamed bytes before invoking the multipart parser. */
export async function boundedMediaForm(request: Request): Promise<FormData> {
  const limit = 21 * 1024 * 1024;
  const declared = Number(request.headers.get('content-length'));
  if (declared > limit) throw new RangeError('Upload exceeds the request limit.');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Upload body missing.');
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let length = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > limit) { await reader.cancel(); throw new RangeError('Upload exceeds the request limit.'); }
    chunks.push(new Uint8Array(value));
  }
  return new Response(new Blob(chunks), { headers: { 'content-type': request.headers.get('content-type') ?? '' } }).formData();
}

export function isAllowedMime(mime: string): mime is AllowedMime {
  return Object.hasOwn(ALLOWED_MIME, mime);
}

/** Tenant path: "<clientId>/<assetId>-<safe-name>". First segment is the tenant. */
export function tenantPath(clientId: string, assetId: string, fileName: string): string {
  return `${clientId}/${assetId}-${safeFileName(fileName)}`;
}

/** Strip path traversal, control chars and overlong names. Never returns empty. */
export function safeFileName(name: string): string {
  const base = (name.split(/[\\/]/).pop() ?? 'asset').replace(/[^\w.\-() ]+/g, '_').replace(/\.{2,}/g, '_').trim().slice(0, 120);
  return base || 'asset';
}

export type MediaValidation =
  | { ok: true; kind: 'IMAGE' | 'VIDEO' }
  | { ok: false; reason: string };

export function validateUpload(input: { mimeType: string; byteSize: number; clientId: string; fileName: string }): MediaValidation {
  if (!validMediaClient(input.clientId)) return { ok: false, reason: 'A valid client workspace is required.' };
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
