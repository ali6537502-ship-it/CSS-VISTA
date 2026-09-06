# CSS Vista — Hostinger production deployment

CSS Vista is prepared for Hostinger Git deployment from the `main` branch.

## Hostinger project settings

In Hostinger, connect the GitHub repository and use exactly these settings:

- Branch: `main`
- Framework: Vite / React front-end
- Node.js version: `22.x`
- Install command: `npm ci --no-audit --no-fund`
- Build command: `npm run build:hostinger`
- Output directory: `dist`
- Entry/start file: none
- Production domain: `https://www.css-vista.com`

Once the repository is connected to Hostinger Git deployment, new commits on `main` can be deployed through the normal Hostinger Git deployment flow without creating a separate server build.

## Production environment variables

Use `.env.hostinger.example` as the template and configure the values in Hostinger's build-time Environment Variables panel.

Required canonical deployment setting:

```text
SITE_ORIGIN=https://www.css-vista.com
CSSV_STRICT_CONTENT_VALIDATION=false
```

Account-backed features use these browser-safe Supabase variables:

```text
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
VITE_SUPABASE_GOOGLE_AUTH_ENABLED=false
```

Optional AdSense manual in-content unit:

```text
VITE_ADSENSE_SLOT_CONTENT=
```

Never place `sb_secret_...`, `service_role`, private API keys, server credentials, or database passwords in a `VITE_` variable. Vite exposes `VITE_` values to browser JavaScript.

## Supabase authentication URLs

In Supabase **Authentication → URL Configuration**, set:

- Site URL: `https://www.css-vista.com`
- Redirect URL: `https://www.css-vista.com/account`
- Redirect URL: `https://www.css-vista.com/account?reset=1`

Do not leave the production Site URL as localhost.

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

## Other deployment target

The OpenAI Sites build remains separate and is available through:

```sh
npm run build:sites
```
