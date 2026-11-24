# WordPress cockpit catalog

Use `GET /api/wordpress/catalog` with the query fields in `WordPressCatalogRequest` from `src/lib/wordpress/external.ts`. Choose `kind=theme` or `kind=plugin`. Optional `search` is a keyword, and `tag` is a WordPress.org taxonomy slug. `page` starts at 1 and is capped at 200. `perPage` defaults to 12 and is capped at 24. Changing the keyword or tag should reset the page.

The response is `ExternalQueryResult`. WordPress.org is the source of the items, pagination totals and metadata. Treat totals as known only when the response says so. A theme can supply an official screenshot, a separate approved navigation destination and declared compatibility. The cockpit can render screenshots through the existing image proxy and link to official previews. Plugin details stay in the center panel using the selected item's real registry record.

The endpoint is a public catalog read. It does not install software or persist site selections. Keep the selected record in the existing studio state while the catalog query changes. Cancel superseded reads with an AbortSignal and ignore late responses from an older filter or catalog. Use the existing draft persistence and separately authorized operations flow for site mutations.

- `200` with `state: ok` is a measured response. `state: empty` is a successful query with no displayable items.
- `503` with `state: unavailable` means the source could not provide a usable result. Preserve the current selection and offer a retry.
- `400` means the query is invalid. `429` is the catalog limit and supplies a `Retry-After` header.

References: [WordPress Theme API](https://developer.wordpress.org/reference/functions/themes_api/) and [WordPress Plugin API](https://developer.wordpress.org/reference/functions/plugins_api/).
