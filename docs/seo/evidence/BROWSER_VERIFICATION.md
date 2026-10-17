# Public browser baseline — 14 October 2026

Evidence: `browser-comparison-baseline.json` contains 36 navigations: nine paths, production and the pre-repair local strict Hostinger artifact, JavaScript disabled and enabled. `browser-tools-baseline.json` records local-only tool interactions. Mobile screenshots use 390 × 844 CSS pixels. Production TLS verification remained enabled, using the managed environment's inherited proxy and CA trust. No account login, backend mutation, Google account access or production deployment occurred.

## Confirmed findings

- The optional financial-accounting topic and Islamic Studies concept-of-Islam topic both return substantial topic-specific study material before and after JavaScript. Their Article and BreadcrumbList JSON-LD graph disappears after the application starts; global WebSite/EducationalOrganization data remains. Production and local baseline agree.
- `/subjects/selector` returns `noindex, follow`. The existing wizard generates **900 marks** for both suggested combinations and visibly reports “Total is 900, must be exactly 600.” This is a real utility defect independent of indexing or ad policy. The browser reproduction used a disposable guest context and Social Sciences / Arts background.
- `/css-eligibility-calculator` works without login or backend access. A local 15 June 1998 example returned final eligible year CE-2028 and two usable attempts, at the observed 2026 runtime. This confirms interaction, not an independent legal certification of FPSC rules.
- `/grammar-course` contains substantive authored lessons accessible to guests and is currently `noindex, follow`. Its local guest opening state includes an actual Day 1 explanation, worked material and links to thirty lessons; it is a useful public educational tool, requiring a deliberate indexability decision separate from ad eligibility.
- Book detail `/book-summaries/why-nations-fail` contains its complete supplied summary body in raw HTML. The increase from 3,168 raw main-text characters to 49,395 rendered characters is primarily the entire shelf catalogue behind the open reader; it is **not evidence of missing raw summary content**. The rendered body repeats the same explanation and lessons. Character counts describe rendering only, never a Google content-quality threshold.
- All sampled real public paths return 200. The deliberately nonexistent path returns a genuine 404, remains noindex, and has no ad loader.
- Canonicals remain on the intended `https://www.css-vista.com/` origin after rendering. Sampled selector, calculator and missing routes do not load AdSense; the reviewed educational pages do.
- No JavaScript page exceptions were observed in the 36 baseline navigations. JavaScript-enabled mobile samples had no horizontal document overflow. Some JavaScript-disabled samples reported overflow, and this requires separate layout inspection if prioritized; it is not a measured Core Web Vitals failure.

## Scope and limits

The local server uses `scripts/lib/htaccess-resolver.mjs`, models the supported rewrite subset, and deliberately does not execute PHP. Production Apache headers, PHP, authentication, account progress and paid flows are outside this smoke test. Anonymous API authentication lookups and non-GET requests were blocked. One local optional-page external resource failure appears in the evidence and does not remove study content. No performance entries in this report establish field LCP, INP or CLS; the report captures only observed browser lab timings.

The new repeatable check is `tests/browser/seo-readiness.mjs`. Run after the strict Hostinger build:

```sh
npm ci --prefix tests/browser --ignore-scripts
CSSV_BROWSER_EXECUTABLE=/usr/bin/chromium node tests/browser/seo-readiness.mjs
```

It uses a random loopback port and blocks all API calls, external requests and non-GET methods. It checks real 404s, canonical/schema persistence, mobile reflow, ad exclusions, valid 600-mark subject suggestions, calculator interaction and public grammar access. Its initial run **failed as expected** on the confirmed optional-topic schema loss; see `browser-regression-baseline-failure.json`. Final-run results must be recorded separately after repairs and rebuilding.

## Repaired-artifact verification

The follow-up browser check passed all eight representative routes on the repaired Hostinger artifact; see `browser-regression-final.json`. Both topic families preserve Article and BreadcrumbList structured data after rendering. Both subject-selection suggestions are now valid 600-mark combinations. The calculator still works, the guest can open the full authored grammar lesson, intended canonicals persist, focused tools stay ad-free, and the deliberately missing route remains a genuine 404. All eight rendered mobile pages passed document reflow and JavaScript exception checks.

One first attempt captured a transient empty React lazy-route state immediately after network-idle on the selector. The smoke test now waits explicitly for the actual route H1 before assessing rendered content; the subsequent full run passed. This was a test synchronization issue, not evidence that production returns an empty selector page.

These checks verify the local generated release candidate, not a production deployment or Google's indexing/AdSense decision.

## Final expanded run —15 October2026

The final rebuilt-artifact run passes **all10 routes**, including a real existing Vistagram reader and an unknown Vistagram slug. Unknown article rendering now retains a meaningful error heading and removes a misleading canonical/schema; the response remains404/noindex/ad-free. The earlier failing attempt is preserved in `browser-invalid-article-baseline-failure.json`. The final pass is in `browser-regression-final.json`.

`npm run audit:browser:seo` also passes the runtime ad-provider fixture, with a stub Google response and no live ad impression/click. Loading/error markers suppress managed library/slot requests; ready content permits one loader request. Existing static-first loaders and Google's account-controlled Auto Ads remain outside this guarantee. The strict Hostinger build and all16 generated-route tests pass; consult [verification](../VERIFICATION.md) for full scope and limits.

## Editorial continuation — 15 October 2026

The final source-supported content build passes **16 public artifact routes**, using the actual Chromium renderer at 390 × 844. Coverage adds verified/unverified/translation-specific book source notes, shared HTTP/runtime wording, both updated constitutional notes, the inspected result source, and `/journal` with all six native readable texts. The Pacific NOAA source and separate Eid calendar clarification are present in static HTML and visible after disclosure. All pages retain intended canonical/schema/robots behavior, no JavaScript exceptions and no mobile document overflow before or after interactions.

The separate advertising fixture also passes with stub Google responses. It proves managed loader/manual-slot state gates, not real account Auto Ads exclusions or Google approval. See `browser-editorial-final.json` and `editorial-browser.log`. No public backend or account write was allowed.

## Further source follow-up

The latest run passes **18 routes**. It adds actual bibliography rendering for Capitalism and Freedom while retaining its unverified quotation status, and The Road to Serfdom without inventing a quotation/copy button. All six Journal clarifications are verified in the real reader, including survey populations/reporting periods and the contemporaneous Senate question's limited evidentiary role. No mobile overflow or JavaScript errors were observed. The ad fixture still uses a stub and does not validate real account exclusions. See `browser-followup-final.json` and `followup-browser-final.log`; prior snapshots keep their original counts.
