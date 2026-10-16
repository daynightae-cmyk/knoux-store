import { NextResponse, type NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import { guardGrowth } from '@/lib/growth/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRequestOrigin, publicRequestOrigin } from '@/lib/contact/intake-guard';
import { clientAddress, rateLimit } from '@/lib/http/rate-limit';
import { MEDIA_BUCKET, safeFileName, tenantPath, validateUpload } from '@/lib/growth/media';

export const dynamic = 'force-dynamic';

/** GET: tenant-scoped asset list with short-lived signed URLs. */

const SIGN_TTL_SECONDS = 600;

export async function GET(request: NextRequest) {
  const clientId = request.nextUrl.searchParams.get('clientId') ?? '';
  if (!clientId) return NextResponse.json({ reason: 'Choose a client.' }, { status: 400 });
  const guard = await guardGrowth({ permission: 'creative.view', clientId });
  if (!guard.ok) {
    return NextResponse.json({ ok: false, code: guard.failure.code },
      { status: guard.failure.status, headers: { 'cache-control': 'no-store' } });
  }
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.from('knoux_growth_media_assets')
      .select('id,file_name,mime_type,byte_size,width,height,kind,source,license,created_at,storage_path')
      .eq('client_id', clientId).order('created_at', { ascending: false }).limit(100);
    if (error) return NextResponse.json({ reason: 'Media library unavailable.' }, { status: 503 });
    const assets = [];
    for (const row of (data ?? []) as Record<string, unknown>[]) {
      const path = String(row.storage_path ?? '');
      const { data: signed, error: signError } = await admin.storage.from(MEDIA_BUCKET)
        .createSignedUrl(path, SIGN_TTL_SECONDS);
      assets.push({
        id: String(row.id), fileName: String(row.file_name ?? ''),
        mimeType: String(row.mime_type ?? ''), byteSize: Number(row.byte_size ?? 0),
        kind: String(row.kind ?? 'IMAGE'), createdAt: String(row.created_at ?? ''),
        url: signError ? null : (signed?.signedUrl ?? null),
        urlState: signError ? 'UNRESOLVED' : 'RESOLVED',
      });
    }
    return NextResponse.json({ assets }, { headers: { 'cache-control': 'no-store' } });
  } catch {
    return NextResponse.json({ reason: 'Media storage unavailable.' }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  if (!checkRequestOrigin(request.headers, publicRequestOrigin(request)).ok) {
    return NextResponse.json({ reason: 'Cross-site request refused.' }, { status: 403 });
  }
  if (!rateLimit(`growth-media:${clientAddress(request.headers)}`, { max: 20 }).allowed) {
    return NextResponse.json({ reason: 'Retry later.' }, { status: 429 });
  }
  let form: FormData;
  try { form = await request.formData(); }
  catch { return NextResponse.json({ reason: 'Upload unreadable.' }, { status: 400 }); }
  const clientId = typeof form.get('clientId') === 'string' ? String(form.get('clientId')) : '';
  const file = form.get('file');
  if (!clientId || !(file instanceof File)) {
    return NextResponse.json({ reason: 'Choose a client and a file.' }, { status: 400 });
  }
  const guard = await guardGrowth({ permission: 'creative.create', clientId });
  if (!guard.ok) {
    return NextResponse.json({ ok: false, code: guard.failure.code },
      { status: guard.failure.status, headers: { 'cache-control': 'no-store' } });
  }
  const validation = validateUpload({ mimeType: file.type, byteSize: file.size, clientId, fileName: file.name });
  if (!validation.ok) return NextResponse.json({ reason: validation.reason }, { status: 400 });
  const assetId = randomUUID();
  const storagePath = tenantPath(clientId, assetId, file.name || 'asset');
  try {
    const admin = createAdminClient();
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error: uploadError } = await admin.storage.from(MEDIA_BUCKET)
      .upload(storagePath, bytes, { contentType: file.type, upsert: false });
    if (uploadError) return NextResponse.json({ reason: 'Storage refused upload.' }, { status: 503 });
    const { error: rowError } = await admin.from('knoux_growth_media_assets').insert({
      id: assetId, client_id: clientId, storage_path: storagePath,
      file_name: safeFileName(file.name || 'asset'), mime_type: file.type,
      byte_size: file.size, kind: validation.kind,
      source: 'CLIENT_UPLOAD', license: 'CLIENT_OWNED',
      uploaded_by: guard.principal.userId, origin: 'LIVE',
    });
    if (rowError) {
      await admin.storage.from(MEDIA_BUCKET).remove([storagePath]);
      return NextResponse.json({ reason: 'Asset record refused.' }, { status: 503 });
    }
    const { data: signed } = await admin.storage.from(MEDIA_BUCKET)
      .createSignedUrl(storagePath, SIGN_TTL_SECONDS);
    return NextResponse.json({
      asset: {
        id: assetId, fileName: safeFileName(file.name || 'asset'),
        mimeType: file.type, byteSize: file.size, kind: validation.kind,
        url: signed?.signedUrl ?? null, urlState: signed?.signedUrl ? 'RESOLVED' : 'UNRESOLVED',
      },
    }, { headers: { 'cache-control': 'no-store' } });
  } catch {
    return NextResponse.json({ reason: 'Media storage unavailable.' }, { status: 503 });
  }
}
