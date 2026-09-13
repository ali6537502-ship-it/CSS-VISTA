# Native Hostinger accounts

The account runtime uses the existing Hostinger PHP API and MySQL/MariaDB database. No Supabase browser package, API requests or authentication bridge are required. The approved transfer is complete: 202 account UUIDs and password hashes were preserved and reconciled before activation. The owner administrator continues using the existing separate password/TOTP session.

## Authentication and private data

`/account` supports registration, verification, login, password recovery and logout. `/account?verify=1#token=…` confirms email; `/account?reset=1#token=…` resets a password without requiring an existing session. The browser removes the fragment after reading it. The same Hostinger recovery email includes a six-digit code entered at `/account?recovery=code`. Codes expire after 10 minutes, allow five guesses, are HMAC-hashed in `account_reset_codes`, and become unusable after either a code or link reset. Password changes invalidate both recovery methods. Tokens are random, single use and stored as HMAC hashes. Verification expires after 24 hours; password reset after 30 minutes. New passwords contain 8–72 UTF-8 bytes. Existing migrated passwords remain verifiable using PHP's portable bcrypt/Argon verification. Password changes require the current password; resets and changes revoke previous sessions.

Sessions use the existing HttpOnly cookie, SameSite=Lax, Secure on HTTPS and a 14-day expiry. Mutations require a session-bound CSRF token. Account-scoped requests check the expected user ID to prevent delayed writes crossing an account switch. Personal progress caches are separated by account before syncing. Server queries always derive ownership from the session.

The personal Factbook API preserves subjects, nested categories, entries, structured content, sources, tags, collections, preferences, revisions, trash, backup import/export and images. `/api/factbook/data.php` accepts only allowlisted operations/tables/columns and binds SQL values. Shared foreign keys preserve ownership. Images live in private Hostinger storage, require an authenticated owning session, are validated as raster images under 5 MB/16 megapixels, and are served with no-store headers. Each account may store up to 500 MB of images. Entry/source/tag saves and collection membership changes are transactional.

Website CMS publishing, report moderation and test-series review use the existing owner MFA session. Student reports and test-series proposals use the student's native session. Proposed test-series fees remain estimates requiring mentor confirmation.

## Private configuration and email

Keep `CSSV_DB_HOST`, `CSSV_DB_PORT`, `CSSV_DB_NAME`, `CSSV_DB_USER`, `CSSV_DB_PASSWORD`, `CSSV_APP_SECRET`, `CSSV_PRIVATE_STORAGE_DIR` and `CSSV_SITE_ORIGIN` in the existing private Hostinger config. No server credentials belong in `VITE_` variables. `server/config/config.example.php` is a template only.

Configure a real Hostinger mailbox using `CSSV_SMTP_HOST`, `CSSV_SMTP_PORT`, `CSSV_SMTP_ENCRYPTION` (`ssl` or `tls`), `CSSV_SMTP_USER`, `CSSV_SMTP_PASSWORD`, `CSSV_MAIL_FROM` and `CSSV_MAIL_FROM_NAME`. If SMTP is not configured, PHP's Hostinger mail transport is attempted. A transport acceptance is not proof of inbox delivery; verify a real recovery email and the sending domain's mail configuration before claiming delivery is verified.

`server/sql/006_native_account_mail.sql` adds `account_verification_tokens`, `account_reset_codes` and `account_mail_outbox`; the API also creates them idempotently. The outbox encrypts addresses and token-bearing bodies with AES-256-GCM under the existing application secret. Accepted, cancelled and expired messages lose the encrypted body. Failed messages retry up to five times, at least two minutes apart. Registration/recovery requests drain the queue, and the existing admin panel's **Account emails** area shows aggregate status and can retry pending messages.

For unattended retries, configure a Hostinger cron every minute to run:

```sh
php /absolute/path/to/repository/server/bin/account-mail.php /absolute/path/to/public_html
```

The CLI file is outside the webroot. Pass the actual deployed public directory and existing `CSSV_CONFIG_FILE` where required. Exit status 1 means at least one transport attempt failed. Do not send queue content or tokens to monitoring systems.

## Deployment and migration

The native release was deployed through PR #21 on 13 September 2026. All 202 accounts and their copied private study records were reconciled in 42 initial batches plus four final delta batches. Newer native records were preserved. The importer was permanently sealed; a repeated signed request returned HTTP 410.

The production migration route now always returns HTTP 410, with no public verification grant or importer implementation. Historical code is retained under server/migration only for disposable CI tests. Source-side temporary payloads, schema and HTTP extension were removed. The original source remains intact as a backup; do not delete it as part of this feature. See [hostinger-account-cutover.md](hostinger-account-cutover.md) for deployment evidence and remaining verification limits.

Daily briefing publishing remains documented in `docs/current-affairs-publishing.md`: push validated dated JSON to the private repository; the deployed server imports it automatically for all authenticated accounts.

## Validation

The disposable GitHub Actions database runs native registration → captured test verification email → verification → login → password recovery → captured reset email → reset → old-session rejection → password change. It also checks private Factbook CRUD/search/revisions/media, cross-user denial, rollback, persistence, the owner CMS, current affairs ingestion and signed migration. Test mail is restricted to `example.invalid`, stays in the disposable runner and is never uploaded as an artifact. Production checks are read-only and must not insert fabricated news.

## Mandatory profile completion

All 12 checks are required: photo, full name, one contact number (phone or WhatsApp), date of birth, gender, city, province/region, country, attempt year, preparation level, optional subjects and education. The previous academy/mentor field is additional and optional. `public/api/_profile.php` evaluates saved values, not a client flag or a historic completion timestamp. Clearing a required value relocks services. Profile editing/photo retrieval, password security, session checks and logout remain accessible while incomplete. Current affairs, private Factbook/media, synced progress, reports and test-series proposals enforce the gate on the server. The account dashboard, personal Factbook and signed-in study dashboard show profile setup until complete. Public study pages remain available.

The profile screen provides a clickable 12-check checklist, three sections, saved completion status and photo preview. Phone photos up to 8 MB are cropped to a square and compressed in the browser to the existing 25 KB private upload limit; originals are not uploaded.

The daily reading desk includes archive search, unread/saved filters, quick profile access and a fact-recall reveal mode using actual published facts. Daily content still arrives through the existing private Git publishing contract.
