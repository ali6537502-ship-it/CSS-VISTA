# VISTA Guide — API-free Précis Learn journey

Development implementation, not production release. This change is intentionally limited to the existing protected Précis account workspace. The owner release hold in `docs/pro/release-hold.md` remains active; do not merge to auto-deployed `main`, publish Pro, enable payment or turn on any AI feature without a separate final-release instruction.

## Source and approved routing

The source is the existing access-controlled `cssv_precis_catalog()` from the owner's imported **Master Précis Writing Handbook**. The catalogue already excludes answer keys from fixed-response questions and full model answers from practice passages. No new passages, answer keys, official past papers or independent scoring rules are introduced. The Guide does not load content from external services.

`src/features/precis/guideModel.ts` maps learner goals to existing chapter identities:

| Learner goal | Handbook chapters | Existing reviewed drill skill |
| --- | --- | --- |
| Start from the beginning | 1, 3, 4, 5 | `central_idea` |
| Find the main argument | 4, 5 | `central_idea` |
| Choose what matters | 5, 6 | `selection` |
| Compress without distortion | 7, 8, 17 | `compression` |
| Preserve the logic | 9, 10 | `qualifications` |
| Build and revise a précis | 10, 11, 12, 13, 14, 16, 19, 22 | `coherence` |

These routes deliberately omit chapter 2's unverified official-exam marks, worked-model answer content and answer-key chapters. A chapter is rendered only if the existing **server-returned authorised catalogue** includes it. The route configuration by itself cannot expose handbook content.

## Learner experience

1. Open `/account/precis?view=guide` through the existing native `ProfileGate` and `ProGate` protection. The Pro release pause still supersedes this route on production.
2. Choose one of six educational goals; select or continue an existing chapter. A deep link such as `?view=guide&chapter=9&attempt=<owned-attempt-id>` resolves the appropriate guide path.
3. Read **one original handbook block at a time**. Headings label the screens; source paragraphs, bullet texts and tables remain verbatim, including qualifications. Long table blocks are horizontally scrollable. Progress indicates position in the current chapter, not competence.
4. Write an optional personal explanation. The note is held in per-account/per-attempt/per-chapter/per-step **sessionStorage**, limited to 1,200 characters, and clearly labelled as local to the tab; it is not presented as evaluated or synced work. Storage failure is visible and does not erase the in-memory note.
5. At the chapter end, attempt an existing authored recognition question where one exists. The existing `student/precis.php` action `drill_answer` validates ownership, Pro access and CSRF; it grades the answer on the server and returns a reviewed explanation. The answer index is not bundled into the client.
6. Continue to the next chapter, open focused skill practice, the full handbook chapter or the saved writing workspace.
7. Optionally use **Save chapter**. This submits the existing `progress_save` action with the current progress version, original completed-days array and chapter identity. It **does not mark any day complete**, claim written mastery, mint awards or change existing writing. A successful save allows chapter resumption across devices. The exact micro-screen stays in the URL rather than being falsely described as synced.

The existing `Course.tsx` contextual "Ask about this method" link now routes into this deterministic guide. Other Ask VISTA functions and external provider settings remain unchanged and must be addressed in a separate API-removal audit.

## Security and data

- No external AI request, prompt, model key, provider SDK, generated marking or new backend endpoint.
- The existing account, membership, database, saved précis history and practice ledgers remain the only authorities.
- Protected handbook content is not copied into a public JS bundle or public route.
- Existing immutable first-answer records, drill explanations and spaced review remain authoritative.
- No schema migration, destructive changes or production configuration edits.
- No new dependency and no change to pricing, access classification or paid-content boundary.

## Verification required before release

Automated coverage is added to `tests/precisGuide.test.ts` and included in `npm run test:precis`. It checks unique routes and denied chapter identities, source-catalogue filtering, original block preservation, server-authored question selection and URL-step bounds.

**In an environment with repository dependencies, execute:** `npm run typecheck`, `npm run lint`, `npm run test:precis`, `npm run test:precis-server`, `npm run test:precis-security`, `npm run test:routes` and `npm run build:hostinger:strict`.

**Manual integration acceptance:** verify anonymous/Free/expired/active/paused states, refresh/direct links, same-device and cross-device chapter resume, stale-version error recovery, local-note storage failures, recorded first-answer behavior, retakes, keyboard navigation, 320/390/768/1440-pixel widths, and no external model call. An authenticated live production student flow has not been asserted.

**Release status:** development-only and pending independent test, editorial and owner publication approval.
