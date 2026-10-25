# Current Affairs Daily operations and release checklist

## Scope and architecture

This feature is independent of `/daily-briefing` articles and the protected `/current-affairs` learning collection. Historical weekly data and filenames in `src/data/weeklyMagazine.ts` remain unchanged; the existing protected route now labels that tab **Weekly Archive**. The homepage promotion is replaced by a live daily widget. The owner-supplied 19–25 October 2026 daily editions are now included in the publication source. No sample edition is used.

Public routes: `/current-affairs-daily` and `/current-affairs-daily/YYYY-MM-DD`. The existing primary navigation places Daily PDFs beside Vistagram and labels news analysis **Daily Briefing**. Existing mobile menus gain the daily destination.

`public/api/daily-pdf.php` is the single public catalogue and file-delivery endpoint. It merges GitHub release metadata into `daily_pdf_editions`, then applies persistent `daily_pdf_overrides`. Admin publication never needs a frontend rebuild. GitHub assets need a successful build/deployment. No static frontend fallback is used during a database outage: it could accidentally republish a withdrawn edition. The UI reports temporary unavailability and offers retry.

The catalogue returns 12 metadata records per page, the actual publication dates for its calendar, and the latest accessible edition. It never fetches PDFs to browse cards. The server reads metadata and checks file existence/size before exposing records; calendar metadata therefore grows with publication count. For very large archives, add a materialized availability index and bounded calendar queries before changing this safety check. PDFs are streamed in chunks with single byte ranges. Published bytes are hash-verified on delivery. Responses revalidate visibility instead of using immutable public caches, so withdrawal remains effective.

## Hosting prerequisites — verify before release

Use the existing Hostinger PHP/database configuration and owner MFA login. This adds no separate authentication system. Required PHP capabilities: PHP 8.2+, PDO MySQL, mbstring, fileinfo, `exec`, and a working **qpdf** executable. Set `CSSV_QPDF_PATH` in private server configuration (default `/usr/bin/qpdf`). Uploads deliberately fail closed if the parser is absent or disabled; a signature/MIME-only validator is insufficient. A successful local test does not prove that Hostinger supplies qpdf or permits process execution. Install/provision a compatible parser with the hosting operator, or keep the feature unreleased until that prerequisite is met. Never bypass validation to unblock publishing.

`CSSV_PRIVATE_STORAGE_DIR` must be an absolute durable directory **outside public_html and release/build directories**, writable by PHP, protected from other users, and retained across deployments. Files use `daily-pdf/YYYY/MM/…-vN.pdf` and `daily-pdf/covers/…png` within it. Never place uploads under `dist`, run deployment cleanup against that storage, or expose it through an alias.

`CSSV_DAILY_MAX_BYTES` defaults to 26214400 (25 MiB). Configure PHP `upload_max_filesize=25M`, `post_max_size=30M` (or larger request overhead) and corresponding hosting limits; set a lower application limit if the host requires it. Metadata/title/topic lengths and rate limits are enforced server-side. GitHub packaging currently caps each PDF at 25 MiB too. Covers are optional approved PNG images, at most 2 MiB / 8 megapixels. Missing covers show an explicitly labelled document placeholder. Admin can preview the actual selected PDF’s first page without saving it.

Additive schema is provisioned by `dp_schema` using the repository’s existing runtime-schema convention:

* `daily_pdf_editions`: stable identity, unique edition date, source, metadata, revision, update time, date index.
* `daily_pdf_overrides`: persistent owner edits, withdrawal, removal and replacements; never removed by release ingestion.
* `daily_pdf_release_state`: fingerprint and conflicts; ingestion runs once per deployed catalogue rather than re-reading every edition on each request.
* `daily_pdf_audit`: actor, action, edition, complete resulting metadata and UTC timestamp, indexed by edition/time.

The configured database account needs the same CREATE/ALTER/write capabilities used by existing admin services. No existing account, membership, briefing or weekly tables are altered.

## Owner dashboard routine

