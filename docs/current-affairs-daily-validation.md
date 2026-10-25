# Validation record — 25 October 2026

Development base: `e8026c5caeb4b19a522cb42dd88250a57ff92ca9`. No production data was changed and no daily publication was invented. All PDF fixtures are disposable, local-only test files.

Verified in this workspace:

* `npm run lint`: passed with zero errors; one existing `react-hooks/exhaustive-deps` warning in `src/features/current-affairs/Introduction.tsx` remains outside this change.
* `npm run typecheck`: passed. The final Hostinger build also runs TypeScript compilation.
* `npm run test:daily-pdf`: 12 passed, zero failures. Covers valid PDF parsing and accurate derived metadata, an empty catalogue, hash mismatch, traversal, wrong source, identity/date mismatch, invalid timestamps/versions/topics, missing binaries and disguised HTML.
* `node tests/daily-pdf/integration.mjs` with `CI=true`, exact disposable database `cssvista_briefing_test`, temporary PHP 8.4/MariaDB/qpdf and loopback HTTP: passed. Real multipart upload, authenticated draft preview, publication without rebuild, anonymous and CSRF rejection, malformed/oversized PDFs, both sources together, duplicate-date protection, PDF ranges and attachment headers, withdrawal across repeated ingestion, private replacement with retained source/identity, scheduling, removal and audit were exercised.
* `node tests/browser/daily-pdf.mjs`: passed at 320, 768 and 1440px. Verifies no horizontal library overflow, title/date archive, metadata search, pagination, calendar navigation, deep-link reader, actual PDF.js worker rendering (painted-canvas assertion), three-page next/previous/jump controls, zoom/fit controls, download link and browser back. Browser catalogue/PDF responses use explicitly intercepted fixtures; this is not a production backend test. Screenshots are in ignored `test-artifacts/daily-pdf/`.
* `npm audit --omit=dev`: zero reported vulnerabilities.
* PHP lint: all three introduced PHP source files pass.

`npm run build:hostinger` passed, including TypeScript, Vite, MPT, SEO, search-readiness, route-integrity, internal-link and duplicate-content gates. Final direct-navigation tests exposed the need for a dynamic date-reader rewrite; the new `scripts/daily-pdf/routes.mjs` generates an ad-free noindex reader shell so admin editions support refresh without rebuilding. The corrected artifact passes all 17 route tests, route-integrity and search-readiness audits. `npm run test:all` passed with exit code 0, including the new validator tests and all existing suite commands. An initial route check caught a new homepage loading placeholder; it was corrected in source rather than weakening the SEO assertion.

The independent GitHub Actions [Daily PDF publication verification](https://github.com/ali6537502-ship-it/CSS-VISTA/actions/runs/40160346792) also passed on commit `8818a64`, including actual MySQL/PHP/qpdf upload and cross-source checks. The final artifact audit additionally caught inherited library social metadata in the dynamic reader shell; that metadata is removed and regression assertions now cover it.

Production verification is pending: Hostinger qpdf/exec capability, private durable storage and PHP request limits, real owner MFA session/upload on Hostinger, atomic deployment/retention behavior, CDN/header behavior, and a real supplied edition’s live URL/hash. GitHub binary blob support is present in the connected tool schema; no actual publication file was attached or authorized for this implementation, so no live GitHub-PDF publication is claimed. Repository release-hold policy keeps the feature on a development branch/draft PR.

## Change map

* `src/features/daily-pdf/`: shared API/date types, public library/home widget, worker reader, cover/owner preview, owner manager and responsive styling.
* `public/api/_daily_pdf.php`: additive schema, guarded release ingestion, conflict state, owner override merge, file availability and PDF validation.
* `public/api/daily-pdf.php`: public paginated metadata and controlled PDF/cover delivery.
* `public/api/admin/daily-pdf.php`: existing MFA/CSRF-protected management, uploads, replacement, preview and audit.
* `scripts/daily-pdf/`: binary-safe preparation and strict build packaging; `content/current-affairs-daily/README.md` documents the source location.
* Existing Home/Layout/App/Admin/route registry: integration without replacing independent resource systems. Weekly dataset and PDFs remain untouched.
* `public/.htaccess`: deny raw release files/helpers; existing protected resource rules remain intact.
* `scripts/build-target.mjs`, `package.json`, lockfile: build packaging, pinned PDF.js dependency range and validator tests.
* `tests/daily-pdf/`, `tests/dailyPdf.test.mjs`, `tests/browser/daily-pdf.mjs`, `tests/productionRoutes.test.ts`, `.github/workflows/daily-pdf-verification.yml`: repeatable validation.

The operations handbook is [current-affairs-daily.md](current-affairs-daily.md).

Final clean production build passed at implementation commit `1fc6654`, including the dynamic reader shell and all existing artifact gates. Subsequent changes only strengthen browser fixture coverage and this validation record.
