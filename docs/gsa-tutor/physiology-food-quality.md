# Physiology, infectious disease and food-science authoring batch

**Private development material; educational acceptance and release approval remain withheld.** This report supersedes the earlier 16-draft inventory for current authoring status. It does not supersede the release hold or establish scientific approval.

## Implemented content

Added 22 eight-stage teaching units using the existing stable lesson IDs, studio renderer, source register and private editorial endpoint:

| Chapter | Additional lessons | Principal mechanisms and distinctions |
|---|---|---|
| 12 Human physiology | 1, 2, 4, 5, 6 | Organization and feedback; digestive enzymes/bile/absorption; nephron filtration/reabsorption/secretion and ADH; neural/reflex/endocrine coordination; contraction, fertilization and defence |
| 13 Infectious diseases | 1–5 | Infection versus disease; transmission chains; poliovirus and diarrhoeal fluid loss; malaria versus dengue; hepatitis routes and B/D dependence; antibacterial targets and resistance selection |
| 21 Food composition | 1–4 | Energy accounting and nutrient quality; starch/cellulose and gelatinization; protein folding and lipid structure; enzymes and three distinct browning routes |
| 22 Nutrition | 1, 3, 4 | Vitamin function and classification limits; EAR/RDA/AI/UL interpretation; digestion versus cellular metabolism and the double burden |
| 24 Preservation | 1, 3–6 | Water activity versus moisture; validated heat/acidity/sealing controls; refrigeration/freezing/cold chains; fermentation/irradiation/pressure; packaging and combined barriers |

Each new unit includes specific objectives, prerequisite statements, defined terminology, source-linked conceptual blocks, labelled conceptual flows, applications, original examination-style tasks, two MCQs, a five-mark written model with five criteria, common mistakes and closed-book recall. The 44 new MCQs explain all four options. Distractors were revised to target related misconceptions. These questions are original practice, never attributed to an FPSC year. Written comparison remains explicitly rubric-based self-evaluation.

The current private corpus contains **38 draft units, 80 original draft MCQs and 38 draft written models; zero independently approved units**. Chapters 6, 12, 13, 14, 21, 22 and 24 now each have a draft for every original lesson. Two other targeted lessons address climate and telecommunications. Draft presence is not a finding of adequate instructional depth or balanced examination coverage. **103 of the 141 original lessons still lack a rebuilt unit.** The full lesson-by-lesson register is `teaching-unit-progress.json`.

## Source comparison and its limits

Sources inspected include OpenStax Anatomy and Physiology 2e, Biology 2e and Microbiology; Health Canada's DRI definitions; Government of Manitoba water-activity guidance; the National Center for Home Food Preservation at the University of Georgia; University of Nebraska–Lincoln Extension; American Society of Baking technical explanations; MedlinePlus; and WHO's malnutrition overview. Unit source records identify title, publisher, actual URL, retrieval date/hash and pending review. Each conceptual block lists the source IDs supporting it. The retrieval log is `sources/physiology-food-source-retrievals.json`.

HTTP status alone was not treated as successful scientific inspection. Short NCHFP FAQ paths returned a general index and were replaced with actual category/article URLs. A nominally successful NCBI response contained a browser check and was not cited. Direct WHO access was unavailable; the WHO overview was inspected through the web source reader, with that method and extracted-response hash recorded. Unavailable WHO/USDA/extension candidates are not represented as inspected substantive sources. Vitamin B12 storage is explicitly supported by MedlinePlus rather than perpetuating an absolute textbook simplification about all water-soluble vitamins.

Source comparison was performed by the authoring assistant. **No independent scientific, medical, pedagogical or diagram review occurred.** The sources are not endorsements of CSS VISTA. The food examples explain principles rather than supply an invented canning schedule, fermentation formulation or shelf-life guarantee. Medical explanations do not invent prevalence, diagnostic rules, vaccine schedules or treatment doses. The worked food-energy portion is explicitly hypothetical and uses stated approximate factors.

Visual stages currently use labelled conceptual flows and explanatory specifications. They are not new calibrated simulations, complete anatomical illustrations or independently validated interactive models. A reviewer must assess whether the existing renderer and diagrams meet each objective before publication.

## Technical preservation and delivery

The units remain outside `public/` and the production artifact. They are usable through the existing loopback-only editorial studio; interactions remain in memory. Normal student delivery continues to use the original manuscript until approved content and its publication adapter are ready. The new units therefore must not be described as deployed student lessons.

No original chapter text, original question key, account schema, progress key or student record was changed in this batch. The progress-register date now derives deterministically from recorded review-log dates rather than a stale literal. Browser-test output reports the actual unit count. Current main was integrated into the draft branch to preserve the newer PMS Vista, Mentor and current-affairs changes; this integration did not merge development into main or authorize deployment.

## Remaining release-blocking work

1. Rebuild the 103 remaining lessons where required and independently review all 38 existing drafts for objective completeness, scientific accuracy, terminology, applications and appropriate lesson size. The broad movement/reproduction/immunity overview especially needs sequencing and depth review.
2. Review all original 141 lessons, 250 MCQs and 31 model answers, plus the new 80 MCQs and 38 models. Validate distractor plausibility, ambiguity, rubric credit and balanced concept/difficulty coverage. No answer key was silently replaced.
3. Independently validate the 24-row syllabus mapping against the supplied document and current FPSC edition when available. The supplied PDF has already been inspected; its absence is not a blocker. Latest FPSC-hosted revision and archived-paper publisher provenance remain unconfirmed.
4. Provide approved diagrams and appropriate interactive models; implement the approved-content publication adapter before normal student delivery. Source checks and UI tests cannot approve scientific representations.
5. Complete demonstrated-concept assessment policy, automatic missed-work/performance adaptation, reviewed revision/readiness criteria and validated planner workload estimates. Existing explicit rebalancing and recall history remain; no reading/confidence state is renamed mastery.
6. Complete controlled authenticated cross-device/reset trials, sustained-history capacity testing, broader accessibility and real-device checks. Local browser fixtures do not establish real account synchronization across devices.
7. Conduct independent beginner learner trials and measure comprehension, correction, retention and examination readiness. No trial or independent learning outcome was fabricated.
8. Obtain independent educational/content approvals and explicit owner release authorization. Keep the draft PR and educational release hold in place.

See `physiology-food-validation.md` for software evidence and limitations. A successful build is not academic certification or final acceptance.
