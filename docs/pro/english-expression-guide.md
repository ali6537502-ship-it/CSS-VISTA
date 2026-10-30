# English Expression Guide

An original, free, deterministic course at `/account/expression` (or `?view=guide`). It teaches complete sentences, clause boundaries, agreement and time, reference and modifiers, precise word choice, sentence flow, paragraph unity and deliberate revision. Each of eight lessons includes four teaching explanations, a before/after example, an explained fixed-answer check, an independent writing task, an optional teaching response and two revision checks.

The guide makes no fetch, model, provider or payment request. It runs inside the existing authenticated account route. It does not score original prose or claim assessed proficiency. “Self-reviewed” records a student's own review, enabled only after a draft, revision and both explicit checks.

Work is saved explicitly in versioned localStorage per account, on the current device only. Students can download all current writing as text. Unsaved work stays in memory between lessons and between the page's guide/practice/writing modes, but is not synced to the server. A browser-close warning protects unsaved work. Corrupt storage is not silently overwritten; storage failures retain the current draft. A stale tab cannot replace another tab's saved version of the same lesson.

Existing `?view=studio`, `?writing=…`, `?version=…`, `?new=writing` and history pagination remain available. The old lab is explicitly available at `?view=lab`; existing writing and evaluations are not changed. This guide does not activate or change the optional legacy AI service.

## Scope

The owner's final instruction on 30 October narrowed this task to English structure/expression only. This change makes no planner, syllabus or dashboard edits. It builds on the existing free-learning branch from PR #135 and does not merge or deploy it.

## Checks

- `npm run test:expression-guide`: content consistency, bounded saved records, corrupt input and self-review requirements.
- `npm run typecheck` and targeted ESLint on the new guide and Expression page.
- `node tests/browser/expression-guide.mjs`: isolated guide UI with a test account context, real Chromium and browser storage. Requires `npm ci --prefix tests/browser --ignore-scripts` and Chromium (`CSSV_BROWSER_EXECUTABLE` overrides `/usr/bin/chromium`). It exercises lesson navigation, feedback, drafts, revisions, save/reload, self-review, account separation, stale-tab protection, unreadable/blocked storage, download, 320/390/768/1440px layouts, accessibility and absence of fetch/API requests. Temporary harness files are removed on completion. This is not a claim of a live native sign-in flow.

Local verification passed: three content/state tests, TypeScript, targeted lint, and the isolated Chromium scenario above. A Vite production build passed; it reports existing large-chunk and third-party annotation warnings. The browser check recorded zero fetch/API requests from the guide and no serious/critical axe accessibility findings. This has not been deployed.
