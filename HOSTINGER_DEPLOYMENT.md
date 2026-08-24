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

The default build is the Hostinger static build. It produces `dist/index.html`, replaces runtime origin placeholders with `https://www.css-vista.com`, generates the sitemap and 605 direct past-paper pages, and copies `.htaccess` routing rules for React Router.

To verify the artifact before deployment:

```sh
npm run build
npm run audit:hostinger
```

The OpenAI Sites deployment remains available through `npm run build:sites`.
