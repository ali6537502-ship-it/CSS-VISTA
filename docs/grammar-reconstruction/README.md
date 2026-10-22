# Grammar reconstruction working dossier

This directory records the reconstruction of the existing CSS VISTA grammar course. The original course data, legacy browser namespaces and native account endpoint remain intact.

**Current status: implementation and verification in progress; not approved for publication.** The live site has not been replaced by this working branch.

- The three `audit-days-*.json` files contain the original 30-day academic audit, including actual locations, severity, evidence and proposed repairs. They distinguish erroneous keys from missing or inadequate teaching.
- `curriculum-map.json` is the approved 30-day organising sequence and explicit permanent extensions. `coverage-matrix.json` maps authored topics, entries and actual practice IDs. A module-level mapping does not claim a separately calibrated test for each exception.
- `content-manifest.json` records source hashes and actual counts; `question-inventory.json` lists every distinct task, operation, concept, depth and marking method.
- `source-register.json` identifies consulted authorities. `evidence/source-access.json` records current access checks and content digests; an HTTP success is not proof of academic relevance.
- Original manuscripts live in `content/grammar/v5/`; generated public resources live in `public/grammar/v5/`. Teaching is separated from React rendering. The build rejects missing days, duplicate IDs/prompts, absent explanations, unmapped concepts and malformed keys.
- `evidence/` retains current review and testing material. Temporary files from the earlier environment were lost at restart; outstanding findings are being reviewed again and retained here.

No CEFR certification, guaranteed examination result or 30-day expertise claim is made. Open writing is compared with models and explicit rubrics; the site does not automatically grade its grammatical accuracy. First responses, repeated-item retention, study completion and written self-review remain separate.

Publication requires the full release review and native/browser test evidence. A structurally valid manuscript alone does not satisfy that gate.
