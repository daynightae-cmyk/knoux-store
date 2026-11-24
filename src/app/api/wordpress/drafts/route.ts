import { createClient } from '@/lib/supabase/server';
import { checkRequestOrigin, publicRequestOrigin, readBoundedJson } from '@/lib/contact/intake-guard';
import { rateLimit } from '@/lib/http/rate-limit';
import {
  isWordPressDraftDocument, isWordPressDraftId, parseWordPressDraftCreate, parseWordPressDraftSave,
  type WordPressDraft, type WordPressDraftSummary,
} from '@/lib/wordpress/site-drafts';

export const dynamic = 'force-dynamic';

const TABLE = 'knoux_wordpress_site_drafts';
const SUMMARY = 'id,title,revision,updated_at';
const DOCUMENT = 'id,title,revision,updated_at,document';
const LIST_SIZE = 25;

type SummaryRow = { id: string; title: string; revision: number; updated_at: string };
type DraftRow = SummaryRow & { document: unknown };

function reply(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return Response.json(body, {
    status,
    headers: { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...headers },
  });
}

function unavailable() {
  return reply({ message: 'WordPress draft storage is unavailable.' }, 503);
}

function summary(row: SummaryRow): WordPressDraftSummary {
  return { id: row.id, title: row.title, revision: row.revision, updatedAt: row.updated_at };
}

function saved(row: DraftRow, status = 200) {
  if (!isWordPressDraftDocument(row.document)) return unavailable();
  const draft: WordPressDraft = { ...summary(row), document: row.document };
  return reply({ draft }, status);
}

async function owner() {
  const client = await createClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user || data.user.is_anonymous) return null;
  return { client, id: data.user.id };
}

export async function GET(request: Request) {
  try {
    const account = await owner();
    if (!account) return reply({ message: 'Sign in to open WordPress drafts.' }, 401);
    const params = new URL(request.url).searchParams;
    const id = params.get('id');
    if (id !== null) {
      if (!isWordPressDraftId(id)) return reply({ message: 'Invalid WordPress draft ID.' }, 400);
      const { data, error } = await account.client.from(TABLE).select(DOCUMENT)
        .eq('owner_id', account.id).eq('id', id.toLowerCase()).maybeSingle();
      if (error) return unavailable();
      return data ? saved(data) : reply({ message: 'WordPress draft not found.' }, 404);
    }

    const rawOffset = params.get('offset') ?? '0';
    if (!/^(0|[1-9][0-9]{0,3})$/.test(rawOffset)) return reply({ message: 'Invalid list offset.' }, 400);
    const offset = Number(rawOffset);
    const { data, error } = await account.client.from(TABLE).select(SUMMARY).eq('owner_id', account.id)
      .order('updated_at', { ascending: false }).order('id').range(offset, offset + LIST_SIZE);
    if (error) return unavailable();
    const nextOffset = data.length > LIST_SIZE && offset + LIST_SIZE <= 9999 ? offset + LIST_SIZE : null;
    return reply({ drafts: data.slice(0, LIST_SIZE).map(summary), nextOffset });
  } catch {
    return unavailable();
  }
}

async function mutate(request: Request, action: 'create' | 'save') {
  const origin = publicRequestOrigin(request);
  if (request.headers.get('origin') !== origin || !checkRequestOrigin(request.headers, origin).ok) {
    return reply({ message: 'Same-origin draft change required.' }, 403);
  }

  try {
    const account = await owner();
    if (!account) return reply({ message: 'Sign in to save WordPress drafts.' }, 401);
    const limit = rateLimit('wordpress-draft-write:' + account.id, { max: 30 });
    if (!limit.allowed) return reply({ message: 'Too many draft saves. Wait and try again.' }, 429, { 'retry-after': String(limit.retryAfterSeconds) });

    const parsed = await readBoundedJson(request, 64 * 1024);
    if (!parsed.ok) return reply({ message: 'Invalid WordPress draft request.' }, parsed.reason === 'body-too-large' ? 413 : 400);
    const db = account.client;
    if (action === 'create') {
      const draft = parseWordPressDraftCreate(parsed.value);
      if (!draft) return reply({ message: 'Invalid WordPress draft document.' }, 400);
      const { data, error } = await db.from(TABLE).insert(draft).select(DOCUMENT).single();
      if (!error) return saved(data, 201);
      if (error.code !== '23505') return unavailable();
      const existing = await db.from(TABLE).select(DOCUMENT).eq('owner_id', account.id).eq('id', draft.id).maybeSingle();
      return !existing.error && existing.data ? saved(existing.data) : unavailable();
    }

    const draft = parseWordPressDraftSave(parsed.value);
    if (!draft) return reply({ message: 'A valid document and expected revision are required.' }, 400);
    const { data, error } = await db.from(TABLE).update({ title: draft.title, document: draft.document })
      .eq('owner_id', account.id).eq('id', draft.id).eq('revision', draft.expectedRevision)
      .select(DOCUMENT).maybeSingle();
    if (error) return unavailable();
    if (data) return saved(data);

    const latest = await db.from(TABLE).select('revision').eq('owner_id', account.id).eq('id', draft.id).maybeSingle();
    if (latest.error) return unavailable();
    if (!latest.data) return reply({ message: 'WordPress draft not found.' }, 404);
    return reply({ message: 'The draft changed. Reload before saving.', revision: latest.data.revision }, 409);
  } catch {
    return unavailable();
  }
}

export function POST(request: Request) {
  return mutate(request, 'create');
}

export function PUT(request: Request) {
  return mutate(request, 'save');
}
