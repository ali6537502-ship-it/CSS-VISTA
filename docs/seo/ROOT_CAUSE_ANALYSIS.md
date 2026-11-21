# CSS VISTA root cause investigation

## Verified live release — 17 October 2026

PR #94 is merged and the exact release `b74ee781b230ebd7c047ff0a6419927a125b96db` is verified live. All post-merge workflows and the 26-page public monitor pass; Google live tests and two selective indexing confirmations are recorded. See [release outcome](RELEASE_2026-10-17.md) and [dated evidence](evidence/release-verification-2026-10-17.json). This supersedes earlier pending deployment/sign-in statements. AdSense approval, rights, regional consent/revocation and final ad preview remain unresolved; no AdSense review was requested.

## Current continuation — 17 October 2026

Google's 17 October live test established a public archive rendered-noindex blocker that raw-HTML samples missed: redundant pathname defaults become query filters after React mounts. The old indexed snapshot is distinct. The account also confirms Low-value content; this does not prove that this technical defect caused the AdSense decision. See [dated diagnosis and limitations](ACCOUNT_RECOVERY_2026-10-17.md).

Baseline audit: 14 October 2026; continuation: 16 October. Branch: `fix/seo-indexing-adsense-recovery`. Baseline source/live fingerprint: `cd9c6e4c24c96b678c7cfff2c4b840adb98a03c8`, built 12 October at 04:25:31.574 UTC. The scoped SEO release is now owner-authorized; actual live state is recorded in [verification](VERIFICATION.md). No Google review submission or approval is claimed.

## Conclusion and evidence boundaries

The public audit did **not** reproduce a sitewide crawl/indexing blocker or missing optional-note bodies. Live sitemaps list 1,018 unique URLs; all four child sitemaps load. The bounded crawl, raw response snapshots and browser comparisons are in [evidence](evidence/README.md). Local baseline strict gates also pass. This disproves neither historical problems nor Google-specific crawl/render failures.

The owner reports AdSense wording as **"low quality content"**. Read-only account mail now confirms a generic rejection received on 14 September; it does not contain that detailed reason. Historical GSC notifications and an issue export confirm specific dated exclusions, with current totals still unknown. Live API access remains subscription-blocked and no AdSense portal/browser connection is callable. See [account evidence](GOOGLE_ACCOUNT_ACTIONS.md). No technical fix is presented as the established cause of the AdSense rejection.

## Confirmed defects addressed on this branch

| Priority | Finding and affected scope | Evidence | Repair |
| --- | --- | --- | --- |
| P2 | Optional/Islamic topic and hierarchy structured data is removed after hydration | `RouteSeo.tsx` previously removed pattern-route schema; raw/JS browser comparisons demonstrate Article/BreadcrumbList loss | Shared page-specific schema builder used by static publisher and client; preserve/rebuild schema across valid navigation. |
| P1 | Subject selector cannot generate a valid recommendation | Original algorithm selects 200+200+5×100=900 then rejects totals other than600; browser reproduced both invalid combinations | Constrained ranked selection and validation; tests for group limits, pairs, duplicates and infeasible totals. |
| P1 | Direct links and refreshes fail for 22 already-public Vistagram articles | Existing validated feed/JSON and React readers have no generated Hostinger detail rewrite; source-inventory overlay resolves every slug 404 | Render real feed/readers and generate finite existing-slug rules. Keep existing noindex/ad-free policy, dates and article content; unknown slugs remain404. |
| P2 | Every yearly past-paper archive gets repeated advice injected after real rendering | `enrich-past-paper-collections-before-validation.mjs` appended identical study paragraphs to 24 collections, despite later factual renderer | Remove obsolete invocation, retain archive facts/real paper links and PDF access. Final gate rejects retired marker. |
| P2 | Unknown-page canonical/schema can become misleading after JavaScript | Static404 correctly has no canonical; former runtime writes `/404`, leaves/reuses schema | Remove unknown/invalid study canonical and OG URL; remove stale schema; recreate metadata after valid navigation. |
| P2 | Public grammar course excluded by default interactive classification and lacks real initial course rendering | Guest browser reads lessons/practice; prior raw response is generic noindex route shell | Explicit indexable exception with real component prerender; remains ad-free; personal progress unchanged. |
| P2 | Ad state model defines loading/error suppression without observing actual public loading/error screens | Provider previously derived account loading only; suspended/failing public pages do not supply it | Observe explicit rendered state markers and recheck deferred requests/manual placements. Existing initial official loader remains; account exclusions still required. |
| P2 | Category sitemap modification dates describe bank generation, not documented category edits | `expand-hostinger-seo.mjs` reused bank-wide `generatedAt` for 42 GK URLs | Omit unsupported page `lastmod`; retain known content-specific dates. |
| P2 | Strict CI content failures are advisory | Workflow used `continue-on-error` for strict build and default strict=false | Make strict CI checks blocking and validate final XML/head/JSON-LD after transformations. |
| P2 | Content audit rejects valid distinct generic-stem questions and reused historical IDs | Stem-only comparison conflates different exercises; a numeric quarantine range also catches28 different rows imported later | Compare complete question identity; retain historical source-record fingerprints and report cross-ID overlaps for editorial review. No question is deleted or factually cleared. |
| P2 | Ability course links to a nonexistent category path | Broad source audit finds `/gk/category/general-ability` instead of existing `/gk/cat/general-ability` | Correct the link; retain the destination's current membership/access controls. |

