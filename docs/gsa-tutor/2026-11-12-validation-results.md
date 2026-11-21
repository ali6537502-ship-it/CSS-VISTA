# Validation results — 12 November 2026

These results concern software and structural behavior. **They do not approve the science, curriculum depth or examination readiness.**

| Check | Final result |
|---|---|
| `npm run test:gsa-tutor` | PASS: 33 tests, zero failures/skips |
| `npm run audit:gsa-content` | PASS structural inventory; scientific verification NOT PERFORMED, source review NOT APPROVED |
| `npm run audit:gsa-coverage` | PASS: generated 24-group register and 28-chapter audit match current source files |
| `npm run typecheck` | PASS |
| `npm run build:hostinger` | PASS; normal existing bundle-size/content notices remain |
| `npm run audit:routes` | PASS: 119 registry routes; all 923 sitemap URLs resolve with correct canonical/indexability behavior |
| `npm run test:routes` after build | PASS: 21 tests, zero failures/skips |
| `npm run test:workspace` | PASS: 78 tests, zero failures/skips |
| `npm run test:free-learning` | PASS: 2 tests |
| `node tests/browser/gsaTutor.mjs` | PASS: local standalone journeys at 320/375/768/1440 px; capacity rebalance, basic keyboard focus, 200% zoom layout, account-change redaction, reload recovery, reset-generation isolation, existing model controls |
| Original-content comparison against baseline commit | PASS: 141 original lesson records, all original fields of 250 questions (including keys), and 31 original model records preserved; one question has additive candidate metadata |
| `git diff --check` and studio JS syntax check | PASS |
| `npm run audit:gsa-release` | EXPECTED BLOCK (exit 1): official-source confirmation and independent academic approval pending |
| Official FPSC retrieval | UNRESOLVED: HTTP 503 from official homepage/category/current and legacy PDF endpoints |
| Independent scientific review / learner trials | NOT PERFORMED |
| Protected-preview authenticated production account/cloud tests | NOT PERFORMED |
| Deployment | NOT PERFORMED; release hold preserved |

An early route audit ran before the build produced `dist/.htaccess` and failed; the final post-build audit and all route tests pass without skips. One intermediate build read the tutor TSX during a concurrent file rewrite and failed to parse the incomplete read. The source passed TypeScript and a fresh full production build afterward. No failed intermediate artifact was deployed.

Existing build scripts regenerate unrelated Vistagram/premium manifest outputs. Those local side effects were excluded from the change package. No student account, database or production storage was mutated.
