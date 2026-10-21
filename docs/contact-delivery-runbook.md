# Contact delivery runbook

The one endpoint a customer writes to is `POST /api/contact`. It is the only
public intake surface on the site, and it is deliberately closed when it
cannot deliver: a valid enquiry with no transport configured is answered with
**503 `Request delivery is not configured on this deployment.`** and
`delivered: false`. Nothing is stored, no message body is logged, and the
visitor is never told a message arrived when it did not.

**Current production state (verified 2026-10-21):** `503` — no transport is
configured, so every enquiry sent to the live site is currently lost. This
needs the owner's action; it cannot be fixed in code without a credential.

---

## 1. Choose a transport

| | Email (Resend) | Webhook |
| --- | --- | --- |
| Needs | a Resend account and one API key | an HTTPS endpoint you control |
| Delivery | a message to an inbox | a JSON POST to your endpoint |
| Setup time | ~5 minutes plus domain verification | varies |
| Failure mode | provider outage, unverified domain | your endpoint's availability |

Email is the primary transport in the code; the webhook is the fallback when
email is absent, and is also used when email fails.

---

## 2. Transport A — email through Resend

1. Create an account at <https://resend.com> and confirm the address.
2. **API key**: *API Keys → Create API Key*. Copy it once.
3. **Sender**:
   - fastest path for a first delivery — leave `CONTACT_FROM_EMAIL` unset; the
     code then sends from `KNOuX Contact <onboarding@resend.dev>`, which
     Resend only allows to deliver to the account owner's own address. That is
     enough to prove the path end to end.
   - for a real customer-facing sender, add a domain under *Domains*, complete
     the DNS records Resend shows, wait for the status to become *Verified*,
     then set `CONTACT_FROM_EMAIL` to a mailbox on that domain, e.g.
     `KNOuX <enquiries@your-domain.example>`.
4. **Recipient**: set `CONTACT_NOTIFY_EMAIL` to the inbox that should receive
   enquiries (defaults to `knouxio@zohomail.com` if left unset).

### Environment variables (server-side only)

| Variable | Example | Notes |
| --- | --- | --- |
| `RESEND_API_KEY` | `re_xxxxxxxxxxxx` | never `NEXT_PUBLIC_` |
| `CONTACT_NOTIFY_EMAIL` | `knouxio@zohomail.com` | where enquiries arrive |
| `CONTACT_FROM_EMAIL` | `KNOuX <enquiries@your-domain.example>` | must be a verified sender |

### Vercel

*Project → Settings → Environment Variables* → add the three variables for
**Production** (and Preview if you want previews to deliver). Redeploy — the
values are read at request time, but a redeploy guarantees the new build has
them.

### Verify

```bash
curl -i -X POST https://knoux.store/api/contact \
  -H 'content-type: application/json' \
  -H 'origin: https://knoux.store' \
  -H 'sec-fetch-site: same-origin' \
  -d '{"name":"Delivery check","email":"you@example.com","organisation":"",
       "message":"Checking that a real enquiry reaches a human.","requestType":"custom",
       "selectedItems":[],"preferredChannels":[],"budgetBand":null,"timeline":"now",
       "sourceInput":null,"entryRoute":"/contact"}'
```

Expected: `HTTP/1.1 200` with `{"ok":true,"delivered":true}` and a message in
the inbox. `503` means the variables did not reach the running deployment.
`502` means a transport was found and the delivery itself failed — the
provider's own error is the thing to read next.

Then check the deployment agrees:

```bash
curl -s https://knoux.store/api/health
```

`services.contact` must read `true`, `sources.contact` must read `email`, and
`blockers` must be empty.

---

## 3. Transport B — webhook

Set `CONTACT_WEBHOOK_URL` to an HTTPS endpoint that accepts a JSON `POST`.

The body is the validated enquiry plus two added fields:

```json
{
  "name": "…", "email": "…", "organisation": "…", "message": "…",
  "requestType": "custom", "selectedItems": [], "preferredChannels": [],
  "budgetBand": null, "timeline": "now", "sourceInput": null,
  "entryRoute": "/contact",
  "source": "knoux.store",
  "receivedAt": "2026-10-21T09:00:00.000Z"
}
```

The endpoint must answer `2xx` within 10 seconds; anything else is reported to
the visitor as a delivery failure (`502`), never as a receipt.

---

## 4. What the code guarantees

- The response body is `{ ok, delivered }` or `{ error, delivered: false }`.
  `delivered` is `true` **only** after a transport confirmed the delivery.
- Abuse controls run before the body is read: cross-site requests are refused
  with `403`, oversized bodies with `413`, and a per-address flood with `429`.
- A honeypot field is accepted silently so bots do not learn the rule.
- Nothing about the message body is written to a log.

These behaviours are covered by `tests/contact-intake.test.mjs`.

---

## 5. If neither transport can be configured now

The honest interim answer is already in place — the endpoint refuses rather
than pretending. The only thing that changes is the visitor's experience:
they will keep seeing "Request delivery is not configured on this deployment."
The `/contact` page can also point the visitor at a direct email address until
a transport exists, if the owner prefers that over a refusal.
