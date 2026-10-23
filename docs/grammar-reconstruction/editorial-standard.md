# Replacement grammar research dossier contract

Work from /tmp/grammar-curriculum-map.json. Root has inspected platform, baseline browser tested 320/390/768/1440, preserved every original source checksum. Complete original audits before authoring. Do not edit project source; candidate original research/teaching material goes only to /tmp. Root reviews and integrates it. No copied textbook material or fabricated citations. All statements must distinguish grammar, context, style, region and register. Sources must be actually consulted; root's successful public-source bodies are /tmp/grammar-sources.json (reject C-TENSE index and Purdue security rejection) and other verified /tmp/grammar-audit-sources. Fetch missing authoritative sources where appropriate. Explicitly record unresolved claims so root can treat them as release blockers.

Output /tmp/grammar-v5-days-START-END.json, a JSON array of Day objects. Prefer a Python authoring script writing JSON to avoid escaping errors. Each day follows this exact schema (all fields required unless labelled optional):
{
 "day": 1, "id":"gv5-day-01", "title":"exact approved title",
 "orientation":"why it matters + real application in 100–180 words; plain English, no motivational padding",
 "outcomes":["at least 4 specific observable outcomes"],
 "prerequisiteDays":[1,2],
 "modules":[Module],
 "questions":[ObjectiveOrResponse],
 "corrections":[Response],
 "transformations":[Response],
 "writing":Response,
 "recall":[Response],
 "checklist":["4–6 observable self-checks"],
 "sources":[Source],
 "editorialNotes":["only genuine limitations or tricky decisions, empty if none"]
}
Module schema:
{
 "id":"gv5-d01-m01", "title":"precise topic grouping", "taxonomy":["A","H"],
 "coverageIds":["gv5-d01-c01","gv5-d01-c02"],
 "definition":"qualified, reliable definition",
 "foundation":["substantial plain-language paragraphs"],
 "intermediate":["substantial paragraphs explaining form/function/meaning and comparisons"],
 "advanced":["substantial paragraphs with exceptions and constraints"],
 "expert":["substantial paragraphs with syntactic precision, terminology differences and disputed/contextual usage"],
 "patterns":[{"form":"accurate structural pattern","meaning":"how to interpret it"}],
 "examples":[{"sentence":"original natural sentence","analysis":"explicit grammatical reasoning"}],
 "contrasts":[{"a":"form A","b":"form B","note":"error comparison OR legitimate different meanings; label which"}],
 "exceptions":["significant contextual exception and worked illustration"],
 "mistakes":[{"problem":"faulty example","repair":"valid repair","reason":"why; do not overcorrect valid alternatives"}],
 "glossary":[{"term":"technical term","definition":"brief accurate definition","example":"original example"}],
 "sourceIds":["source-id"]
}
Author 3–5 coherent modules per normal day, cover ALL mapped coverageIds explicitly. Module reference entries are also permanent encyclopedia material: each must have at least 300 substantive words across its four layers and definitions, 3 worked examples of increasing complexity, a meaningful contrast, a significant exception/constraint, and 2 genuine common mistakes. Do not make tiny fragments for each coverageId; related subtopics can share a rich module with explicit internal explanation. Target ~1,300–2,000 instructional words/day excluding assessments, add where necessary. Days29/30 use 2–3 substantial orientation/analysis modules supporting assessments and revision; no artificial new grammar topics.

Objective schema:
{"id":"gv5-d01-q01","type":"objective","kind":"choice"|"gap"|"spot","prompt":"context enough for ONE correct option","options":["4 distinct options, including No error in genuine error-detection items"],"answer":0,"why":"defensible explanation including why misleading alternatives fail","conceptId":"gv5-d01-m01","difficulty":"Foundation"|"Intermediate"|"Advanced"|"Expert Extension","ability":"Recognition"|"Understanding"|"Application","sourceIds":["..."]}

Response schema:
{"id":"gv5-d01-r01","type":"response","kind":"gap"|"multiple-gap"|"correction"|"transformation"|"combining"|"splitting"|"ordering"|"classification"|"function"|"comparison"|"paragraph-edit"|"writing"|"analysis","prompt":"complete, original, answerable activity","model":"specific worked model solution","rubric":["2–4 concrete features to check; permit other defensible answers"],"alternatives":["actual alternate solution or an explicit principle admitting alternatives"],"conceptId":"module id","difficulty":"Foundation"|"Intermediate"|"Advanced"|"Expert Extension","ability":"Recognition"|"Understanding"|"Application"|"Production and revision","sourceIds":["..."]}
Response tasks are honestly self-reviewed, NEVER exact-string auto-marked. No vague 'use correct grammar' rubrics. Every question tests the teaching; no unsupported stock prohibitions or invented examiner preferences.

For each day: approximately 28 questions (8–12 objective + 16–20 purposeful short response; vary all required types across course), 8 distinct sentence corrections (some correctly formed suspicious examples explicitly permit 'no change'), at least 2 transformations, 1 applied original writing task, 3 cumulative recall tasks linked to earlier concepts (Day1 uses diagnostic recall). These inventories are separately counted; no counting variants or displayed model examples as additional questions. Avoid filler and duplicates. Days29/30: 24–30 objective +12–18 short response +8–12 corrections +4 transformations +2 substantial writing/paragraph prompts (writing can be a response with two explicitly numbered prompts and matching model/rubric). Balance difficulties, retain individual concepts in cumulative assessment rather than tagging all questions 'mixed'.

Sources: {"id":"cambridge-...","title":"actual title","url":"verified exact URL","consulted":"2026-10-21","note":"what claim was checked, any limits"}. Only verified successful content (not generic index redirects/security block pages) is 'consulted'. Books not directly accessible may be recommended but cannot count as verification. Use explicit language if terminology differs between traditional school grammar and modern grammars. No CEFR/expert guarantee. British English editorial default while established US/other standard usage is accepted.

Write a parallel /tmp/grammar-v5-review-START-END.json with counts, actual source access, claims needing review, and your per-objective uniqueness/answer audit. Do not label unresolved material reviewed. Return artifacts and exact counts. This is preparation material for root review, not permission to publish.
