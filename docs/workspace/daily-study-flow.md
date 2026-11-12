# Free student daily study flow

The student overview now offers a focused 15, 30 or 60 minute session connecting **Learn → Write → Feedback → Review**. The session follows students through the existing modern student workspace and public Grammar course. All seven workspace sections and the existing account rollback remain intact.

This change includes current main `6f7c68b444e1af9773cb34fe150986783eab63e1`, including the free-learning conversion and the 16-chapter free Sentence and Expression course. It does not incorporate the superseded Pro integration from draft PR #109.

## Native learning and continuity

- The authenticated, read-only `student/daily-study.php` catalog lists eight remaining free learning tools and currently published topics, with bounded pagination and exact course lookup. Unpublished or withdrawn topics are excluded.
- Stage links retain the native lesson, topic, attempt, writing, workspace and immutable version identifiers. Native tools continue to enforce ownership and record the work; navigating a stage never awards completion.
- A session keeps only account-scoped navigation metadata in sessionStorage for up to 24 hours. It contains no response text, grades or copied learning records. Foreign-account, malformed and expired pointers are ignored. Storage failure leaves explicit stage links usable.
- Native navigation may drop study query parameters without losing the selected session. Ending a session removes its browser pointer, preserving all original writing and history.
- Standalone General Ability remains retired. The separate free GSA Tutor remains available. The flow does not request memberships, start payments or dispatch external evaluation.

## Verification

`tests/daily-study/state.test.ts` checks bounded metadata, safe destinations, stage allocation and native writing/version/attempt handoffs. `tests/daily-study/native.mjs` checks authentication, complete profiles, expected-account enforcement, read-only methods, pagination, exact published editions, withdrawal and original writing hashes in the disposable native database.

`tests/browser/daily-study.mjs` exercises setup at five widths, native lesson continuity, all four stages, a published topic beyond the first catalog page, original attempt retention, reload, account isolation and session end. It also checks eighteen student routes at three widths, three automated accessibility scans and the absence of retired billing/external requests. Run only against the isolated CI runtime. Browser results and screenshots are generated under ignored `test-artifacts/daily-study/`.

The existing free-learning security/browser suites and Grammar preservation check remain required. Automated Chromium checks do not certify physical-device behavior, manual assistive-technology testing or academic content approval. No production release is included; the repository release hold remains in effect.

Verified on 11 November 2026 with PHP 8.2, MariaDB 11.4 and isolated Chromium: five state tests, native daily-study security, existing free-learning security and browser suites, the new eighteen-route browser suite, three axe scans, TypeScript, scoped ESLint, PHP syntax and unchanged Grammar checksums all passed. The strict Hostinger build passed its content, search, routing, internal-link and duplicate-content gates. No local build or embedded fingerprint is evidence of a production deployment.
