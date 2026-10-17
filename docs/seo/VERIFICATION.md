# Verification evidence

## Verified live release — 17 October 2026

PR #94 is merged and the exact release `b74ee781b230ebd7c047ff0a6419927a125b96db` is verified live. All post-merge workflows and the 26-page public monitor pass; Google live tests and two selective indexing confirmations are recorded. See [release outcome](RELEASE_2026-10-17.md) and [dated evidence](evidence/release-verification-2026-10-17.json). This supersedes earlier pending deployment/sign-in statements. AdSense approval, rights, regional consent/revocation and final ad preview remain unresolved; no AdSense review was requested.

## Current continuation — 17 October 2026

The isolated harness repair at `da5a8275acb830a7bf754a479798a62867a3a5f3` passes all GitHub workflows, including payment-invariants on its second attempt. Retain its first attempt's later Chromium failure and the original navigation failure as real failed checks. The additional archive-query correction follows Google's live rendered-noindex finding; its new checks and release outcome must be recorded separately. See [continuation](ACCOUNT_RECOVERY_2026-10-17.md). No live deployment is claimed by that CI pass.

Public baseline/research:14 October 2026. Final local verification:16 October 2026. Branch `fix/seo-indexing-adsense-recovery`; baseline HEAD `cd9c6e4c24c96b678c7cfff2c4b840adb98a03c8`. The initial sections describe local working-tree verification. The final continuation below records subsequent publishing/live evidence separately. The build fingerprint records checked-out HEAD and build time; its old SHA does **not** assert these uncommitted changes are live.

## Verified production baseline

[Raw HTTP evidence](evidence/README.md) contains 113 distinct public/technical probes, four asset checks, five sitemap files, nine named-user-agent comparisons and five sensitive-path HEAD checks. This is a bounded sample, not an exhaustive live fetch of every discovered URL. There are 1,018 unique production sitemap URLs; all 68 sampled submitted destinations return direct200 with correct canonical/robots. The live fingerprint matched baseline HEAD. Missing pages returned real 404 and sensitive paths denied access. Source/sitemap/link discovery is recorded in [inventory](URL_INVENTORY.json), with unavailable live and Google fields left null.

## Local validation

| Check | Result and scope |
| --- | --- |
| `npm run typecheck` | Passed; application TypeScript project build. |
| `npm run lint` | Passed; repository ESLint. |
| `npm run test:all` |256 tests passed: 251 Node tests across 17 runner groups plus five Python editorial tests, zero failures/skips, plus grammar preservation/catalogue checks. Covers existing accounts/policies/state logic and new SEO, selector, MCQ audit, collection and Vistagram regressions. This is not an authenticated live account test. |
| `npm run audit` | Passed after fixing the broken ability link and two audit false positives. Import/catalogue checks preserve339 optional topics,1,382 references and existing question/paper resources. Structural success is not factual certification. |
| `npm run build:hostinger:strict` | Passed on 16 October after the book-source continuation; complete artifact with mandatory route/link/duplicate/sitemap/head gates. |
| `npm run audit:hostinger` | Passed on the prepared artifact. Final build invokes the same v2 audit. |
| `npm run audit:browser:seo` | Passed all 22 public routes, mobile rendering, article schema/canonical hydration, two genuine 404s, selector/calculator/grammar interactions, plus the actual ad-provider fixture. No accounts or live ad calls. |
| `npm run test:routes` after final build |16 tests passed, zero failures/skips, including all 22 packaged Vistagram readers and unknown slug 404s. |
| `node scripts/seo/overlay-artifact.mjs dist` | Every discovered same-origin concrete path resolved locally; all 1,019 sitemap destinations verified. Does not overwrite live HTTP observations. |
| `git diff --check` | Passed; no whitespace/conflict-marker errors. |

The strict build verifies 1,019 indexable canonical URLs (core 588/GK 42/collections 24/papers 365),1,527 application HTML pages,1,528 total generated HTML files, and 60,961 first-party links. It restores22 existing public Vistagram readers without adding them to sitemaps or enabling ads. All782 paper viewers remain served:365 indexable and 417 intentionally excluded under existing source-question gates. The existing Pure Mathematics subject hub remains noindex; its topic remains available. The newly indexable public grammar course explains the single additional sitemap entry.

