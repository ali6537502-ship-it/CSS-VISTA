# CSS VISTA content and advertising review

Baseline review: 14 October 2026; bounded source-supported editorial implementation: 15 October 2026. This is a repository/source audit with a Chromium runtime advertising test. Live HTTP observations, build fingerprints and Google documentation research are recorded separately in this audit package. Source existence is not evidence that Google indexed or evaluated the content. The owner now reports that AdSense says “low quality content”. This is owner-reported wording; the account notice, review date/history and Policy Center have not been independently inspected. No Search Console account report was available to this reviewer.

## Scope and preservation

`AGENTS.md` retains the owner's release hold and hidden Pro product state. The initial technical pass did not alter educational bodies. The 15 October editorial pass adds 56 reviewed MCQ explanations, one documented answer-key correction, two sourced optional-note updates and six accessible transcriptions of existing Journal scans. Original book-summary source bodies, Journal images, DOCX originals, account records, subscription settings, permissions, prices and publisher IDs remain intact. Protected Current Affairs and hibernated MPT content remain protected. Code repairs below change runtime suppression, not the route registry's advertising or search eligibility.

## Source inventory and evidence

The following are complete counts from the named repository sources, not production/Google counts. JSON files with a single long line are identified by path and object keys rather than misleading line precision.

| Collection | Verified source evidence | Interpretation |
| --- | --- | --- |
| Optional subject notes | `src/data/bundled/optional-notes-index.json`: 34 subjects, 339 topics; every referenced `public/study-material/optional/{subject}/{topic}.json` exists. Exactly 23 DOCX files in `data-archive/optional-notes/`. No two complete topic `blocks` arrays are identical. | There is a substantial existing library to preserve and render; there is no evidence supporting mass deletion or automatically rewriting 339 topics. |
| Optional note references | Baseline: no HTTP(S) URL in 339 topic `blocks` arrays. The 15 October review adds inspected National Assembly citations to two constitutional-law topics; the other 337 remain for risk-prioritized review. Sources may also be named in plain text or subject introductions. | This does not establish inaccuracy, but claim-level primary references and legal/historical accuracy need human editorial verification. Do not invent citations. |
| Book summaries | `public/book-summaries/index.json`: 100 books; 100 non-empty bodies; zero exactly identical bodies; all 100 referenced local covers exist. 99 covers list Open Library; one lists Penguin Books. | Each book has its own material; the collection is not 100 identical placeholders. Authorship, originality, factual accuracy and rights are separate from these structural checks. |
| Book quotations | Baseline: 89 book bodies have quotation labels without edition/page provenance. A separate 100-book source ledger and shared rendering metadata now supply inspected citations, explicit excerpts/translations and unverified-wording qualifications without rewriting the original bodies. See [editorial completion](EDITORIAL_COMPLETION.md). | These are quotation verification candidates. This audit does not assert the quotations are false or unlawful. Obtain authentic editions/excerpts before affirming exact wording, attribution and rights. |
| Journal legacy archive | Six existing entries using 11 unchanged page images. All now also have source-compared accessible text in the same React/static renderer. Four date precisions were recovered from the scans; the unsupported Dawn label is neutralized. Six dated clarifications are separate from original text. | Preserve images and genuine attribution. A source-supported accessible transcript and original-publication link would improve usability and discovery. Do not invent missing dates, publication evidence or text. |
| Journal newer articles | `src/lib/journal.ts:45` requests public `/api/journal.php`; `src/pages/VistaJournal.tsx:82` loads it after mount. Article cards open local-state modals (`:176`, `:258`). | The source supports text articles, but this implementation does not give each article a normal discoverable detail URL. Repository code cannot establish the live published row count. |
| Central GK/MPT bank | `public/mcq/index.json` and counted source shards: 37,627 questions, 42 categories. Baseline: 23,491 have no explanation and 137 have a source URL. After 56 reviewed explanations and 26 citations, 23,435 lack explanations and 163 have a source URL; all 37,627 IDs and order remain unchanged. | Missing explanations or URLs do not automatically make a valid quiz worthless. Review answer correctness and add authentic explanations/sources where they improve learning, especially contested or changing facts. |
| Legacy Current Affairs MCQs | 887 questions in the central bank's `current-affairs` category; 631 matched an intentionally broad publication-date/report-date prompt expression. Example: `src/data/mcq-shards/cat-current-affairs-0.json`, `current-affairs-1`, asks the date Reuters published a named report. | Regex matches are editorial candidates, not a quality verdict. Testing report-publication metadata rather than the underlying event may provide limited exam value. This collection is protected by the current product configuration; do not publish it to manufacture searchable pages. |
| Past papers | `src/data/pastPapers.generated.ts`, `scripts/lib/past-paper-content.mjs`, `scripts/strengthen-longtail-search-pages.mjs`. Source records distinguish original PDFs from available transcribed questions. | Keep original PDFs. Indexing of paper landing pages should reflect available authentic questions and page usefulness; noindex does not remove downloads. This review did not re-verify every original examination PDF. |

