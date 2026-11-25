# KNOuX Store technical integration for Kimi

Use the existing Studio and Build presentation. The integration branch supplies the following contracts.

| Flow | Request and contract | UI state and authority |
| --- | --- | --- |
| Open and edit a Build file | `GET /api/build/project?project=<ref>` then `GET /api/build/file?project=<ref>&path=<relative-path>`. Types are `ProjectSnapshot` and `ProjectFileDocument` in `src/lib/build/types.ts`. | A signed-in owner needs a paired Bridge for project files. A read-only document or missing hash stays read-only. Build restores the selected project reference on tab reload and verifies it against the server again. |
| Review and save a Build file | `PUT /api/build/file?project=<ref>` takes `ProjectFileSaveRequest` and returns `ProjectFileSaveReceipt`. | Show the reviewed source change before saving. The receipt supplies the new hash. Keep the draft on `409`, reload the saved version, and review again. On timeout, read back the saved version before retrying. |
| Validate and store a provider credential | `POST /api/build/provider-os/credentials/validate` takes `CredentialValidationRequest` for `openai`, `anthropic`, `gemini`, `openrouter`, `groq`, `deepseek`, `moonshot`, `cloudflare` (with a separate `accountId`) and `opencode-console-v2` (requires an `oc_sk_` token). NVIDIA NIM has no key-only endpoint (public catalog) and stays on the persisted `TEST_CONNECTION` path. `POST /api/build/provider-os` accepts `CREDENTIAL_CREATE` with provider ID, name and secret. `GET /api/build/provider-os` returns `ProviderWorkspaceSnapshot`; see `src/lib/ai/provider-os/types.ts`. | Use an authenticated same-origin request. Keep the raw key ephemeral. The pre-save validation result is transient. Save returns a vault reference. Bind it to the profile and use `TEST_CONNECTION` to measure access and discover its models. |
| Select and execute with a model | `GET /api/build/ai/models`, `POST /api/build/ai/router` using `RouterInput` in `src/lib/ai/types.ts`, and existing `/api/build/ai/stream` or `/api/build/ai/generate`. | Use the canonical discovered inventory and routing decision. Wait for the inference response before reporting execution. Paid calls require explicit approval. |
| Populate the WordPress selectors | `readStudioCatalog({ kind, search, tag, page, perPage }, signal)` calls `GET /api/wordpress/catalog`; contract is `ExternalQueryResult`. | This public read comes from WordPress.org. Distinguish loading, empty, unavailable and rate-limited. Cancel superseded reads and keep the selected record as the center pane changes. |
| Save and reopen a Studio project | `listStudioDrafts`, `openStudioDraft`, `writeStudioDraft` and `restoreStudioSelection` in `src/lib/wordpress/studio-client.ts` use `/api/wordpress/drafts`. `WordPressDraftDocument` carries the existing identity, blocks, theme and plugins, plus optional `selection` for the active pane and plugin. | Requires a signed-in owner and the additive staging migration. Reuse the creation UUID when retrying. Subsequent saves send `expectedRevision`. On `409`, keep the local draft, read the server revision, and review before saving. Older drafts open in the site pane. |
| Runtime and preview | `POST /api/build/verify` returns `VerificationSnapshot` for a supported task. The existing Bridge client exposes `procList`, `procRestart` and `logs` with `ProcessInfo`. | Bridge process state and logs measure the process. Preview readiness requires a measured HTTP response. The bounded generated-project executor lives on the existing #113/#114 branches and is outside the five integrated PRs. |

Keep a loading state while requests are pending. Treat `401` as a sign-in requirement, `403` as a refused origin, scope or permission, `429` as a retry delay, and `503` as unavailable storage or catalog. Render the response's safe message and preserve the current editor or Studio draft. Catalog selection and draft persistence do not publish a WordPress site.

## Phase 3 ownership checkpoint

In #129 the committed Studio uses the live service through the separate StudioCatalogData and StudioDraftControls adapters. In Base, WordPressStudio and WordPressCockpit remain under Kimi's presentation ownership. Integrate the adapter imports and event bindings into the current Cockpit; keep the existing layout, interaction and CSS. Use the Catalog button events as controlled search/tag/page values and keep the selected record independent from the returned page. Pass the actual composer blocks into snapshot and restore them in onRestore. The older committed Studio preserves previously saved blocks because its layer selection is a preview rather than an editable block document.

### Phase 3 Build executor

The existing engineering result can include `generatedProject: GeneratedProjectPlan`. Its review surface uses the generated-project API for bounded static artifacts. It never writes through the paired workspace file endpoint or runs a package command. The file editor keeps its existing paired Bridge contract above.

| Operation | Contract |
| --- | --- |
| `GET /api/build/generated-projects` | Host availability, `{ enabled, message }` on success. |
| `POST /api/build/generated-projects` | `{ operationId: UUID, artifact: GeneratedProjectPlan, confirmation: "APPLY STATIC PROJECT" }` → `{ receipt: GeneratedRuntimeReceipt }`. The same owner, UUID and artifact can be retried. A different artifact for that UUID returns 409. |
| `GET /api/build/generated-projects/{operationId}` | Reads the owner-scoped durable receipt. |
| `DELETE /api/build/generated-projects/{operationId}` | Cancels in-flight execution or stops the owned preview, then returns the receipt. |
| `GET /api/build/generated-projects/{operationId}/bundle` | Returns the verified ZIP when exported. |

Access requires a valid session and an operator listed in `KNOUX_BUILD_OPERATOR_IDS`. Mutations require the application origin. Starting execution also requires `KNOUX_WRITE_EXECUTOR_ENABLED=1` on the trusted host. Treat 401 as a sign-in state, 403 as refused access or approval, 404 as an unavailable owner-scoped receipt, 409 as an operation conflict, 429 as a retry-after state, and 503 as host disabled. Use the receipt's measured build exit code and HTTP readiness for success. Preview URLs are loopback URLs for the browser on that trusted host and open in a separate tab under the existing workspace CSP.

The review binding is in the committed `DevWorkspaceHome.tsx` on this integration branch. It leaves the current CodeSurface and PreviewSurface bindings in place. The static executor keeps durable receipts; restoring the overall workspace or resuming arbitrary paired-Bridge tasks is a separate integration.
