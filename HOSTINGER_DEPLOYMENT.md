# CSS Vista — Hostinger production deployment

CSS Vista is prepared for Hostinger Git deployment from the `main` branch.

## Hostinger project settings

In Hostinger, connect the GitHub repository and use exactly these settings:

- Branch: `main`
- Framework: Vite / React front-end
- Node.js version: `22.x`
- Install command: `npm install --no-audit --no-fund`
- Build command: `npm run build:hostinger`
- Output directory: `dist`
- Entry/start file: none
- Production domain: `https://www.css-vista.com`

Use `npm install`, not `npm ci`, for the Hostinger build. The repository previously had a lock-only install state that could omit the direct `react-router` dependency in a completely clean build. The production install now reconciles `package.json` and the lockfile before compiling.

Once the repository is connected to Hostinger Git deployment, new commits on `main` can be deployed through the normal Hostinger Git deployment flow without creating a separate server build.

## Production environment variables

Use `.env.hostinger.example` as the template and configure the values in Hostinger's build-time Environment Variables panel.

Required canonical deployment setting:

```text
SITE_ORIGIN=https://www.css-vista.com
CSSV_STRICT_CONTENT_VALIDATION=false
```

Accounts use the same-origin Hostinger PHP API. Configure database, private storage and email credentials in the existing private server config described in `docs/hostinger-native-accounts.md`. No browser authentication keys are required. Complete and reconcile the account-data migration before merging the native-authentication release.

Optional AdSense manual in-content unit:

```text
VITE_ADSENSE_SLOT_CONTENT=
```

Never place `sb_secret_...`, `service_role`, private API keys, server credentials, or database passwords in a `VITE_` variable. Vite exposes `VITE_` values to browser JavaScript.

## Account verification and recovery

Set `CSSV_SITE_ORIGIN=https://www.css-vista.com` in the private server configuration. Native email verification uses `/account?verify=1#token=…`; password recovery uses `/account?reset=1#token=…`. Tokens are carried in the fragment, consumed once, and never placed in public data files. Configure the Hostinger mail transport and inspect **Admin → Account emails** for failures. Actual inbox delivery must be verified separately from transport acceptance.

## Deployment-safe build design

`npm run build:hostinger` now uses the deployment-safe production path:

1. checks Node, canonical origin and public environment safety;
2. compiles TypeScript;
3. builds the Vite application;
4. generates route-specific crawler-visible HTML;
5. enriches past-paper and collection pages;
6. treats only thin-content word-count thresholds as deployment warnings;
7. keeps structural generation failures as fatal errors;
8. generates the canonical sitemap index and child sitemaps;
9. validates the final Hostinger artifact before the command succeeds.

This separation prevents an advisory SEO content threshold from taking the whole website offline while still blocking genuine build, routing, sitemap and artifact corruption.

For a strict editorial/content-quality build, run:

```sh
npm run build:hostinger:strict
```

Strict mode converts the long-tail word-count checks back into deployment-blocking errors. It is intended for quality review, not ordinary Hostinger production availability.

## Preflight and verification commands

Run only the environment preflight:

```sh
npm run preflight:hostinger
```

Build the same artifact Hostinger should publish:

```sh
npm run build:hostinger
```

Verify an already-built artifact:

```sh
npm run audit:hostinger
```

Run the complete deployment preparation path:

```sh
npm run prepare:hostinger
```

The final Hostinger build produces `dist/index.html`, canonical `www` metadata, `.htaccess` routing, a sitemap index with child sitemaps, route-specific SEO HTML and 782 registered past-paper pages/assets.

## GitHub build guard

`.github/workflows/hostinger-build-check.yml` runs the same deployment build on pushes and pull requests to `main`. The deployment smoke build is blocking when it encounters a genuine build/artifact problem. The stricter content-quality pass is intentionally advisory so a thin page cannot prevent the production website from being generated.

## Redeploy trigger

Production redeploy re-triggered after the VISTA Journal route-integrity fix on 22 September 2026.

## Other deployment target

The OpenAI Sites build remains separate and is available through:

```sh
npm run build:sites
```