Repeated optional-note prose was inspected rather than treated as an automatic duplicate-content verdict. A 34-topic repeated paragraph says “The following sections develop the compressed source notes into the academic depth needed for first-time understanding and analytical answer writing.” A 17-topic repeated paragraph explains reading arrows in a flow. The complete topic bodies remain distinct. The smallest topic by its recorded source word count, `history-of-usa/global-perceptions-of-the-united-states`, is recorded as 348 words and contains specific advice on survey evidence, soft power and regional variation. Its length alone does not justify exclusion.

### Existing audit failure requiring correct interpretation

The baseline `node scripts/audit-mcq-data.mjs` failed with seven repeated-stem errors: `mpt-past-papers-404`, `412`, `424`, `425`, `426`, `427`, `428`. The audit used the question stem alone (`scripts/audit-mcq-data.mjs:76`). Manual examination shows the repeated instruction stems have different options and test different sentences. For example, 403 and 404 both say “Choose the sentence that is grammatically correct:” but their answer choices test different grammar. Preserve the questions; duplicate detection should include options and the correct answer. This was an audit false positive, not evidence that seven questions should be removed. It is repaired using normalized stem, sorted options and actual correct-answer text; option reordering no longer defeats duplicate detection. Two fixture regressions distinguish genuine duplication from distinct generic-stem exercises. No question was deleted or edited.

`src/data/mcqMeta.ts` previously declared 37,609 and labeled the whole bank “verified”; the index totals 37,627. No consumer of that marketing-summary module was found in source searches. It now derives its total/category count from the authoritative bundled index and uses “MCQs” without an unsupported blanket verification claim.

## Per-family search decisions

These are editorial rationales to accompany the machine-readable route inventory, not claims of Google indexing.

