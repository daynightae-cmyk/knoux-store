# KX Private VPN — KNOUX.STORE web integration evidence

Date: 2026-11-05
Source repository: daynightae-cmyk/knoux-store
Base main SHA: f9b0898aaf195f6a16781498462d955747bc5666
Implementation branch: feat/kx-private-vpn-hub-20261105
Production status: **NOT DEPLOYED / NOT MERGED**

## Scope
Added KX portal to existing Next.js website; preserved existing home, product registry, navigation and domain settings.
- /software/kx-private-vpn
- /docs/kx-private-vpn
- /legal/kx-private-vpn/privacy
- /support/kx-private-vpn
- /software/kx-private-vpn/releases
- Spotlight link on /products and five sitemap entries
- Arabic/English, RTL, responsive layout, reduced-motion styling
- Honest release and VPN field-verification limitations

## Verification (isolated D: checkout)
- npm ci --no-fund --no-audit --prefer-offline: success.
- npm run typecheck: exit 0.
- Targeted npx eslint: exit 0.
- Full npm test: 918 passed, 0 failed (before final non-test changes).
- npm run build: exit 0; all five new static routes generated.
- Browser test: node scripts/kx-private-vpn-smoke.mjs, against fresh local production server: 10/10 desktop+mobile success. Each HTTP 200, one main/h1, brand text present; zero horizontal overflow or JS errors.
- Arabic browser test: node scripts/kx-private-vpn-rtl-smoke.mjs: 10/10 desktop+mobile success, dir=rtl, lang=ar, translated headings, zero overflow or JS errors.
- git diff --check: exit 0.
- Local screenshots saved only in KX-QA-LOCAL; never commit screenshots or temporary server logs.

## Distribution and privacy limits
- This is web content only; not an Android VPN release.
- Owned gateway handshake, route/DNS/IPv6 egress, signing, API 26/35 devices, release integrity still have separate acceptance gates.
- No public APK download or F-Droid submission is claimed.
- Privacy notice describes reviewed native Android client, not a contractual no-logs policy for third-party gateways. Recheck before release.

## Release boundaries
- Do not change DNS, Vercel configuration or main in this feature branch.
- Owner must review the Vercel Preview before merge or production promotion.
