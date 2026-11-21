# Physiology and food-science batch: validation evidence

Validation covered the merged development working tree, including current main `f19285c5cb73b135f8843610ab53b7a3cfc406b5`. No production deployment, live-account mutation, learner trial or independent academic approval occurred.

| Check | Observed result |
|---|---|
| `npm run test:gsa-tutor` | 54 tests passed, including retained attempts, draft recovery, mock answers, account/reset isolation and timetable preservation |
| `npm run test:workspace` | 97 tests passed, including the newer Vista Guide and PMS public-content coverage from main |
| `npm run typecheck` | Passed |
| `npm run test:routes` after completed build | 22 tests passed |
| `npm run audit:gsa-content` | Structural pass for the unchanged original 28 chapters / 141 lessons / 250 MCQs / 31 models; academic warnings remain |
| `npm run audit:gsa-units` | Format/mapping/provenance pass for 38 private drafts, 80 original draft questions and 38 five-mark draft models; zero independent approvals |
| `npm run audit:gsa-coverage` | 24-row coverage register and all-lesson progress artifact current |
| `npm run audit:gsa-scope` | Explicit scope and syllabus references for all 141 lessons retained |
| `npm run audit:gsa-math` | Generated renderer current; 156 expressions, no rendering warnings |
| `npm run build` | Hostinger artifact completed; route, internal-link, search-readiness and duplicate-content audits passed |
| `npm run audit:routes` | 160 registry routes, 4 redirects, genuine 404 checks and 964 sitemap URLs verified |
| `npm run audit:gsa-publication` | Private unit JSON and functioning editorial endpoint absent from production artifact |
| `node tests/browser/gsaTutor.mjs` | Responsive journeys at 320/375/768/1440 px; keyboard and 200% zoom; timed/resume/math/model journeys; reload/reset/account-switch preservation passed |
| `node tests/browser/gsaTutorEditorial.mjs` | All 38 drafts and all eight stages rendered at 320/768/1440 px; option feedback, model comparison/rubrics, host guards, account redaction and zero saved-record writes passed; rerun after distractor edits passed |
| `node tests/browser/vista-guide.mjs` | Compiled PMS/CSS planner responsive journeys passed with no recorded runtime errors |
| Original chapter preservation | No diff against the previous draft HEAD for any `public/gsa-tutor/content/chapter-*.json`; no source-key changes in this batch |
| `git diff --check` | Passed |
| `npm run audit:gsa-release` | Expected rejection: independent curriculum/science/assessment review, learner trials and owner release authorization still pending |

Initial route tests read an older artifact lacking newly integrated PMS pages. Another attempt ran before the build had finished its sitemap phase and found a missing generated file. The final route suite was rerun only after the build exited successfully and passed all 22 tests; no route implementation was weakened to bypass either result.

An additional Mentor PHP unit check could not start because this environment has no PHP runtime. A system-package installation attempt was unavailable to this non-root user (`sudo` absent; apt's system list directory inaccessible). No Mentor PHP implementation or database schema changed in this batch, but its backend check is **not claimed as passed**. Run `npm run test:mentor-server` in the native PHP QA environment before relying on this merged branch for a broader site release. Actual authenticated, cross-device and production backend testing remains outside these local fixtures.

Build output also retains pre-existing non-blocking chunk-size notices and content notices (including the short contact/pure-mathematics pages). They are unrelated to the private GSA authoring batch and were not represented as academic validation. Build fingerprints identify the pre-commit development HEAD; no artifact was deployed.

The private corpus contains source-compared drafts, not scientifically approved teaching. Software tests cannot verify medical or food-safety correctness, assess true learner mastery, certify every syllabus objective or establish independent examination readiness. Those remain explicit educational release gates in `physiology-food-quality.md`.
