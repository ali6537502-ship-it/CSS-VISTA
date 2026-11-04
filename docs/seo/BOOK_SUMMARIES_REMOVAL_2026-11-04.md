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

The first removal audit exposed a rule-order defect (generic missing-file handling could precede the 410); the retirement rule now runs before that handling. Browser checks wait for actual note sample links after navigation rather than measuring a transient loading view.

## Production evidence

Deployment and live results will be recorded after the exact merged commit fingerprint is observed. No AdSense review request is submitted. Removal alone does not demonstrate approval readiness or guarantee approval.
