# Current Affairs implementation verification

## Automated verification

On 13 September 2026, native Hostinger account commit `7ed5b893d73b1bf2b3fd7f8edbcbd0d814e78dd3` passed:

- Both established Hostinger build paths (`npm ci` / `npm install`, production build, artifact audit, PHP syntax checks): [run 34742496541](https://github.com/ali6537502-ship-it/CSS-VISTA/actions/runs/34742496541).
- The isolated account, publishing and migration workflow: [run 34742496567](https://github.com/ali6537502-ship-it/CSS-VISTA/actions/runs/34742496567).

The integration run uses the actual native PHP login endpoint with disposable test identities and disposable MySQL account tables. It does not contact the production Supabase identity service. Tests cover automatic import from the complete Hostinger artifact, shared editions for two identities, search/category/date filters, archive, exact source/statistic preservation, preference updates and isolation, bookmarks, read-state isolation, CSRF rejection, cookie-account mismatch rejection, invalid publication rollback, stable-ID conflicts, duplicate imports, unpublish/restore, publishing-token revocation, logout/relogin persistence, expired sessions and direct release-file denial. Browser bundles are checked for the test server secret and protected story content.

Both JSON validators and all five frontend model tests pass. The edited account components pass ESLint and the application passes TypeScript checking.

The same integration run passes native registration, captured verification email, login, captured password-recovery email, reset, single-use and expired tokens, old-session revocation, password change, cookie security, personal Factbook CRUD/search/revisions/media/collections, cross-user isolation, transaction rollback, owner CMS and persistence. A separate signed-migration test verifies preserved test-account IDs/passwords, field reconciliation, replay safety, ownership-conflict rollback and permanent sealing. All accounts and email messages in these tests belong to the disposable CI database; this does not verify delivery to a real inbox or migrate production students.

The complete existing repository suite has two inherited failures: the MPT reasoning-bank count and the notes-price expectations. The workflow reproduces them on the exact unchanged base commit, records both logs, and rejects any new failed test. This feature does not alter those data or prices.

## Browser verification limits

The existing production homepage, account screen and current-affairs route were inspected before deployment. The local preview could not be reached from the browser because the execution environment isolates its server; exposing it was rejected by the environment's approval policy. No authenticated dashboard browser journey or exact mobile-width visual pass has been claimed.

The test-only UI entry at `tests/current-affairs/ui.html` can be run with `npx vite --config tests/current-affairs/vite.config.ts`. It uses labelled fixtures and is excluded from the production build. It supports reviewing the dashboard, reader, filters, archive, saved state and settings presentation; it is not an authentication or persistence test.

Live sign-up, email confirmation, password recovery and the authenticated browser journey require an authorised test account and its email verification. Production student identities are not changed by the automated suite. No fictional edition is committed to the production content directory.

## Deployment verification

The daily briefing feature is already deployed through PR #18. The native Hostinger replacement is held in draft PR #21 and is not deployed. The owner explicitly approved the account/password-hash/private-study-data transfer on 13 September 2026. The bounded public grant was renewed in PR #23, and the first 202 account records transferred with field reconciliation. Native cutover follows completion of all dataset batches and CI; the original source remains intact.

The mandatory-profile implementation at `5b85d89c1b18477dcbfff6a4598fbafb4b91ba72` passed both Hostinger build paths ([run 34753986514](https://github.com/ali6537502-ship-it/CSS-VISTA/actions/runs/34753986514)) and integration ([run 34753986522](https://github.com/ali6537502-ship-it/CSS-VISTA/actions/runs/34753986522)). The tests validate all 12 required fields, missing-photo denial, successful private photo upload, service unlocking and relocking, and unchanged personal-data isolation. Reset-code coverage is added to the same disposable suite.

After a push to main, the workflow checks the existing production backend and every new account route. It verifies that anonymous requests cannot read current-affairs content or internal release files. GitHub build success alone is not treated as proof that Hostinger deployed the change.

The exact daily-publishing contract is in [current-affairs-publishing.md](current-affairs-publishing.md).
