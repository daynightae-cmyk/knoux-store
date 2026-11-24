# Build integration contracts

## Paired project editor

Use `GET /api/build/file?project=<projectRef>&path=<relativePath>` to open or reload a document. The response is `ProjectFileDocument` from `src/lib/build/types.ts`. The bridge filesystem supplies the content and hash. Keep the last confirmed hash alongside the editor draft. A missing hash, `readOnly: true`, or unavailable project capability means the document cannot be saved. Requests without a selected project retain the checkout's read-only inspection mode.

Use `PUT /api/build/file?project=<projectRef>` with `ProjectFileSaveRequest` to save an existing source or documentation file. The request requires the signed-in owner's bridge pairing and a same-origin request. The bridge must advertise `projectFileSave` in its handshake. It accepts a signed `fs:write` ticket and records the write in its audit log. The editor save uses a bounded UTF-8 file, a named project and an existing path. No create or rename operation is part of this contract.

- While saving, keep the user's draft and capture the exact content being submitted. Apply the returned `ProjectFileSaveReceipt` only to the project and document that initiated the request. Use the returned hash as the base for the next save. If the user typed during the save, keep those newer changes dirty.
- Treat `409` as a recoverable refusal. Show the response message, keep the unsaved draft and reload the saved version for comparison. The same hash can become stale through another editor or an external write.
- `400` indicates an invalid or unsupported request, `401` a missing verified session, `403` an origin or bridge permission refusal, `413` a size limit and `429` the save rate limit. A failed read keeps the document unavailable. Show the picker if no project is selected.
- Abort obsolete reads when a selection changes. After a submitted save is aborted or returns `502`, reload to determine whether the bridge committed the write before trying again. Only a receipt confirms the exact content saved by that request.

## Existing Build and provider contracts

| Operation | Existing implementation and source of truth |
| --- | --- |
| Open an existing paired project | `GET /api/build/project?project=<projectRef>` returns a `ProjectSnapshot` from the paired bridge. An unavailable snapshot follows the API refusal. |
| Provider and credential workspace | `GET /api/build/provider-os` returns `ProviderWorkspaceSnapshot` in `src/lib/ai/provider-os/types.ts`. `POST` accepts commands validated in `ProviderService.command`. Read credential references and connection state from the response. Keep pasted keys ephemeral and submit secrets only in the authorized write request. |
| Choose a model and request generation | Use `/api/build/ai/models` for model discovery, `POST /api/build/ai/router` for routing (`RouterInput` in `src/lib/ai/types.ts`) and `/api/build/ai/stream` or `/api/build/ai/generate` for actual execution. A router decision is a selection; inference success requires the completed generation response. Cancel obsolete streaming reads and discard responses for stale project selections. |
| Checkout verification | `POST /api/build/verify` returns measured `VerificationSnapshot` for trusted tasks. Use the returned SHA and source state to associate evidence with the checkout. |
| Reviewed generated static artifact and preview | The technical branch in PR #113 and the visual branch in PR #114 already carry the generated-project routes and `GeneratedProjectPlan`, `GeneratedRuntimeReceipt` and `PreviewReceipt` in `src/lib/build/generated-project-contract.ts`. Their current availability depends on the delivered revision and trusted host configuration. Keep one operation ID per reviewed artifact. Read its receipt for actual execution state. Show a usable preview only when the receipt reports readiness and supplies the URL. Use the existing operation cancellation route and the existing Preview and Generation components. |

On an absent or inaccessible workspace, use the route's blocker and preserve the local draft. Keep catalog models, verified connections, routing eligibility and completed inference as distinct states.