## Source-supported editorial repairs — 15 October 2026

| Priority | Confirmed issue | Evidence and implemented scope |
| --- | --- | --- |
| P1 | One analogy question reverses the intended person-to-action relationship | `english-grammar-6407` now selects the existing Senator:Legislates option; source-backed ledger and preservation checks. No historical attempt scores rewritten. |
| P2 | Existing Journal scans have no readable text, imprecise dates and an unsubstantiated outlet label | Six image-compared transcriptions use the real renderer; four dates gain printed precision; neutral Opinion label replaces unsupported Dawn attribution. |
| P1 | Pacific temperature panel conflates ambient and wet-bulb measurements; Eid text has an internal calendar inconsistency | Separate dated clarifications identify the issues and cite primary weather guidance, without rewriting archived images or guessing event facts. |
| P2 | Current constitutional-text pointer stops at the 2024 amendment | Two bounded, exact-anchor-reviewed topic updates cite the inspected official 2025 Act and Constitution download listing. Original DOCX sources preserved. |
| P2 | Quotation labels imply certainty without edition/source evidence | All 100 books receive ledger entries. Available original passages have real locators; unverified text is clearly qualified in both normal renderings, printing and copy. Graham translation is explicitly identified for On War. |

See [editorial completion](EDITORIAL_COMPLETION.md) for final counts, sources, unresolved cases and rights. These findings are independently useful repairs; they are not established causes of Google's account decision.

No verified P0 outage or private-data exposure was found in the bounded checks. Denied private paths were checked without downloading protected content. This is not a comprehensive security certification.

## Confirmed observations requiring editorial/account work

- The public Journal API returned an empty array on the checked dates; six legacy image archives remain available and now also have prepared accessible text. Future API text articles open in modals without stable detail routes. Do not claim existing text bodies were lost, and do not generate fake articles. See [content review](CONTENT_REVIEW.md).
- Book bodies exist for 100 entries without empty/exact duplicate bodies. Quotations lack edition/page provenance; Open Library/Penguin cover hosting does not itself prove reproduction rights. Originality, accuracy and rights need human verification.
- Optional notes contain339 topics across 34 subjects. All are present in source; source count alone is not a quality endorsement. One existing subject hub, Pure Mathematics, stays noindex while its topic stays accessible/indexable; audit its hierarchy usefulness rather than adding prose to cross a threshold.
- Question explanations/source links are incomplete. Preserve working banks and examination resources while prioritizing verifiable editorial corrections.
- Production uses Hostinger CDN/cache headers. No Cloudflare layer or server crawl log access was established. HTTP non-www currently makes two redirects before www HTTPS; HTTPS apex directly reaches preferred host. The first redirect is upstream of repository Apache rules; hosting configuration access is needed for a single-hop improvement.
- Slash/case/encoded/query variants remain accessible with canonical hints. Without Google-selected canonical evidence, there is no justification for mass redirects or changing the canonical origin.

