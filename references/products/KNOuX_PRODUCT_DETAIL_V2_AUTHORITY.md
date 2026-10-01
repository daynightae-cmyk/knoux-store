# KNOuX Product Detail V2 — Authority

## Exact scope
This authority applies ONLY to individual product pages:
/products/[slug]

It does not apply to:
- /
- /products index
- Home KNOuX System Field
- /about
- global navigation

## Current architecture to preserve and improve
Route:
src/app/products/[slug]/page.tsx

Runtime:
src/components/products/ProductExperience.tsx

Current layers:
- ProductArrival
- ProductHero
- ProductSystemAnatomy
- ProductBlocks
- RelatedSystems
- ProductPager

Presentation profiles:
src/data/product-visuals.ts

Product truth:
src/data/software.ts

This is already the correct architectural direction.
Do NOT replace it with one HTML file per product.

## Routing contract
Any Home System Field system click must land on:
/products/<product.slug>

The destination page shows ONE product only.
Related/previous/next may appear later as navigation, but the page's cinematic narrative belongs only to the selected product.

## Shared engine / variable personality
Shared across all products:
- page shell
- header
- cinematic chapter grammar
- accessibility
- evidence contract
- actions
- performance rules
- KNOuX color system

Variable by product:
- product name/logo
- motif
- geometry
- motion vocabulary
- chapter visual transitions
- accent intensity
- scene labels

## Chapter contract
00 / ARRIVAL
Product-aware deterministic identity reveal.

01 / PRODUCT HERO
Selected product only.

02 / SYSTEM REVEAL
Statement + system anatomy.

03 / CAPABILITY FLOW
Real capabilities represented using product motif.

04 / EVIDENCE SURFACE
Limitations, technologies, evidence and access.

05 / CLOSING
Related systems / previous-next / contact or real live/repository action.

## Truth rules
No fake telemetry.
No fake benchmark.
No fake uptime.
No fake install counts.
No invented clients.
No decorative fake console output.

## Technical corrections required when touched
- prefer canonical MARK_PATHS / MARK_VIEW_BOX instead of duplicated inline KNOuX path data
- avoid React state updates on every animation frame
- no Math.random() in identity-critical geometry
- no fake loader percentage
- reuse existing Three/R3F infrastructure
- no runtime CDN imports
- no external font dependency
- one main product scene/canvas where practical
- dispose WebGL resources correctly
- pause offscreen / document.hidden
- reduced-motion fallback

## Visual acceptance
A product page must feel:
same KNOuX institution
+
one specific engineered system

It must NOT feel:
all products displayed together,
a product carousel,
seven copied pages,
seven unrelated microsites,
VOID reskinned purple.
