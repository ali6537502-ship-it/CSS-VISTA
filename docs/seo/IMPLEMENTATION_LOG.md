# Implementation log

Branch: `fix/seo-indexing-adsense-recovery`. Baseline `cd9c6e4c24c96b678c7cfff2c4b840adb98a03c8`. Technical and source-supported editorial changes prepared 14–16 October 2026. The owner subsequently authorized the scoped SEO release. Actual GitHub/live proof is recorded in [verification](VERIFICATION.md); no Google submission or approval is implied.

Repairs cover rendering/metadata, source-backed archives and content notes, reliable learning tools, advertising suitability/document boundaries, failed-download stability, accessible motion controls and strict final validation. Bounded editorial work includes 56 explanations/one answer correction, two constitutional-note updates, six accessible Journal editions/six separate clarifications and the shared 100-book provenance review. Current book totals are 31 passage matches, one identified translation, 57 unverified entries and 11 without quotation labels; permissions remain independent.

Original book bodies, DOCX sources, Journal images, all 37,627 MCQ IDs/order/stems/options, accounts/history, pricing and resource access are preserved. Pro/MPT, private drafts, payments and AI restrictions remain. See [release continuation](AUTONOMOUS_RELEASE_2026-10-16.md) and [editorial completion](EDITORIAL_COMPLETION.md). Generated `dist/`, dependencies and temporary artifacts stay ignored. Dated evidence/prose is separate from source and live/Google findings.

All **274** changed or new repository files are accounted for below.

