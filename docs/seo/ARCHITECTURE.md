# Production architecture and build provenance

## Current continuation — 17 October 2026

The architecture remains React/Vite, the existing prerender generators, Apache resolution and native PHP. The authenticated browser harness now resolves generated documents with the existing `.htaccess` resolver rather than a homepage fallback. Archive filter synchronization must not convert pathname defaults into a noindex query. Later scoped SEO authorization in AGENTS.md controls this release; older blanket-hold prose below does not cancel it.

Baseline architecture: 14 October 2026; editorial integration: 15 October 2026. Preferred origin: `https://www.css-vista.com`.

This is the existing React/TypeScript/Vite and native Hostinger PHP architecture. The repairs preserve it. The owner subsequently authorized a scoped SEO release; actual production proof is in [verification](VERIFICATION.md). No account mutation, private-content publication or Pro/MPT reactivation is included.

## Verified deployment baseline

The public [deployment fingerprint](evidence/deployment-fingerprint.json) records Git SHA `cd9c6e4c24c96b678c7cfff2c4b840adb98a03c8`, target `hostinger`, built `2026-10-12T04:25:31.574Z`. That equals the checked-out baseline Git revision. It establishes source provenance, not that every asset or runtime database row is byte-identical to Git. Public response headers identify Hostinger/HCDN. The [crawl baseline](evidence/crawl-summary.json) stores response headers, redirects and body hashes; source-derived URLs outside its bounded HTTP sample are explicitly not reported as live-verified.

The initial live sitemap contained 1,018 distinct URLs. These are submitted candidates in publicly served sitemap files, not Search Console submission or indexed counts. Google account reports and host control-plane/log access were unavailable to this audit.

## Content and route map

| Surface | Authoritative source | Initial HTTP HTML | User rendering and access |
| --- | --- | --- | --- |
| Exact public pages | `src/pages/*`, `src/data/*`, `src/data/routeRegistry.mjs` | Same React components rendered through `scripts/prerender/entry.tsx`, `routes.tsx` | React client mounts the corresponding page under `Layout`; native account and release gates remain active |
| Optional notes | `public/study-material/optional/*.json`, topic JSON subdirectories; `src/data/bundled/optional-notes-index.json`; source importer `scripts/import_optional_notes.py` and exact-anchor `scripts/editorial/optional-note-reviews.json` | Actual React subject/topic components; build primes the same data cache used by browser fetches | Public subject hierarchy and topic readers; 34 subjects + 339 topics = 373 generated detail pages |
| Islamic references | `public/study-material/islamic-studies/`; bundled index and `scripts/import_islamic_references.py` | Actual React chapter/topic components with primed data | Public chapter/topic readers; 79 generated detail pages |
| Book summaries | `public/book-summaries/index.json`; `generate-book-catalogue.mjs` derives bundled shelf; reviewed quotation/source metadata from `docs/seo/editorial/book-quotation-review.json` | `expand-book-summary-seo.mjs` renders all 100 bodies, shared reviewed quotation labels/source notes, identity and related links | `BookSummaries.tsx` owns shelf/full-reader interactions and detail metadata; data-driven static renderer remains separate from React reader |
| Past papers | `src/data/pastPapers.ts`, generated registry, PDF files; `scripts/lib/past-paper-registry.mjs`, `past-paper-content.mjs` | Dedicated HTML generators, genuine PDF links and available recorded questions | Client archive/viewer; document-only pages remain usable but are excluded from sitemap/indexing |
| GK categories | `public/mcq/index.json`, category JSON chunks | First 12 available questions through `expand-hostinger-seo.mjs` | Complete interactive bank; selected premium banks remain gated and must not be exposed by an SEO repair |
| VISTA Journal | Legacy `opinions` in `src/data/books.ts`, six image-compared `public/opinions/transcripts/` records and generated synchronous bundle; new text publications from native `/api/journal.php` | Same React archive/fallback, all six readable text editions and separate dated clarifications; native database text articles are not fetched during Node prerender | `VistaJournal.tsx` fetches published articles and opens readers; legacy scans and native text disclosures remain accessible |
| Existing public Vistagram | Validated `public/vistagram-content/index.json` and its 22 public post JSON files, produced by existing packaging rules | Repair renders the real feed and all existing detail components with the same public parser/cache primed in Node | Existing freely readable articles, sources, dates and account-save controls; noindex/ad-disabled policy retained; drafts/private saves never enter prerender |
| Current Affairs | Protected `content/current-affairs/` releases, legacy premium payloads and native APIs | Public/protected entry state, not private edition bodies | Profile/Pro-gated content; `package-current-affairs.mjs` packages guarded PHP under `api/_briefing_release/` |
| Student/admin systems | `src/App.tsx`, `src/features/current-affairs/Workspace.tsx`, native `public/api/`, private runtime DB/storage | Noindex route shells; no private student data is prerendered | Native authentication, profile, ownership, membership and admin authorization remain authoritative |