1. Sign in through the normal private owner dashboard and complete MFA.
2. Select **Current Affairs Daily — PDF Manager**, then **+ Upload New Daily PDF**.
3. Confirm the Pakistan-local edition date, edit the suggested title, and select the actual approved PDF. Add a description/topics and an approved PNG cover if available.
4. Use **Preview selected PDF** to render its real first page. Choose Draft, Published or Scheduled. A scheduled time is interpreted in Asia/Karachi, and must be in the future.
5. **Save Draft**, or select Published and **Publish**. The progress indicator distinguishes upload from server validation. Wait for explicit success. The public page and homepage retrieve the new record immediately, without a rebuild.
6. Use **Edit / Publish / Replace / Withdraw** on a row for subsequent changes. The edition date/identity remains fixed. Selecting another PDF increments its version and hash. Supply a matching cover for replacement PDFs; stale covers are cleared.

To unpublish, choose Withdrawn. To remove it from the active catalogue, choose Removed. Both require confirmation and retain files and audit history; Removed is a soft removal visible to the owner for recovery. There is intentionally no automatic permanent deletion. Preview links require owner authentication even for drafts. If a session expires, sign in again; browser metadata remains until navigation/reload. An interrupted request may have completed server-side: refresh the list before retrying.

Only one edition identity per date is accepted: `daily-YYYY-MM-DD`. Duplicate submissions are rejected. To replace a same-date edition, explicitly edit its existing row. Optimistic revisions reject stale concurrent edits. Backdating is supported: edition date and actual publication timestamp are separate. When no new edition exists, the latest actual accessible edition stays featured; nothing is called “today’s” unless that is its real date.

## ChatGPT → GitHub publication routine

The owner must attach an actual completed PDF and explicitly authorize its publication. Do not generate content, publish a placeholder or infer rights from filenames. The first owner-approved batch contains seven PDFs for 19–25 October 2026.

Preferred preparation from an authorized local checkout:

```sh
node scripts/daily-pdf/prepare.mjs /path/to/approved.pdf --date 2026-10-25
npm run validate:daily-pdf
npm run test:daily-pdf
npm run build:hostinger
```

Omit `--date` to use the current Asia/Karachi date. Optional `--title "Approved title"` changes the suggestion. The command copies binary bytes, computes SHA-256, validates the PDF with PDF.js and creates:

```
content/current-affairs-daily/2026/10/daily-2026-10-25-v1.pdf
content/current-affairs-daily/2026/10/2026-10-25.json
```

Review the prepared files before committing. No publication is live merely because preparation or a commit succeeded.

Metadata fields: `id`, `date`, `title`, `file` (relative dated PDF path), `status` (`draft`, `scheduled`, `published`), `source: "github"`, integer `version`, SHA-256 `sha256`, and explicit ISO `publishedAt` with timezone. Optional `description`, `topics`, `cover`, and a derived `contentCredentialsSha256` when C2PA provenance is present. Size and page count are always derived by the packager. `updatedAt` should be supplied for metadata corrections. Draft/scheduled PDFs remain protected server-side and are never served until publicly eligible. `publishedAt` controls visibility independently of edition date; there is no midnight synthetic publication.

Optional cover files go in `content/current-affairs-daily/covers/` using `daily-YYYY-MM-DD-<32 lowercase hex characters>.png`; set `cover` to that filename. Supply only a genuine first-page export or approved cover. The build checks PNG header/dimensions/size and copies it to the guarded release. Future image formats require explicit validation support.

The connected GitHub tools inspected in this session support `create_blob` with **`encoding: "base64"`**, plus tree, commit, branch and pull-request operations. For a PDF, base64-encode its exact bytes, call `create_blob`, use the returned SHA as a `100644` blob in a tree, and commit the PDF and matching validated JSON together. JSON/Markdown can use UTF-8. Never pass decoded PDF binary as UTF-8 text. A local authorized `git add` / commit / push is also binary-safe. Prefer the existing reviewed branch/PR workflow and honor repository release holds. Do not put credentials in the repository or frontend.

Connector request/attachment size limits vary; no unlimited transfer capability is asserted. If a transfer fails or is too large, report that precisely and use the owner’s authenticated PDF Manager or an authorized local binary-safe git checkout. Do not introduce an anonymous upload API. For multi-year repository growth, prefer durable admin storage for large editions; an eventual approved private object-store adapter can retain the same catalogue and ChatGPT-triggered authorized workflow, but none is assumed or required here. Git LFS is not configured by this feature.

