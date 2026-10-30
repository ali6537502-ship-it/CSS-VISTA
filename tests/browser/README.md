# Built student journeys

This test uses the real built React application and native PHP APIs against the disposable `cssvista_briefing_test` database. It creates synthetic accounts only, makes no real provider calls and never targets production.

After the Pro foundations workflow's database/runtime setup:

```sh
npm ci --prefix tests/browser --ignore-scripts
npm exec --prefix tests/browser -- playwright-core install chromium
npm run build:hostinger:strict
node tests/browser/runtime.mjs
```

In a second terminal with the same isolated CI environment:

```sh
CSSV_BROWSER_EXECUTABLE=/path/to/chromium node tests/browser/skills.mjs
CSSV_BROWSER_EXECUTABLE=/path/to/chromium node tests/browser/ability.mjs
```

`CSSV_TEST_PHP_CONTAINER` optionally selects the local disposable PHP container. `CSSV_TEST_BROWSER_ORIGIN` must be loopback. The HTTPS runtime reproduces the existing native paid-file access controls and generates a temporary certificate outside the repository. CI installs the pinned browser separately from application dependencies.

## Workspace and account verification

Against a finished artifact and the same isolated native environment, run the
workspace, planner and preservation journeys:

```sh
node tests/browser/workspace.mjs
node tests/browser/workspace-visual.mjs
CSSV_TEST_AXE=true node tests/browser/planner-workspace.mjs
node tests/browser/workspace-native.mjs
node tests/browser/planner-native.mjs
node tests/browser/signup.mjs
node tests/browser/workspace-guidance.mjs
node tests/browser/account-continuity.mjs
node tests/browser/quiz-account-race.mjs
node tests/browser/pro-pause.mjs
node tests/browser/workspace-avatar.mjs
node tests/browser/answer-timer.mjs
node tests/browser/runtime-routing.mjs
node tests/browser/workspace-accessibility.mjs
```

The native harnesses require `CI=true`, `CSSV_DB_NAME=cssvista_briefing_test`,
`CSSV_TEST_PHP_CONTAINER` and a loopback `CSSV_TEST_BROWSER_ORIGIN`. The accessibility
journey creates a unique disposable account and saves explicitly labelled fixtures
through its own native progress API. It scans all seven loaded workspace sections
at mobile/desktop widths, including the real profile form. Automated scans do not
certify WCAG conformance or physical-device behavior.

The single-account pilot adds `workspace-preview.mjs` and `classic-profile.mjs`.
They test the real native selector, both interfaces, account switching, failed
selection, retained profile records and safe edit retries. Presentation fixtures
explicitly mock the selector; native workspace fixtures select only their own
disposable test identity via `preview-fixture.mjs`. Run native suites sequentially
because only one disposable identity is selected at a time. The actual database
name and CI mode guard the backend fixture override.

`signup.mjs` remains the complete future **global** single-page-signup journey;
it is not the guest flow released by this account-only pilot. The pilot browser
suite instead verifies that guests retain the production signup presentation.
Do not enable a guest opt-in or weaken the real selector to run the global-flow
harness. See [the pilot scope and evidence](../../docs/workspace/single-account-preview.md).

For successful recovery, the disposable PHP server additionally needs
`CSSV_MAIL_TRANSPORT=php-test` and the existing invalid-domain-only capture:

```sh
php -d "sendmail_path=php $PWD/tests/account-native/mail-capture.php" \
  -S localhost:4173 -t public tests/pro/router.php
node tests/browser/account-recovery.mjs
```

Only the isolated runtime may use that transport. No external email is sent.
`read-recovery-mail.php` checks CLI/CI mode, the actual database name and a unique
`@example.invalid` mailbox before returning a captured code/token to the runner.
The browser test exercises successful code and reset-link paths, old-session
revocation, replay rejection, query/hash return and record retention. It never logs
the recovery credentials. This does not verify real SMTP or inbox delivery.

The native account security harness also accepts `CSSV_TEST_ACCOUNT_API_ORIGIN`
(default `http://localhost:4173/api/`, loopback only) so its original environment-only,
non-writable-config fixture can run separately from writable Pro fixture settings.
Unique account emails permit reruns without deleting account records. Normal
registration/recovery limits still apply; never disable them for these checks.
The guarded `signup-fixture.php recovery` preparation removes only prior
`reset-request` counters for this browser harness's TEST ONLY invalid-domain
accounts. Its default mode retains the original signup-counter scope. Neither mode
changes the limiter, account records or other security events.