The baseline registry has 122 route definitions: 103 exact definitions (36 indexable, 67 intentionally noindex) and 19 patterns. The baseline shared prerender covers 46 exact React pages, including some intentionally noindex pages; the repair adds the existing public Vistagram feed to that map. Pattern notes/references and the existing 22 Vistagram detail pages are rendered from the same bundle. Counts describe repository/build inventory, never Google's known or indexed URLs.

## Authoritative build order

`package.json` sends `build`, `build:hostinger` and `build:hostinger:strict` to `scripts/build-target.mjs`. The strict command enables stronger duplicate-content similarity validation; the ordinary Hostinger path also runs mandatory integrity gates. Node 22–24 is supported. `hostinger-preflight.mjs` validates canonical origin and public environment safety.

1. MPT release pre-hook/audit; mandatory `reviewed-mcqs.mjs --check` and optional-note importer `--check`; `build-book-reviews.mjs` and `build-journal-transcripts.mjs` validate source evidence and generate shared metadata/text before TypeScript/Vite. Then `split-past-paper-analysis.mjs`, `generate-book-catalogue.mjs`, `package-vistagram.mjs`, `package-premium-content.mjs` prepare source-derived payloads.
2. TypeScript project build and Vite build produce hashed assets under `dist/assets/`. Vite explicitly disables automatic public-directory copying.
3. Hostinger-only MPT paper export/audit writes protected server payloads, without activating the hibernated interface.
4. `prepare-sites-build.mjs` copies `public/`, generates exact-route metadata/shells, 404/protected shells, past-paper/year/result HTML, route redirects and rewrites, initial flat sitemap and robots.txt. Its route-name HTML is intermediate scaffolding, not an acceptable final indexable body.
5. `expand-hostinger-seo.mjs` creates data-backed GK category pages, replaces GK protected rewrites and adds their sitemap entries.
6. `repair-search-visibility.mjs` resets home/paper metadata and paper document bodies; standardizes organization references. Its temporary homepage body is superseded by real React prerendering.
7. `prerender-real-content.mjs` builds `dist-ssr/entry.js`, uses a Node DOM shim and actual providers/router/layout, and replaces the served exact-route bodies. Missing indexable components, placeholders and empty primary content fail the build. `scripts/lib/served-paths.mjs` is authoritative for special served-file destinations.
8. Baseline `enrich-past-paper-collections-before-validation.mjs` appends repeated study guidance to year archives. This was identified as redundant content generation: the next step already provides collection-specific facts. See implementation log for its removal from the repaired pipeline.
9. `strengthen-longtail-search-pages.mjs` adds authentic available paper questions or a truthful document-access statement, and collection-specific subject/mode/count information. It does not invent question explanations.
10. `expand-book-summary-seo.mjs`, `expand-islamic-references-seo.mjs`, `expand-optional-notes-seo.mjs` write dynamic family files and sitemap entries. The latter two call `scripts/lib/publish-section.mjs`, which renders real React pages and makes per-page noindex decisions for empty content. The repaired pipeline also invokes `expand-vistagram-pages.mjs`: it uses this existing publisher to restore exact direct-navigation rules for 22 already-public posts, while retaining noindex/ad-disabled policy and adding no sitemap entries.
11. `polish-prerender-shells.mjs` styles remaining hand-rendered shells. `reinforce-brand-homepage.mjs` standardizes approved homepage brand metadata and adds home links without replacing the real body.
12. `apply-adsense-html-policy.mjs` removes official ad loaders from disallowed generated routes. Route indexability, access and advertising remain separate policies.
13. `split-sitemap-index.mjs` converts the flat sitemap into the root index plus core/GK/paper-year/paper children, validates uniqueness and excludes noindex exact routes. Individual page lastmod is emitted only from source dates where supplied; the sitemap-index dates describe child-file generation.
14. `package-current-affairs.mjs` writes protected PHP releases. `write-deployment-fingerprint.mjs` writes checked-out SHA and build time and adds noncacheable fingerprint headers.
15. Final Hostinger artifact, route, link, duplicate and additional search-readiness gates execute. Final artifacts, rather than intermediate shell files, are the basis of verification.

