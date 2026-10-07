# KNOuX Growth — OAuth Setup

Code: `src/lib/growth/connectors/oauth.ts` · Status: **CONFIG_REQUIRED** for both
providers (no credentials set).

---

## 1. Current state, measured

| Variable | Present | Effect |
|---|---|---|
| `META_APP_ID` | No | Meta NOT_CONFIGURED |
| `META_APP_SECRET` | No | Meta NOT_CONFIGURED |
| `GOOGLE_CLIENT_ID` | No | Google NOT_CONFIGURED |
| `GOOGLE_CLIENT_SECRET` | No | Google NOT_CONFIGURED |
| `GOOGLE_ADS_DEVELOPER_TOKEN` | No | Google Ads NOT_CONFIGURED even with a client pair |
| `META_OAUTH_REDIRECT_URI` | No | Handshake cannot complete |
| `GOOGLE_OAUTH_REDIRECT_URI` | No | Handshake cannot complete |

A configured provider with no user grant reports `AUTH_REQUIRED`. A provider with
no client secret reports `CONFIG_REQUIRED`. Neither is ever reported as
`CONNECTED`.

---

## 2. Meta

### Create the app

1. [developers.facebook.com](https://developers.facebook.com) → **My Apps** → Create
2. Choose the app type that fits the capability you need. For ads management, a
   Business app is required.
3. Add the products: **Facebook Login** for Pages/Instagram, **Marketing API** for
   ads.
4. **Settings → Basic** → App ID and App Secret. These become `META_APP_ID` and
   `META_APP_SECRET`.
5. **Facebook Login → Settings → Valid OAuth Redirect URIs**:
   `https://<your-host>/api/growth/oauth/meta/callback`
6. For ads, request `ads_management` access review. Unreviewed apps get a
   development-mode token with no ad accounts, which surfaces as
   `PERMISSION_MISSING` rather than as an empty list.

### Scopes, by capability

Requested per capability, never as a raw string:

| Capability | Scopes |
|---|---|
| `META_PAGES` | `pages_show_list`, `pages_read_engagement` |
| `META_INSTAGRAM` | the above + `instagram_basic` |
| `META_ADS_READ` | `ads_read`, `read_insights` |
| `META_ADS_WRITE` | `ads_management` — **never requested by a read flow** |
| `META_LEADS` | `ads_management`, `leads_retrieval` |
| `META_WHATSAPP` | `whatsapp_business_management` |

A read grant never pulls in `ads_management`. Tested.

---

## 3. Google

### Create the credentials

1. [console.cloud.google.com](https://console.cloud.google.com) → project →
   **APIs & Services → Credentials**
2. **Create Credentials → OAuth client ID → Web application**
3. Authorised redirect URI: `https://<your-host>/api/growth/oauth/google/callback`
4. Client ID → `GOOGLE_CLIENT_ID`, Client secret → `GOOGLE_CLIENT_SECRET`

### Scopes, by capability

| Capability | Scope |
|---|---|
| `GOOGLE_ADS` | `https://www.googleapis.com/auth/adwords` |
| `GOOGLE_ANALYTICS` | `…/auth/analytics.readonly` |
| `GOOGLE_BUSINESS` | `…/auth/business.manage` |
| `GOOGLE_SEARCH_CONSOLE` | `…/auth/webmasters.readonly` |
| `GOOGLE_YOUTUBE` | `…/auth/youtube.readonly` |

Least privilege per surface. `analytics.readonly` does not imply
`webmasters.readonly`, and neither implies Ads. A grant can therefore stay narrow.

### Google Ads needs a third credential

`GOOGLE_ADS_DEVELOPER_TOKEN` from a **manager account** with API access approved.
Without it, Google Ads is `CONFIG_REQUIRED` even with a valid OAuth client — which
is exactly what `growth_google_ads_accounts` reports.

---

## 4. Environment

Appended to `.env.example` as comments. **No value belongs in that file.**

```
META_APP_ID=
META_APP_SECRET=
META_OAUTH_REDIRECT_URI=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_OAUTH_REDIRECT_URI=
GOOGLE_ADS_DEVELOPER_TOKEN=
```

---

## 5. The handshake

### Initiation

```ts
const state = createOAuthState();          // 32 random bytes, expires in 10 min
const result = buildMetaAuthorisationUrl({
  config, state, capabilities: ['META_PAGES'],
});
// result.url  OR  { state: 'CONFIG_REQUIRED', message }
```

Store `state.stateHash` — **not** `state.value` — against the client and user,
with `expiresAt = state.expiresAt` and the requested scopes for audit.

### Callback

```ts
const verdict = verifyOAuthState({
  presented:    searchParams.get('state'),
  expectedHash: stored.stateHash,
  expiresAt:    stored.expiresAt,
  consumed:     stored.consumedAt !== null,
});
if (!verdict.ok) return refuse(verdict.reason);   // unknown | expired | consumed
```

Three properties, all tested:

- **Constant-time** hash comparison. The value is attacker-supplied; a timing
  difference on a hash comparison is a real, if narrow, oracle.
- **Single use.** A replayed state reports `consumed`, which is distinguishable
  from a bad one — the two need different operator responses.
- **Self-expiring.** A stale state dies on a clock, not on a cleanup job.

### Exchange

```ts
const result = await exchangeMetaCode({ config, code, secretStore });
// result.token.secretRef   ← a reference. Never the token.
```

The provider's own error message is preserved verbatim in `providerDetail` rather
than being flattened, so `invalid verification code` stays distinguishable from
`user is not authorized`.

### Storage

`SecretStore` is an **interface**, because "no token ever reaches a caller" is a
property of the interface, not of whichever store is configured. A production
deployment needs a real secret manager.

Guarantees regardless of implementation:

- Never `localStorage`.
- Never in a response body.
- Never in a database row — `knoux_growth_connections` holds `secret_ref` only.
- Never in an audit entry; `redactAuditDetail` runs before the write.

---

## 6. Connection state derivation

`deriveConnectionState()` is pure, so the Connections screen and a scheduled
health check cannot disagree.

| State | Condition |
|---|---|
| `BLOCKED` | platform refused the account or region |
| `NOT_CONFIGURED` | no credential path on the server |
| `NOT_CONNECTED` | no authorisation completed |
| `EXPIRED` | token expiry is in the past |
| `PERMISSION_REQUIRED` | a required scope is not granted — names which |
| `REAUTH_REQUIRED` | token held, **never verified** |
| `TOKEN_EXPIRING` | verified, expires within 24h |
| `CONNECTED` | verified at a recorded time, scopes sufficient |

`CONNECTED` is **unreachable without `lastVerifiedAt`.** That mirrors the schema
constraint `knoux_growth_connections_verified`, so an unverified green connection
is not representable in either layer.

---

## 7. Not built

| Item | Why |
|---|---|
| The route handlers themselves | `buildMetaAuthorisationUrl` and the exchange are complete and tested; the Next route wrappers are not written. Deliberate: an OAuth route without a working callback would look finished and fail at the first handshake. |
| Token refresh | The refresh-token **reference** is stored. A refresh scheduler is not built. |
| Secret store implementation | Needs a chosen provider. The interface is the contract. |
| Any mutating grant | `META_ADS_WRITE` is declared so a future launch path has a defined scope set, and is never requested by a read flow. |

---

## 8. Verify

```powershell
# after setting the variables
Invoke-RestMethod https://<host>/api/growth/capabilities
```

Expect `META_APP_ID` / `META_APP_SECRET` no longer listed in `missingEnv`, and
`readiness` for the Meta capabilities to move from `CONFIG_REQUIRED` to
`ADAPTER_READY`.

**Not** to `CONNECTED` — that requires completing the handshake and then a real
provider call. Anything else would be a false claim.
