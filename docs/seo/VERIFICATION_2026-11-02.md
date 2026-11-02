# CSS Vista AdSense recovery: resumed production verification

**Verdict: NOT READY for another AdSense review.** The confirmed rendering/advertising correction is deployed and retained. The technical evidence does not establish site-wide editorial originality, reproduction rights, current Google account findings or regional consent behavior. No review request was submitted.

## Root-cause findings and correction

The confirmed defect was `/subjects/compulsory/current-affairs`: initial HTML exposed an indexable, ad-enabled subject guide, while the browser replaced it with the paused Pro notice. SSR omitted the application's existing `SelectedStudyGate`. This is a plausible rejection contributor, not proof of Google's causal decision.

PR [#146](https://github.com/ali6537502-ship-it/CSS-VISTA/pull/146) merged as `3ed0918b3259a621b56058a55022b1df5cc43cab`. It applies the same gate during prerendering and makes that unavailable URL noindex, ad-free and absent from the sitemap. It retains the guide source and all existing access restrictions. No major collection was removed or bulk-noindexed. Regression checks cover the generated document, browser state, advertising and live crawler response.

Affected files: `scripts/prerender/routes.tsx`, `src/data/routeRegistry.mjs`, `scripts/check-adsense-production.mjs`, `tests/pausedSubjectSeo.test.mjs`, `tests/browser/seo-readiness.mjs`, `tests/browser/production-content.mjs` and the Hostinger verification workflow. The [31 October report](RECOVERY_2026-10-31.md) records the URL-level decision, inventory and broader findings.

## Production and CI evidence

Production on 2 November reports **`eff08a58a0e2791ae26ba78f087e8510682b7582`**, built **2026-11-02 07:24:08.791 UTC**. It matches current main at this inspection and includes the correction plus subsequent scheduled publications. No new product deployment was required during this continuation.

- [Current fingerprint](evidence/2026-11-02/fingerprint-2026-11-02.json).
- [Original release CI](evidence/2026-11-02/original-release-ci.json): both build paths and all four live jobs succeeded. This closes the previous pending-CI qualification.
- [Current commit CI](evidence/2026-11-02/current-commit-ci.json): all 14 reported checks succeeded, including the full Hostinger test/build path, fingerprint, live AdSense/crawler checks, Book Summaries, backend and account publishing checks.
- [Current public state](evidence/2026-11-02/public-state-2026-11-02.json): backend responds `ok:true`; Pro remains `paused:true`; affected subject responds 200 with the pause notice, `noindex, follow`, no AdSense loader, and no sitemap entry.
- [HTTP redirects](evidence/2026-11-02/http-redirects.json): HTTP/apex variants resolve to HTTPS www; the seller record matches the existing publisher. The workspace's Node fetch implementation still fails on HTTP-only requests; independent urllib checks and the successful GitHub live checker establish the distinction. The raw failed checker output is retained, not relabeled a full local pass.

The prior local evidence includes 372 passing Node tests, 19 direct-route cases, a strict Hostinger build, 48 artifact browser routes, runtime ad fixtures, zero reported production-dependency vulnerabilities and lint with zero errors/one pre-existing warning. The prior 1,100-URL inventory and 378 PDF HEAD checks are dated 31 October; they are not presented as a fresh full-site crawl today.

## Browser and content interpretation

The original final browser attempt was interrupted by a workspace gateway tunnel failure affecting CSS Vista and GitHub alike. That timeout did not establish a CSS Vista defect. The resumed run uses the existing read-only browser harness at mobile and desktop widths, blocking third parties and all non-GET requests. No account edits or ad clicks are performed.

The Book Summaries reader is a visible dialog outside the shelf's `<main>`. Comparing only `<main>` can therefore produce a low similarity figure even when the correct full reader is open. A focused live check at both widths found the expected supplied explanation and source notes in the visible Why Nations Fail reader (2,888 characters). Its initial network-idle timeout was replaced by waiting for that actual reader content; the assertions on the full explanation and source region were retained.

Daily PDF library/readers retain an intentional noindex/ad-free initial shell; their rendered catalogue differs from that shell. A low similarity score alone is not evidence of cloaking or an indexable duplicate. The original subject defect is different: the full public-looking guide was replaced by an unavailable notice while remaining indexable/ad-enabled. Its correction is tested explicitly.

## Content-quality and account limits

No additional articles, quotations, contributor identities, qualifications or permission claims were created. No supplied book bodies, PDFs, notes or private drafts were republished or rewritten during this continuation. The existing quotation ledger retains 10 exact, 31 excerpt, one paraphrase/translation, 47 unverified and 11 no-quotation entries; those classifications do not certify the surrounding analysis or rights.

The latest matched official rejection email remains 28 October 2026 UTC; it is generic. The 17 October repository evidence records the historical Sites category **Low-value content** and a separate Policy Center **No current issues** observation. Neither is a current authenticated dashboard read. No connected AdSense browser is callable, and Search Console access remains subscription-blocked. No paid subscription, new publisher ID or account setting was introduced.

Unresolved items remain material:

1. Item-level contributor/originality/source evidence and the rights basis for third-party material, especially supplied summaries, covers, archive images and source documents. The existing owner-reported provider statement is not a collection-specific licence or authorship record. Targeted Drive searches did not locate permission/contributor records; absence from search is not proof of infringement.
2. Current authenticated Sites details and Policy Center status; the complete reported 15-rejection history and reviewed deployment versions remain unestablished.
3. Current Search Console exclusions/live URL inspections, field Core Web Vitals, actual account-controlled ad placements, and regional CMP delivery/revocation.
4. Private account record integrity and email delivery are not established by public health or anonymous browser checks. No production account records were changed for testing.

Do not request another review merely because the rendering fix and technical checks pass. Complete the substantive provenance/editorial and current account checks first. Google alone decides AdSense eligibility; no approval or readiness guarantee is made.

## Completed resumed browser outcome

The [live browser report](evidence/2026-11-02/browser-production.json) completed successfully: **48 observations across 24 representative paths**, at 390px and 1366px widths. Every tested document returned HTTP 200; ordinary/Googlebot primary text matched; rendered primary content was present; no captured page JavaScript errors or horizontal overflow occurred. The affected subject's initial/rendered primary-text similarity was exactly 1.0 at both widths, with noindex and no ad loader. The [mobile screenshot](evidence/2026-11-02/paused-subject-mobile.png) records the actual notice.

The final pass covers home, compulsory/optional subjects, Vistagram, daily PDF library/edition, Journal, book shelf/reader, past-paper library/collection, MCQs, notes, Study Material, grammar course, tools, About, Contact, editorial/privacy pages, account and answer timer. The previously interrupted Study Material view passes at both widths. These are representative public checks, not a fresh editorial review of every indexable URL.

The [focused reader evidence](evidence/2026-11-02/live-reader-result.json) and [past-paper filter journey](evidence/2026-11-02/live-archive-journey-2026-11-02.json) also pass at both widths. The archive search updates the URL, survives reload, applies noindex to the filtered view, then restores the canonical indexable URL when cleared. No backend writes, account sign-in, ad clicks or real advertising responses were needed.

The [end fingerprint](evidence/2026-11-02/end-fingerprint.json) remains `eff08a58a0e2791ae26ba78f087e8510682b7582`, matching the start. This closes the interrupted representative production pass. It does not change the NOT READY verdict or the outstanding editorial/account requirements above.
