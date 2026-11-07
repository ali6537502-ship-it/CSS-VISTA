# Free Sentence and English Expression Lab

Development checkpoint: 7 November 2026. **Implemented on the development candidate; not released.** The owner's production hold remains active.

## Scope and initial audit

The existing native Sentence Studio contained 21 sentence lessons, fixed checks, source snapshots, account-owned preparation attempts, immutable writing versions and conflict/receipt recovery. The independent Expression Lab already saved sentences and paragraphs. Its navigation and new-work access still assumed Pro membership and optional AI diagnosis.

The owner now requests a free chapter-based expression course, skips Ask VISTA, My Answer Performance, CA/PA, maths and reasoning exercises in this build, and cancels all AI evaluation and the picture scanner. Skipping does not authorize deleting existing records or unrelated public resources.

## Implemented course

The course groups the original 21 sentence lessons and 12 newly authored expression lessons into **16 chapters / 33 guided lessons**. Original question identities and reviewed answer keys remain. The other 30 stored reasoning lessons remain unchanged in content; they are not new deliverables or part of this course.

| Chapter | Focus | Lessons |
| --- | --- | ---: |
| 1 | Sentence foundations | 5 |
| 2 | Agreement and time | 2 |
| 3 | Word order and modifiers | 2 |
| 4 | Clauses and connections | 2 |
| 5 | Parallel structure | 1 |
| 6 | Clear, economical wording | 2 |
| 7 | Natural academic language | 2 |
| 8 | Cause and effect | 1 |
| 9 | Expressing a reasoned position | 2 |
| 10 | Qualification and transformation | 2 |
| 11 | Natural phrases and references | 2 |
| 12 | Paragraph focus and support | 2 |
| 13 | Cohesion and sequence | 2 |
| 14 | Comparison and concession | 2 |
| 15 | Responsible source use | 2 |
| 16 | Open, close and edit | 2 |

Every lesson supplies an explanation, worked example, four-option understanding check, individual option explanations, independent task, self-review and revision. Newly authored situations are instructional or explicitly hypothetical; they are not claimed as real research or past-paper questions. Fixed checks have stored answers. Free text is recorded as participation, not automatically certified as correct or mastered.

Chapter links select the appropriate lesson and learning level. Students progress one activity at a time, revisit prior versions, compare revisions and choose the next lesson after recording the stages. Paragraph tasks use their stated word minimum and paragraph storage type; legitimate short sentence exercises retain their one-word imperative compatibility.

## Implementation evidence

- `scripts/skills/expression_chapters.py` authors chapter mapping and new lessons; `author-curriculum.py --check` verifies the protected curriculum package.
- `_skills_core.php`, `_skills.php` and `student/skills.php` implement a real free-access permission for the sentence/expression course, independent of subscription status. No fake membership is created. Authentication, complete profile requirements, CSRF, ownership, source snapshots, expected versions and receipt recovery remain.
- `Studio.tsx`, skills API types, the Expression page, Composer and Review integrate chapters and independent writing into the existing routes and persistence. A focused account navigation omits skipped tools and purchase links within this lab. Other account pages retain their existing navigation pending the wider migration.
- Shared `_ai.php` rejects new reservations for sentence, paragraph, précis, handwriting/OCR, argumentation, analysis and essay evaluation. Reserved cancelled operations cannot dispatch, and release their reservation. Already unresolved or terminal historical operations are preserved.
- Expression, skills, précis feedback and scanner configuration cannot advertise activation through stale enable flags. No provider was called. Historical feedback remains readable; new evaluation controls are removed from this lab.
- No schema migration, production content publication or production data mutation is required for this increment.

## Validation

- TypeScript project build and targeted ESLint pass.
- Strict Hostinger build passes, including MPT release checks, SEO, route, internal-link and duplicate/thin-content audits. This produces local artifacts; it is not deployment evidence.
- `tests/skills/free-expression.mjs`: all 33 lessons with a non-member account; wrong/correct checks, ordered writing/reflection/revision, storage kind, immutable versions, exact replay, stale conflicts, reopening, ownership, authentication and CSRF. No AI usage from practice.
- `tests/skills/retired-evaluation.php`: eight retired scopes, disabled configuration despite stale enable flags, old reservation release without provider dispatch or consumed usage, and preserved unresolved historical result.
- Native skills and learning security suites pass, including concurrency, transfer/return preservation and free independent writing. Sentence v2 snapshot/answer history tests pass after membership expiry.
- PHP syntax checks and skills, expression, handwriting, précis and release-hold unit suites pass. Retained validator tests do not imply that scanner/evaluation products remain active.
- Grammar checksum preservation passes: 30 lessons, 480 questions and 180 correction items. The 22 Grammar/Précis state tests pass.
- Built Chromium journeys cover chapter discovery, level selection, complete guided sentence/paragraph sessions, authored wrong-answer feedback, revision, refresh and second-device recovery, responsive widths 320/390/768/1024/1440 and axe WCAG A/AA checks. The independent editor is also checked for saving, rewriting, reopening and selecting an earlier version. Browser artifacts are isolated test output, not repository content.

The native CI workflow replaces obsolete positive scanner/AI-evaluation journeys with free-course and cancellation coverage. Historical test files remain in Git. Local native testing uses PHP 8.3 and a disposable MariaDB 11.4 database; hosted MySQL CI and the full unrelated platform suite have not been claimed green from these results.

## Remaining work and release status

The focused expression course is a development implementation, not a production release. The wider conversion of retained features, sales/coupon navigation and legacy paid gates outside this lab remains separate work. The owner-skipped CA/PA, Ask VISTA, Answer Performance and maths/reasoning areas are not being completed by this increment.

The candidate still requires reconciliation with newer `main` work, including its scoped Précis release/access changes, before any eventual merge. Do not merge or deploy under the current hold. Do not enable payment collection, coupon offers, providers or private-topic publication.

Optional owner input: anonymized examples of common student mistakes and preferred explanation depth can improve future chapters. No document, password, provider key or payment decision is needed to use the free non-AI learning design.
