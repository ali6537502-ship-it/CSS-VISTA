# One free learning account — 7 November 2026

The owner instructed: “delete ability and pro system and make it free”. This replaces the older Pro product/launch policy for the remaining learning tools.

## Result

- The standalone General Ability course and its frontend are removed. Its old account URL redirects to Practice; its native endpoint and source catalogue return `410`. Existing rows and immutable migrations remain for retention. The compulsory General Science & Ability subject, existing subject MCQs and the separate free GSA Tutor are retained.
- There is one learning account. The Free/Pro switch, membership/renewal UI, subscription lookup hooks, Pro badges, checkout and payment-review UI are removed. Their old account URLs redirect to settings or study progress.
- Published Current Affairs, essay resources, reading/revision, subject learning, guided writing and manual answer-performance records are free to complete accounts. Sign-in, complete-profile, CSRF, expected-account and ownership checks remain. Unpublished/withdrawn source restrictions remain editorial restrictions, not subscription gates.
- Existing writing, source snapshots, immutable versions, mentor evaluations, transcriptions, tutor responses and reading records remain. Handwriting and tutoring pages now expose retained records and free lesson links, without new external-processing forms.
- Payment creation/submission/review endpoints reject new POSTs with `410` after authentication and CSRF. Their legacy GET endpoints remain read-only and owner/admin-bound for retained records. Historical billing/grant rows are not deleted, amended or repurposed as access rules.
- External evaluation/OCR/tutoring POSTs are retired with `410`. Global provider configuration is hard-disabled in code and all external allowances are zero, even if older deployment flags remain enabled. Owned GET feedback/history remains available. No new API provider, subscription, collection target or charge is activated.
- Old launch-status helpers remain as inert protocol compatibility only; learning has no launch-status request or subscription check. Retained storage/schema helpers keep their historical names so existing records remain readable.
- The independent MPT hibernation and private editorial publication lifecycle are unchanged. No learner-facing planner algorithm or account record migration is introduced.

## Validation

`tests/free-learning/unit.php` asserts immutable retirement despite enabled environment flags. `tests/free-learning/security.mjs` uses fresh free accounts to open learning, verify profile/account boundaries, recover owner-only historical orders and reject retired payment/provider/ability requests without mutating prior records or provider counters.

The existing native writing/skills/reading/mentor/topic/grammar/Précis/reset tests retain their ownership, CSRF, replay, versioning and history assertions. Their old paid-access expectations are replaced with free continuity. Provider-activation and removed Ability lifecycle specifications are superseded by explicit retirement checks; current CI does not attempt to reactivate those removed features.

`tests/browser/free-learning.mjs` opens every remaining learning route as a fresh free account, rejects subscription/launch network dependencies and external actions, verifies old URL redirects and checks 320–1440px library layout. The existing complete-book and guided-writing browser journeys remain required.

No production data is used for test fixtures. Release uses the existing GitHub/Hostinger pipeline after the updated tests pass.
