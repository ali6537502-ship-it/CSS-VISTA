# CSS Vista Hostinger migration runtime

This directory contains the server-side foundation for the zero-data-loss Supabase → Hostinger transition.

## Safety model

- The existing React/Supabase account client remains unchanged until target data reconciliation and login tests pass.
- Existing Supabase UUIDs stay as permanent `users.id` values.
- Existing bcrypt hashes can be copied directly into `users.password_hash`; PHP `password_verify()` supports them.
- A second safety net is implemented in `/api/auth/login.php`: users whose local password hash has not yet been copied can authenticate once against Supabase. After successful verification the same password is hashed locally and the account becomes dual-auth capable. Password plaintext is never logged or stored.
- Supabase remains available as rollback until explicit final retirement approval.
- New batch registrations require a server-validated profile image no larger than 25 KiB. Existing students without a photo remain able to sign in and can complete their profile later.

## Required private Hostinger environment variables

No values belong in Git or in any `VITE_` variable. The backend reads true PHP environment variables first and, for shared-hosting setups where runtime environment injection is unavailable, can read a private `../cssv-private/config.php` file outside the public web root. `server/config/config.example.php` is a non-secret template only.

Use a current `sb_secret_...` key for the private migration runner. The runner
still accepts the legacy `CSSV_SUPABASE_SERVICE_ROLE_KEY` variable temporarily,
but new setup must use `CSSV_SUPABASE_SECRET_KEY`.

- `CSSV_DB_HOST`
- `CSSV_DB_PORT` (usually 3306)
- `CSSV_DB_NAME`
- `CSSV_DB_USER`
- `CSSV_DB_PASSWORD`
- `CSSV_APP_SECRET` (at least 32 random characters; preferably 64+)
- `CSSV_PRIVATE_STORAGE_DIR` (directory outside public web root)
- `CSSV_SUPABASE_URL` (temporary bridge only)
- `CSSV_SUPABASE_PUBLISHABLE_KEY` (temporary bridge only)
- `CSSV_SUPABASE_SECRET_KEY` (private migration runner only)
- `CSSV_BOOTSTRAP_TOKEN` (optional one-time schema bootstrap; private config and GitHub Actions secret only)
- `CSSV_SMTP_HOST`
- `CSSV_SMTP_PORT`
- `CSSV_SMTP_USER`
- `CSSV_SMTP_PASSWORD`
- `CSSV_SMTP_ENCRYPTION` (`tls` or `ssl`)
- `CSSV_MAIL_FROM`
- `CSSV_MAIL_FROM_NAME`
- `CSSV_PASSWORD_RESET_URL`

`/api/health.php` reports only capability/configuration booleans and database/schema reachability. It never returns credentials.

## Database

Apply `server/sql/001_hostinger_core_schema.sql` and then `server/sql/002_hostinger_hardening.sql` to the private Hostinger MySQL/MariaDB database before enabling any new API client.

The schema contains migration audit tables. Every source table must reconcile by count/ownership/checksum before account cutover.

## Current API foundation

- `/api/health.php` — safe runtime/configuration/database probe
- `/api/auth/login.php` — local login with temporary Supabase password bridge
- `/api/auth/session.php` — local session status
- `/api/auth/supabase-session.php` — temporary verified Supabase-session exchange for phased cutover
- `/api/auth/logout.php` — CSRF-protected logout
- `/api/auth/forgot-password.php` — one-time reset token + Hostinger SMTP/mail transport
- `/api/auth/reset-password.php` — reset + revoke all old sessions
- `/api/student/profile.php` — self profile read/update
- `/api/student/progress.php` — authenticated progress read/sync/reset on Hostinger
- `/api/student/photo.php` — server-validated <=25 KiB private profile photo upload
- `/api/student/photo-view.php` — authenticated/self-or-admin private photo response
- `/api/admin/students.php` — owner-only student directory with age/gender/city/attempt/batch/status/payment filters
- `/api/batch/register.php` — public batch registration with required photo and duplicate/capacity checks

The React account runtime now establishes a Hostinger session from the verified Supabase session and writes merged progress to Hostinger first. Supabase authentication and the original progress path remain available as a temporary automatic rollback while the remaining account-dependent modules are converted. Set the non-secret build variable `VITE_ACCOUNT_BACKEND=supabase` to disable the Hostinger account path immediately.
