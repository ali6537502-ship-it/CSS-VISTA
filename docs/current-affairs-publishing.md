# Daily Current Affairs: publishing contract

## Push once, available in every account

1. Produce a verified, sourced edition matching the schema below.
2. Add it at `content/current-affairs/YYYY/MM/YYYY-MM-DD.json` in this private repository.
3. Push through the existing main/Hostinger production workflow.
4. The build validates the edition and packages it as guarded server-only PHP. It does **not** emit public JSON.
5. After deployment, the next authenticated briefing/admin request imports changed editions into MySQL **before returning the briefing**. All accounts read the same published edition with their own bookmarks and reading history.

No per-student inserts, daily page editing, manual import command, new hosting service or additional publishing credential is needed. Existing open dashboards refresh when the tab regains focus and periodically while visible.

A Git push must successfully reach Hostinger production. GitHub CI success alone does not prove Hostinger deployment. Existing production database/auth configuration remains required.

## Destination and file format

- Source example: `content/current-affairs/2026/09/2026-09-12.json`.
- Runtime content: existing Hostinger MySQL, in `current_affairs_days` and `current_affairs_items`.
- Browser access: authenticated `/api/current-affairs.php`.
- Build packaging: `scripts/package-current-affairs.mjs`, automatically called by `npm run build` and `npm run build:hostinger`.
- Guarded server release: `dist/api/_briefing_release/`. Direct retrieval is denied by both PHP guards and Apache rules.
- The filename and enclosing year/month must match the dataset date.
- UTF-8 JSON, at most 2 MiB per edition, containing 1–100 stories.
- Dates: real calendar dates in `YYYY-MM-DD` form.
- Publication timestamp: ISO 8601 with seconds and explicit timezone, e.g. `2026-09-12T21:30:00+05:00`. Its date in Asia/Karachi must match `date`.
- Future editions remain hidden until their actual publication timestamp.
- Latest is the greatest publication date among published editions whose timestamp has arrived. Today's screen stays honest if today's edition is absent and offers the latest eligible edition.
- No manual index or latest.json is required.

## Required fields

Edition: `date`, `published_at`, `edition`, `stories`. Optional `schema_version` must be integer 1. Unknown metadata is retained.

| Story property | Contract |
| --- | --- |
| id | Globally unique stable ID, 1–128 ASCII letters/numbers/hyphens/underscores; begins with a letter or number |
| category | Nonempty string, maximum 120 bytes; new categories appear automatically |
| headline | Nonempty string, maximum 350 bytes |
| summary | Nonempty string, maximum 4,000 bytes; keep concise |
| sources | 1–30 original source objects |

A source requires the exact supplied `publisher`, `title` and original HTTP(S) `url`. No embedded URL credentials. Optional `published_at` and `source_type` appear as supplied; source labels are never inferred from domains.

## Optional structured sections

String fields: `what_happened`, `explanation`, `background`, `why_it_matters`, `pakistan_perspective`, `regional_implications`, `global_implications` (20,000 bytes each), and `importance` (80 bytes).

String arrays, maximum 50 entries of 2,000 bytes each: `key_takeaways`, `what_to_watch`, `question_angles`, `topics`, `countries`, `institutions`, `reports`, `treaties`, `organisations`, `people`.

- `timeline`: up to 30 objects with nonempty `date` and `text`. Historical dates can be descriptive.
- `facts` and `quick_gk`: up to 60 entries each. Entries are strings or objects with required `label` and `value`; optional `source`, `year`, `type`, `topic`. Type enables flexible revision groupings.
- `statistics`: up to 40 objects with nonempty string `label`, `value`, `source` and at least one of string `year` or `date`. Source must exactly match a publisher or URL in that story's sources. Preserve units, percentages and original wording. Unmatched or undated statistics are rejected during publication and omitted defensively by the reader.
- Omit optional sections or use empty arrays/strings. Do not substitute null for a list. Empty sections are hidden.
- Topics and entity fields remain searchable and support future topic-based factbook aggregation.

Executable validators: `scripts/lib/current-affairs-schema.mjs` and `public/api/_current_affairs_model.php`. Before pushing, run:

```sh
node scripts/package-current-affairs.mjs --check
php tests/current-affairs-validation.php
```

