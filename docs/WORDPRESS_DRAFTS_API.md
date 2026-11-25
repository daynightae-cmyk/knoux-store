# WordPress site drafts

The draft endpoint uses the signed-in account and an owner-only Postgres policy. The API stores the existing identity editor and composer block data along with theme and plugin selections. The schema is additive and does not import, publish or change a WordPress installation.

- `GET /api/wordpress/drafts` returns draft summaries and `nextOffset`. Pass `offset` for the next page and `id` to open one draft.
- `POST /api/wordpress/drafts` takes `WordPressDraftCreate`. Generate the UUID once per new draft and reuse it after a timeout. A retry returns the existing same-owner record and does not overwrite its contents.
- `PUT /api/wordpress/drafts` takes `WordPressDraftSave`. Supply the last confirmed `expectedRevision`, hold the draft during the request, and update the base revision from the returned `WordPressDraft`. If newer local edits exist, keep them dirty.
- On `409`, retrieve the saved document and review the conflict before retrying. On an aborted save or `503`, reload first to establish whether the save committed. `401` means sign-in is required, `403` is an origin refusal, `404` means the draft is unavailable to this account, and `429` includes a retry delay.
- Use the existing tab draft as the starting input to an explicit create action. Keep it available until cloud storage returns its receipt. No automatic import or publish is part of the API.

Types live in `src/lib/wordpress/site-drafts.ts`. Validate the additive migration on an authorized staging Supabase project before enabling the UI write controls in a deployed environment.
