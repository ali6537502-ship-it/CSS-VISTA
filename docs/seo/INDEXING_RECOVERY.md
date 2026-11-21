# Search indexing recovery

## Verified live release — 17 October 2026

PR #94 is merged and the exact release `b74ee781b230ebd7c047ff0a6419927a125b96db` is verified live. All post-merge workflows and the 26-page public monitor pass; Google live tests and two selective indexing confirmations are recorded. See [release outcome](RELEASE_2026-10-17.md) and [dated evidence](evidence/release-verification-2026-10-17.json). This supersedes earlier pending deployment/sign-in statements. AdSense approval, rights, regional consent/revocation and final ad preview remain unresolved; no AdSense review was requested.

## Current continuation — 17 October 2026

Current dated baseline: **469 indexed, 719 not indexed, 1,188 known in the HTTPS www prefix report**, updated 12 October and inspected 17 October. The 678 discovered cases dominate, but exclusions must be compared individually with intended policy. The sitemap is successfully processed (last read 15 October). A live archive test found a rendered noindex defect; the repair keeps pathname defaults out of query filters. See [account evidence](evidence/google-current-account-evidence-2026-10-17.json). The older unavailable-baseline table below is historical.

The goal is useful canonical public pages, not the largest index count. Baseline production has1,018 sitemap entries: core 587, GK 42, year collections 24 and paper detail365. The branch adds the already-public grammar course with real initial content; the verified final count belongs in [verification](VERIFICATION.md). Source content and private features remain available under their existing access policy.

## Baseline measurements

| Metric | Evidence |
| --- | --- |
| Total URLs known to Google | Unavailable; account blocked |
| Indexed canonical URLs | Unavailable; account blocked |
| Current exclusion categories/counts/report dates | Unavailable; dated historical evidence below is not a current report |
| Submitted sitemaps in Search Console | Unavailable; public files do not prove submission |
| Publicly served sitemap entries |1,018 unique live URLs on 14 October 2026; four valid children |
| Canonical origin | `https://www.css-vista.com/`, preserved |
| Deployment revision | Live fingerprint matches baseline source `cd9c6e4c24c96b678c7cfff2c4b840adb98a03c8` |
| Bounded live technical sample | See crawler evidence; every checked sitemap candidate200, self-canonical and indexable |
| Full generated artifact route validation | Baseline and final build logs/verification; not equivalent to full live crawl |

The [machine inventory](URL_INVENTORY.json) consolidates source routes, production sitemap, links, redirects and probes. Unmeasured live and Google fields remain null. A concrete source inventory is not Google's known-URL count. Pattern definitions are not fabricated user/session URLs. [Indexability matrix](INDEXABILITY_MATRIX.md) documents every registry family.

## Changes and implications

Keep optional/Islamic page metadata/schema consistent after hydration, clear invalid canonicals, remove repeated collection filler and unsupported GK modification dates, render the genuine public grammar course and enforce final artifact syntax/metadata gates. The branch also restores direct routes for the 22 already-public Vistagram posts while retaining their noindex/ad-free policy. Six existing Journal scans now have real accessible text, and reviewed book/constitutional sources are visible in both HTML and React; see [editorial completion](EDITORIAL_COMPLETION.md). None of these changes submits URLs to Google or changes Google's selected canonical/index.

The365 submitted paper viewers have authentic recorded questions and pass current content gates. Other document viewers remain served with PDFs and deliberately noindex; do not delete them or treat each as a recovery failure. Likewise personal records, assessments and hibernated products remain excluded. Valuable tools are judged individually; calculator is already indexable, grammar course explicitly opted in after guest-content review. Selector correctness is repaired while its existing noindex remains pending independent discovery/readiness review.

## Evaluate only statuses actually present in account evidence

| If Search Console reports… | Investigation/action |
| --- | --- |
| Crawled — currently not indexed | Check last crawl against release, rendered primary content, duplication and links; eligibility does not guarantee inclusion. |
| Discovered — currently not indexed | Verify discovery, sitemap processing and server/crawl history; do not infer capacity exhaustion. |
| Duplicate without user-selected canonical | Inspect same-content alternatives and canonical/redirect consistency; avoid canonicalizing different lessons together. |
| Alternate page with proper canonical | Usually intentional when canonical is correct/indexed; do not force duplicates into sitemap. |
| Google chose different canonical | Compare both pages and indexed/live snapshots before changing hints. |
| Excluded by noindex | Compare final route decision and intended privacy/content status; remove only accidental exclusions. |
| Blocked by robots.txt | Verify actual directives/resources; Google generally needs crawl access to see noindex. Private data stays authenticated. |
| Not found404 / pages with redirects | Keep correct legacy moves/removals; fix broken internal references; don't redirect every404 to home. |
| Soft404 | Confirm actual useful content/response; preserve genuine tools and documents; use real 404 for missing routes. |
| Server5xx / redirect errors | Correlate exact URLs/time with hosting logs and reproduce; never mask errors with 200 shells. |
| Other categories | Record actual wording/date and investigate official category guidance without inventing a count. |

See [account checklist](GOOGLE_ACCOUNT_ACTIONS.md) for Page Indexing, Sitemaps, Crawl Stats, Performance, URL inspection/live test, Manual Actions, Security and experience reports. The API's indexed snapshot is not a UI live test. No Google Indexing API, artificial searches, backlinks or paid indexing service is used.

## Follow-up

The owner has authorized the scoped SEO release; actual publishing/live evidence is tracked in [verification](VERIFICATION.md). Recheck fingerprint, sitemap children and representative raw/rendered URLs, then use issue-specific validation only where an actual problem was corrected. Request indexing selectively for important eligible pages; do not repeatedly submit unchanged sitemaps. Compare dated account baselines at 7/14/28 days using [monitoring](MONITORING.md). No success percentages are available or promised.

## Historical account baseline recovered on 16 October

Official 26 September notifications record validation started for **970 discovered-not-indexed**, **38 crawled-not-indexed** and **2 Google-selected-other-canonical** cases. A separate export named 4 September contains 488 discovered examples, with its chart dated 28 August. All examples already occur in the inventory; 195 are currently intended index candidates and 293 are excluded/redirected/error/limited-viewer cases. Epoch last-crawled values are placeholders. These are historical separate observations, not a sum or complete/current Page Indexing report.

The JSON/CSV now distinguish `google_status_historical` and its evidence date from the still-unavailable present `google_status`. [Account evidence](GOOGLE_ACCOUNT_ACTIONS.md) records sources and limitations. The 16 September notification validating four alternate-canonical examples predates these changes and cannot be attributed to this implementation.
