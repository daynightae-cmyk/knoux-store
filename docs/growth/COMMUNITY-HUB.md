# Community Hub

The flagship area of the Command Center, and the one where an overreach would do
real harm to a real person.

Source: `src/app/command/communities/page.tsx` ·
`src/data/growth/{communities,taxonomy}.ts` ·
`src/lib/growth/intelligence/adapters/local.ts` (`scoreCommunity`)

---

## 1. The platform limitation, stated rather than worked around

**Facebook exposes no general Groups API for publishing into arbitrary groups, and
none for extracting member lists.**

Two tempting options were rejected:

- *Model the API as if it existed.* This would produce a product that appears to
  automate community posting and then silently does nothing, or worse, invites a
  scraper. It would also be a security and terms-of-service problem.
- *Drop community distribution.* Real local marketing does work through
  communities, and pretending otherwise would not be honest either.

What ships instead is a **manual-assisted distribution queue**: KNOuX ranks
destinations, prepares the post, and a person opens the group, posts, and marks it
done. That is a product capability, not a workaround. It is registered as
`community.post → BLOCKED` with the reason attached.

---

## 2. What the product refuses to do

These are hard limits, asserted by tests rather than stated in a comment:

| Refusal | Enforced by |
|---|---|
| Never read a member list, ever | No field for it exists on `Community`. Test asserts `members`, `memberCount`, `memberIds` are all absent. |
| Never store a private or closed group | `visibility` is constrained; no fixture is `PRIVATE` |
| Never infer or scrape a contact detail | `publicAdminContact` is operator-supplied only; no enrichment path exists |
| Never claim to have posted | Distribution entries carry `postedBy`; only an operator action sets `POSTED` |
| Never message an admin | No send capability exists; `whatsapp.send` is `BLOCKED` |
| Never build spam automation | Not present in any code path |

```js
// growth-automation-community.test.mjs
test('no community record carries member data of any kind', () => {
  for (const community of DEMO_COMMUNITIES) {
    assert.equal('members' in community, false);
    assert.equal('memberCount' in community, false);
    assert.notEqual(community.visibility, 'PRIVATE');
  }
});
```

---

## 3. Discovery is lawful by construction

Discovery ranks **operator-supplied and imported** public records. There is no
crawler, and no scraping adapter.

Inputs: `keywords`, `country`, `region`, `city`, `language`, `platform`,
`businessCategory`, `verificationStatus`.

Outputs: `HIGH` / `MEDIUM` / `LOW` bands, where the band is derived from the score
(`>= 60`, `>= 30`, else `LOW`).

### Relevance scoring is explainable on purpose

`scoreCommunity()` is shallow arithmetic over stored fields, because a score an
operator cannot explain is a score they will not act on.

| Signal | Points |
|---|---|
| Keyword in community name | +40 |
| Keyword in a relevance tag | +25 |
| Keyword anywhere in the searchable haystack | +15 |
| City match | +20 |
| Group is `PUBLIC` | +10 |
| Promotion policy is `ALLOWED` | +10 |
| No admin approval required | +5 |
| Promotion policy is `RESTRICTED` | **−15** |

Floored at 0, so a mismatch never produces a negative relevance.

The negative weighting is the important one. **A large group is not a reachable
group.** `activityEstimate` deliberately does not score, because a busy group that
forbids promotion is worse than a quiet one that allows it. Reachability is scored;
volume is not.

---

## 4. Verification states

Verification describes the **stored public metadata only**. It never asserts that
posting will be permitted, and it is separate from `promotionPolicy` for exactly
that reason.

| State | Meaning |
|---|---|
| `VERIFIED` | Public URL resolves and visibility confirmed |
| `NEEDS_REVIEW` | Present but stale, unchecked, or unconfirmed |
| `UNAVAILABLE` | Confirmed not reachable |
| `BROKEN_LINK` | URL does not resolve |
| `PRIVATE` | Not public — should not be stored as a destination |
| `UNKNOWN` | Never checked |

`community.refresh` re-reads **stored public URLs only** — a HEAD/GET against a URL
the operator already supplied. It reads nothing behind a login, and it never
enumerates members.

`lastCheckedAt` is absent on any `UNKNOWN` record, and a test enforces that pairing:
an unchecked record must not claim a check time.

---

## 5. Geography

Two markets, because relevance for community distribution is almost entirely
geographic and category based.

**UAE** — Abu Dhabi (with Khalifa City, Al Yas Island, Al Wahda, Mussafah),
Dubai (Marina, Jumeirah, Downtown, Business Bay, Deira, Bur Dubai, Al Barsha,
Jebel Ali), Sharjah (Al Majaz, Aljada, Muweilah, University City), Ajman, Ras Al
Khaimah, Fujairah, Umm Al Quwain.

