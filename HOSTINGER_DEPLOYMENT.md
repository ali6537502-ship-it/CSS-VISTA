# Hostinger deployment

Deploy this repository through **Websites → Add Website → Deploy Web App → Import Git Repository**.

Use these settings:

- Branch: `main`
- Framework: Vite / React front-end
- Node.js version: `22.x`
- Install command: `npm ci`
- Build command: `npm run build` (or `npm run build:hostinger`)
- Output directory: `dist`
- Entry/start file: none

Add these build-time environment variables in Hostinger before deploying:

- `VITE_SUPABASE_URL`: the Project URL shown in the Supabase **Connect** panel
- `VITE_SUPABASE_PUBLISHABLE_KEY`: the browser-safe `sb_publishable_...` key
- `VITE_SUPABASE_GOOGLE_AUTH_ENABLED`: `true` only after the Google provider and callback URL are configured

In Supabase **Authentication → URL Configuration**, set:

- Site URL: `https://www.css-vista.com`
- Redirect URL: `https://www.css-vista.com/account`
- Redirect URL: `https://www.css-vista.com/account?reset=1`

Do not leave the production Site URL set to `http://localhost:3000`; Supabase
uses the Site URL as the fallback for confirmation and password-recovery emails.

Do not put an `sb_secret_...` key or legacy `service_role` key in a `VITE_`
variable. Vite embeds these values in the public browser bundle; database
access is protected by the row-level-security policies in the supplied SQL
migrations.

The default build is the Hostinger static build. It produces `dist/index.html`, replaces runtime origin placeholders with `https://www.css-vista.com`, generates the sitemap and 605 direct past-paper pages, and copies `.htaccess` routing rules for React Router.

To verify the artifact before deployment:

```sh
npm run build
npm run audit:hostinger
```

To verify the connection without writing data, create `.env.local` from
`.env.example` and run:

```sh
npm run check:supabase
```

The check queries only the public `site_content` singleton and never prints the
API key. If it reports that the table is missing, run every file in
`supabase/migrations` in filename order using the Supabase SQL editor.

The OpenAI Sites deployment remains available through `npm run build:sites`.
