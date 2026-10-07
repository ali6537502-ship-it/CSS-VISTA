# Phase 1A: membership and manual-payment foundation

Status: implemented for review on `feature/css-vista-pro-foundations`; not a production launch. Price approved by the owner: PKR 1,950 / 30 days. Phase 1B (AI accounting, minimum attempt settings and writing persistence) is now a separate reviewable increment on the same draft PR; see [phase-1-learning.md](phase-1-learning.md). The broader Grammar, Précis, Current Affairs and guided preparation rollout follows the phased audit; this increment does not promise those new services are available.

## Account and entitlement contract

One existing student UUID, login and complete profile. `/account/membership` is private, noindex and ad-disabled; dashboard summary and shared account navigation lead to it. Both free and Pro members retain the common dashboard. The owner payment workspace is in `/sadiaali`, behind the established password/TOTP owner session.

`pro_memberships` is the current aggregate; `pro_grants` preserves the source (`easypaisa_manual`), order, approved submission, activation time and each credited period. There is no client-controlled entitlement. The future `cssv_pro_require_active` helper is server-side and checks an exclusive UTC expiry; existing free routes are not gated in this increment. Saved educational history will require ownership, independently of entitlement, when its endpoints are added.

Approval grants exactly 30 × 24 hours from the later of approval time or current expiry. Dates are stored as UTC `DATETIME(6)` and returned as ISO UTC; screens explicitly display Pakistan time. Active renewals preserve the original continuous-period start; renewals after expiry begin a new period. Expiry does not write to learning tables, browser storage, account records or past grants.

## Order, submission and review contract

`student/membership.php` GET returns owned membership, product and a paginated order history (50/page, `offset`); `?order_id=UUID` returns an owned order, terms snapshot, retained submissions, credited period and current collection state. Cross-account order access returns 404. POST requires session, full profile, expected-user header where supplied, CSRF, bounded JSON, strict field allowlists and the existing account rate limiter (30/hour per account, 120/hour for the combined account/IP boundary).

- `create`: UUID `request_id`, current `terms_version` and `product_revision`, allowlisted `return_to`. Server fixes price, PKR, receiving account and 30 days and snapshots terms. The revision hashes price, receiver, duration and terms; changed details invalidate consent even if an operator forgets to change the version. Matching retries return the original order; changed intent returns 409.
- `submit`: owned `order_id`, UUID `request_id`, normalized transaction ID. Allowed only from awaiting-payment or rejected. Creates a separate history record; a claim grants no access. Matching replay is idempotent, including after review.
- `cancel`: owned unpaid/rejected order only; repeated cancellation is harmless. Pending or approved orders cannot be cancelled.

`admin/payments.php` GET has pending/approved/rejected submission filters and pagination. POST rechecks the native owner session inside the transaction and validates CSRF before review. Approval needs explicit actual-receipt verification, independently entered matching transaction/account/amount, valid transfer timestamp with timezone, and a reason. Rejection needs a reason and preserves any existing entitlement. Administrators should keep review reasons factual and avoid private wallet details.

All member/review transactions lock membership → order → submission, then atomically create the grant, update expiry and record the decision. Unique grant constraints on order, submission and globally allocated transaction prevent duplicate credit and receipt reuse. Claimed transaction IDs are not globally reserved: a fabricated claim cannot monopolize someone else's actual payment. Concurrent distinct renewals serialize and both receive 30 days. Repeated approval returns the existing result; conflicting subsequent decisions return 409. There is no silent modification of a prior decision or refund/revocation interface in this increment.

Supporting images are not collected yet. Retention, consent, storage limits and access rules must be decided before accepting uploads. Order/transaction review history is currently retained; no production payment data exists from this increment and no deletion job is enabled. Bank/wallet settlement remains manual; software does not claim a connected provider API or independently verified transfer.

## Closed collection and launch dependencies

Private config example: `server/config/config.example.php`. Defaults hide transfer instructions and disable new orders/submissions. Screens explain that no payment is required. Existing submitted transfers remain reviewable if collection closes. No secret goes into the browser or Git.

Opening collection requires both `CSSV_PRO_COLLECTION_ENABLED=1` and `CSSV_PRO_COLLECTION_APPROVED=1`, a valid integer `CSSV_PRO_PRICE_MINOR` (default `195000`), receiver number/title, a nonempty owner-approved `CSSV_PRO_TERMS_TEXT`, and version. These are operational release gates, not evidence of actual receipt or user entitlement. Receiver number is a string preserving `03055199994`.

Before opening: owner-approved purchase/refund terms, support and verification expectations, retention/privacy policy and confirmation that the receiving account is suitable/permitted for business collection; complete and verify the actual Pro value being sold; explicit merge/deployment authorization. Price approval alone does not settle these dependencies. Never configure invented commercial terms.

Additive migration `012_pro_membership.sql` avoids the unmerged pilot's `011` number. Runtime schema initialization follows the existing project pattern, executes outside business transactions and is protected by a database advisory lock. SQL and PHP schema mirrors are tested for parity. Existing core/admin schemas must be available. No tables or live records are deleted. Before an eventual authorized release, stage migration/build with a database backup and verify the exact production user/owner flow.

## Verification

`php tests/pro/unit.php`: duration/month boundary, active/expired renewal, exclusive expiry/microseconds, timezone, input/destination validation and migration parity.

`node tests/pro/security.mjs`: guarded isolated `cssvista_briefing_test` only, actual PHP endpoints/native login/MySQL. Covers eligibility, account isolation, CSRF, expected account, price tampering, collection closed/paused, duplicate intents, receipt validation, concurrent duplicate approvals, concurrent distinct renewals, competing approve/reject decisions from separate owner sessions, globally allocated transaction reuse, rejection/resubmission, cancellation, redirect allowlist, expiry/history and logout. CI uses MySQL 8; local execution uses disposable MariaDB 11.4 with eight PHP workers. `tests/pro/fixture.php` cannot run against production and writes its test-only policy config only under the temporary directory.

Repository validation: typecheck, lint, production Hostinger build and existing test suite. Browser smoke checks cover narrow and desktop layouts and the member flow against actual local PHP; production remains unchanged. Record concrete results in the PR after those checks finish.

Verified locally on 7 October 2026: typecheck and full repository lint passed; final Hostinger build passed its MPT release, route, internal-link, SEO and duplicate-content gates; `npm run test:all` passed all 163 existing checks. PHP syntax/pure rules/schema parity and repeated isolated database runs passed, including separate-session approval/rejection races and retained preparation payloads. Final built-application browser flow passed at 390px and 1440px: collection closed, account instructions/copy, refresh-persistent pending, owner rejection/resubmission/approval, active/expired membership, owned order access after expiry and safe Grammar return with preserved local notes. No horizontal overflow or JavaScript page errors in that flow. These are local checks; no production checkout, receipt or activation was performed. The CI workflow provides the MySQL 8 replay independently of local MariaDB results.