## Likely contributors, not established causes

Repeated archive prose, image-dominated Journal material, unsupported quotations and limited explanations may weaken perceived editorial value. Their role in Google's historical site review cannot be established without the review evidence and manual content evaluation. Historic Google snapshots may predate earlier source fixes; compare last crawl dates before concluding a defect remains live.

## Untested hypotheses

Google-selected alternate canonicals, manual actions, security findings, server failures seen only by Google, consent/account exclusions and current discovered/crawled-not-indexed counts are unknown (historical counts are recorded separately). A public crawl does not settle these questions. No crawl-budget exhaustion, traffic requirement or minimum Google word count is asserted.

## Preservation and deferred work

No material, account, protected data, prices, permissions or paid workflows were removed. Pro/current affairs and MPT hibernation remain in force. No artificial educational text, authors, credentials or publication dates were created. Review [architecture](ARCHITECTURE.md), [indexability decisions](INDEXABILITY_MATRIX.md), [verification](VERIFICATION.md) and [monitoring](MONITORING.md) before release. The owner subsequently authorized the scoped SEO release on 16 October; product restrictions remain in force.

## Further bounded source findings

The next primary-source pass adds four further Journal clarifications (six total): climate study periods and regional agricultural evidence, survey/workforce denominators, complaint-reporting periods and the difference between AI procurement/investigation requests and event-specific findings. These are content-accuracy and source-scope repairs, not confirmed causes of an AdSense rejection. The FAO agricultural figure was verified in the actual report rather than rejected for lacking an initial citation. Thirteen additional publisher identity records bring the verified bibliography to 71; quotation status remains independently gated. See [follow-up](EDITORIAL_FOLLOWUP.md).

## Book-source continuation — 16 October 2026

The [next source review](BOOK_SOURCE_REVIEW_2026-10-16.md) resolves the remaining 29 bibliographic identities and locates two further authentic quotation excerpts. The current ledger now records 100 primary identities and 59 unresolved quotations. An outdated aggregate identity count inside the ledger was a confirmed reporting defect; the generator now refuses mismatched summary counts. Bibliographic improvements and quotation provenance are not established causes of the account rejection, nor evidence of approval.

## Final continuation findings

The earlier-pass totals above are historical. Two further publisher-preview passages bring the latest ledger to 31 book-text matches, one translation, 57 unverified quotations and 11 books without a quotation label. No rights clearance is inferred.

| Priority | Confirmed finding | Safest implemented response |
| --- | --- | --- |
| P1 | Optional-topic and Islamic-reference fetch effects depend on newly allocated lookup objects; failed downloads repeatedly reset error state and retry, shifting adjacent-topic navigation | Memoize lookups, keep one stable error state per request and verify recovery on navigation. This is reproduced with isolated failed downloads; no sitewide production failure rate is invented. |
| P1 | Nine manual-ad exceptions cover account-management, personal records/navigation and focused practice | Disable placements based on their actual purpose while retaining all access, study features and search exclusions. |
| P1 | An executed advertising library survives an SPA route change into an ad-free screen | Navigate to a fresh same-origin ad-free document before target content commits; test the actual provider with a stub library. |
| P2 | Duplicate ticker CSS defeats reduced-motion preference; mobile hit areas overlap and countdown accessible label omits displayed text | Restore reduced-motion behavior, add pause/resume and correct hit targets/naming. |
| P2 | Every entry imports study indexes and closed profile-form code | Defer those modules, preserving prerendered metadata and cancelling late metadata work after navigation. |

Historical notifications establish that discovered-not-indexed, crawled-not-indexed and Google-selected-alternate-canonical issues existed in September. Their present scope and relation to these repairs remain unverified. Of 488 historical discovered examples, 195 are currently index candidates and 293 should not simply be forced into the index. The original preview's repeated layout shifts were provoked by an overly restrictive test CSP; the underlying failed-download retry loop was real and was fixed. Neither that sample nor a passing local Lighthouse result establishes field Core Web Vitals. See [release continuation](AUTONOMOUS_RELEASE_2026-10-16.md).
