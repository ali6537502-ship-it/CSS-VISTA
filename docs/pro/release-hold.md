# Scoped owner release — 30 October 2026

The owner has clarified the released course is named **CSS Vista Preci Mentor** and it must be **free for all signed-in accounts**, including those without active Pro membership. This is a **narrow exception** to the 12 October pause below. The existing `/account/precis` course, original handbook catalogue, typed browser-only writing checker, saved versions and `/api/student/precis.php` are available without a Pro membership. Student sign-in, individual account/attempt ownership, anti-CSRF and existing limits remain mandatory. Payment collection is not reactivated.

All other paid products, premium routes, image upload, external AI provider evaluation (`precis-feedback.php` included), and membership purchase/renewal collection remain paused. The public `/api/pro-release.php` response still reports `paused:true` because the wider Pro product remains paused. The returned value is **not** the free Preci Mentor availability indicator. Other categories remain protected independently at the backend and client.

Release checks: run typecheck, lint, Précis unit/security tests, Pro-pause isolation tests, browser/mobile regression, exact deployed SHA verification and direct API checks before declaring the site live. The owner approval covers this scoped release only, not an unreviewed opening of the full Pro system. No paid prices, records, purchases or memberships are altered.

---

# Owner release hold — 12 October 2026

The owner instructed that new work must be produced and finalised before publication, and that the current Pro version should be hidden until then. The only production change authorised by this instruction is the reversible Pro pause. Keep subsequent feature/content work on development branches or in private content packages; do not merge it into the auto-deployed `main`, publish lessons, activate AI/payment collection or reopen Pro without the owner's explicit final-release instruction.

The public availability endpoint defaults to paused, independently of membership, provider and collection configuration. Student premium routes show an accessible temporary-unavailability message; Pro account choices and paid links are omitted. Native premium endpoints deny operations for existing active members as well as new users. Purchase readiness is closed, and the shared General Science/Ability file continues to deliver only its free science portion. Authentication, account ownership, saved free writing, Grammar, preparation, public resources and native administrator authoring remain available.

This pause performs no migration, deletion, membership expiry adjustment, payment-state change, mentor-mark change or historical progress rewrite. Existing records remain stored. The existing native test environment (`CI=true`, exact database `cssvista_briefing_test`) may preview unpublished work; no browser query, cookie, header or production configuration flag can grant that exception. An isolated fixture can exercise the paused state. Real production release requires removing the hold through a reviewed change after the owner approves finalisation.

Use the read-only `/api/pro-release.php` response and exact deployment fingerprint to verify the requested production pause; neither a local successful test nor a merged PR is proof that it is live.