## Request resolution

`public/.htaccess` is copied and augmented by the generators. Host/protocol variants permanently redirect to the preferred www HTTPS origin. Sensitive PHP helpers/config/storage remain forbidden. Premium payload rewrites preserve native authorization. Literal robots/ads/sitemap/verification resources bypass the SPA. Exact registry rules precede family rules; generated family rules precede existing-file passthrough. Unknown clean routes terminate in a genuine 404, using a noindex 404 document without a canonical.

| Public URL | Final Hostinger artifact |
| --- | --- |
| `/` | `dist/index.html` |
| Exact route, e.g. `/notes` | `dist/seo/routes/notes.html` |
| `/css-2026-written-result` | `dist/seo/css-2026-written-result.html` (served-file override) |
| `/past-papers/view/:id` | `dist/seo/past-papers/:id.html` |
| `/past-papers/:exam/:year` | `dist/seo/past-paper-collections/:exam/:year.html` |
| `/gk/cat/:slug` | `dist/seo/gk-categories/:slug.html` |
| `/book-summaries/:slug` | `dist/seo/book-summaries/:slug.html` |
| `/study-material/optional/:subject/:topic` | `dist/seo/optional-notes/:subject--:topic.html` |
| `/study-material/islamic-studies/:chapter/:topic` | `dist/seo/islamic-studies/:chapter--:topic.html` |
| Existing `/vistagram/:slug` | `dist/seo/vistagram/:slug.html`; finite packaged-slug rules only, no catch-all draft publication |
| Dynamic protected workflows | Noindex protected shell, then native authenticated client/API flow |
| Unknown route/data slug without generated file | HTTP 404; no generic 200 homepage fallback |

Apache rule simulation in `scripts/lib/htaccess-resolver.mjs` is useful local evidence. It models a declared subset, not the entire hosting server, PHP authorization, CDN or Google rendering. Browser and direct production HTTP evidence are still required.

## Metadata and rendering parity

`routeRegistry.mjs` controls access/content class/indexability/sitemap/ad mode separately. `prepare-sites-build.mjs` writes exact-route metadata; family generators write data-specific titles/descriptions/canonicals/JSON-LD. Client `RouteSeo.tsx` updates ordinary metadata during navigation; book/paper/GK components own their dynamic metadata. `serverRobots.ts` preserves the landing document's server-side noindex decision.

Confirmed baseline defect: `RouteSeo.tsx` removed `cssv-route-structured-data` for optional/Islamic pattern pages after hydration even though their static publisher supplied Article/BreadcrumbList data. The repair shares `studyMaterialStructuredDataForPath` between the publisher and client, uses CollectionPage for subject/chapter indexes and Article for topics, and creates ordered canonical breadcrumbs from actual indices. No authors/dates/ratings are invented. Unknown routes and unknown study-material IDs clear route schema/canonical/og:url; valid navigation recreates necessary head elements.

React uses client mounting rather than matching HTML hydration. Thus initial server-rendered content can briefly be replaced by client loading states while JSON arrives. This requires browser/network verification; the existence of a prerendered body alone does not prove interaction or rendering parity. Private material must never be primed into public HTML to avoid a loading state.

## Authoritative versus legacy/limited scripts