**Egypt** — Cairo (Maadi, Zamalek, Heliopolis, Nasr City, 6th of October, New
Cairo), Giza (Dokki, Mohandessin, Haram), Alexandria (Smouha, Sidi Gaber,
Montaza), Mansoura, Port Said, Suez, Ismailia, Shubra El Kheima.

Cities with no records still appear, so a zero result reads as *"nothing recorded
here"* rather than *"this place does not exist"*. A test asserts no slug is
duplicated within a country.

---

## 6. Categories

All sixteen from the brief: Parents, Schools, Sports, Swimming, Football,
Buy & Sell, Local Businesses, Residents, Jobs, Services, Women, Families, Arab
Communities, Egyptians Abroad, Local Communities, Directories.

Each carries `businessCategories`, which is what makes a community *useful* rather
than merely large:

```
parents  → swimming, education, family-restaurant, healthcare, retail
swimming → swimming, fitness, sportswear
women    → healthcare, fashion, hospitality, education
```

A parents group is a poor fit for a swimming academy and a good fit for a family
restaurant. Without this mapping, the Hub would return large irrelevant groups —
which is the failure mode of naive community marketing.

---

## 7. Platform mechanisms

| Platform | Auto-post | Mechanism |
|---|---|---|
| Facebook | **no** | Manual-assisted queue. No general Groups API exists. |
| Discord | no | Manual-assisted; server requires human moderation |
| Telegram | no | Manual-assisted; public channels have their own rules |
| WhatsApp | no | **Not a discovery source.** No public discovery; KNOuX sends nothing |
| Reddit | no | Manual-assisted; subreddit rules govern promotion |
| Directory | yes | Submissions follow the directory's rules, as an approval-gated task |

Directories are the one platform where automatic submission is legitimate, because
they exist to receive submissions.

---

## 8. The distribution queue

A `DistributionList` is a saved collection plus per-destination status:

```
Abu Dhabi Parents — 4 destinations
  cm_ae_ad_parents   NEEDS_APPROVAL   (community requires admin approval)
  cm_ae_ad_local     QUEUED          → Copy Post · Open Destination · Mark Posted
  cm_ae_ad_mums      NEEDS_APPROVAL   (restricted promotion policy)
  cm_ae_ad_swim      QUEUED          → Copy Post · Open Destination · Mark Posted
```

Entries whose community requires admin approval are held as `NEEDS_APPROVAL` rather
than queued. `Mark Posted` is disabled until an operator acts, and records
`postedBy`. A test asserts no `POSTED` entry lacks a `postedBy`.

---

## 9. Smart sync metadata

Tracked per community, per the brief:

`lastCheckedAt` · availability · visibility · name/category change · activity
estimate · promotion allowed · admin approval required · broken URL · location
relevance

All of these are fields on `Community`, and `community.refresh` is the adapter that
would refresh them from public metadata once a lawful source is approved. Nothing
has been refreshed, and the fixtures say so — one record is deliberately `UNKNOWN`
with no `lastCheckedAt` to exercise that state.

---

## 10. Demo boundary

Every community record is `origin: 'FIXTURE'` and the screen carries a DEMO notice.

The demo URLs use the reserved **`.invalid`** TLD, so an accidental fetch fails
immediately rather than reaching a real group. That is a safety choice, not a
placeholder convenience, and a test enforces it.

```js
test('no demo community URL can resolve to a real host', () => {
  for (const community of DEMO_COMMUNITIES) {
    if (!community.publicUrl) continue;
    assert.match(community.publicUrl, /\.invalid\b/);
  }
});
```

---

## 11. Performance

Pagination at 9 records per page. A full registry rendered at once would be
thousands of DOM nodes in a screen an operator scans visually.

Relevance scoring runs in `useMemo` over the fixture set — 23 records, trivial — and
is a pure function, so it is testable without a database.

---

## 12. Known gaps

- **Discovery is not connected.** `community.search_public` ranks stored records;
  there is no import from any external source. The ranker is ready.
- **No verification has run.** `community.verify` is `ADAPTER_READY`; no public URL
  has been fetched, because no real URL exists in the fixtures.
- **No list CRUD.** `DistributionList` entries are read and rendered; create/edit
  is not wired to a mutation route.
- **No distribution history view.** `postedAt` and `postedBy` are modelled and
  recorded; there is no screen that filters by them.
- **Single-language copy.** Community records carry one `language`; a bilingual
  variant set is not modelled.