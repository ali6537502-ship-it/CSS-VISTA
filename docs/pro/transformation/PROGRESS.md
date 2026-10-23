# CSS VISTA Pro transformation progress

Draft PR: [#109](https://github.com/ali6537502-ship-it/CSS-VISTA/pull/109). Development branch: `feat/pro-workspace-transformation-20261023`. Main baseline: `ffeedde80be9af6a9915bf360e8eb7bba821917f`. Candidate: `964beeb50e4f7bfe83c2394bc16736ea55993dad`. This is an unfinished transformation under the existing release hold. Read `ledger.json`, `DECISIONS.md`, current AGENTS.md and git status/history before continuing.

## Implemented development scope

- Reconciled candidate ancestry with main, preserving public Daily Briefing, current Free Grammar v5 and legacy records. Retained both original 026 migrations. Added a baseline source/hash manifest and 15 synthetic preservation contracts before integration.
- Replaced Factbook's confirmed nested-wrapper sanitizer with DOMPurify; sanitize clipboard HTML before insertion, prevent rich drop, restrict native rich-content shape, retain original private data and repair owned entry links.
- Repaired publication security-event counting with a separate hashed admin actor and null student FK. Publication honors the production hold and requires an exact private, fresh, independently reviewed dossier; existing MFA/CSRF/receipt/revision/editorial controls remain.
- Added additive 027 references from topic draft/notes slots to existing immutable writing versions. Preserve one exact imported baseline, append actual revisions, retain latest progress projections, reject stale/replayed intent and direct generic writing/AI access back to the topic workspace. Added a readable per-edition version panel.
- Connected six shared account homes, Today resume, account-scoped unconfirmed preparation-save discovery, metadata course index, typed native Library search and topic/reading Review queue. Kept transactional routes, opaque IDs and query contracts; added safe return allowlist, primary-home breadcrumbs and private/ad-disabled route declarations. No new account, progress, membership, AI or body store.
- Changed unsupported Mastered display claims to recorded practice/recall; labelled browser-only/self-reported progress and student-entered mentor feedback. Daily Facts and My Factbook remain distinct.
- Preserved exact Sentence Studio workspace/version/attempt return through Grammar v5 reference/practice navigation. Fixed secondary-text contrast on the new account canvas.
- Updated compatible npm dependencies and a scoped build dependency override; scan currently reports zero advisories. Extended both CI workflows' shared dependency triggers and registered new regression checks.

## Verification boundaries

Actual commands and safe evidence hashes are recorded in `ledger.json`. Raw logs, database backups, synthetic sessions, screenshots and runtime evidence are outside Git at `/workspace/css-vista-evidence` and ignored `test-artifacts`. Do not publish those raw files. First-run config-directory failures, browser assertions tied to retired UI, the real Grammar return defect, real contrast failures and a concurrent-build browser timeout are retained separately from successful reruns.

Locally verified scope includes main baseline typecheck/lint/strict build; integrated standard/content/native tests; two-account search isolation/pagination/read preservation; topic exact-text/hash/version continuity and schema parity; private dossier validation; admin counter/429; built workspace at 320/390/768/1024/1440 and sanitizer attack cases; a quiescent 96-table synthetic MySQL backup/restore. This is not host readiness, representative performance, real-provider evaluation, independent human approval or field accessibility evidence. All 19 browser programs now have successful local results after the recorded reruns. The final local artifact identifies application commit `ed6d6150ef919a6fd108ef11c0e15bc90040ad7d`; later changes pin verification evidence and documentation. Final-head GitHub CI remains a separate gate.

## Phase state and remaining work

| Phase | State | Remaining evidence or work |
|---|---|---|
| P0 reconcile | Local integration implemented; full phase blocked | Recover exact private package; host applied/schema convention and MariaDB rehearsal; final exact-head CI |
| P1 security/persistence | Implemented bounded foundations; wider verification outstanding | Full Factbook import/export/print/legacy matrix; prior public-content exposure response; broader restore/private-image and adversarial matrix |
| P2 workspace | Bounded shell/catalog/return/resume implemented | Reviewed complete course/lesson relationships, full breadcrumbs/subject filters; actual usability panel and all domain mobile task states |
| P3 Library/Review/Progress | Partial implementation | Remaining native CA/personal-source adapters; complete saved/unfinished/source/date/collection filters; Grammar/Précis/Ability due federation; real-intent aliases/ranking and 30-query academic relevance set; explicit local import preview/receipts and cross-device coverage |
| P4 academic completion | Blocked | Exact package retrieval/hash, current source reconciliation, 53 outstanding affairs reviews and rechecks, bounded Ability/Précis/skills additions and independent academic approval |
| P5 publishing/operations | Exact-dossier gate implemented; operation readiness blocked | Actual independent approval artifacts/operator installation; full dossier/coverage/operational UI, host maintenance/private-storage/mail/backup readiness and withdrawal/stale/replay matrix |
| P6 convergence | Partial verification | Complete manual keyboard/AT/zoom/software-keyboard and Urdu/math task evidence, complete unique contrast review, CSP report-only/enforcement, ASVS matrix and representative lab/query/load/field budgets |
| P7 final held packet | In progress; release blocked | Draft PR #109 and local checks are recorded; all unresolved earlier gates, final exact-head CI and separately authorized host preparation remain |

The partial engineering items above are uncompleted work, not invented external blockers. Continue them independently while exact content and academic/operator evidence are unavailable. Do not mark the full transformation complete from routes, counts, a build or synthetic tests.

## External blockers

The referenced local package path is absent. Connected Drive discovery finds source PDFs but no exact native JSON/ZIP package matching `05e46f50b827e91996674ebc041c0b166ec180e78c04f171bd81fde7e8817890`; source metadata is not a replacement package. No independent human academic approval, real provider calibration, approved payment/AI operating policy, authenticated production host/schema/private-storage/maintenance connection, manual assistive-technology panel or representative capacity measurements were available. No such result is claimed.

## Release status and next action

Nothing is deployed, merged to main, published privately, collected or activated. An anonymous read-only live check still returned `paused:true` and the unchanged main fingerprint, with ordinary/cache-varied GET agreement. This observes the held live baseline; it is not deployment evidence for this branch.

Continue from the ledger's actual test and source head, inspect drift, finish the remaining independent P3/P6 engineering and request the exact private package through a legitimate connection when available. Review `RELEASE-PACKET.md` and `MIGRATIONS.md` before any later release decision. A future release needs separate explicit owner authorization naming the exact artifact and scope.