| Family | Recommended treatment and justification | Remaining evidence |
| --- | --- | --- |
| Optional library and 34 subjects | Public indexable canonical hubs where the real subject structure and guidance render and links reach the actual notes. | Verify final HTML, hydration and every linked topic against build inventory. |
| 339 optional topics | Consider individually for indexing where the topic's actual blocks form an independently useful explanation. Do not noindex the collection on a word-count rule. Preserve all study access. | Priority subject-expert review of legal, constitutional, historical and scientific claims; source attribution. |
| Book catalogue and 100 book details | Public catalogue plus individually useful canonical summary pages; full body available to users and crawlers. Avoid query/filter duplicates. | Verify quotation provenance, original analysis and cover rights before claiming editorial completeness. |
| Journal archive | Preserve the public archive. A useful archive can be indexed; image-only metadata is not equivalent to a text article body. | Owner-supplied authentic text/transcripts and publication links; reviewed stable article routes for actually published articles. Do not create empty article pages or guess text from titles. |
| New Journal text articles | Original published articles are candidates for stable public URLs with actual body, truthful author/date and sources. | Public CMS inventory, rights/author confirmation, source text and a supported publishing/rendering path. Modal-only opening currently limits individual discovery. |
| Current Affairs and daily editions | Preserve current authenticated/noindex access and Pro hold. Do not leak protected assets or include them in public sitemaps. | A future owner-approved public editorial selection would require an explicit publishing decision and real article content. |
| MCQ category and practice screens | Preserve useful interactive learning. Search classification depends on the particular landing page's real functionality/content, independently of advertising suitability. | Correctness, options, source provenance and helpful explanations; avoid indexing filters, empty results and personalized attempts. |
| Individual past-paper landings | Retain PDFs and source identifiers. Pages with authentic recorded questions can merit indexing; catalogue-only duplicates may remain noindex while available. | Validate paper/year matching and original wording; no invented commentary, source attribution or copyright claims. |
| Calculators and subject selector | Valuable functioning tools can merit indexing without long prose. Keep focused tools ad-free under the existing route policy. | Complete interactions, current FPSC rule references, mobile checks; private inputs remain private. |
| Accounts, progress, saved items, assessments and admin | Authenticated/personal data remains noindex and outside public sitemaps. | Search exclusion is separate from access control. Google must never receive private data merely to improve indexing. |
| Legal, identity, editorial and contact | Keep accurate, publicly discoverable and ad-free. | Verify actual owner channels and practices; legal text alone cannot establish content quality or AdSense approval. |

## Advertising findings and implemented repair

The existing route policy is appropriately distinct from indexability (`src/lib/ads.ts`). Unknown routes fail closed; public interactive, legal, document-viewer and assessment routes do not enable Auto Ads. Private account overview placements are separately allowlisted for a manual unit. Publisher `ca-pub-6131271603014611` and manual slot `1618565899` were preserved.

**Confirmed runtime defect:** the provider passed account session loading/recovery into the policy, but public page loading, fatal errors and failed note/book bodies were not connected to suppression. `ManagedContentAd` ignored rendered-page state, and manual slot initialization could continue after the visible page failed while the loader was downloading. Policy unit tests for hypothetical `{ errorState: true }` did not prove the actual UI reported that state.

Implemented:

- Explicit `data-cssv-ad-state="loading"` / `"error"` markers in the application suspense fallback, fatal `ErrorBoundary`, unknown subject/topic views, topic-body loading/failure, requested book-body loading/failure and initial Journal loading.
- A shared rendered-state reader and provider observer (including marker changes and removal) feed the existing ad policy. A ready view never overrides pending account authentication.
- Client-side library scheduling rechecks rendered state when idle work executes. Manual placements consume the same state; slot initialization checks again before loading and after its asynchronous load before making a unit request.
- Existing route eligibility, genuine IDs, static verification meta/loader and AdSense account settings are unchanged.

**Important limit:** eligible static HTML still contains the official loader, preserving the current directly verifiable implementation. That script can execute before React state gating. Once Google's Auto Ads library has loaded on one SPA route, suppressing subsequent site-managed requests does not prove it stops account-configured automatic placements on another route. The new runtime fixture deliberately tests client-managed behavior without a static-first loader. Its success must not be represented as proof of all Google Auto Ads placements or production consent compliance.

The owner must verify Auto Ads page exclusions and excluded areas in AdSense for account, authentication, administrative, error, focused assessment and other unsuitable surfaces. Review the actual signed-in account overview inventory carefully: a private account can be technically functional while still lacking suitable publisher content for ads. This repair does not expand or silently revoke that existing inventory. `docs/adsense-production-checklist.md` mentions a unit only on `/account`, while the route registry and `AccountHome` / `account/shared` allow additional overview pages; the account audit must use the actual allowlist. The account dashboard, real ad serving and consent UI were not accessible in this source review.

## Editorial and trust work remaining

These are dependencies and recommendations, not verified Google rejection causes:

