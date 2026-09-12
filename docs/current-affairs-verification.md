# Current Affairs implementation verification

## Automated verification

On 12 September 2026, commit `6bb66d3966dc8b49064fb94f77a257b6c32e8b20` passed:

- Both established Hostinger build paths (`npm ci` / `npm install`, production build, artifact audit, PHP syntax checks): [run 34681053813](https://github.com/ali6537502-ship-it/CSS-VISTA/actions/runs/34681053813).
- The isolated account and publishing workflow: [run 34681053802](https://github.com/ali6537502-ship-it/CSS-VISTA/actions/runs/34681053802).

The integration run uses the actual PHP Supabase-session exchange endpoint with a local identity-verification fixture and disposable MySQL account tables. It does not contact the production Supabase identity service. Tests cover automatic import from the complete Hostinger artifact, shared editions for two identities, search/category/date filters, archive, exact source/statistic preservation, preference updates and isolation, bookmarks, read-state isolation, CSRF rejection, cookie-account mismatch rejection, invalid publication rollback, stable-ID conflicts, duplicate imports, unpublish/restore, publishing-token revocation, logout/relogin persistence, expired sessions and direct release-file denial. Browser bundles are checked for the test server secret and protected story content.

Both JSON validators and all five frontend model tests pass. The edited account components pass ESLint and the application passes TypeScript checking.

The complete existing repository suite has two inherited failures: the MPT reasoning-bank count and the notes-price expectations. The workflow reproduces them on the exact unchanged base commit, records both logs, and rejects any new failed test. This feature does not alter those data or prices.

## Browser verification limits

The existing production homepage, account screen and current-affairs route were inspected before deployment. The local preview could not be reached from the browser because the execution environment isolates its server; exposing it was rejected by the environment's approval policy. No authenticated dashboard browser journey or exact mobile-width visual pass has been claimed.

The test-only UI entry at `tests/current-affairs/ui.html` can be run with `npx vite --config tests/current-affairs/vite.config.ts`. It uses labelled fixtures and is excluded from the production build. It supports reviewing the dashboard, reader, filters, archive, saved state and settings presentation; it is not an authentication or persistence test.

Live sign-up, email confirmation, password recovery and the authenticated browser journey require an authorised test account and its email verification. Production student identities are not changed by the automated suite. No fictional edition is committed to the production content directory.

## Deployment verification

After a push to main, the workflow checks the existing production backend and every new account route. It verifies that anonymous requests cannot read current-affairs content or internal release files. GitHub build success alone is not treated as proof that Hostinger deployed the change.

The exact daily-publishing contract is in [current-affairs-publishing.md](current-affairs-publishing.md).
