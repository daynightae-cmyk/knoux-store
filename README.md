# KNOuX Digital Headquarters

Code-first Next.js headquarters for KNOuX products and engineering work.

## Local development

```bash
npm ci
npm run dev
```

`npm run lint`, `npm run typecheck`, `npm run build`, and `npm test` form the verification gate. The test suite starts the built production server, so build before running tests.

## Contact

Set `CONTACT_WEBHOOK_URL` on the server to enable delivery. Without it, `/api/contact` returns 503 and the page offers `knouxio@zohomail.com`. A success message is shown only after an upstream delivery response.

## Logo geometry provenance

The supplied `D:\Knoux Store\knoux-mark-canonical.svg` was six non-SVG bytes at implementation time. The original file was preserved. `public/knoux-mark-mask.png` is a pixel-accurate mask extracted from the available original KNOuX image, used for the particle coordinates and the static fallback. Replace the mask source with a restored authoritative SVG and recheck the four component outlines before calling geometric fidelity final.

The site does not claim live product capabilities, customer results, metrics or screenshots that have not been verified. The canonical production domain is `knoux.store`; deployment state must be checked against Vercel before release claims are made.