The local HTTP resolver models a documented Apache subset. It does not execute PHP, simulate a production CDN or verify live backend ownership/membership. No account data or payment controls changed, and Pro/MPT release restrictions were retained.

## Significant failures investigated

1. Baseline browser schema loss was reproduced, preserved in evidence and corrected using shared client/static metadata.
2. Removing repeated archive advice initially made four genuine single-paper MPT archives fail a60-word floor. The fix verifies their actual source-backed resource membership and identifying facts; it does not pad content, lower the global floor or suppress failures.
3. A pre-existing ad test assumed every interactive route must be noindex. It was updated to verify the reviewed public grammar course's explicit index eligibility while retaining ad exclusion and fail-closed defaults elsewhere.
4. Broad source audit caught the wrong ability category link; corrected to the existing route. MCQ stem-only comparison and historical numeric-ID quarantine also produced false positives. Complete question/source-record identity now preserves later distinct imports while retaining the original quarantine and reporting cross-ID review candidates.
5. Expanded browser coverage caught the unknown Vistagram article's missing rendered heading and invalid runtime canonical. The error view now has a meaningful H1, explicit failure marker, noindex and no canonical/schema claiming an article. See `browser-invalid-article-baseline-failure.json`.
6. The production `check:adsense` command initially failed all network calls without proxy opt-in. With `NODE_USE_ENV_PROXY=1`, HTTPS files, all eight page samples, sitemap children, verification, genuine 404 and HTTPS canonical checks passed; its three plain-HTTP variant/redirect fetches still failed with Node proxy socket errors. Independent Python/curl HTTP probes recorded the working actual redirects. This command's nonzero result is retained, not described as a pass or a confirmed production outage.

## Performance/accessibility limits

[Lab evidence](evidence/PERFORMANCE_LAB.md) includes six local desktop/mobile LCP/CLS observations and an isolated Lighthouse mobile run. The simulated local homepage scored51/100 performance with 7.05s LCP and 424ms total blocking time. The unthrottled local samples and simulated Lighthouse result are different setups; neither is field CWV or production speed. Large Vite chunks and ticker/countdown accessibility findings remain measured follow-up work. No field INP, CrUX/PageSpeed account data, server crawl logs or Google rendered inspection was available.

## Google and release limits

The owner reports **“low quality content”**. AdSense account notice/history/Policy Center and Search Console exclusions remain unverified because connected access is blocked. Public verification code/files are intact; account approval and Google's actual indexed count are unknown. The bounded editorial changes and quotation qualifications are implemented; unresolved quotation/rights/claim reviews and account consent/exclusions remain prerequisites. No production deployment, Google submission or claimed approval/indexing success occurred.

Final log excerpts and machine evidence are stored under [evidence](evidence/README.md). Reproduction and post-release steps are in [monitoring](MONITORING.md).

## Resume-day recheck

On15 October, remote `main` still resolves to the baseline SHA. A first curl fingerprint probe returned503; independent subsequent Python GETs of homepage, fingerprint and robots all returned200, and the fingerprint remains the12 October baseline. This isolated transient failure is recorded without declaring a sitewide outage or a resolved hosting root cause. See `live-recheck-2026-10-15.json`. The Search Console account readiness call was retried and remains subscription-blocked. No new account information was available.

## Editorial continuation verification — 15 October 2026

The complete final artifact was rebuilt after the content changes. TypeScript, full lint, `npm run audit`, `npm run test:all`, strict Hostinger build and `npm run audit:hostinger` pass. The complete suite includes **23 new editorial checks** (18 Node + 5 Python). The final browser/ad fixture passes **16 routes**, including three book source/quotation variants, two constitutional-note updates, result citation, all six Journal text readers and both separate editorial clarifications.

The artifact still contains 1,019 intended sitemap URLs and 1,527 application HTML pages (1,528 total); 60,961 internal links resolve. Source-preservation comparison confirms all 37,627 MCQ identities/order/stems/options/classifications, exactly 56 explanation changes, 26 source links and only the documented answer-index correction. Existing book bodies, DOCX originals and Journal images remain unchanged; two exact-anchor optional topic updates and six image-compared transcripts are separately documented. No protected General Ability material was made public.

