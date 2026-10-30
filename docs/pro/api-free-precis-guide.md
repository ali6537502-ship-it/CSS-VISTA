# VISTA Guide — Student-paced Master Précis course

**Draft, development-only. Do not merge, deploy or reopen the paused Pro system without the owner's separate explicit release instruction.**

## Primary source and fidelity

The actual authoritative teaching source for this flow is the owner-imported `Master Précis Writing Step-by-Step Handbook`, exposed from protected `cssv_precis_catalog()`. The imported catalogue contains 22 numbered chapters and appendices A–C, i.e. 25 sequential catalogue entries. It has six short practice passages, and 39 editorially authored fixed-answer checks.

**No course chapters, introductory explanations, example passages, glossary entries, tables, or answer keys are fabricated by the Guide.** The course includes every paragraph, bullet and table from the protected handbook catalogue, in chapter/block order. Existing source chapter headings become navigation headings. Chapter 2 explicitly contains the existing unverified official-mark claim warning; do not present such marks as confirmed official rules. Worked model answers remain withheld under the existing deliberate comparison disclosure gate; the guide links to writing practice instead of embedding answer keys.

## Student-chosen course duration

At `/account/precis?view=guide`, a student with an owned preparation attempt chooses a pace:

- Presets: 7, 14, 21, 30, or 45 days
- Custom: any whole number from 3 to 60 days, provided the handbook contains enough teaching units

The preview lists every day, relevant handbook chapter range, and exact reading-section count **before** the student saves their plan. Faster plans contain more reading on each day; slower plans contain fewer sections. The system does **not** claim that merely selecting a shorter pace guarantees learning.

`handbookUnits()` takes actual imported content as the only curriculum: adjacent original non-heading blocks (paragraphs, bullets or tables) form coherent reading units of at most three blocks per handbook heading. Each unit has a stable first-block `chapterId:blockIndex` ID; every original block remains present and unchanged. `buildStudyDays()` partitions all units into the chosen number of nonempty, source-ordered, weighted daily schedules. Text length is used only for workload balancing, not to alter the lesson content. Every unit must appear exactly once in the complete schedule; headings provide stable readable section labels. The current imported edition contains 108 grouped reading units comprising 193 original body blocks.

A learner can replan from 14 to 30 days (or another supported duration). Previously completed **source unit IDs** are preserved; daily groupings change without deleting earlier work. The UI reports exact completed-section coverage and does not claim that reading completion proves written Précis mastery.

## Daily learner journey

1. Open the current day: `Day n of targetDays`, title, sections covered today, and daily progress.
2. Read one coherent group of source paragraphs/bullets/tables verbatim, labelled with its actual handbook chapter and heading. Groups are intentionally small to avoid either scattered micro-flashes or oversized full-chapter dumps.
3. Optionally write a working explanation in a browser-tab note. This field is clearly private, local, and not automatically evaluated. Browser-storage failure is shown.
4. Select `I have read this · Continue`. One server-validated, account-owned, version-checked completion record is saved for the exact original book unit.
5. At the end of the day's reading, attempt one existing authored fixed-answer question when its chapter skill is represented in the reviewed bank. The server alone checks and explains correctness. There is no free-text semantic marking.
6. Move to the next day, revisit a preceding day, read the full source chapter, open the existing writing workspace or review actual recorded practice errors.

The complete existing optional 30-day routine is still available as a handbook chapter and in the legacy guided course. This adaptive plan is an additional mode, not a destructive replacement for any previously saved legacy course.

## Secure storage and migration

- Existing native login, ProfileGate/ProGate pause, owner-scoped `preparation_attempts`, PHP/PDO account checks, idempotent receipts, first-answer history and CSRF remain in control.
- New additive migration `server/sql/027_precis_adaptive_guide.sql` adds `precis_guide_plans` keyed by `attempt_id`: `target_days`, `completed_units`, `version`, and `handbook_sha`. No record is deleted and no existing `precis_progress` or writing version is replaced.
- `guide_setup` validates 3–60 days and the current version; `guide_mark` validates that a source unit ID actually exists and is a paragraph, bullet or table in the imported book. Both require native owner, CSRF and active membership; source-hash mismatch blocks silent remapping after handbook changes.
- The new front-end imports no model SDK, sends no provider request, and exposes no complete content or answer-key bundle in public JavaScript. The protected PHP catalogue supplies its original source.
- Work notes are stored per user/attempt/source unit in browser `sessionStorage`. Those notes are not synced and are not a substitute for the saved writing workspace.

## Tests, release hold and acceptance

`npm run test:precis`: algorithmic coverage (days, all sections exactly once, chapter/block fidelity, answer isolation, resumption when pace changes).
`npm run test:precis-server`: genuine source IDs and additive migration parity.
`npm run test:precis-security`: separate accounts, attempt ownership, invalid durations, fake sections, stale version conflicts, idempotent saves, preserving completed units during replanning.

Run project-wide TypeScript, ESLint, server/security, build and browser verification before publication. Check completion on multiple devices, answer-checking without external provider calls, keyboard navigation, narrow mobile layouts, Pro pause, and cross-device plan save. All access and pricing remain unchanged until a separately authorized API-free Pro release.

**This PR is a development implementation. It is not a live or publicly accessible course preview.**
