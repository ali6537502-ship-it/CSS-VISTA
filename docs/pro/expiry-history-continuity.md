# Expiry history continuity — private development increment

This follows the Précis guided-continuity work in draft PR #92. The owner release hold remains active: no merge to auto-deployed main, production deployment, publication, provider activation or payment collection. CA/PA conversion remains deferred.

## Policy reconciliation and implementation

General Ability already permits authenticated, profile-complete students to read their own saved attempts after expiry through `student/ability.php?view=history`. Its route gate previously blocked that permitted view. The route now explicitly opts into **only** the history query. An expired member opening the course gets a “Read saved attempts” link alongside membership access. History loads the existing paginated, owned receipts and saved explanations; it does not request the lesson catalogue or expose submission controls. New lessons, exercises and quizzes remain active-Pro operations, enforced independently on the server. Free accounts retain the existing presentation gate; the native history query returns only their own records.

My Answer Performance has a different documented policy (`paid-feature-policy.md`, `human-mentor-records.md`): both reads and writes require active Pro. Expiry retains records and renewal restores access. This increment preserves that rule and adds an expired-member explanation that questions, marks, comments and correction history are retained. It does not opt mentor history into expired access or alter the mentor endpoint.

`ProGate` retains closed-by-default behaviour. The history query opt-in is restricted to General Ability; the earlier Précis opt-in remains unchanged. Failed membership checks, unauthenticated access and the production pause still take precedence. No backend authorization, tables, saved responses, mentor marks, comments, AI limits or membership records are changed by application code.

## Meaningful validation

- Native mentor security tests compare the complete owned record, repeat series and weighted overview before expiry and after renewal. A guarded test-only fixture hashes every owned answer/evaluation row, including timestamps, comments and corrections. The same digest must survive expiry, rejected create/write/correct/retry requests and renewal. This proves preservation beyond merely counting entries.
- The built General Ability browser journey creates eight real wrong/correct exercise receipts. It verifies expired history, saved feedback, refresh, history-only requests even with lesson query parameters, denied new paid work, unchanged receipts after renewal, account isolation and 320–1440 pixel layouts.
- The new mentor browser journey creates a question, marks it written, records an actual zero mark, appends a correction and creates/evaluates a repeat through the UI and native API. It checks the expiry notice/paywall, denied requests, unchanged native records, exact restored comments/marks/corrections/first-repeat history after renewal, second-device recovery, other-account denial, release-pause priority and 320–1440 pixel layouts. All synthetic records are confined to the isolated CI database.
- Both journeys verify zero AI operations. They do not establish real-provider availability, academic AI quality or production readiness.

The exact private commit, local outcomes and CI evidence are recorded in the draft PR and private release report. Production remains paused; this change is prepared for review, not live.

Local validation passed: TypeScript, lint, PHP fixture syntax, 23 mentor unit assertions, complete native mentor and General Ability security suites, strict Hostinger build, and built General Ability/mentor/Précis browser journeys. The new guarded row digest and exact restored responses passed. Mobile screenshots of expired mentor access and General Ability history were inspected. Existing build notices about Browserslist age, inconsistent JSON import attributes, bundle size and thin-page safeguards remain; no new build error occurred. The generated unrelated Vistagram timestamp was restored before review. Final CI and production-hold evidence are reported separately rather than inferred from these local results.
