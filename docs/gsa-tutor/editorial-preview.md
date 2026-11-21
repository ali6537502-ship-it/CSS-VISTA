# Review the eight-stage teaching drafts

These are draft teaching units, not an approved student release. Use the existing studio locally:

```sh
npm run dev:gsa-editorial
```

Open `http://127.0.0.1:5175/gsa-tutor/studio.html?editorial=1`, then **Review draft lessons**. Inspect all eight stages, each option's explanation, the question-specific model rubric, revision tasks and source records. The original manuscript remains available from **Inspect original manuscript**.

The explicit server flag, loopback host/peer checks and development-only middleware control the editorial endpoint. The normal dev server returns 404 for that endpoint. Production builds contain the renderer, but do not contain the private unit JSON or an editorial endpoint. `npm run audit:gsa-publication` verifies the built artifact boundary. This is a local author/reviewer workflow, not a new course page or student progress system.

Preview activity stays in memory. The studio suppresses saved-progress writes and sync notifications throughout this editorial mode, including standard-course actions. It does not overwrite accounts, drafts, question history, revision dates or completion records. Use the normal studio for student persistence testing.

Draft review is not sign-off. Every unit retains its pending review status and null independent-reviewer/approval fields. Do not infer scientific approval from a rendered lesson, a passing format audit or a model's mark allocation. Record real scientific corrections and independent review evidence before any publication decision. The existing educational release hold remains active.

Current authoring coverage and the exact remaining lesson IDs are in `teaching-unit-progress.json`. Reviewers should check objective completeness and source support; do not treat the presence of eight stage headings as evidence that a lesson is correct or sufficient.