| Script | Current role / limit |
| --- | --- |
| `build-target.mjs` | Authoritative production sequence; changing a component alone is insufficient if a later generator overwrites it |
| `prepare-sites-build.mjs` | Active shared Hostinger/Sites foundation; name is historical, not evidence Hostinger uses Sites hosting |
| `prerender-real-content.mjs` | Authoritative real-component exact rendering; replaces intermediate templates |
| `repair-search-visibility.mjs` | Active paper metadata/body pass; homepage temporary body is superseded |
| `strengthen-longtail-search-pages.mjs` | Active authentic question and collection-fact pass |
| `expand-hostinger-seo.mjs` | Active GK-specific static rendering, not a sitewide framework |
| `expand-book-summary-seo.mjs` | Active book detail rendering; shared data with client, separate markup implementation |
| `expand-islamic-references-seo.mjs`, `expand-optional-notes-seo.mjs` | Active real-component dynamic-family publishers |
| `expand-vistagram-pages.mjs` | Repair restoring direct navigation to the finite already-public package; uses real components, preserves noindex and excludes nonexistent slugs |
| `split-sitemap-index.mjs` | Authoritative final sitemap split; do not introduce a parallel sitemap generator |
| `audit-hostinger-build-v2.mjs` | Active final artifact/source correspondence gate |
| `audit-hostinger-build.mjs` | Compatibility wrapper importing v2; not an independent competing audit |
| `audit-route-integrity.mjs` | Active all-sitemap + registry route/canonical/robots/404 checks; some nonsitemap dynamic probes are sampled |
| `audit-internal-links.mjs` | Active generated HTML href/src resolution gate; browser-only links and remote-source validity need separate checking |
| `audit-duplicate-content.mjs` | Active empty/placeholder/exact/within-directory near-duplicate gate; similarity is diagnostic, not a Google quality verdict |
| `check-adsense-production.mjs` | Read-only live technical probe; does not read account rejection details or prove approval/policy compliance |
| `validate-artifact.sh` | Sites Worker/hosting manifest validation only; not a Hostinger production release check |

## Editorial authority and preservation

Book source bodies remain unchanged. Verified bibliographic identity records are exposed separately from quotation evidence, with source URL deduplication and no automatic quotation upgrade. `bookEditorial.mjs` applies reviewed quotation labels/attributed translation and notes identically to static HTML and the real reader/printing/copying. Verified book wording requires actual book-text/excerpt evidence; author blurbs, speeches and identity records retain their narrower scope. The generator rejects stale source quotations or unsupported verified states.

Journal transcripts derive only from existing owner-supplied page images. The transcript generator checks all 11 image hashes, preserved text hashes, six identities/dates and separate dated note provenance. No API rows or publication status are fabricated. Six separate dated Journal clarification records distinguish primary evidence, limited official metadata checks and unresolved event-specific claims. Two optional-note updates apply after DOCX parsing and before word-count/index generation, with exact original-block preconditions. MCQ patches check both serving copies and cannot silently change stems/options/IDs. Access and Pro/MPT release policies are unchanged.

## CI, deployment boundaries and verification

`.github/workflows/hostinger-build-check.yml` checks pull requests and main pushes. It exercises lockfile and documented-install builds, type/lint/tests, strict content validation, route/artifact checks, PHP syntax, book artifacts and exact fingerprint correspondence. On main pushes, a separate job waits for the same SHA on production, followed by live checks. That is deployment observation, not an explicit Hostinger upload implementation. Hostinger's externally configured Git integration is not fully inspectable from repository workflow files; do not invent its control-plane settings.

The Sites target writes `dist/client`, `dist/server/index.js` and `.openai/hosting.json` for a different preview runtime. Its Worker fallback must not be mistaken for Hostinger production routing. No preview was published during this task.

The new `tests/studyMaterialSeo.test.mjs` runs the actual RouteSeo effect with only router/React hook substitution and a small DOM-head fixture. It verifies retained schema, route-specific metadata, unknown-route cleanup, restored canonical elements and preserved server noindex. This supplements the final generated HTML and full browser evidence; it does not claim Google has reprocessed the changes.

Owner release hold remains in force: do not merge into automatically deployed main, deploy, publish protected material, reopen Pro/MPT, activate payments/AI or submit AdSense re-review without explicit authorization. Build artifacts and this branch are reviewable preparation only.
