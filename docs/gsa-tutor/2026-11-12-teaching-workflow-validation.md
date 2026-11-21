# Teaching workflow validation — 12 November 2026

| Check | Result |
|---|---|
| `test:gsa-tutor` | 54 tests passing; zero failures/skips |
| `typecheck` | Passed |
| `test:workspace` | 78 tests passing |
| `test:free-learning` | 2 tests passing |
| `build:hostinger` | Production build checked; no deployment |
| Post-build route tests | 21 tests passing |
| Route audit | 119 registry routes and all 923 sitemap URLs verified |
| Draft-unit audit | Format pass: 16 drafts, 36 original questions, 16 five-mark models; no scientific approval |
| Coverage/scope/content audits | Generated metadata and original content structure pass |
| Equation audit | Existing 156 MathML expressions typeset without parser warnings |
| Standard browser journeys | Mobile/tablet/desktop, 200% zoom, focus, reading/recall, timed and mixed mock reload/resume/submit, equations/models, account/reset isolation |
| Editorial browser journeys | All eight stages of every unit at 320/768/1440 px, including choice explanations and model rubric tables; retained records unchanged; ownership changes redact the view |
| Publication boundary | Private draft JSON/editorial endpoint absent from production artifact; normal dev endpoint returns 404 |
| Release checks | Expected block: independent reviews, learner trials and owner authorization pending |
| Human scientific review / beginner trial | Not performed; no approval claimed |
| Real authenticated production testing | Not performed; no production student data accessed |

Tests cover the 20+40 science layout, rejection of General Ability groups, frozen archive provenance, chosen deadlines, persistence of written responses, no invented written marks, separate-device merging and earlier-finish protection. Planner tests cover budget extension, rest days, retaining all lessons, practice completion independent of reading, direct access to individual writing models, question-count workload splitting, interrupted chapter resumption, stable calendar assignments, archival of previous timetables and non-destructive fallback from malformed snapshots.

The full mobile sweep found a nutrition rubric-table overflow; a scoped fixed-column rubric layout resolved it. A long-plan check exposed an empty final day; work reservation corrected that allocation. Browser fixtures were updated for explicit MCQ wording and distinct navigation buttons. The host-header guard test uses a real HTTP Host header because the fetch implementation did not transmit its attempted Host override. Final host-guard checks reject the request, and all final regression/browser checks pass. None of these checks substitutes for academic review or outcome measurement.
