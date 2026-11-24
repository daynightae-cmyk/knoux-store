import { NextResponse, type NextRequest } from 'next/server';
import { requestProjectAdapter } from '@/lib/build/request-adapter';
import { guardBuildApi, resolveBuildOwnerId } from '@/lib/build/api-guard';
import type { ProjectFileDocument, ProjectFileSaveRequest } from '@/lib/build/types';
import { checkRequestOrigin, publicRequestOrigin, readBoundedJson } from '@/lib/contact/intake-guard';
import { rateLimit } from '@/lib/http/rate-limit';

export const dynamic = 'force-dynamic';

/** Reject anything that is not a plain relative path before touching the disk. */
function isSafeRelativePath(value: string): boolean {
  if (value.length === 0 || value.length > 400) return false;
  if (value.includes('\0')) return false;
  if (value.startsWith('/') || value.startsWith('\\')) return false;
  if (/^[a-zA-Z]:/.test(value)) return false;
  const segments = value.split(/[\\/]/);
  if (segments.some((segment) => segment === '..')) return false;
  return segments.every((segment) => segment.length > 0);
}

export async function GET(request: NextRequest) {
  const denied = await guardBuildApi(request, { scope: 'file' });
  if (denied) return denied;

  const requested = request.nextUrl.searchParams.get('path') ?? '';
  if (!isSafeRelativePath(requested)) {
    return NextResponse.json(
      { error: 'invalid-path', message: 'Provide a repository-relative path. Absolute paths and traversal are refused.' },
      { status: 400 },
    );
  }

  let adapter;
  try { adapter = await requestProjectAdapter(request); } catch { return NextResponse.json({ message: 'Selected project is unavailable. Sign in and pair its bridge.' }, { status: 409 }); }
  const file = await adapter.readFile(requested).catch(() => null);

  if (!file) {
    return NextResponse.json(
      { error: 'not-found', message: 'No readable file at that path in this deployment.' },
      { status: 404 },
    );
  }

  const writable = adapter.capabilities()['project.write'] === 'available'
    && Boolean(file.hash) && /\.(?:tsx?|jsx?|mjs|json|css|md)$/.test(requested);
  const document: ProjectFileDocument = {
    path: requested,
    ...file,
    readOnly: !writable,
    readOnlyReason: writable ? null : adapter.blockerFor('project.write') ?? 'This file is read-only in the editor.',
  };
  return NextResponse.json(document, { headers: { 'cache-control': 'no-store' } });
}

function saveError(status: number, message: string) {
  return NextResponse.json({ message }, { status, headers: { 'cache-control': 'no-store' } });
}

export async function PUT(request: NextRequest) {
  const denied = await guardBuildApi(request, { scope: 'file-save' });
  if (denied) return denied;
  const origin = publicRequestOrigin(request);
  if (request.headers.get('origin') !== origin || !checkRequestOrigin(request.headers, origin).ok) {
    return saveError(403, 'Same-origin editor save required.');
  }
  const ownerId = await resolveBuildOwnerId();
  if (!ownerId) return saveError(401, 'Sign in to save files to your paired machine.');
  if (!request.nextUrl.searchParams.get('project')) {
    return saveError(400, 'Select a paired local project before saving.');
  }
  if (!rateLimit(`build-project-save:${ownerId}`).allowed) {
    return saveError(429, 'Too many save requests. Wait a moment and try again.');
  }

  const parsed = await readBoundedJson(request, 4 * 1024 * 1024);
  if (!parsed.ok) {
    return parsed.reason === 'body-too-large'
      ? saveError(413, 'The save request is too large.')
      : saveError(400, 'Expected a JSON save request.');
  }
  const input = parsed.value as Partial<ProjectFileSaveRequest> | null;
  if (!input || typeof input.path !== 'string' || !isSafeRelativePath(input.path)
    || typeof input.content !== 'string' || typeof input.expectedHash !== 'string'
    || !/^[a-f0-9]{64}$/.test(input.expectedHash)) {
    return saveError(400, 'Provide a relative path, content and the hash returned when the file was opened.');
  }
  if (Buffer.byteLength(input.content, 'utf8') > 512 * 1024) {
    return saveError(413, 'The editor file exceeds the 512 KB limit.');
  }
  const adapter = await requestProjectAdapter(request, ownerId).catch(() => null);
  if (!adapter?.saveFile || adapter.capabilities()['project.write'] !== 'available') {
    return saveError(409, 'Select an available project on a paired bridge that supports editor saves.');
  }
  const result = await adapter.saveFile({ path: input.path, content: input.content, expectedHash: input.expectedHash });
  if ('status' in result) return saveError(result.status, result.message);
  return NextResponse.json(result.receipt, { headers: { 'cache-control': 'no-store' } });
}
