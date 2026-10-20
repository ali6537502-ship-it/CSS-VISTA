# Original text to native interactive topic courses

Status: **PRIVATE WORKFLOW VERIFIED — PRODUCTION RELEASE HELD**, 20 October 2026. No topic was published to production, Pro reopened, payment/AI activated, or main deployment triggered.

The owner replaced extraction-led authoring with original notes based on the combined CA/PA list on `/notes`, and then explicitly instructed: “Do not create word or pdf. Just create text and then make it interactive to css vista.” New work therefore uses private UTF-8 text directly in the existing native topic engine. The original sources and previous definitions remain retained.

## Actual preparation

Ten chapters now have native guided editions: India–China Maritime Relations; AI Governance/Cybersecurity/Digital Economy; Civil–Military Relations; Azm-e-Istehkam; Climate Change/Pakistan’s Vulnerability; CPEC and Phase II together; Multilateralism/UN Reform; Multipolarity/Pakistan’s Balancing; Sovereignty; and De-dollarisation.

They contain **131 teaching sections with individual checkpoints, 60 separate recall questions, 191 fixed questions in total and ten independent writing tasks**. Existing account-owned progress, writing, revision, history and entitlement workflows are reused. Fixed marking requires no AI. Five established reform courses are reused without rebuilding their content.

CPEC and Phase II share a course, so this batch represents **16 of the 86 catalogue headings**, not 16 new courses. The twelve dated current-affairs update priorities are not twelve additional unique courses. Seventy catalogue headings still need a full chapter under the new plan; fifteen of those have earlier bounded foundations that remain retained. Related material does not automatically complete another heading. The next catalogue heading is BRICS, SCO & Regional Connectivity.

## Editions and preservation

The ten editions comprise eight new logical topics and proposed new editions under the existing Climate and Sovereignty IDs. A separate duplicate-free private release candidate contains **29 logical topics, 455 sections and 677 fixed questions**. This preparation does not silently replace the authoritative earlier 21-course package.

All 21 earlier definitions remain in that unchanged baseline and a private snapshot. Nineteen are unchanged in the reconciled candidate; Climate and Sovereignty retain their original immutable versions and historical work. No original-file completion count is increased merely because new text has been authored.

Each new source checksum is the actual original Markdown edition, with an empty page list. No PDF page numbers or inherited owner-source support are invented. Every teaching paragraph and table cell survives conversion; tables become labelled readable rows. Private editorial evidence records source limitations, exercise keys, distractor review and source/definition hashes. One Library of Congress bibliography label was corrected before the corresponding browser test.

Internal review is not independent external academic endorsement, full-source certification or official examination marking. Time-sensitive legal, policy, methodological and event claims retain their identified dates and scope; unsupported claims and future outcomes are not used to fill gaps.

## Verification

All ten exact-package authenticated admin-to-student workflows passed in the disposable native database and built HTTPS preview: local-only import/review/publication; anonymous/Free/foreign-attempt denial; absent initial answer keys; every guided section/checkpoint; wrong-answer feedback, refresh and retry; complete understanding checks; independent writing recovered after refresh and a second signed-in device; scheduled recall guards and due recall; and expiry preserving owned writing/results while denying new lesson content.

Every course passed overflow checks at 320/390/768/1024/1440 widths. Private mobile captures were retained and Maritime/Climate captures visually inspected. Browser page errors and AI operations were zero. Answers and writing are explicitly synthetic isolated test data, not student achievements.

The separate Climate/Sovereignty edition regression passed: old notes, drafts and checks remain byte-for-byte equivalent in history; new-edition drafts are separate; stale old-edition writes receive 409; and expiry preserves both histories. The native security regression also passed ownership, profile/member access, CSRF, replay, conflict, immutable history, scheduling and withdrawal/expiry checks.

Validation commands used the existing isolated Docker PHP runtime:

- `php server/bin/pro-topic-package-check.php -` on the ten-edition package and reconciled candidate: accepted.
- `php tests/topics/unit.php`: 51 assertions passed.
- Private fixed-grading verification: 1,116 assertions passed, covering all options for every checkpoint, complete all-right/all-wrong sets, missing answers, mode separation and private initial payloads.
- Private `verify-course-browser.mjs <course>`: all ten full journeys passed.
- `CI=true CSSV_DB_NAME=cssvista_briefing_test CSSV_TEST_PHP_CONTAINER=cssv-pro-php node tests/topics/security.mjs`: passed.
- Private `verify-edition-history.mjs`: both logical-topic histories passed.

This increment changes content preparation and documentation, not application code or schema. No new full application build, current-head CI, provider activation, or regression test of every unrelated free/mentor feature is claimed. The earlier broad checks remain historical evidence only.

## Production and handoff

A read-only `GET https://www.css-vista.com/api/pro-release.php` returned HTTP 200 and `paused:true` on 20 October. There was no production mutation or deployment. The release hold remains active. Private topic publication still requires the established authenticated production workflow and the owner’s separate release instruction.

Bodies, keys, original text, source review and exact workflow evidence remain outside Git/public assets under `/workspace/private/css-vista/original-notes/interactive/`. The current text-only progress report is `/workspace/CSS-VISTA-Interactive-Progress-2026-10-20.md`; the machine-readable catalogue tracker records all 86 headings and their actual stage. These paths are private workspace artifacts, not public routes.
