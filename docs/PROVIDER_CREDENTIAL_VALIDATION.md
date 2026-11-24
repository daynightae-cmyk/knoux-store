# Provider credential validation

Use `POST /api/build/provider-os/credentials/validate` with `CredentialValidationRequest` from `src/lib/ai/provider-os/types.ts`. The request requires a signed-in account and the application origin. The first supported provider is `openai`. Paste into an ephemeral form field and submit the key over the authenticated same-origin request. Keep the raw key out of client storage, query strings and logs.

The server sends a bounded, cancellable GET to the official models endpoint using the pasted key only. It performs no model generation, vault writes, profile mutations or connection updates. The response is a `CredentialValidationResult` carrying the measured status and timestamp.

- On `authenticated`, enable the existing save action for the same input and provider. Changing either invalidates the UI's validation state.
- On `refused`, use `httpStatus` to distinguish invalid credentials, insufficient permission, provider throttling and provider errors. On `unreachable`, keep the draft and allow an explicit retry. Clear obsolete responses when the user cancels or switches provider.
- An HTTP `401` from the app indicates missing sign-in. `403` indicates a refused origin, `400` invalid input or an unsupported provider, `413` an oversized request and `429` the app's validation limit with a `Retry-After` header.
- Save via `CREDENTIAL_CREATE` on `POST /api/build/provider-os`. The authenticated workspace receives a credential reference after encrypted storage succeeds. Bind the reference to the profile, then use `TEST_CONNECTION` for the persisted profile's connection and model discovery.
- Read the eligible discovered models and profile state from Provider OS and the canonical Build model/routing API. A passed pre-save validation measures access to the models endpoint. Inference success requires a completed, authorized generation request.

The existing provider endpoint contracts and vault storage authorize each operation independently. The pre-save result is transient and is used for UI feedback.
