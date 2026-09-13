# Hostinger account cutover — 13 September 2026

## Implemented and deployed

PR #21 deployed native PHP/MySQL accounts at main commit
d5aa45e0b5b796f7eef6ffe92f4e043e7387cb93 through the existing Hostinger workflow.
Supabase is no longer a browser/runtime dependency. Registration, email
verification, login/logout, password changes and recovery use Hostinger.
Recovery supports a link and a six-digit code, with expiry, attempt limits,
single-use enforcement and session revocation.

All 202 approved existing accounts retained their IDs and portable password
hashes. Private study data was reconciled across 42 initial and four delta batches,
preserving newer Hostinger records. The importer was permanently sealed and a
repeated signed request returned 410. Temporary source payloads, schema and HTTP
extension were removed. The source project remains an unchanged backup.

All 12 profile checks are mandatory: photo, full name, contact number (phone or
WhatsApp), date of birth, gender, city, province/region, country, attempt year,
preparation level, optional subjects and education. Saved values are checked
server-side. Incomplete accounts retain profile, security and logout access;
account services unlock only after completion and relock if required data is removed.

## Routes

Public introduction: /daily-briefing. Authentication: /account.
Recovery code: /account?recovery=code.
Protected: /account/dashboard, /account/current-affairs,
/account/current-affairs/:storyId, /account/current-affairs/archive,
/account/factbook, /account/saved, /account/search, /account/settings.
Existing /dashboard and /factbook remain available through their profile gate.

## Database and publishing

Native sessions and existing student/profile/progress tables are reused.
SQL 006 adds verification tokens, recovery codes and encrypted mail outbox.
SQL 005 defines the seven current-affairs publication, personal-state and
ingestion tables. PHP enforces session ownership, CSRF and profile completion;
private media and protected editions remain inaccessible to anonymous requests.

Push daily JSON to the private repository at
content/current-affairs/YYYY/MM/YYYY-MM-DD.json and merge/push to main.
The existing build validates and packages it as protected server content.
After deployment, an authenticated request imports changed editions atomically;
all eligible student accounts then see the same edition. Stable IDs prevent
duplicates. No per-student copies or daily component edits are needed.
The exact mandatory/optional schema, dates, source structure, latest-edition
rules, failures and test-only example are documented in
[current-affairs-publishing.md](current-affairs-publishing.md).

## Verification and limits

Native release integration: Actions run 34754517326; both Hostinger build paths:
34754517382. Main build/backend checks: 34754667350; main integration and
production route/protection checks: 34754667270. See
[current-affairs-verification.md](current-affairs-verification.md).
Tests use real disposable PHP/MySQL services and captured test email. They cover
recovery links/codes, all 12 checks, private photo upload, unlock/relock, personal
data ownership, bookmarks/history persistence, publishing and migration sealing.

Live health confirmed native accounts, database/schema, private storage and
application secret ready. PHP mail is available; SMTP is not configured.
Actual delivery to a real inbox has not been verified. Automatic mail retries
can additionally use the documented Hostinger cron; this cron has not been
configured remotely. No authenticated browser journey or full mobile-width
visual pass is claimed. No fabricated current-affairs edition is published.