| File | Purpose |
| --- | --- |
| `.github/workflows/hostinger-build-check.yml` | Make strict content failures blocking and run isolated browser gates after building; preserve existing deployment workflow. |
| `.github/workflows/seo-monitoring.yml` | Schedule bounded read-only public release/crawler checks weekly and preserve dated artifacts without Google mutations or messages. |
| `AGENTS.md` | Record later scoped owner authorization for the tested SEO release; retain Pro/MPT, private-draft, paid and AI restrictions. |
| `docs/english-islamiyat-mcq-audit-2026-09-15.md` | Append evidence distinguishing later reused IDs from the original rejected import; retain original historical report. |
| `docs/seo/ADSENSE_READINESS.md` | Audit deliverable documenting findings, implementation, evidence, dependencies, account actions or monitoring. |
| `docs/seo/ARCHITECTURE.md` | Audit deliverable documenting findings, implementation, evidence, dependencies, account actions or monitoring. |
| `docs/seo/AUTONOMOUS_RELEASE_2026-10-16.md` | Document the final ad eligibility/document boundary, mobile accessibility, deferred loading, failed-download recovery, book-source continuation and historical Google evidence. |
| `docs/seo/BOOK_SOURCE_REVIEW_2026-10-16.md` | Document 29 newly inspected identities, two located excerpt matches, source limitations, preserved content and mandatory review-total safeguards. |
| `docs/seo/CONTENT_REVIEW.md` | Audit deliverable documenting findings, implementation, evidence, dependencies, account actions or monitoring. |
| `docs/seo/EDITORIAL_COMPLETION.md` | Concrete completed editorial scope, exact counts, evidence links, preservation guarantees and unresolved source/rights/account/release dependencies. |
| `docs/seo/EDITORIAL_FOLLOWUP.md` | Record 13 additional publisher identity checks, four new Journal clarification notes, actual source limits and final validation. |
| `docs/seo/GOOGLE_ACCOUNT_ACTIONS.md` | Audit deliverable documenting findings, implementation, evidence, dependencies, account actions or monitoring. |
| `docs/seo/IMPLEMENTATION_LOG.md` | Audit deliverable documenting findings, implementation, evidence, dependencies, account actions or monitoring. |
| `docs/seo/INDEXABILITY_MATRIX.json` | Explicit category/access/index/ad decision and rationale for every registered route family. |
| `docs/seo/INDEXABILITY_MATRIX.md` | Explicit category/access/index/ad decision and rationale for every registered route family. |
| `docs/seo/INDEXING_RECOVERY.md` | Audit deliverable documenting findings, implementation, evidence, dependencies, account actions or monitoring. |
| `docs/seo/MCQ_EDITORIAL_REVIEW.md` | Document individual explanation/key repairs, primary references, counts, unchanged ambiguous rows and preservation/test evidence. |
| `docs/seo/MONITORING.md` | Audit deliverable documenting findings, implementation, evidence, dependencies, account actions or monitoring. |
| `docs/seo/OFFICIAL_GUIDANCE.md` | Audit deliverable documenting findings, implementation, evidence, dependencies, account actions or monitoring. |
| `docs/seo/README.md` | Audit deliverable documenting findings, implementation, evidence, dependencies, account actions or monitoring. |
| `docs/seo/ROOT_CAUSE_ANALYSIS.md` | Audit deliverable documenting findings, implementation, evidence, dependencies, account actions or monitoring. |
| `docs/seo/URL_INVENTORY.csv` | Expose baseline/local canonical, robots, status, policy, actions and separate historical/current Google fields for repeatable review. |
| `docs/seo/URL_INVENTORY.json` | Consolidated URL policy/live-baseline/local-artifact inventory with 488 explicitly dated historical Google examples and unknown present Google status. |
| `docs/seo/VERIFICATION.md` | Audit deliverable documenting findings, implementation, evidence, dependencies, account actions or monitoring. |
| `docs/seo/editorial/JOURNAL_REVIEW.md` | Image/date/byline evidence, six accessible editions, separate sourced clarifications and precise remaining factual/rights questions. |
| `docs/seo/editorial/book-quotation-review.json` | Authoritative 100-identity ledger: 31 book-passage matches, one identified translation, 57 unverified quotation entries and separate unresolved permissions. |
| `docs/seo/editorial/rights-inventory.json` | Inventory 100 summaries/covers, 11 archive images, 23 DOCX and three publication records; private permission evidence is explicitly unavailable. |
| `docs/seo/evidence/BROWSER_VERIFICATION.md` | Dated public/local verification evidence; live and prepared-artifact observations distinguished. |
| `docs/seo/evidence/PERFORMANCE_LAB.md` | Dated public/local verification evidence; live and prepared-artifact observations distinguished. |
| `docs/seo/evidence/README.md` | Dated public/local verification evidence; live and prepared-artifact observations distinguished. |
| `docs/seo/evidence/additional-live-probes.json` | Dated public/local verification evidence; live and prepared-artifact observations distinguished. |
| `docs/seo/evidence/ads.txt` | Dated public/local verification evidence; live and prepared-artifact observations distinguished. |
| `docs/seo/evidence/adsense-public-baseline.log` | Dated public/local verification evidence; live and prepared-artifact observations distinguished. |
| `docs/seo/evidence/artifact-book-bibliography-followup.html` | Dated verification/source/HTML evidence for the prepared local follow-up; keep production, source-scope, Google and rights limits explicit. |
| `docs/seo/evidence/artifact-book-brave-new-world-2026-10-16.html` | Representative final local book HTML with actual bibliography, verified excerpt or unverified-wording label; not an observed production response. |
| `docs/seo/evidence/artifact-book-capital-in-the-twenty-first-century-2026-10-16.html` | Representative final local book HTML with actual bibliography, verified excerpt or unverified-wording label; not an observed production response. |
| `docs/seo/evidence/artifact-book-on-war.html` | Representative final generated HTML with substantive public content, actual citations/clarifications and canonical metadata; no private student records. |
| `docs/seo/evidence/artifact-book-pakistan-beyond-the-crisis-state-2026-10-16.html` | Representative final local book HTML with actual bibliography, verified excerpt or unverified-wording label; not an observed production response. |
| `docs/seo/evidence/artifact-book-source-notes.html` | Representative final generated HTML with substantive public content, actual citations/clarifications and canonical metadata; no private student records. |
| `docs/seo/evidence/artifact-book-the-better-angels-of-our-nature-2026-10-16.html` | Representative final local book HTML with actual bibliography, verified excerpt or unverified-wording label; not an observed production response. |
| `docs/seo/evidence/artifact-book-without-quotation-followup.html` | Dated verification/source/HTML evidence for the prepared local follow-up; keep production, source-scope, Google and rights limits explicit. |
| `docs/seo/evidence/artifact-constitutional-update.html` | Representative final generated HTML with substantive public content, actual citations/clarifications and canonical metadata; no private student records. |
| `docs/seo/evidence/artifact-grammar-course.html` | Representative final generated public HTML, including real main content and metadata; no private records. |
| `docs/seo/evidence/artifact-inventory-summary.json` | Dated public/local verification evidence; live and prepared-artifact observations distinguished. |
| `docs/seo/evidence/artifact-journal-followup.html` | Dated verification/source/HTML evidence for the prepared local follow-up; keep production, source-scope, Google and rights limits explicit. |
| `docs/seo/evidence/artifact-journal.html` | Representative final generated HTML with substantive public content, actual citations/clarifications and canonical metadata; no private student records. |
| `docs/seo/evidence/artifact-optional-topic.html` | Representative final generated public HTML, including real main content and metadata; no private records. |
| `docs/seo/evidence/artifact-vistagram-article.html` | Representative final generated public HTML, including real main content and metadata; no private records. |
| `docs/seo/evidence/autonomous-audit.log` | Dated command, source, HTTP, browser, performance or historical account evidence; preserve live/candidate and current/historical distinctions. |
| `docs/seo/evidence/autonomous-browser.log` | Dated command, source, HTTP, browser, performance or historical account evidence; preserve live/candidate and current/historical distinctions. |
| `docs/seo/evidence/autonomous-build.log` | Dated command, source, HTTP, browser, performance or historical account evidence; preserve live/candidate and current/historical distinctions. |
| `docs/seo/evidence/autonomous-final-browser.log` | Dated command, source, HTTP, browser, performance or historical account evidence; preserve live/candidate and current/historical distinctions. |
| `docs/seo/evidence/autonomous-final-build.log` | Dated command, source, HTTP, browser, performance or historical account evidence; preserve live/candidate and current/historical distinctions. |
| `docs/seo/evidence/autonomous-final-content-families.log` | Dated command, source, HTTP, browser, performance or historical account evidence; preserve live/candidate and current/historical distinctions. |
| `docs/seo/evidence/autonomous-final-hostinger.log` | Dated command, source, HTTP, browser, performance or historical account evidence; preserve live/candidate and current/historical distinctions. |
| `docs/seo/evidence/autonomous-final-lint.log` | Dated command, source, HTTP, browser, performance or historical account evidence; preserve live/candidate and current/historical distinctions. |
| `docs/seo/evidence/autonomous-final-performance.log` | Dated command, source, HTTP, browser, performance or historical account evidence; preserve live/candidate and current/historical distinctions. |
| `docs/seo/evidence/autonomous-final-tests.log` | Dated command, source, HTTP, browser, performance or historical account evidence; preserve live/candidate and current/historical distinctions. |
| `docs/seo/evidence/autonomous-final-typecheck.log` | Dated command, source, HTTP, browser, performance or historical account evidence; preserve live/candidate and current/historical distinctions. |
| `docs/seo/evidence/autonomous-hostinger.log` | Dated command, source, HTTP, browser, performance or historical account evidence; preserve live/candidate and current/historical distinctions. |
| `docs/seo/evidence/autonomous-inventory.log` | Dated command, source, HTTP, browser, performance or historical account evidence; preserve live/candidate and current/historical distinctions. |
| `docs/seo/evidence/autonomous-performance-isolation-rejected.log` | Dated command, source, HTTP, browser, performance or historical account evidence; preserve live/candidate and current/historical distinctions. |
| `docs/seo/evidence/autonomous-performance.log` | Dated command, source, HTTP, browser, performance or historical account evidence; preserve live/candidate and current/historical distinctions. |
| `docs/seo/evidence/autonomous-routes.log` | Dated command, source, HTTP, browser, performance or historical account evidence; preserve live/candidate and current/historical distinctions. |
| `docs/seo/evidence/autonomous-tests-stale-policy-failure.log` | Dated command, source, HTTP, browser, performance or historical account evidence; preserve live/candidate and current/historical distinctions. |
| `docs/seo/evidence/autonomous-tests.log` | Dated command, source, HTTP, browser, performance or historical account evidence; preserve live/candidate and current/historical distinctions. |
| `docs/seo/evidence/autonomous-typecheck.log` | Dated command, source, HTTP, browser, performance or historical account evidence; preserve live/candidate and current/historical distinctions. |
| `docs/seo/evidence/autonomous-verification-results.json` | Dated command, source, HTTP, browser, performance or historical account evidence; preserve live/candidate and current/historical distinctions. |
| `docs/seo/evidence/book-bibliography-followup.json` | Capture 13 inspected publisher identity records and 14 limited public-page/excerpt checks without treating identity or unavailable passages as quote verification. |
| `docs/seo/evidence/book-pass-audit.log` | Dated command output for the final 16 October prepared source/build/browser verification; retain actual outcome and scope. |
| `docs/seo/evidence/book-pass-browser.log` | Dated command output for the final 16 October prepared source/build/browser verification; retain actual outcome and scope. |
| `docs/seo/evidence/book-pass-build-summary.log` | Dated command output for the final 16 October prepared source/build/browser verification; retain actual outcome and scope. |
| `docs/seo/evidence/book-pass-build.log` | Dated command output for the final 16 October prepared source/build/browser verification; retain actual outcome and scope. |
| `docs/seo/evidence/book-pass-hostinger.log` | Dated command output for the final 16 October prepared source/build/browser verification; retain actual outcome and scope. |
| `docs/seo/evidence/book-pass-inventory.log` | Dated command output for the final 16 October prepared source/build/browser verification; retain actual outcome and scope. |
| `docs/seo/evidence/book-pass-lint.log` | Dated command output for the final 16 October prepared source/build/browser verification; retain actual outcome and scope. |
| `docs/seo/evidence/book-pass-tests.log` | Dated command output for the final 16 October prepared source/build/browser verification; retain actual outcome and scope. |
| `docs/seo/evidence/book-pass-typecheck.log` | Dated command output for the final 16 October prepared source/build/browser verification; retain actual outcome and scope. |
| `docs/seo/evidence/book-pass-verification-results.json` | Record the current 256-test/22-browser-route verification, complete artifact counts, unchanged source library, source-manifest identity and remaining account/rights/release dependencies. |
| `docs/seo/evidence/book-source-review-2026-10-16.json` | Capture exact primary identity and quotation sources, real direct-response fingerprints, web-extraction limits and unsuccessful/discarded candidates; no permission or Google-status inference. |
| `docs/seo/evidence/browser-autonomous-final.json` | Dated command, source, HTTP, browser, performance or historical account evidence; preserve live/candidate and current/historical distinctions. |
| `docs/seo/evidence/browser-book-pass-final.json` | Actual Chromium result for 22 public mobile artifact routes, HTTP/runtime metadata/citations, useful tool flows and genuine 404s; no live account or backend mutation. |
| `docs/seo/evidence/browser-comparison-baseline.json` | Dated public/local verification evidence; live and prepared-artifact observations distinguished. |
| `docs/seo/evidence/browser-editorial-final.json` | Dated raw verification/source/asset evidence for the prepared local candidate; preserve production, Google and rights limitations. |
| `docs/seo/evidence/browser-final.log` | Dated public/local verification evidence; live and prepared-artifact observations distinguished. |
| `docs/seo/evidence/browser-followup-final.json` | Dated verification/source/HTML evidence for the prepared local follow-up; keep production, source-scope, Google and rights limits explicit. |
| `docs/seo/evidence/browser-invalid-article-baseline-failure.json` | Dated public/local verification evidence; live and prepared-artifact observations distinguished. |
| `docs/seo/evidence/browser-local-book-summaries-why-nations-fail-mobile.png` | Dated public/local verification evidence; live and prepared-artifact observations distinguished. |
| `docs/seo/evidence/browser-local-css-eligibility-calculator-mobile.png` | Dated public/local verification evidence; live and prepared-artifact observations distinguished. |
| `docs/seo/evidence/browser-local-home-mobile.png` | Dated public/local verification evidence; live and prepared-artifact observations distinguished. |
| `docs/seo/evidence/browser-local-study-material-optional-mobile.png` | Dated public/local verification evidence; live and prepared-artifact observations distinguished. |
| `docs/seo/evidence/browser-local-tool-css-eligibility-calculator.png` | Dated public/local verification evidence; live and prepared-artifact observations distinguished. |
| `docs/seo/evidence/browser-local-tool-grammar-course.png` | Dated public/local verification evidence; live and prepared-artifact observations distinguished. |
| `docs/seo/evidence/browser-local-tool-selector.png` | Dated public/local verification evidence; live and prepared-artifact observations distinguished. |
| `docs/seo/evidence/browser-performance-autonomous-final.json` | Dated command, source, HTTP, browser, performance or historical account evidence; preserve live/candidate and current/historical distinctions. |
| `docs/seo/evidence/browser-performance-autonomous-initial.json` | Dated command, source, HTTP, browser, performance or historical account evidence; preserve live/candidate and current/historical distinctions. |
| `docs/seo/evidence/browser-performance-autonomous-isolation-rejected.json` | Dated command, source, HTTP, browser, performance or historical account evidence; preserve live/candidate and current/historical distinctions. |
| `docs/seo/evidence/browser-performance-lab.json` | Dated public/local verification evidence; live and prepared-artifact observations distinguished. |
| `docs/seo/evidence/browser-production-book-summaries-why-nations-fail-mobile.png` | Dated public/local verification evidence; live and prepared-artifact observations distinguished. |
| `docs/seo/evidence/browser-production-css-eligibility-calculator-mobile.png` | Dated public/local verification evidence; live and prepared-artifact observations distinguished. |
| `docs/seo/evidence/browser-production-home-mobile.png` | Dated public/local verification evidence; live and prepared-artifact observations distinguished. |
| `docs/seo/evidence/browser-production-study-material-optional-mobile.png` | Dated public/local verification evidence; live and prepared-artifact observations distinguished. |
| `docs/seo/evidence/browser-regression-baseline-failure.json` | Dated public/local verification evidence; live and prepared-artifact observations distinguished. |
| `docs/seo/evidence/browser-regression-final.json` | Dated public/local verification evidence; live and prepared-artifact observations distinguished. |
| `docs/seo/evidence/browser-tools-baseline.json` | Dated public/local verification evidence; live and prepared-artifact observations distinguished. |
| `docs/seo/evidence/build-final-summary.log` | Dated public/local verification evidence; live and prepared-artifact observations distinguished. |
| `docs/seo/evidence/crawl-summary.json` | Dated public/local verification evidence; live and prepared-artifact observations distinguished. |
| `docs/seo/evidence/css-2026-result-editorial-check.json` | Dated raw verification/source/asset evidence for the prepared local candidate; preserve production, Google and rights limitations. |
| `docs/seo/evidence/deployment-fingerprint.json` | Dated public/local verification evidence; live and prepared-artifact observations distinguished. |
| `docs/seo/evidence/editorial-audit.log` | Dated raw verification/source/asset evidence for the prepared local candidate; preserve production, Google and rights limitations. |
| `docs/seo/evidence/editorial-browser.log` | Dated raw verification/source/asset evidence for the prepared local candidate; preserve production, Google and rights limitations. |
| `docs/seo/evidence/editorial-build-summary.log` | Dated raw verification/source/asset evidence for the prepared local candidate; preserve production, Google and rights limitations. |
| `docs/seo/evidence/editorial-hostinger.log` | Dated raw verification/source/asset evidence for the prepared local candidate; preserve production, Google and rights limitations. |
| `docs/seo/evidence/editorial-lint.log` | Dated raw verification/source/asset evidence for the prepared local candidate; preserve production, Google and rights limitations. |
| `docs/seo/evidence/editorial-next-source-probes.json` | Capture actual primary HTTP/API/PDF availability, hashes, source locators, failed endpoints and an explicitly discarded unrelated candidate. |
| `docs/seo/evidence/editorial-official-source-probes-2026-10-15.json` | Dated raw verification/source/asset evidence for the prepared local candidate; preserve production, Google and rights limitations. |
| `docs/seo/evidence/editorial-preservation-check.json` | Dated raw verification/source/asset evidence for the prepared local candidate; preserve production, Google and rights limitations. |
| `docs/seo/evidence/editorial-tests-summary.log` | Dated raw verification/source/asset evidence for the prepared local candidate; preserve production, Google and rights limitations. |
| `docs/seo/evidence/editorial-typecheck.log` | Dated raw verification/source/asset evidence for the prepared local candidate; preserve production, Google and rights limitations. |
| `docs/seo/evidence/editorial-verification-results.json` | Dated raw verification/source/asset evidence for the prepared local candidate; preserve production, Google and rights limitations. |
| `docs/seo/evidence/followup-audit.log` | Dated verification/source/HTML evidence for the prepared local follow-up; keep production, source-scope, Google and rights limits explicit. |
| `docs/seo/evidence/followup-browser-final.log` | Dated verification/source/HTML evidence for the prepared local follow-up; keep production, source-scope, Google and rights limits explicit. |
| `docs/seo/evidence/followup-build-summary.log` | Dated verification/source/HTML evidence for the prepared local follow-up; keep production, source-scope, Google and rights limits explicit. |
| `docs/seo/evidence/followup-editorial-tests.log` | Dated verification/source/HTML evidence for the prepared local follow-up; keep production, source-scope, Google and rights limits explicit. |
| `docs/seo/evidence/followup-hostinger.log` | Dated verification/source/HTML evidence for the prepared local follow-up; keep production, source-scope, Google and rights limits explicit. |
| `docs/seo/evidence/followup-lint-final.log` | Dated verification/source/HTML evidence for the prepared local follow-up; keep production, source-scope, Google and rights limits explicit. |
| `docs/seo/evidence/followup-tests.log` | Dated verification/source/HTML evidence for the prepared local follow-up; keep production, source-scope, Google and rights limits explicit. |
| `docs/seo/evidence/followup-typecheck.log` | Dated verification/source/HTML evidence for the prepared local follow-up; keep production, source-scope, Google and rights limits explicit. |
| `docs/seo/evidence/followup-verification-results.json` | Dated verification/source/HTML evidence for the prepared local follow-up; keep production, source-scope, Google and rights limits explicit. |
| `docs/seo/evidence/google-access-2026-10-15.json` | Dated raw verification/source/asset evidence for the prepared local candidate; preserve production, Google and rights limitations. |
| `docs/seo/evidence/google-access-2026-10-16.json` | Preserve the authorized read-only account-readiness retry and subscription error; no property reports retrieved or Google mutations. |
| `docs/seo/evidence/google-historical-account-evidence-2026-10-16.json` | Dated command, source, HTTP, browser, performance or historical account evidence; preserve live/candidate and current/historical distinctions. |
| `docs/seo/evidence/gsc-historical-examples-2026-09-04.json` | Dated command, source, HTTP, browser, performance or historical account evidence; preserve live/candidate and current/historical distinctions. |
| `docs/seo/evidence/http-00c9cd07f118.html` | Dated public/local verification evidence; live and prepared-artifact observations distinguished. |
| `docs/seo/evidence/http-05f9c948efe4.html` | Dated public/local verification evidence; live and prepared-artifact observations distinguished. |
| `docs/seo/evidence/http-0f92eaefe1e7.html` | Dated public/local verification evidence; live and prepared-artifact observations distinguished. |
| `docs/seo/evidence/http-1d2ca4c198d1.html` | Dated public/local verification evidence; live and prepared-artifact observations distinguished. |
| `docs/seo/evidence/http-2d4fc5589c07.html` | Dated public/local verification evidence; live and prepared-artifact observations distinguished. |
| `docs/seo/evidence/http-3b80a9d47b72.html` | Dated public/local verification evidence; live and prepared-artifact observations distinguished. |
| `docs/seo/evidence/http-603651132d4b.html` | Dated public/local verification evidence; live and prepared-artifact observations distinguished. |
| `docs/seo/evidence/http-74641780cf6b.html` | Dated public/local verification evidence; live and prepared-artifact observations distinguished. |
| `docs/seo/evidence/http-8b437ce08355.html` | Dated public/local verification evidence; live and prepared-artifact observations distinguished. |
| `docs/seo/evidence/http-97ec7a4adab4.html` | Dated public/local verification evidence; live and prepared-artifact observations distinguished. |
| `docs/seo/evidence/http-aba993ac6fe2.html` | Dated public/local verification evidence; live and prepared-artifact observations distinguished. |
| `docs/seo/evidence/http-c31c27672782.html` | Dated public/local verification evidence; live and prepared-artifact observations distinguished. |
| `docs/seo/evidence/http-c39d3d2807c7.html` | Dated public/local verification evidence; live and prepared-artifact observations distinguished. |
| `docs/seo/evidence/http-c47e5ab536c2.html` | Dated public/local verification evidence; live and prepared-artifact observations distinguished. |
| `docs/seo/evidence/http-ce5df9d371b3.html` | Dated public/local verification evidence; live and prepared-artifact observations distinguished. |
| `docs/seo/evidence/http-d25b23422232.html` | Dated public/local verification evidence; live and prepared-artifact observations distinguished. |
| `docs/seo/evidence/http-d6240e73684c.html` | Dated public/local verification evidence; live and prepared-artifact observations distinguished. |
| `docs/seo/evidence/http-d671b55d6c27.html` | Dated public/local verification evidence; live and prepared-artifact observations distinguished. |
| `docs/seo/evidence/http-db2d6d68016f.html` | Dated public/local verification evidence; live and prepared-artifact observations distinguished. |
| `docs/seo/evidence/http-e5bc365e6852.html` | Dated public/local verification evidence; live and prepared-artifact observations distinguished. |
| `docs/seo/evidence/lighthouse-autonomous-final.json` | Dated command, source, HTTP, browser, performance or historical account evidence; preserve live/candidate and current/historical distinctions. |
| `docs/seo/evidence/lighthouse-autonomous-initial.json` | Dated command, source, HTTP, browser, performance or historical account evidence; preserve live/candidate and current/historical distinctions. |
| `docs/seo/evidence/lighthouse-autonomous-isolation-rejected.json` | Dated command, source, HTTP, browser, performance or historical account evidence; preserve live/candidate and current/historical distinctions. |
| `docs/seo/evidence/lighthouse-local-mobile.json` | Dated public/local verification evidence; live and prepared-artifact observations distinguished. |
| `docs/seo/evidence/live-recheck-2026-10-15.json` | Dated public/local verification evidence; live and prepared-artifact observations distinguished. |
| `docs/seo/evidence/live-recheck-2026-10-16.json` | Record fresh public homepage/fingerprint responses and unchanged remote main, distinguishing the original release from the prepared branch. |
| `docs/seo/evidence/mcq-editorial-sources-2026-10-15.json` | Dated raw verification/source/asset evidence for the prepared local candidate; preserve production, Google and rights limitations. |
| `docs/seo/evidence/optional-notes-layout-shift-initial.json` | Dated command, source, HTTP, browser, performance or historical account evidence; preserve live/candidate and current/historical distinctions. |
| `docs/seo/evidence/prepared-source-manifest-2026-10-15-followup.json` | Preserve the earlier 93-file follow-up candidate manifest instead of retroactively relabeling its build/source identity. |
| `docs/seo/evidence/prepared-source-manifest-2026-10-16-book-pass.json` | Dated command, source, HTTP, browser, performance or historical account evidence; preserve live/candidate and current/historical distinctions. |
| `docs/seo/evidence/prepared-source-manifest-first-editorial.json` | Dated verification/source/HTML evidence for the prepared local follow-up; keep production, source-scope, Google and rights limits explicit. |
| `docs/seo/evidence/prepared-source-manifest.json` | Fingerprint the 103 prepared source/test/workflow/public files and authoritative ledgers with a deterministic aggregate; identify uncommitted changes independently of baseline Git HEAD. |
| `docs/seo/evidence/private-path-head-probes.json` | Dated public/local verification evidence; live and prepared-artifact observations distinguished. |
| `docs/seo/evidence/public-monitor-pre-release.json` | Dated command, source, HTTP, browser, performance or historical account evidence; preserve live/candidate and current/historical distinctions. |
| `docs/seo/evidence/remaining-book-source-review-2026-10-16.json` | Dated command, source, HTTP, browser, performance or historical account evidence; preserve live/candidate and current/historical distinctions. |
| `docs/seo/evidence/robots.txt` | Dated public/local verification evidence; live and prepared-artifact observations distinguished. |
| `docs/seo/evidence/sitemap-core.xml` | Dated public/local verification evidence; live and prepared-artifact observations distinguished. |
| `docs/seo/evidence/sitemap-gk.xml` | Dated public/local verification evidence; live and prepared-artifact observations distinguished. |
| `docs/seo/evidence/sitemap-past-paper-collections.xml` | Dated public/local verification evidence; live and prepared-artifact observations distinguished. |
| `docs/seo/evidence/sitemap-past-papers.xml` | Dated public/local verification evidence; live and prepared-artifact observations distinguished. |
| `docs/seo/evidence/sitemap.xml` | Dated public/local verification evidence; live and prepared-artifact observations distinguished. |
| `docs/seo/evidence/user-agent-comparison.json` | Dated public/local verification evidence; live and prepared-artifact observations distinguished. |
| `docs/seo/evidence/verification-results.json` | Dated public/local verification evidence; live and prepared-artifact observations distinguished. |
| `package.json` | Expose editorial integrity/source-inventory audits and 32 editorial checks through the existing commands and complete suite. |
| `public/mcq/cat-english-grammar-6.json` | Apply 9 reviewed question-specific explanations; preserve IDs/stems/options/order and matching serving copy. |
| `public/mcq/cat-english-grammar-7.json` | Apply 5 reviewed question-specific explanations; preserve IDs/stems/options/order and matching serving copy. |
| `public/mcq/cat-english-grammar-8.json` | Apply 1 reviewed question-specific explanations and the documented Commander:Commands answer-key correction; preserve IDs/stems/options/order and matching serving copy. |
| `public/mcq/cat-english-grammar-9.json` | Apply 11 reviewed question-specific explanations; preserve IDs/stems/options/order and matching serving copy. |
| `public/mcq/cat-general-ability-6.json` | Apply 30 reviewed question-specific explanations; preserve IDs/stems/options/order and matching serving copy. |
| `public/opinions/transcripts/index.json` | Declare the six existing archive transcript records; no new publication or account data. |
| `public/opinions/transcripts/opinion-ali-hassan.json` | Image-compared full archived text, printed-date/byline evidence, original image/body hashes, explicit rights limits and any separate clarification. |
| `public/opinions/transcripts/opinion-eid-eve-chaman-phatak.json` | Image-compared full archived text, printed-date/byline evidence, original image/body hashes, explicit rights limits and any separate clarification. |
| `public/opinions/transcripts/opinion-harassers-calculus.json` | Image-compared full archived text, printed-date/byline evidence, original image/body hashes, explicit rights limits and any separate clarification. |
| `public/opinions/transcripts/opinion-machines-at-war.json` | Image-compared full archived text, printed-date/byline evidence, original image/body hashes, explicit rights limits and any separate clarification. |
| `public/opinions/transcripts/opinion-power-without-peace.json` | Image-compared full archived text, printed-date/byline evidence, original image/body hashes, explicit rights limits and any separate clarification. |
| `public/opinions/transcripts/opinion-the-next-48-hours.json` | Image-compared full archived text, printed-date/byline evidence, original image/body hashes, explicit rights limits and any separate clarification. |
| `public/study-material/optional/constitutional-law/constitutional-history-of-pakistan.json` | Regenerated exact-anchor-reviewed legal topic with inspected National Assembly citations; original DOCX and all other material preserved. |
| `public/study-material/optional/constitutional-law/judiciary-judicial-independence-and-judicial-review.json` | Regenerated exact-anchor-reviewed legal topic with inspected National Assembly citations; original DOCX and all other material preserved. |
| `scripts/audit-duplicate-content.mjs` | Allow genuinely useful short archives only after validating actual source-backed resources; retain all duplicate/placeholder checks. |
| `scripts/audit-mcq-data.mjs` | Detect complete-question duplicates rather than conflating distinct exercises with identical instruction stems. |
| `scripts/audit-search-readiness.mjs` | Run mandatory final-artifact XML/head/JSON-LD validation with existing Python prerequisite. |
| `scripts/build-target.mjs` | Retain prior rendering repairs and mandatory final-artifact gates; check reviewed MCQ/optional-note sources and generate shared book/Journal metadata before compilation. |
| `scripts/clean-english-islamiyat-mcqs.mjs` | Quarantine original source-record identities rather than permanently banning numeric IDs reused by later imports. |
| `scripts/editorial/book-review-validation.mjs` | Stop the normal book build on stale inventory/quotation/identity counts or verified identities supported only by missing, unsafe or explicitly unsuccessful records. |
| `scripts/editorial/build-book-reviews.mjs` | Validate original quotation strings and evidence roles, enforce aggregate review consistency, and generate shared bibliography/quotation metadata without identity-only quotation upgrades. |
| `scripts/editorial/build-journal-transcripts.mjs` | Validate six preserved text/image sources and dated clarifications; enforce safe explicit verification endpoints with metadata-only evidence scope when applicable. |
| `scripts/editorial/optional-note-reviews.json` | Record two bounded legal-note operations, exact original blocks, official sources/locators and review reasons. |
| `scripts/editorial/optional_note_reviews.py` | Validate review provenance/citations and enforce unique exact source anchors without mutating original author blocks. |
| `scripts/editorial/reviewed-mcq-explanations.json` | Store 56 before/after records, one documented key correction, actual arithmetic proofs, inspected sources and nine unchanged unresolved candidates. |
| `scripts/editorial/reviewed-mcqs.mjs` | Read-only default integrity check and explicit reviewed patch replay; refuse source drift, mismatched copies or forbidden identity/option changes. |
| `scripts/expand-book-summary-seo.mjs` | Render the same reviewed wording, source roles and bibliographies as the real reader, including books without a quotation. |
| `scripts/expand-hostinger-seo.mjs` | Omit unsupported bank-generation lastmod dates for category pages. |
| `scripts/expand-vistagram-pages.mjs` | Render and rewrite only already-public validated article slugs; preserve noindex/no ads and genuine unknown-slug 404. |
| `scripts/import_optional_notes.py` | Apply exact-anchor, source-backed editorial updates after original DOCX parsing and before topic/index word counts; fail missing/stale targets. |
| `scripts/lib/collection-content-quality.mjs` | Verify archive identity, accessible links and catalogue facts against actual paper source records. |
| `scripts/lib/islamiyat-import-quarantine.mjs` | Enforce immutable original record fingerprints and report cross-ID overlap as editorial review. |
| `scripts/lib/islamiyat-rejected-source-records.json` | Record 2,257 historical source fingerprints and exact source/cleanup revision provenance; no private data. |
| `scripts/lib/mcq-question-identity.mjs` | Normalize stem, option set and actual correct answer for structural identity. |
| `scripts/lib/publish-section.mjs` | Reuse genuine page-specific client/static schemas and accept source-based Vistagram metadata. |
| `scripts/lib/search-readiness.py` | Parse HTML/XML and reject conflicting metadata, invalid JSON-LD/date syntax, broken sitemap structure and retired filler. |
| `scripts/prerender-real-content.mjs` | Remove unsupported claim establishing AdSense causality; preserve same-component real rendering. |
| `scripts/prerender/routes.tsx` | Render real public grammar and Vistagram feed/readers using public source-cache priming. |
| `scripts/seo/build-rights-inventory.mjs` | Generate/check non-sensitive source/asset fingerprints and explicit unknown permission evidence without fetching protected material or inferring rights. |
| `scripts/seo/crawl-production.py` | Bounded read-only source/sitemap/link inventory and live HTTP snapshots with null unmeasured Google/live fields. |
| `scripts/seo/monitor-production.py` | Reuse crawler HTTP/parser for bounded live fingerprint, robots, seller file, sitemap, canonical/content/ad policy, anonymous account-shell and genuine 404 checks. |
| `scripts/seo/overlay-artifact.mjs` | Record final local rewrite/HTML/editorial and action evidence separately from baseline HTTP; preserve dated Google status in distinct JSON/CSV fields. |
| `src/App.tsx` | Mark actual suspense loading views for managed advertising suppression. |
| `src/components/Ads.tsx` | Observe real loading/error states and defer ad requests safely; use a fresh same-origin document before entering ad-free routes from an executed library; preserve publisher identity and reserved slot. |
| `src/components/ErrorBoundary.tsx` | Mark genuine fatal failure view for advertising suppression. |
| `src/components/Layout.tsx` | Provide accessible ticker pause/resume, reduced-motion controls and nonoverlapping 44px mobile hit targets. |
| `src/components/ProfileGate.tsx` | Load the existing profile form only when its gate opens, retaining account/profile requirements and records. |
| `src/components/RouteSeo.tsx` | Preserve valid study detail/breadcrumb schema and unknown-route metadata; defer study indexes with cancellable effects so late imports cannot clobber later navigation. |
| `src/data/bookEditorial.d.mts` | Type shared review/source/copy API and separate bibliographic identity status for runtime/static callers. |
| `src/data/bookEditorial.generated.json` | Generate shared static/React/copy labels and actual bibliography/passage locators from the validated ledger without changing original book bodies. |
| `src/data/bookEditorial.mjs` | Share reviewed book-body presentation, source lookup and provenance-preserving quotation copying across runtime/static implementations. |
| `src/data/books.ts` | Recover four exact archive dates from printed scans and neutralize unsupported Dawn attribution; preserve images, bylines and hosted-publication access. |
| `src/data/bundled/optional-notes-index.json` | Regenerate accurate word counts for the two reviewed topics; retain 339 topics in 34 subjects. |
| `src/data/css2026Result.json` | Add the inspected APP announcement context source without changing result counts, date, notice or PDF. |
| `src/data/journalTranscripts.generated.json` | Bundle six preserved archive bodies and six separate sourced/date-context clarifications for the normal React/static renderer. |
| `src/data/mcq-shards/cat-english-grammar-6.json` | Apply 9 reviewed question-specific explanations; preserve IDs/stems/options/order and matching serving copy. |
| `src/data/mcq-shards/cat-english-grammar-7.json` | Apply 5 reviewed question-specific explanations; preserve IDs/stems/options/order and matching serving copy. |
| `src/data/mcq-shards/cat-english-grammar-8.json` | Apply 1 reviewed question-specific explanations and the documented Commander:Commands answer-key correction; preserve IDs/stems/options/order and matching serving copy. |
| `src/data/mcq-shards/cat-english-grammar-9.json` | Apply 11 reviewed question-specific explanations; preserve IDs/stems/options/order and matching serving copy. |
| `src/data/mcq-shards/cat-general-ability-6.json` | Apply 30 reviewed question-specific explanations; preserve IDs/stems/options/order and matching serving copy. |
| `src/data/mcqMeta.ts` | Derive totals from the authoritative bundled index and remove unsupported blanket verified claim. |
| `src/data/routeRegistry.mjs` | Explicitly index the useful public grammar course while ad-free; remove nine account/navigation/focused-practice manual exceptions without changing access or private indexing. |
| `src/data/studyMaterialMeta.d.mts` | Declare shared schema API for TypeScript callers. |
| `src/data/studyMaterialMeta.mjs` | Share source-specific metadata and canonical ordered breadcrumb/article schemas across static and browser rendering. |
| `src/features/ability/Course.tsx` | Correct broken category link while retaining existing destination access checks. |
| `src/features/vistagram/api.ts` | Prime/cache the same parsed public feed/post content for static rendering and client use; no private records. |
| `src/features/vistagram/meta.d.mts` | Type shared public article metadata API. |
| `src/features/vistagram/meta.mjs` | Share original publication/revision metadata without inventing dates/authors. |
| `src/index.css` | Honor paused and reduced-motion ticker behavior, removing a later duplicate animation rule that overrode the preference. |
| `src/lib/ads.ts` | Shared rendered-state and clean-document decision helpers; keep Search policy separate from route advertising suitability. |
| `src/lib/subjectSelection.ts` | Produce exactly 600-mark ranked feasible combinations under group limits and validate invalid inputs. |
| `src/pages/BookSummaries.tsx` | Preserve shelf/progress/reading tools and ad-state markers; expose shared quotation/bibliographic sources in reading/printing/copying without inventing quotation actions on books without quotations. |
| `src/pages/Css2026Result.tsx` | Show the aggregate announcement citation and distinguish the supplied PDF from FPSC correction authority. |
| `src/pages/Home.tsx` | Give the exam countdown a name derived from its visible changing text and retain official-source navigation. |
| `src/pages/IslamicReferenceTopic.tsx` | Memoize route lookup to prevent the independently reproduced reference-download error/retry loop; preserve the real content and language views. |
| `src/pages/OptionalSubjectNotes.tsx` | Mark unknown subject view; preserve topic hierarchy and study content. |
| `src/pages/OptionalTopicNotes.tsx` | Mark real loading/error states for advertising and memoize route lookup so failed JSON downloads settle without repeated retries. |
| `src/pages/SubjectSelector.tsx` | Use repaired combination engine, retain presentation/planner save flow and cite existing official scheme. |
| `src/pages/VistaJournal.tsx` | Retain original image/API readers and loading guards; render six synchronous native text editions, printed-date precision and two separate dated clarifications. |
| `src/pages/Vistagram.tsx` | Use primed public data for genuine first-response feed rendering. |
| `src/pages/VistagramArticle.tsx` | Use public cache and shared preferred-origin schema, preserve content/dates, and show meaningful metadata-safe error view. |
| `tests/adPolicy.test.ts` | Verify live rendered-state safeguards, all account exclusions and clean-document navigation without same-route refresh loops. |
| `tests/bookEditorial.test.mjs` | Twelve tests for preserved bodies, source drift, honest copy/translation/identity semantics, actual excerpt locators, stale aggregate claims and unsupported identity evidence. |
| `tests/browser/ad-state.mjs` | Exercise actual ad provider with stub library only, including stable loading/error/account suppression and a real fresh-document route transition. |
| `tests/browser/artifact-preview.mjs` | GET-only loopback Hostinger resolver preview; permit genuine public static content while isolating APIs/external resources in performance samples. |
| `tests/browser/seo-performance.mjs` | Capture bounded mobile/desktop local performance with actual public notes, shift-node attribution and pinned Lighthouse isolation guards; never infer field CWV. |
| `tests/browser/seo-readiness.mjs` | Exercise 24 public artifact routes, actual optional/reference JSON, failed-download stability/recovery, deferred-head cancellation, accessible ticker and source-backed content. |
| `tests/editorial/test_optional_note_reviews.py` | Five checks for exact-anchor drift/ambiguity refusal, source visibility, preserved surrounding material and full 339-topic inventory. |
| `tests/journalTranscripts.test.ts` | Nine tests for preservation/dates/reading order, source-specific study/population/period/event evidence boundaries and actual generator refusal of unsafe/unexplained verification endpoints. |
| `tests/mcqAudit.test.mjs` | Focused regression coverage for the repaired behavior; existing working tests retained. |
| `tests/mcqEditorial.test.mjs` | Six checks for all arithmetic steps/key, source-supported correction, original identities, unresolved preservation and drift/copy/patch refusal. |
| `tests/pastPaperCollectionQuality.test.mjs` | Focused regression coverage for the repaired behavior; existing working tests retained. |
| `tests/productionRoutes.test.ts` | Retain real artifact route/404 coverage and correct stale manual-MPT assertion to the reviewed ad-free account policy. |
| `tests/searchReadiness.test.mjs` | Focused regression coverage for the repaired behavior; existing working tests retained. |
| `tests/studyMaterialSeo.test.mjs` | Verify shared study schemas plus deferred metadata success/failure/cancellation, pending head preservation and query policy. |
| `tests/subjectSelection.test.ts` | Focused regression coverage for the repaired behavior; existing working tests retained. |
| `tests/vistagramRoutes.test.mjs` | Focused regression coverage for the repaired behavior; existing working tests retained. |
