import { checkRequestOrigin, publicRequestOrigin, readBoundedJson } from '../contact/intake-guard';

/** Same-origin, bounded input shared by authenticated Signal submissions. */
export async function readSignalMutation(request: Request): Promise<Record<string, unknown> | Response> {
  if (!checkRequestOrigin(request.headers, publicRequestOrigin(request)).ok) {
    return Response.json({ error: 'Cross-site submission refused.' }, { status: 403 });
  }
  const body = await readBoundedJson(request, 4096);
  if (!body.ok) return Response.json({ error: 'Invalid submission body.' }, { status: body.reason === 'body-too-large' ? 413 : 400 });
  if (!body.value || typeof body.value !== 'object' || Array.isArray(body.value)) {
    return Response.json({ error: 'Expected a JSON object.' }, { status: 400 });
  }
  return body.value as Record<string, unknown>;
}
