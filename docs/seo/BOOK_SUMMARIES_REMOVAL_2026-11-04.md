# Owner-requested Book Summaries removal — 4 November 2026

The owner explicitly requested removal of Book Summaries. This change implements that publishing decision; it does not establish a copyright violation or attribute an AdSense rejection to the collection. The owner's attribution to Ali Hassan Sargana remains recorded in the earlier evidence branch.

## Public changes

- Retire the hub and 100 individual summaries from the app and prerender registry, navigation, homepage, search and study-resume suggestions.
- Remove summary catalogue JSON, covers and reader HTML from the deployment artifact. Prevent reader JavaScript from entering the app bundle.
- Return HTTP 410 with a noindex, ad-free removal notice for the complete old namespace, SEO readers and stale reader JavaScript. The early server rule also protects against old files retained on Hostinger.
- Exclude the retired URLs from all sitemap files. Enforce removal in normal builds and in a dedicated live CI check, replacing obsolete positive-availability assertions.

Books by Sir Ali, Notes, Journal, past papers and other educational resources remain available. Accounts, stored reading progress and other personal records are untouched. Original collection source remains recoverable in the repository and is not shipped in the website artifact; this is not a private archive. The source catalogue SHA-256 remains `f4a57cab5566e5508896437d272e7c6b2e2759f9fed4c0c4b7e86cb218cf7d8e`.

## Validation before release

- Strict Hostinger build passed: 923 indexable URLs; 65,781 internal links resolve; mandatory routing, duplicate-content, rendering and advertising gates pass.
- Full suite: 404 tests passed, no failures or skips. Post-build direct-route suite: 21 passed.
- TypeScript passed. ESLint: no errors; existing Introduction hook warning remains.
- Existing browser suites passed: 25 public routes, canonical/schema hydration, genuine 404, ad exclusions, learning tools, notes and Journal; ad-state and privacy-choice tests pass.
- New removal browser test verifies mobile/desktop home discovery, 410/noindex/ad-free notice, original Books navigation and surviving Notes sample links.
- Artifact checks verify seven representative retired entry points, including raw JSON, covers, generated SEO HTML and stale reader JS.

The first removal audit exposed a rule-order defect (generic missing-file handling could precede the 410); the retirement rule now runs before that handling. The Notes journey opens the existing Sample notes disclosure and waits for its sample links, rather than measuring a transient view or expecting links in closed disclosures to be visible. The artifact-only test follows existing route tests by deferring until dist exists on a clean checkout; the normal build still runs the retirement audit unconditionally and the post-build suite repeats it.

## Production evidence

Verified again on **10 November 2026 (Asia/Karachi)**. Removal PR [#158](https://github.com/ali6537502-ship-it/CSS-VISTA/pull/158) and clean-checkout test fix [#159](https://github.com/ali6537502-ship-it/CSS-VISTA/pull/159) are merged. Hostinger now serves subsequent main commit `1d5a29e00b878bc29341ecadb977399163a97fe1`, with its matching deployment fingerprint (`builtAt: 2026-11-10T07:17:48.934Z`). The removal persists through later publication releases.

- All seven retired URLs above return **410**, noindex and ad-free HTML. Ordinary requests and legitimate Googlebot requests receive identical notice HTML.
- Live Chromium journeys pass at widths 390 and 1366: no summary discovery links, original Books navigation retained, old reader returns the removal notice, Notes sample disclosure and links work. Only same-origin GETs were allowed; backend and third-party calls were blocked in this browser test.
- Homepage, Books, Notes, Journal, past papers and privacy policy return 200. Public backend health reports `ok:true`. A subsequent product release now reports `paused:false`, `free:true`, `pro_retired:true`; this removal task did not change those product settings. No accounts or saved records were changed or inspected.
- All four live child sitemaps exclude the retired collection.
- Latest [Hostinger workflow 42773742370](https://github.com/ali6537502-ship-it/CSS-VISTA/actions/runs/42773742370) succeeded, including both clean build paths, exact fingerprint, AdSense/crawler checks, Book Summaries removal and backend checks.

The original 4 November follow-up workflow missed its exact-fingerprint time window and skipped dependent live jobs. That historical run is not represented as a pass. The later successful workflow and fresh live checks above establish the current result. The original local AdSense checker also encountered HTTP proxy failures on non-HTTPS variants; the successful latest GitHub crawler check provides separate production evidence.

Machine-readable results: [book-summaries-removal-2026-11-10.json](evidence/book-summaries-removal-2026-11-10.json).

No AdSense review request was submitted. This collection removal is complete; it does not establish that all broader editorial/account checks have passed or guarantee AdSense approval.