CI runs both validators. See `examples/current-affairs/test-edition.json` for the complete structure. It is clearly labelled TEST ONLY, includes `test: true`, is excluded from packaging and cannot be published on production. Never copy fictional content into the production directory.

## Corrections and duplicate prevention

Keep each story ID stable when correcting wording or sources. Never reuse it on a different date. An edition import is transactional; failures roll back the entire edition. The same payload returns unchanged and creates no duplicates.

A corrected edition replaces that date's full story set. Omitted stories become inactive; saved/reading states remain intact. The Git release ledger remembers each source file hash, so unchanged files are not reapplied on later deployments. This preserves manual corrections and unpublishing.

To correct from Git, edit the edition file and push. A changed file intentionally republishes its edition. Removing a repository file does **not** unpublish stored material. Use existing private admin → Daily briefing publications → Unpublish.

Failed releases retry on subsequent authenticated requests. Previously committed editions stay stored. A multi-edition push is atomic per edition, not one transaction for the whole archive.

## Health and failures

The existing MFA-protected admin shows publication date/status, story count, last ingestion time, recent attempts, original dataset, unpublish controls and optional publisher tokens.

Malformed JSON, invalid schemas or cross-edition duplicate IDs fail the build. Runtime responses use 422 for validation, 409 for ID conflicts, 401 for missing authentication, 403 for CSRF violations and 503 for backend failures. Server/admin diagnostics record useful error codes without credentials or private payloads.

The additive migration is `server/sql/005_current_affairs.sql`. Authenticated requests apply it idempotently, following the existing Hostinger APIs. If the production database user lacks CREATE privileges, the existing administrator must run this migration once.

Existing private CSSV_DB_*, CSSV_APP_SECRET, CSSV_SUPABASE_* and private storage settings are reused. No Supabase service-role key is needed and existing Supabase tables are unchanged.

## Optional direct API publishing

Repository pushes are the default. A scheduler can alternatively POST the same dataset to:

`https://www.css-vista.com/api/current-affairs/publish.php`

Headers: `Content-Type: application/json` and `Authorization: Bearer <publishing-token>`.

Create a limited token in the existing private admin. It is shown once, stored as a server-side HMAC hash, expires after one year and can be revoked. Store it in the scheduler's secret store, never in VITE variables, repository files or browser bundles. It permits publishing only, not access to student data.

A successful JSON response contains `ok`, `status` (published/unchanged), `date` and `story_count`. Treat non-2xx or ok != true as failure. Retry temporary failures with backoff; correct invalid content before retrying. A direct post needs no deployment.

## Account and data protection

Supabase Auth remains the login provider. The existing backend validates its session and issues a secure HttpOnly Hostinger cookie. Personal endpoints require that server session, scope all records to its user ID, enforce CSRF on writes and reject account mismatches during tab/account switching.

MySQL has no Supabase-style RLS. Protection comes from prepared server queries and authenticated endpoints; browsers never connect to MySQL. Tables cover days/items, combined private bookmarks and reading history, preferences, ingestion runs, limited tokens and Git release bookkeeping. Existing student profiles are reused.

Private responses use no-store headers. Account routes are noindex and absent from sitemaps. No protected stories are embedded in React bundles or static HTML. Account deletion still requires the existing cross-system account-removal process; no unsafe partial-deletion button is exposed.

## Verification

Run the existing Hostinger build checks plus the Current affairs verification workflow. The latter uses an isolated disposable MySQL database, a local test authentication provider and clearly labelled fictional fixtures. It validates the real PHP session bridge and per-user endpoints, publishing/idempotency/access control, session persistence, CSRF and expired sessions. It compares existing-suite failures with the exact base commit and rejects new failures. It does not test Supabase email delivery or sign-up in a real browser, send real verification emails, or change production student accounts.

For local browser review with clearly labelled fixtures, run `npx vite --config tests/current-affairs/vite.config.ts` and open `/tests/current-affairs/ui.html`. This entry and its mock API are test-only and are not production build inputs. Use a real staging account to verify registration, email confirmation, password recovery and persistence across full browser reloads. The isolated fixture is not evidence that those live-provider flows were tested.