1. Complete unresolved entries in the [100-book quotation ledger](editorial/book-quotation-review.json). Verified passages now carry real locators; remaining quotations are visibly qualified, including in copied text. Matching author blurbs or speeches do not certify that a phrase appears in the named book. No invented page numbers or paraphrases were added.
2. Document a lawful basis for each third-party cover/image/PDF. Open Library or publisher availability and source attribution do not by themselves demonstrate a reproduction licence. The audit established providers and existing local assets, not infringement. Use licensed or owner-created artwork where permission cannot be established; owner/legal review is required before changing materials.
3. Review optional-note factual claims in risk order: legal/constitutional rules and current examination eligibility first, then quantitative/current claims and historically disputed assertions. Topic-level absence of clickable references is a review signal, not automatic proof of low-value content.
4. Six Journal transcripts, recovered printed dates, neutral outlet metadata and six dated clarifications are completed. [Journal review](editorial/JOURNAL_REVIEW.md) identifies remaining claim-specific statistics, attributed quotations and rights evidence; original publication claims remain unverified.
5. Sample MCQ correctness, explanation quality, stale facts, ambiguous options and provenance. Existing structural audits establish ID/options consistency, not subject accuracy. Do not rewrite the full bank automatically or advertise all questions as independently checked without records.
6. Keep checking primary FPSC notices behind schedules and rules. The supplied result PDF was independently parsed: seven pages, 476 continuous annex serials, and matching notice/date metadata. APP’s inspected report corroborates 476 written qualifiers and the announcement; its source link is now shown. A fresh FPSC-hosted byte match remains unavailable (official direct requests returned 503). `css2027.ts` verification timestamps were not falsely refreshed.
7. Verify that actual operator practices match the existing privacy/cookie/editorial pages, including current account data collection and real Google-certified CMP configuration where required. Repository text describing a CMP is not proof the dashboard enabled it.

No new credentials, institutional recognition, endorsements, testimonials, quotations or educational paragraphs were invented. Existing about/disclaimer/copyright/editorial pages already distinguish CSS VISTA from FPSC and third-party works (`src/pages/LegalTrust.tsx:88`, `:99`, `:130`). Those pages support transparency but do not independently establish AdSense approval readiness.

## Verification and changed-file log

Passed after this repair:

- `npm run test:ads`: 24 tests, zero failures, including rendered-state suppression and the unchanged official static loader contract.
- `node tests/browser/ad-state.mjs`: Chromium integration using the actual bundled `AdSenseProvider`, real DOM mutation and mocked account state. It intercepted the Google loader and returned test-only JavaScript; it made no live ad impression or click. Loading and error views made zero loader requests; ready views made one; the account failure removed the manual slot and made no extra manual request.
- Targeted ESLint on changed TypeScript/React files and `tests/adPolicy.test.ts`: passed.
- `npm run typecheck`: passed.
- `node --test tests/mcqAudit.test.mjs`: two regressions passed; `node scripts/audit-mcq-data.mjs`: all 37,627 questions and unique IDs passed after fixing the baseline false positive.

The browser check requires the existing `tests/browser` Playwright dependency and Chromium (`CSSV_BROWSER_EXECUTABLE` can override `/usr/bin/chromium`). It is a local runtime check, not an authenticated production or field-performance test.

| Modified file | Purpose |
| --- | --- |
| `src/lib/ads.ts` | Shared rendered-state interpretation and state derivation. |
| `src/components/Ads.tsx` | Observe rendered state, gate deferred loading and manual placement, recheck asynchronous slot initialization. |
| `src/App.tsx` | Mark suspense page loading. |
| `src/components/ErrorBoundary.tsx` | Mark fatal failure. |
| `src/pages/OptionalTopicNotes.tsx` | Mark unknown, downloading and failed topic bodies. |
| `src/pages/OptionalSubjectNotes.tsx` | Mark unknown subject view. |
| `src/pages/BookSummaries.tsx` | Mark missing requested book and unavailable/pending requested summary body. |
| `src/pages/VistaJournal.tsx` | Mark initial article-loading state; existing image archive retained. |
| `tests/adPolicy.test.ts` | Regression coverage for actual rendered-state policy and UI wiring. |
| `tests/browser/ad-state.mjs` | Browser verification of library/manual-unit gating with a stub Google response. |
| `docs/seo/CONTENT_REVIEW.md` | Source findings, editorial dependencies, repair scope and verification limits. |

