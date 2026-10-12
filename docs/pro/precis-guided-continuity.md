# Précis guided practice and continuity — private increment

The owner requested further core Pro work, deferred CA/PA conversion and retained the production release hold. This increment starts from production/main `cd9c6e4c24c96b678c7cfff2c4b840adb98a03c8`. Draft PR #91 contains separate writing-studio improvements; this branch does not duplicate them or merge them into production.

## Problem and resulting behaviour

The handbook, writing/revision workspace, fixed checks and append-only response history already existed. Skill practice displayed every drill for the selected skill simultaneously. Refreshing cleared visible choices and feedback, despite the response being retained in the native database.

Guided practice now shows one question at a time, with explicit previous/next controls and an optional all-drills view. Students can read a hint, attempt a check, review its explanation and continue. The selected question is retained in the URL after interaction, so saving does not automatically skip the explanation. Without a bookmarked selection, the student resumes at an unanswered drill, then an outstanding error-review drill. Merely opening or skipping a question earns no evidence.

The existing owned-attempt progress endpoint returns only the latest saved choices and explanations for answered questions. It reuses the bounded first/latest response query and orders equal timestamps consistently by the existing response ID. Unanswered explanations and keys are not returned. No new table or alternative progress system is introduced.

The UI restores saved choices/feedback after refresh or another authenticated device. An explicit reload can recover an accepted response without submitting it again. While a response is saving, drill navigation and other answer controls are disabled. The same immutable first-attempt and most-recent-error rules remain authoritative: an immediate correct retry does not erase the three-day review interval or turn recognition into writing mastery.

## Preservation and access

- The 39 authored drills, 25 handbook chapter/appendix entries, six practice passages and 30-day sequence are unchanged.
- No response, draft, saved version, source snapshot, mentor record, AI allowance or membership is rewritten or deleted.
- Authentication, profile, CSRF, account/attempt ownership and active-Pro writes remain native server checks. Previously answered feedback remains owned history after expiry; new paid work remains blocked.
- Reading, navigation, fixed checking and restoring feedback create no AI operation. Real source-bound AI activation and academic calibration remain external prerequisites, not claims established by these tests.
- Independent writing, delayed handbook model disclosure and immutable comparisons remain in the original Précis Lab. No summariser or duplicate course is added.

The actual browser journey found a pre-existing expiry mismatch: the native Précis API allowed owned history, but the outer route gate blocked the page. The Précis route now explicitly opts into verified expired-member history. Unauthenticated/free accounts retain the original gate, and the production pause still takes precedence. The Lab already omits its premium catalogue, composer and new evaluation actions when inactive; the server independently blocks new paid actions. This opt-in is not applied to every Pro destination.

Related inspection found that General Ability's native history endpoint also permits owned expired history while its outer route is gated; that deserves a separate scoped fix. My Answer Performance currently requires active Pro even for reads, so its history policy and inactive UI must be reconciled before changing that route. No mentor access rule, mark or record is changed here. The following [expiry-history increment](expiry-history-continuity.md) resolves General Ability's gate mismatch and confirms the documented renewal-required mentor policy without changing mentor access.

## Validation and release

`tests/precis/unit.php` checks the latest-response projection and excludes unattempted/invalid/retired keys. The native security suite covers wrong/correct recovery, first-attempt preservation, account/attempt isolation, ownership and expiry history. The existing source-bound feedback suite remains separate and uses labelled disposable transports only.

The new `tests/browser/precis.mjs` exercises the built UI/native API/database with isolated synthetic accounts: guided navigation, initial hidden answers, lost-response read-only recovery, restored feedback, retries, attempt/device isolation, responsive widths, independent writing/revision, delayed model, course resume and expiry history. The Pro foundations workflow includes this browser journey.

Local validation passed: typecheck, lint, PHP syntax, strict Hostinger build, 195 Précis assertions, native course/security and existing source-bound feedback suites, and the complete new built-browser journey. The browser covered 320–1440 pixel widths, zero page errors and zero AI operations. The first run exposed an assertion that did not await layout rendering; a subsequent full run exposed the real route-level expiry bug described above. Both were resolved before the successful final journey. The mobile drill screenshot was visually inspected.

Final exact draft commit/CI evidence is retained in the private validation manifest and PR. Nothing is merged into automatically deployed main, published or activated under this increment. Pro remains paused and CA/PA work stays deferred. Real-provider academic validation remains blocked by the missing legitimate provider connection and approved activation policy; synthetic feedback tests do not establish it.
