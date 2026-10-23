# Reasoning content quality — private candidate increment

This follows the integrated draft #93 under the owner's production hold. CA/PA conversion stays deferred. No production release, provider/payment activation or topic publication is part of this work.

## Educational findings and resulting behaviour

The 51-lesson catalogue already covers 21 sentence, 15 argumentation and 15 analysis lessons. Sentence tasks are distinct. However, all 15 argumentation lessons reused the evening-library task, and all 15 analysis lessons reused the administrative-delay task. Several recognition distractors were obviously unrelated or absurd, letting students choose a polished-looking answer without understanding the relevant distinction. Feedback explained the defensible answer but did not address the student's particular misconception.

The reasoning edition `skills-2026-10-v2` retains every lesson identity, level, rule, worked example, correct answer and answer index. All 21 sentence lessons remain identical. The 30 reasoning lessons now have individually authored tasks matched to their concepts, across beginner, intermediate and advanced levels. The tasks distinguish claims, assumptions, evidence, mechanisms, alternatives, rebuttals, qualification and analytical judgements. They use hypothetical situations and ask for evidence rather than supplying invented findings.

All 90 distractor positions were reviewed; 88 are revised to represent relevant mistakes: a premise mistaken for a conclusion, a preference mistaken for evidence, chronology mistaken for causation, an observation that fails to distinguish rivals, a universal claim without access conditions, or a descriptive list mistaken for analysis. Three recognition prompts were narrowed to make the intended comparison unambiguous. Each of the four options has an authored explanation, aligned with the deterministic option shuffle.

The native fixed grader returns only the chosen option's explanation after an attempted check. An incorrect response displays that explanation alongside the established correct-answer explanation. A correct retry advances the guided stage without retaining the previous wrong-choice message. These are stored instructional explanations, not model responses. Reading, checking and reopening them consumes no AI allowance. No examination marks or mastery score is introduced.

## Review bounds

The review checks each item against its stated rule, including why the three alternatives do not answer the specific question. Correct answers were frozen from the prior committed catalogue and manually checked against those rules; a preserved answer string alone is not proof of academic accuracy. All examples and practice prompts remain original hypothetical instruction, not authentic past questions, contemporary findings or verified subject content. This is an internal content review, not an external mentor endorsement.

No new factual statistics, quotations, examination rules, legal provisions or citations are introduced. Existing source identity and attribution remain intact. The review does not certify real AI feedback, complete every Pro curriculum or complete the private topic library. Real-provider academic calibration remains outstanding.

## Student-record compatibility and privacy

A new workspace snapshots the new edition. Existing workspaces continue to use their own original source snapshot and hash. No runtime migration rewrites a stored question, answer, explanation, practice task, writing version, prior feedback or allowance. Optional chosen-choice feedback is omitted for old sources that never supplied it.

`cssv_skills_public_source` strips the answer, answer explanation and all option explanations from the unanswered source. The owned saved-version endpoint returns attempted feedback only. Contextual tutoring and AI input continue to select bounded rule/stage/student text; the full choice-explanation bank is not appended to model context. Native ownership, CSRF, active-Pro new work, expired history and the release pause remain unchanged.

Two v1 test-source fixtures, captured before revising the catalogue, allow native and browser checks to verify legacy behaviour. They contain original educational examples, not student data, and are never packaged as public resources. The fixture that creates them is restricted to the exact isolated CI database.

## Validation

Pure tests check all 120 reasoning option/explanation alignments, 30 distinct tasks, preserved gold answers, hidden unanswered explanations and unchanged legacy hashing/feedback. The normal authoring checksum remains authoritative for the private content package.

`tests/skills/quality-security.mjs` exercises actual native v1/v2 workspaces, wrong/correct checks, immutable previous responses, exact replay, foreign-account denial, expiry/renewal and unchanged original source bytes/hashes. Existing skills and labelled TEST ONLY AI lifecycle suites remain separate.

`tests/browser/reasoning-quality.mjs` tests six lessons across both reasoning courses and all three levels. It checks visible concept-specific tasks, no explanations before attempting, the chosen misconception after a wrong answer, locked progression until a correct response, saved-version/device/refresh/expiry recovery, v1 compatibility and 320–1440 pixel layouts. The normal connected writing and release-pause journeys remain regression checks.

Final local and exact-head CI results are recorded in the draft PR and private validation report. No build or synthetic provider test is presented as a successful production or real-AI journey.

Local verification passed: TypeScript, full lint plus focused final lint, PHP syntax, pure grading/legacy checks, authoring checksum, native source-edition lifecycle, existing skills regression and labelled TEST ONLY AI lifecycle, strict Hostinger build, the six-lesson reasoning browser and complete connected-writing browser. Wrong/correct histories, source byte/hash preservation and zero AI usage were observed in isolated native accounts. The mobile feedback panel was visually inspected. Existing build warnings remain; generated unrelated Vistagram timestamp changes were restored. Exact final CI/release-hold results are recorded separately in the private manifest and draft PR.
