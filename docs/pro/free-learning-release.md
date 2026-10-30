# Free learning access — 30 October 2026

The owner requested that existing learning tools become free today, including English Expression, sentence practice, argumentation, analytical writing, published subject learning and Précis. This supersedes the October 12 release hold only for those learning tools. Optional AI evaluation, payment collection and unrelated held services retain their existing restrictions. No membership, payment or saved-work records are changed.

This branch includes PR #134's deterministic Précis Guide. That PR alone removes no payment gates: its use of “API-free” means no external model calls. This change opens the native lesson catalogues, authored exercises, progress and versioned writing to authenticated students regardless of membership expiry. Profile, CSRF, ownership, replay and source-version validation remain required. Only already-published subject topics can be read; private drafts stay private.

Existing names differ from the owner's requested names. The repository has Sentence Structure & Improvement, Argumentation Skills Builder, Analytical Skills Builder, Essay Themes Builder, English Expression Lab and published topic learning. No separate Reading Comprehension Lab, Subject Learning Maps, or Word and Expression Bank was found under those names. The existing public Grammar & Vocabulary Word Bank remains free. Those unmatched names need mapping before claiming their release.

## Verification

Run typecheck, lint, the strict Hostinger build, Précis/guide/route tests, and `node --test tests/freeLearning.test.ts`. The native Pro foundations workflow exercises the PHP/MySQL access and preservation contracts, including free owned practice and expired memberships. Local PHP/MySQL integration cannot be claimed without the runtime. Do not report this as live until the deployed version and authenticated free-account flow have been checked.
