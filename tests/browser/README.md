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