### GitHub replacement and withdrawal

For a deliberate GitHub replacement, retain the ID/date, increment version, use a new `…-vN.pdf` path and update SHA-256. Do not mutate versioned bytes in place. Commit PDF and metadata together. A same-version hash change is rejected by ingestion and reported as an admin conflict. A source/date conflict is shown to the owner; the existing admin edition is retained. Replacing through the dashboard preserves identity and source provenance, while storing replacement bytes privately. Owner overrides take precedence over later GitHub metadata, including future deployments. To reverse an owner withdrawal, explicitly publish that row in the dashboard; changing GitHub JSON alone cannot undo it.

The Hostinger build runs `scripts/daily-pdf/package.mjs` after Vite. It validates all records, missing files, duplicate IDs/dates, paths, PDF parsing, page count, hashes and timestamps, then creates `dist/api/_daily_release/` with a guarded PHP catalogue and denied file directory. The root .htaccess also denies direct access. The public API ingests the deployed release on requests, transactionally; a failed build never produces an accepted release. Deploy the whole completed artifact atomically with the established hosting workflow; never copy a partial `_daily_release` live. Old release rollback may remove newer GitHub assets; unavailable files are hidden rather than advertised.

### Proving an edition is live

After an authorized merge/deployment: verify `deployment-fingerprint.json` matches the intended commit; request `/api/daily-pdf.php?id=daily-YYYY-MM-DD`; check status/date/version; request its `pdfUrl` and verify HTTP 200, PDF content type, `%PDF-` bytes and exact SHA-256; test Range and attachment delivery; open the reader and homepage. A commit, green CI or HTTP 200 HTML page alone is not successful live publication.

## Reader, accessibility and privacy

PDF.js is deferred until reading or owner preview, runs via its local worker, disables eval, and renders one page at a time. Controls support page jump/navigation, zoom, fit width, fullscreen where supported, original download and browser-native print through the original viewer. Sequential PDF text search uses the actual text layer and reports no match for image-only scans; archive search is explicitly metadata-only. Canvas rendering does not create a fake text layer: the original viewer remains available for selectable text/assistive reading. Fullscreen, printing and mobile embedded behavior depend on browser support.

Bookmarks and last page use localStorage only, tolerate disabled storage and never gate access. There is no new login, synchronized profile, analytics or fabricated completion data.

New routes use the existing route/SEO registry and canonical system, with ads disabled. The initial empty/utility library and individual document readers are noindex and excluded from the sitemap; this avoids thin empty pages. Promote the library’s indexability only after it has distinctive server-rendered, crawlable editorial content through the existing SEO pipeline. Protected weekly access controls, PDFs, routes and files remain unchanged.

## Backups and recovery

Back up the four new tables together with the private `daily-pdf` tree. Use the existing encrypted off-host backup policy and test restore in isolation. GitHub covers/PDFs/metadata are versioned by commits, but GitHub is not a backup of admin files or override/audit tables. Retain old file versions for recovery; do not delete them on withdrawal or deployment. Audit rows retain resulting metadata for historical recovery. Restore matching DB/files, then verify hashes and public visibility. A failed transaction removes files newly staged by that request. A process crash can leave an unreferenced file; reconcile against all edition/override/audit references before cleanup. No destructive automatic file garbage collection is enabled.

## Validation and remaining release work

See `docs/current-affairs-daily-validation.md` for actual results, not promises. Production owner login/upload, qpdf execution, durable storage permissions, deployment retention, CDN behavior and live binary delivery must be verified on Hostinger after release authorization. No hosting secrets are available in this development environment. The dated repository release hold must be resolved by the owner before merging this feature to automatically deployed main. This feature does not reopen Pro, MPT, payments or AI.

## Content Credentials in supplied PDFs

The GitHub packager preserves the original 25 October 2026 PDF, including its embedded Content Credentials. Its narrowly recognized C2PA/JUMBF metadata container is bounded and hashed; script/launch attachments, unknown attachment names/types and active/external SVG thumbnail content remain rejected. PDF document/page scripts remain rejected. This verifies container integrity, not cryptographic authorship or the truth of the publication. The complete PDF SHA-256 still matches the supplied original. This exception applies to GitHub validation; the separate server-upload parser remains fail-closed.
