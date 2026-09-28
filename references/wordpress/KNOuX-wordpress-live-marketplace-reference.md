# KNOuX WordPress Live Marketplace Reference

ROLE:
Specialized reference for the WordPress marketplace/catalogue only.

CURRENT PROBLEM:
The existing KNOuX WordPress catalogue is intentionally empty because wordPressItems contains only KNOuX-owned releases and currently has none.

TARGET:
Keep KNOuX-owned releases honest, but add a distinct external discovery catalogue backed by official WordPress.org sources.

CRITICAL SEPARATION:
1. KNOuX Releases = first-party items from src/data/wordpress.ts.
2. WordPress.org Marketplace = external discovery items fetched from official WordPress.org APIs.
Never merge provenance or imply ownership.

OFFICIAL SOURCES

Plugins:
WordPress.org Plugins API
https://api.wordpress.org/plugins/info/1.2/
Use query_plugins and plugin_information.
Request fields needed for UI, including icons, banners, rating, active_installs, last_updated, requires, requires_php, tested, download_link and tags where supported.

Themes:
WordPress.org Themes API
https://api.wordpress.org/themes/info/1.2/
Use query_themes and theme_information.
Request screenshot_url, rating, downloaded, last_updated, homepage, tags, requires_php and versions only when needed.

Patterns:
WordPress Pattern Directory API
https://api.wordpress.org/patterns/1.0/
Use official directory query semantics.

Blocks:
Use the documented WordPress Block Directory search contract.
Do not invent an undocumented bulk endpoint.

DATA MODEL

Create a normalized external item model:
source: 'wordpress.org'
kind: 'plugin' | 'theme' | 'block' | 'pattern'
slug
name
shortDescription
author
iconUrl?
screenshotUrl?
bannerUrl?
rating?
ratingCount?
activeInstalls?
downloaded?
version?
requiresWp?
testedWp?
requiresPhp?
lastUpdated?
tags[]
homepageUrl?
downloadUrl?
sourceUrl

Do not write these external records into wordPressItems.
wordPressItems remains first-party KNOuX truth.

UX

WordPress overview:
- KNOuX Releases rail
- Explore WordPress.org rail
- categories: Plugins / Themes / Blocks / Patterns
- search
- filters
- sort
- pagination or infinite loading
- source badge on every external item

Plugin card:
- official plugin icon
- name
- author
- short description
- rating
- active installs when returned
- compatibility metadata
- last updated
- View details
- WordPress.org link

Theme card:
- official screenshot as the hero visual
- name
- author
- rating/downloads when returned
- tags
- last updated
- details/source link

Block:
- icon
- title
- description
- rating
- active installs

Pattern:
- rendered preview where safe
- title/category/keywords
- source attribution.

IMAGE / LOGO RULE

Use only official image URLs returned by the official source.

Prefer server-side image proxy/cache or strict Next Image remotePatterns.
Do not hotlink arbitrary third-party domains.
Never recolor third-party logos to look like KNOuX.
Never place KNOuX ownership badges on WordPress.org items.

If an official icon is absent:
use a neutral WordPress marketplace fallback,
not an invented brand logo.

PERFORMANCE

"All products" means all are discoverable through search/filter/pagination.
Do NOT download or render the full catalogue in one response.

Use:
- server-side fetch
- normalized response
- cache/revalidate
- bounded page sizes
- lazy images
- skeletons
- request deduplication
- graceful upstream failure states

No build-time scraping of the entire marketplace.

TRUST

Show provenance clearly:
SOURCE: WORDPRESS.ORG

KNOuX may offer:
- implementation
- configuration
- migration
- maintenance
- optimization

But do not imply KNOuX authored an external plugin/theme.

For premium/commercial marketplaces:
do not scrape arbitrary vendors.
Integrate only through an official/public API/feed or an explicitly approved provider.

FIRST-PARTY KNOuX items may be highlighted separately when they exist.

