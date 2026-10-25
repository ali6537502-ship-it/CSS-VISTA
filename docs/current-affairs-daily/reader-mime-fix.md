# Public daily reader: production MIME correction

The owner reported that Read Online failed on the live daily publication page. Real live Chromium reproduced the failure: Hostinger returned the PDF.js module worker with HTTP 200 but `Content-Type: text/plain`, with `nosniff` enabled. Browser module MIME enforcement rejected the worker and the reader displayed its load error. Earlier development-server browser tests and HTTP-status/PDF-byte checks did not cover that production header behavior.

The production build now emits module assets under a content-hashed `.js` filename. This preserves the exact module source, uses Hostinger's established JavaScript delivery, and replaces the old immutable `.mjs` URL in reader and owner-preview code. Apache MIME declarations explicitly cover both `.js` and `.mjs`; `nosniff` and other security policies remain enabled. Native and fallback PDF.js worker imports use the same corrected asset URL.

The same `/current-affairs-daily` library and individual readers explicitly state **Free public access / no sign-in required**. The daily catalogue and all seven document endpoints already allow anonymous requests; no membership gate was removed from unrelated Current Affairs learning resources, weekly files or account services. The reader hides its unused blank canvas when loading fails, leaving the original PDF/download fallback visible.

Regression coverage:

* `tests/browser/daily-pdf-production.mjs` serves the actual Hostinger artifact with production-like MIME types, checks the emitted worker's JavaScript extension/content type, and renders the actual supplied PDFs using the production bundle. It runs in the existing Hostinger CI job.
* `tests/browser/daily-pdf-live.mjs` uses real live HTTPS browser requests (no intercepted catalogue/PDF/worker responses), fresh anonymous desktop/mobile contexts, all seven editions, page controls and an original-file hash check on a real browser download. TLS certificate verification stays enabled. Run only after the expected deployment is live.
* Existing unit, route and responsive reader tests remain applicable. Live verification must include MIME type and painted canvas, not merely HTTP 200 for a worker file.

The production/live browser scripts write evidence to ignored `test-artifacts/daily-pdf/`. No real publication is fabricated or altered by these checks.
