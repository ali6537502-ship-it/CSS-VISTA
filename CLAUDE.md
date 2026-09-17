# CSS Vista — working rules

Production site: https://www.css-vista.com (Hostinger, static build from `dist/`).
AdSense publisher: `ca-pub-6131271603014611`.

## Standing rules from the site owner

1. **The site structure is fixed.** When adding or changing a page, keep the
   existing structure, navigation and visual identity. Do not restructure,
   rename or redesign as a side effect of another change.
2. **`ads.txt` stays in place.** Every build must ship
   `public/ads.txt` containing exactly
   `google.com, pub-6131271603014611, DIRECT, f08c47fec0942fa0`,
   the `<meta name="google-adsense-account">` ownership tag, and the Search
   Console verification file `googlec96e2248070e0570.html`. These are verified
   by `npm run test:routes` and the production audits.

## Route policy is authoritative

`src/data/routeRegistry.mjs` is the single source of truth. Every route declares
five **independent** dimensions. Never collapse one into another:

| Dimension | Values | Meaning |
|---|---|---|
| `access` | `public` / `authenticated` / `admin` | who may reach it |
| `contentQuality` | `substantial` `legal` `document` `interactive` `utility` `private` `incomplete` | what its primary content actually is |
| `indexable` | boolean | may search engines index it (**fails closed**) |
| `sitemap` | boolean | does it belong in the sitemap |
| `adMode` | `enabled` / `disabled` / `auto` | advertising eligibility |

Specifically:

- **Authentication does not disable advertising.** Signed-in content pages
  (dashboard, factbook, saved items, account current affairs) are `noindex` and
  ad-eligible at the same time. That is intended.
- **Indexability does not control advertising.** A legal page can be indexed
  with no ads; a utility hub can be `noindex` and still carry ads.
- **Being `noindex` never means deleting a route.** Unindexed pages stay fully
  served, linked and usable. Removing a URL from the sitemap is not a reason to
  remove the page.
- Ads are always suppressed, whatever the route says, on authentication
  transactions, sensitive account controls, active assessments, error states and
  loading states — see `isAdSuppressedState()` in `src/lib/ads.ts`.

`ROUTE_REDIRECTS` in the same file is the only redirect table. An old URL gets
one redirect to its final canonical destination — never a chain, never a loop,
never a redirect to the homepage to paper over a missing page.

## Content rules

- **Search-facing content must be the real page.** The build server-renders the
  actual React components (`scripts/prerender/`) into the production HTML.
  Never reintroduce separately authored SEO copy, route-name templates, or any
  "fallback" body generated from a page's title.
- **Real content or `noindex` — never filler.** If a page has nothing
  page-specific to say, lower its `contentQuality` so it is served `noindex`.
  Do not pad it, and do not invent educational, legal, syllabus, statistical or
  biographical facts to satisfy a threshold.
- **Do not chase word counts.** The gates check emptiness, placeholder/loading
  state and duplication. A short page of unique structured information is fine.
- Past-paper pages are indexable only where the paper's real recorded questions
  exist (`scripts/lib/past-paper-content.mjs`). The rest are document pages:
  served and downloadable, not indexed.

## Before you claim a route change works

A route change is complete only when all five layers agree: router, UI links,
build output, Hostinger `.htaccess` resolution, and canonical/robots/sitemap
state. Direct URL navigation and refresh are the test that matters — in-app
navigation working proves nothing.

Run, and do not silence:

```
npm run build:hostinger      # enforces every content and route gate
npm run test:all             # includes tests/productionRoutes.test.ts
```

`build:hostinger` is the production build and must stay safe on its own.
`build:hostinger:strict` only tightens the duplicate threshold; it is not
allowed to become the only trustworthy build. Never turn a failing gate into a
warning, exclude a failing page from an audit, or skip a test to get green.