Additional MCQ audit files changed: `scripts/audit-mcq-data.mjs` now uses complete question identity; `scripts/lib/mcq-question-identity.mjs` provides that normalization; `tests/mcqAudit.test.mjs` proves distinct generic stems remain valid and reordered true duplicates match; `src/data/mcqMeta.ts` derives accurate totals and removes an unsubstantiated blanket verification claim. None of these changes alters the educational question bank.

## Broader-audit provenance repair (14 October 2026)

The full audit also encountered an outdated numeric-ID quarantine in `scripts/clean-english-islamiyat-mcqs.mjs`. Git cleanup `317d98c9e63d6bf18ed48a3d5e73f2bfd918be45` rejected 2,257 original source records on 15 September. Later import `7385d36b1de0197dda7d7587bb8063c100cfe033` reused 28 IDs with different content. All 28 current rows exactly match that later import; none matches the old source row at the same ID. The audit now uses immutable original ID-plus-content fingerprints, generated from the actual pre-cleanup revision and checked into `scripts/lib/islamiyat-rejected-source-records.json`; runtime does not depend on Git history. `scripts/lib/islamiyat-import-quarantine.mjs` preserves rejection of original records while allowing the demonstrated later ID reuse. The same content under a different ID is separately reported for editorial review.

One such cross-ID candidate exists: current `islamic-gk-8462` and rejected original `islamic-gk-8450` share the Umar/Surah Taha question and answer choices. It is recorded for authentic historical-source review. Import provenance establishes where a row came from; it does not prove the keyed answer is true. All 3,818 current Islamiyat records remain intact. The immutable manifest records the original rejection and does not claim that every rejected individual fact was false.

Additional modified files: `scripts/clean-english-islamiyat-mcqs.mjs`, `scripts/lib/islamiyat-import-quarantine.mjs`, `scripts/lib/islamiyat-rejected-source-records.json`, `tests/mcqAudit.test.mjs`, and the addendum to `docs/english-islamiyat-mcq-audit-2026-09-15.md`. Four MCQ audit fixture tests now cover both complete-question identity and original-record rejection/later-ID reuse/cross-ID warning behavior. No study content was changed by these repairs.

## Completed continuation — 15 October 2026

See [editorial completion](EDITORIAL_COMPLETION.md), [MCQ review](MCQ_EDITORIAL_REVIEW.md), [Journal review](editorial/JOURNAL_REVIEW.md) and the machine-readable [rights inventory](editorial/rights-inventory.json). The inventory documents unknown permission evidence rather than asserting infringement or permission. New source/quotation drift checks run in the normal Hostinger build; final rebuilt-artifact verification is recorded in [verification](VERIFICATION.md). These are prepared branch changes, not production or Google outcomes.

## Further primary-source continuation

[The follow-up](EDITORIAL_FOLLOWUP.md) records four further dated Journal notes, 13 additional publisher identity records and real bibliographic links in the book readers, including books without quotations. At that 15 October checkpoint there were 71 verified title/author identities and 29 unresolved identities. That pass did not change the 61 unverified quotation entries or establish reproduction permissions. Original bodies/images/dates and access remain preserved; new tests exercise period/population/source-scope boundaries rather than word counts.

## Book review — 16 October 2026

[The remaining 29 identities](BOOK_SOURCE_REVIEW_2026-10-16.md) now have inspected primary bibliographic records. Two further phrases were located in actual book text and labeled as excerpts, bringing the book-text matches to 29 plus one identified Graham translation; 59 quotations remain unverified. Publisher metadata is still excluded as proof of a named-book quotation. A mandatory ledger check prevents totals from drifting away from the individual review records. No full third-party book was added, no source analysis was rewritten and rights remain unresolved.
