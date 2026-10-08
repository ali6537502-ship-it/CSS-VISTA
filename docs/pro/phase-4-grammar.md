# Phase 4: Existing Grammar audit and guided session upgrade

Audited 8 October 2026. Public production fingerprint still identifies `7b01d0126b07d0bf8626b0b3d365a01a3b64ff5a`; no production writes occurred. This increment addresses the owner's instruction that the course should feel alive through actual interaction and saved work.

## Existing Grammar Audit

The preserved `/grammar-course` sequence contains 30 authored lessons across five phases, 480 questions (four warm-up and twelve drill questions per day), 180 written corrections and 285 wrong/right/reason examples. Exact titles, question IDs, correction IDs and source checksums are in `grammar-preservation-map.json`. Explanations, inline rule models, terminology, exam applications, transfer tasks and toolkit tables are strengths. They remain authoritative and unchanged.

The original course displayed all six steps in one long page. Its `cssvista:grammar-course:v3` record retained completed days, best scores, mistakes, notes and current day. Warm-up/drill answers, correction drafts and exercise position disappeared on refresh/day changes. Completion was possible without attempting the drill. Retrying after seeing the answer could improve the best score without a separate first-response measure. Storage failure was silent. The key is outside native account sync, and unowned device history must not silently become an account's private work.

`/language-grammar` contains a separate owner-provided appendix: English has 220 entries across ten topics; Urdu has 334 across five. It also exposes a separate authored Master Grammar course through `view=master-course`. These are existing distinct collections; this increment does not replace, merge, gate or erase them. Its topic/search/page parameters were being reset by the language-load effect, breaking direct lookup and refresh. Public routes, sitemap/indexing and free access are preserved.

## This increment

Replace the long-page default with a guided session: overview, rules, prediction examples, warm-up, drill, corrections and independent writing. Keep a full-lesson reading mode. A real session panel reflects attempted questions, current position, writing and completion; it does not claim live teachers, online students or AI activity. Practice uses authored questions and model explanations with no AI calls.

Version 4 device state preserves answers, first drill responses, correction drafts/model reveals, writing, checklist, per-day step and exercise positions. Guests fall back to the unchanged legacy key; accounts receive isolated UUID-scoped state and do not auto-import unowned guest notes. Explicit contextual lesson links preserve the saved sequential-course position. Storage failures are visible. New completion requires the daily exercises and self-review; inherited completion stays intact. A completed twelve-question drill records its first-response accuracy once per round; retries and repeated completion clicks do not replace it or duplicate the entry. The last 100 completed drill rounds are retained, alongside preserved completion and best-score records. First-response results and later practice scores are distinguished, without claiming mastery. Legacy notes longer than the new input limit remain intact.

Reference lookup returns to the exact day and writing context. Existing Expression links continue to return to the original writing/version. Account work is local to this browser in this increment; no cross-device sync is claimed.

## Remaining Phase 4 work

The broader brief still calls for mixed-topic Error Lab sessions, scheduled revision/maintenance, a calibrated Personal Grammar Profile and validated account synchronization. They follow this guided-session increment; opening a lesson or revealing a correction must never imply mastery. No new authored syllabus or generated question bank is introduced here.

## Validation

Repository lint and TypeScript checks passed. All 168 tests passed (163 existing plus five state/ownership/migration cases); the preservation check confirms all authored source hashes and the existing counts. Final strict Hostinger build passed MPT release, 95 registered routes, all 1,020 indexable sitemap URLs, 59,998 resolved internal links and duplicate/thin-content gates. Final artifact route checks passed all fourteen cases.

Built-app HTTPS browser checks passed at 320, 390, 768 and 1,440 pixels: complete authored Day 1 practice, first-answer error/retry without score inflation, quiz-history deduplication, completion prerequisites, exact exercise/step/draft/model/writing/checklist restoration, restart, full/guided views, original 25,000-character legacy note preservation, topic/search refresh, reference return, next-day URL/refresh consistency, explicit storage failure and native account switching. An actual disposable native writing/version made the reference → course → Expression round trip intact. No page errors or horizontal overflow. A slash-separated sequence in the existing explanation required wrapping within the course content at 320px; its text is unchanged. Public content was not gated.

No production data, migration, external model call or deployment was used. Account course state is still device-local. The branch remains a draft; the remaining Phase 4 capabilities above are pending.
