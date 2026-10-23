# Pro coupon access — private implementation

Owner requested student-specific discounts and complimentary coupon access on 13 October 2026. This increment extends the existing native membership, authentication, MFA admin, manual receipt verification and subscription period model. It is not a new payment provider or tier.

**Release state: private development only.** Pro remains paused. `CSSV_PRO_COUPONS_ENABLED` defaults to `0`; even setting it to `1` cannot bypass the repository’s production release hold. No real codes have been issued, no production migration applied, no live collection or grant made. Later activation needs the separate owner release instruction; discounted purchases also need all existing commercial collection prerequisites.

## Owner and student workflows

The private admin workspace has **Pro coupons**:

1. Choose a percentage discount (1–99%), fixed PKR discount below the current price, or a complimentary 30-day period.
2. Enter a private admin label, expiry in Pakistan time and maximum accounts (1–10,000).
3. By default, provide the student’s existing account email. The server resolves it to an immutable account ID; a forwarded code does not work for another account. Alternatively explicitly allow any eligible account holding the code.
4. Generate and privately copy the high-entropy code. It is shown in the creation response, not in the issued-code list or student history. Database records store its SHA-256 hash, not the plaintext. The creator can recover the identical creation response using the same request ID and details while the backend security key is unchanged. After key rotation, disable the old code and issue another.
5. Review allocation counts and **View usage** (account email, order status/amount or complimentary period, including cancelled allocations). **Disable code** requires confirmation, records the admin identity and prevents future redemption. It preserves access already credited and the agreed price of an existing order.

A signed-in student with a complete profile enters the code in **Membership & Payments → Coupon access**. Applying a code displays an authoritative offer; it does not reserve a slot, create an order or grant access. The student explicitly confirms the offered period/price before redeeming.

- Percentage and fixed discounts create a new ordinary payment order at the reduced amount. No discounts can be applied to an existing order. The standard price remains **PKR 1,950 / 30 days**. One coupon per order; no stacking. A 25% code gives PKR 1,462.50; a PKR 500 code gives PKR 1,450.
- Existing manual receipt review checks the exact reduced amount, receiving account, transaction and transfer time. Merely applying a code, submitting a transaction or visiting a success screen does not activate a paid order.
- Complimentary codes require no transfer and create no fake payment receipt, payment order or manual-payment grant. Their immutable redemption record credits the existing membership aggregate by exactly 30 days: from now if free/expired, or after current expiry if active. Paid and complimentary renewals use the same membership lock and period rules. Codes grant ordinary Pro access with the existing AI allowances and feature availability; they do not bypass feature flags or provide unlimited AI.
- Each account may have one non-cancelled allocation per code. An unpaid order reserves one allocation immediately. Rejected orders keep the allocation because the student can resubmit a receipt. Cancelling an unpaid order releases its slot and lets that student create a replacement. A pending-verification or approved order cannot be cancelled by the student. Disabling/expiry affects future use, not existing orders or credited periods.
- Coupon history is account-owned, paginated and available after expiry or while new redemption is disabled. No source content, code hashes or other students’ details are returned. Saved learning records and mentor marks are not edited.

## Security and data

Additive migration `server/sql/026_pro_coupons.sql` creates `pro_coupons` and `pro_coupon_redemptions` with mirrored PHP statements, foreign keys, constraints, creation/disable admin identities and immutable pricing/period snapshots. The native schema initializer follows the existing named-lock convention and runs outside business transactions. No existing tables or records are replaced.

Endpoints: `student/coupons.php` and `admin/coupons.php`. Native auth, profile eligibility, account identity headers, separate MFA admin and CSRF are enforced. Codes never appear in GET query strings. Student writes have existing-style account/IP rate limits. Wrong-account, unknown, exhausted, disabled and expired codes use the same availability message. Admin-only usage inspection is paginated. History responses inherit no-store.

Lock order for redemption: membership → coupon → allocation/order reads. Current locking reads serialize total-use and one-account limits across concurrent requests. Idempotency receipts commit atomically with the order or complimentary credit. Exact replay reads its original receipt even when new collection/redemption is paused; changed intent conflicts. Ambiguous network retries reuse the request identity. Existing member/payment review locks prevent a concurrent paid or free renewal from losing time.

Codes cannot be edited, re-enabled, deleted or used to revoke existing access. Disable and create a replacement for corrections. No destructive account/history or retention job is introduced. The code is generated from a keyed HMAC of the creator and random request UUID (128-bit displayed token); the signing key never leaves the server. Normal code/history responses do not expose it.

## Verification

- `php tests/pro/coupons-unit.php`: exact integer pricing/rounding, code validation, invalid discounts and migration parity.
- `node tests/pro/coupons-security.mjs` against isolated real PHP/MySQL: auth/profile/CSRF/account identity, admin-only creation and usage, defaults/pause, account restrictions, hashed storage, idempotency, concurrent limit protection, exact complimentary/renewal periods, no paid-receipt fabrication, percentage/fixed snapshots, exact discounted receipt approval, cancellation/disable, private expiry history and rate limits.
- Existing `tests/pro/security.mjs`: ordinary payment, approval, renewal, rejection, transaction uniqueness and saved-record regressions.
- `node tests/browser/coupons.mjs`: built frontend/native API; admin issue/assign/copy/view/disable, student consent/free credit/discounted order, submitted transfer pending verification, refresh/device/expiry history, release hold, 320/390/768/1024/1440 widths.
- TypeScript, touched-TSX ESLint, PHP syntax and strict Hostinger artifact checks.

All fixtures are restricted to `CI=true` and `CSSV_DB_NAME=cssvista_briefing_test`. Synthetic accounts, codes and receipt strings are tests only. No live student account or transfer is used. Exact successful commands/results are recorded in the private task report after execution; this document alone does not establish deployment.

### Observed local results (13 October 2026)

All checks above passed in the disposable native Docker database and built loopback browser. TypeScript and touched-component ESLint passed; all new PHP files passed syntax checks inside `cssv-pro-php`. The strict Hostinger build passed routing, SEO, links, protected-content and artifact checks; its generated fingerprint is a local build artifact and is not deployment evidence. Existing ordinary payment, paid/free access and release-pause suites passed.

Initial browser checks required correcting selectors for wrapped select labels and the established build’s em-dash-to-hyphen normalization, unique labels for repeat runs against the disposable database, and the final assertion to expect the existing whole-Pro pause screen. The complete browser journey was rerun successfully. The first ordinary-payment regression used an expired synthetic admin session; refreshing that fixture and rerunning passed. The host shell has no PHP executable; PHP checks were run in the established native test container. These initial attempts are not reported as successful validation.

Production, real students, payment channels, AI configuration and owner launch-policy decisions remain unchanged. GitHub CI on any later commit must be reported separately from these local results.