Evidence: [editorial completion](EDITORIAL_COMPLETION.md), [preservation check](evidence/editorial-preservation-check.json), [editorial test log](evidence/editorial-tests-summary.log), [strict build log](evidence/editorial-build-summary.log), [browser result](evidence/browser-editorial-final.json) and [command results](evidence/editorial-verification-results.json). The URL inventory now separates local editorial-review status from all observed production fields. The checked-out SHA is still the baseline; generated fingerprints alone must not be mistaken for evidence that the uncommitted working-tree candidate is deployed. A source manifest fingerprints the prepared file set.

While research was in progress, the book metadata generator correctly refused verified entries lacking an explicit original/excerpt source scope. Those records were completed with their actual evidence roles; matching author descriptions and speeches remain unverified as book quotations. No guard was weakened.

Google readiness was retried after implementation and still returned `payment_required`; [account-access evidence](evidence/google-access-2026-10-15.json) records that no reports were retrieved or settings changed. Source/copyright and unresolved factual dependencies are explicit; no new AdSense review is advised yet.

Final public follow-up at 15:48 UTC on 15 October: homepage, robots and cache-bypassed deployment fingerprint all returned HTTP 200. Production and remote main still report the original `cd9c6e4c24c96b678c7cfff2c4b840adb98a03c8` revision/build from 12 October. This confirms that these local repairs have not been deployed; it does not authenticate every database row or cached asset.

## Further primary-source follow-up verification

The later follow-up passes **253 tests** (248 Node + five Python), full TypeScript/lint/source audits, the complete strict Hostinger build and Hostinger artifact audit. The final Chromium/ad check passes **18 routes**, including the verified-bibliography/unverified-quotation distinction and a book without a quotation. Six Journal clarifications and all their source links are present in the generated HTML and the real reader. The new notes preserve all original reading-body hashes, images and publication dates.

There are 71 verified primary book identity records and 29 unresolved identities; 61 quotations remain unverified. No quotation or copyright status was upgraded merely from a publisher listing. Detailed availability/source-scope evidence is in [follow-up](EDITORIAL_FOLLOWUP.md). The core artifact remains 1,019 sitemap URLs, 1,527 application pages (1,528 total) and 60,961 checked internal links. No production or Google account mutation was performed.

Latest evidence: [command results](evidence/followup-verification-results.json), [test log](evidence/followup-tests.log), [strict build](evidence/followup-build-summary.log), [browser evidence](evidence/browser-followup-final.json), [browser log](evidence/followup-browser-final.log) and the refreshed [source manifest](evidence/prepared-source-manifest.json). The first editorial candidate's manifest is preserved separately as `prepared-source-manifest-first-editorial.json`; previous dated results retain their historical counts.

The build continues to report existing non-blocking Browserslist age, mixed JSON import-attribute, bundle-size and static/dynamic import warnings. No dependency migration or unrelated performance change was introduced in this content pass; the earlier lab/field limitations still apply.

## Book-source verification — 16 October 2026

The current candidate passes **256 tests** (251 Node across 17 runner groups plus five Python), TypeScript, lint, source audits, the complete strict Hostinger build, the Hostinger audit and **22 public browser routes** plus the isolated ad-state fixture. The new browser cases cover both verified excerpts, a primary bibliographic record with an unverified quotation, and an edited collection without a quotation. Static and React readers show the same labels and actual locators.

All 100 reader bibliographies are populated. The source library is byte-identical to baseline (SHA-256 `f4a57cab5566e5508896437d272e7c6b2e2759f9fed4c0c4b7e86cb218cf7d8e`); original analysis, covers and book access are preserved. Current quotation totals are nine exact, twenty excerpts, one identified translation, 59 unverified entries and eleven books without quotations. The new mandatory ledger-summary gate catches stale aggregate claims and missing/unsafe/explicitly unsuccessful identity evidence. It cannot certify the truth or rights of external documents automatically.

