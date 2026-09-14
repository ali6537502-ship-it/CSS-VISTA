# CSS Vista Supabase → Hostinger migration

## Non-negotiable migration rules

1. Existing students must keep the same account identity, email, password, progress and history.
2. Supabase remains the source of truth until the Hostinger replacement is fully built, copied, reconciled and verified.
3. No destructive Supabase change is permitted before cutover verification and rollback readiness.
4. Existing Supabase UUIDs are preserved as the primary user IDs in the Hostinger database.
5. Existing bcrypt password hashes are migrated securely; plaintext passwords are never exported, logged or displayed.
6. New registrations require a student profile photo. Server-side hard limit: 60 KB (61,440 bytes). Existing students may continue signing in without a photo and are asked to complete the new profile later; they are never locked out because legacy data lacks a photo.
7. Profile photos are stored as files, not database blobs. The database stores only path, MIME type, byte size, dimensions and integrity metadata.
8. Every migrated table must pass row-count and ownership reconciliation before cutover.

## Production source inventory captured 2026-09-07

Supabase production project: `puxdxzvzzwqglxjtiyre` (`css-vista-production`).

Current live row counts:

- auth users: 150
- auth identities: 150
- student profiles: 150
- student progress: 150
- student activity: 946
- question attempts: 6,537
- quiz attempts: 278
- admin users: 1
- site content: 1
- site content versions: 0
- custom test-series requests: 0
- MCQ error reports: 0
- factbook subjects: 17
- factbook categories: 7
- factbook entries: 26
- factbook entry tags: 4
- factbook tags: 6
- factbook sources: 2
- factbook preferences: 4
- factbook revisions: 311
- factbook collections: 0
- factbook collection entries: 0
- factbook entry blocks: 0
- factbook media: 0
- Supabase storage objects: 0

All 150 current password accounts use bcrypt hashes.

## Target student profile

The Hostinger profile expands the current record without changing existing user IDs:

- full/display name
- email
- phone
- WhatsApp
- date of birth (age is derived, not permanently stored)
- gender
- city
- province / region
- country
- CSS attempt year
- preparation level
- optional subjects
- education
- structured previous CSS Vista history: Miss Sadia Zahoor / Sir Ali Hassan Sargana / both / neither
- previous CSS Vista services: Batch / Test Series / Purchased Notes
- optional previous-study details and other previous academy / mentor
- profile photo path / MIME type / byte size / dimensions / integrity hash
- last seen / profile completion timestamps

Admin filters will use indexed fields such as city, gender, CSS attempt year, batch and registration status. The protected student directory also exposes and exports the structured previous CSS Vista history.

## Photo policy

- New student registration: photo required.
- Accepted web image types are validated by the backend, not by filename alone.
- Final stored profile photo must be no larger than 60 KB (61,440 bytes).
- The profile UI, shared backend helper, database constraint and photo endpoint must all use the same 60 KB ceiling.
- Browser-side compression may help the student, but the backend independently verifies the uploaded file size and decoded image type.
- Uploaded names are never trusted; files receive randomized server filenames.
- Photos are stored outside database tables and served only through the controlled application path.
- Existing accounts with no photo remain usable and receive a profile-completion prompt after migration.

## Migration phases

### Phase 0 — Capability verification

Deploy `/api/health.php` with no secrets. It reports only whether PHP, PDO MySQL, secure random generation and password verification are available. Do not provision or copy data until the live endpoint confirms the required backend runtime.

### Phase 1 — Target database and private configuration

Create the Hostinger MySQL database and apply `hosting-migration/mysql-schema.sql`. Existing installations must also apply the additive schema updates in `server/sql/007_student_profile_photo_60kb.sql` and `server/sql/008_previous_student_history.sql`; the live profile/photo endpoints perform the same upgrades idempotently as a safety net.
Database credentials must remain outside Git and outside all `VITE_` variables. Configure them only in a server-side secret/configuration location.

### Phase 2 — Backend security foundation

Implement server-side endpoints with:

- PDO prepared statements
- secure HttpOnly + Secure + SameSite session cookies
- CSRF protection for state-changing browser requests
- login and reset rate limiting
- password verification using the migrated bcrypt hashes
- hashed password-reset tokens with expiry and one-time use
- admin authorization on every admin endpoint
- server-side validation and file-type checks
- audit logging for sensitive admin actions

### Phase 3 — Initial copy while Supabase remains live

Copy users first, then dependent tables. Preserve IDs and timestamps. Copy bcrypt hashes only through a secure migration path into the private target database; never surface them in browser JavaScript or admin UI.

Recommended order:

1. users
2. student_profiles
3. admin_users
4. student_progress
5. student_activity
6. question_attempts
7. quiz_attempts
8. site_content / versions
9. custom_test_series_requests
10. mcq_error_reports
11. factbook subjects/categories/entries/tags/sources/preferences/revisions/collections/blocks/media

### Phase 4 — Reconciliation

For every source table record:

- compare row counts
- verify distinct user ownership counts
- verify min/max timestamps
- verify primary/unique IDs exist on target
- compute deterministic checksums for stable scalar/JSON payloads where practical
- record the result in `migration_control`

No table is marked complete until source and target reconcile.

### Phase 5 — Dual-running account bridge

Keep the current Supabase login active while the Hostinger backend is tested. Existing students continue to use the website normally. Do not change `/account` authentication yet.

The Hostinger backend is tested privately against copied users, including bcrypt password verification, session rotation, logout, forgot-password flow and progress read/write behavior.

### Phase 6 — Final delta copy

At cutover:

1. take a fresh source snapshot/count set;
2. copy records created or updated after the initial migration;
3. reconcile again;
4. briefly freeze only cloud writes if needed for the final delta, not the entire public site;
5. verify account login and representative progress histories;
6. switch the website account client to the Hostinger API;
7. keep Supabase intact as rollback source during the observation period.

### Phase 7 — Cutover validation

Before Supabase is removed, verify:

- existing student password login works without reset
- password reset email works through the configured Hostinger mail system
- old account IDs match their existing progress
- question/quiz history is preserved
- Factbook data is preserved
- owner/admin account works
- admin student directory and filters work
- new registration/profile photo flow enforces a <=60 KB profile-photo limit consistently
- structured previous CSS Vista history saves, reloads, filters and exports correctly
- existing users without a photo are not blocked merely because legacy data lacks a photo
- batch registration, statuses, payments and exports work
- server rejects oversized/invalid image uploads even if browser validation is bypassed
- session/CSRF/rate-limit tests pass

### Phase 8 — Supabase retirement

Only after a stable observation period:

- stop new Supabase writes
- take a final backup/export
- remove browser Supabase calls and `@supabase/supabase-js`
- remove Supabase production environment variables
- archive, rather than immediately delete, migration history needed for audit/rollback
- retire the Supabase project only after explicit owner approval

## Rollback

Until final retirement, Supabase stays unchanged and available. If target authentication or data reconciliation fails, point the website back to the existing Supabase implementation and correct the target before trying cutover again.
