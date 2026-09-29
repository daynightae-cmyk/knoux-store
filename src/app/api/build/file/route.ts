import { NextResponse, type NextRequest } from 'next/server';
import { createProjectAdapter } from '@/lib/build/adapter-factory';
import { guardBuildApi } from '@/lib/build/api-guard';

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

  const adapter = createProjectAdapter();
  const writable = adapter.capabilities()['project.write'];
  const file = await adapter.readFile(requested);

  if (!file) {
    return NextResponse.json(
      { error: 'not-found', message: 'No readable file at that path in this deployment.' },
      { status: 404 },
    );
  }

  return NextResponse.json(
    {
      path: requested,
      ...file,
      // Stated rather than implied: the UI must render a read-only editor.
      readOnly: writable !== 'available',
      readOnlyReason:
        writable !== 'available'
          ? adapter.blockerFor('project.write')
          : null,
    },
    { headers: { 'cache-control': 'no-store' } },
  );
}