[Command results](evidence/book-pass-verification-results.json), [test log](evidence/book-pass-tests.log), [strict build summary](evidence/book-pass-build-summary.log), [browser result](evidence/browser-book-pass-final.json) and [source review](BOOK_SOURCE_REVIEW_2026-10-16.md) identify this pass. The then-current [book-pass source manifest](evidence/prepared-source-manifest-2026-10-16-book-pass.json) fingerprints 94 prepared source/test files and the authoritative ledger; its aggregate is `dfbc6eefa19662b794bf1c7df8b9df670910305e4816ed15f7feb8bc65d74fa1`. The 15 October follow-up manifest remains separately preserved. Artifact totals remain 1,019 sitemap URLs, 1,527 application HTML pages, 1,528 HTML files overall and 60,961 internal links.

A fresh [public check](evidence/live-recheck-2026-10-16.json) at 05:01 UTC found homepage/fingerprint HTTP 200, with production and remote main still at the 12 October baseline SHA. The [read-only Google readiness retry](evidence/google-access-2026-10-16.json) still returned the subscription error. No production changes, Google-side mutations or actual account findings are asserted. Existing nonblocking build warnings and earlier performance/consent/rights limits remain.

## Final autonomous continuation — 16 October 2026

The owner authorized the scoped SEO release; Pro/MPT, paid/AI activation and private-draft restrictions remain. The earlier sections are dated pass snapshots, not current aggregate claims. Additional repairs and recovered historical Google evidence are documented in [release continuation](AUTONOMOUS_RELEASE_2026-10-16.md). Final command/browser/performance results and actual GitHub/live deployment evidence are recorded below as completed; local output bearing the old baseline SHA is not production proof.

Final local gates pass: TypeScript, lint, source audits, **263 tests** (258 Node plus five Python), strict Hostinger build, Hostinger audit and **24 browser routes**. Both injected-503 fixtures make one failed request, keep a stable error and adjacent-topic navigation, and recover on the next topic. Deferred metadata cannot overwrite a later route. The ad provider's executed-library fixture uses only stub Google responses and confirms a clean destination document.

The artifact contains 1,019 intended sitemap URLs, 1,527 application HTML pages (1,528 total), 60,961 resolving first-party links, 598 loader-eligible documents and 929 no-loader documents. The entry JS is 480,144 bytes; metadata/profile code loads separately. The final isolated local Lighthouse sample scores accessibility 100, SEO 100 and performance 52; simulated LCP 6.978 s/TBT 413 ms. This is not a production or field CWV result. [Lab details](evidence/PERFORMANCE_LAB.md) retain the limits and discarded attempts.

[Machine verification](evidence/autonomous-verification-results.json), [final browser evidence](evidence/browser-autonomous-final.json) and [current source manifest](evidence/prepared-source-manifest.json) identify the candidate. The manifest covers 103 source/test/workflow/public/authoritative-ledger files; aggregate `3752aad93a597659c96dc62943a06cf742abb6fbc71102bdeeec9b6e4969ec2a`. The previous 94-file book-pass manifest is preserved separately. The baseline public monitor fails only on the old grammar noindex/sitemap absence, as expected before release. Historical account examples are kept separate from unknown present Google indexing status.

## Final archive/source verification — 17 October

The completed strict Hostinger build passes all final metadata, route, sitemap, link and duplicate/content gates: 1,019 intended sitemap URLs, 1,527 application HTML pages, 1,528 total HTML files and 60,961 resolving links. TypeScript and lint pass on the final source. Chromium passes **26** public routes plus metadata cancellation, failed-resource and isolated advertising-boundary checks. The two canonical archive routes stay indexable after mounting; real query filters remain noindex, an explicit all-years selection survives reload, restoring defaults clears the query, and controls fit both 320px and 390px widths. All 16 route tests and the native HTTPS routing regression pass. The earlier continuation full suite passed 258 Node plus five Python tests, and the complete source audit passed; final commit CI is required separately.

The intermediate candidate `0318039cb8f188b97254b6e3243833f0a2285816` failed its new browser check on genuine archive mobile overflow (run 39012944111, job 117339130608); the corrected final source passes locally. Its payment-invariants job passes on its first attempt (run 39012944081, job 117339130209). No check was suppressed. The original book JSON hash is unchanged. [Dated results](evidence/continuation-verification-2026-10-17.json) and [cumulative source manifest](evidence/prepared-source-manifest-2026-10-17.json) distinguish source/artifact, remote CI and live deployment. The live site still showed the 12 October SHA at the pre-merge check.
