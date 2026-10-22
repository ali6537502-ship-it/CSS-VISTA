# Grammar reconstruction working dossier

This directory records the reconstruction of the existing CSS VISTA grammar course. The original course data, legacy browser namespaces and native account endpoint remain intact.

**Verification:** all 30 days, the reference system, assessments and native learning flows have retained verification evidence. Publication is gated by the final commit’s checks. The observed deployed version is recorded in the [release evidence](https://github.com/ali6537502-ship-it/CSS-VISTA/releases/tag/grammar-v5-2026-10).

- The three `audit-days-*.json` files contain the original 30-day academic audit, including actual locations, severity, evidence and proposed repairs. They distinguish erroneous keys from missing or inadequate teaching.
- `curriculum-map.json` is the approved 30-day organising sequence and explicit permanent extensions. `coverage-matrix.json` maps authored topics, entries and actual practice IDs. A module-level mapping does not claim a separately calibrated test for each exception.
- `content-manifest.json` records source hashes and actual counts; `question-inventory.json` lists every distinct task, operation, concept, depth and marking method.
- `source-register.json` identifies consulted authorities. `evidence/source-access.json` records current access checks and content digests; an HTTP success is not proof of academic relevance.
- Original manuscripts live in `content/grammar/v5/`; generated public resources live in `public/grammar/v5/`. Teaching is separated from React rendering. The build rejects missing days, duplicate IDs/prompts, absent explanations, unmapped concepts and malformed keys.
- `evidence/` retains current review and testing material. Temporary files from the earlier environment were lost at restart; outstanding findings are being reviewed again and retained here.

No CEFR certification, guaranteed examination result or 30-day expertise claim is made. Open writing is compared with models and explicit rubrics; the site does not automatically grade its grammatical accuracy. First responses, repeated-item retention, study completion and written self-review remain separate.

The Hostinger build requires a matching release review as well as valid generated content. A structurally valid manuscript alone does not satisfy that gate.

The complete narrative and technical records are in `AUDIT_REPORT.md`, `technical-audit.json`, `QA_REPORT.md` and `IMPLEMENTATION.md`. `verified-key-register.json` retains all selected answer texts and explanation digests. The topic matrix records relationships; the inventory records actual activities and their marking limits.

## Deliverables

1. [Original audit report](AUDIT_REPORT.md), [academic issue matrix](audit-matrix.json) and [technical audit](technical-audit.json).
2. [Final curriculum and assessment coverage](coverage-matrix.json) and [organising map](curriculum-map.json).
3. [Reconstructed 30-day course](https://www.css-vista.com/grammar-course).
4. [Permanent reference library](https://www.css-vista.com/grammar-course?view=reference).
5. [Question inventory](question-inventory.json), [verified keys](verified-key-register.json) and [source register](source-register.json).
6. [Practice and revision](https://www.css-vista.com/grammar-course?view=lab) and [personal learning profile](https://www.css-vista.com/grammar-course?view=profile).
7. [Quality assurance report](QA_REPORT.md), [release sign-off](release-review.json) and [native verification evidence](evidence/final-native/).
8. [Implementation and preservation summary](IMPLEMENTATION.md).
