# MPT content and examination review — 3 October 2026

Reviewed repository base: `98a636b90330bab37219814cb37e107065e6b626`.
Editorial release: **8**, series `37e077d8e04f860f`.

## What changed

- Replaced **67** legacy Urdu translation questions whose distractors were unrelated to the translated sentence, sometimes nonsensical. Every replacement is an unused, grade-A question already in the reviewed Urdu bank. No new question was written to fill these slots.
- Applied **104** explicit wording clarifications across upcoming papers: stated category-existence premises, immediate-neighbour seating clues, family-count scope and family-relation assumptions; clarified five English questions' intended meaning/style; corrected or qualified four factual stems.
- The factual edits distinguish Composite Dialogue **resumption** in 2004 from its original framework; Iltutmish's three additional Qutb Minar storeys from later work; Northern Hemisphere solar orientation; and a factory-assigned MAC address from locally administered/randomized overrides.
- Original source text, keyed answer, mock allocation, reason and replacement-bank reference are recorded in `src/data/mpt/release/clarifications.json`. The resolver fails if an original question or its keyed answer changes without another review.
- Full wording and explanations now contribute to series identity and frozen-paper fingerprints. Previously a wording-only revision could retain the same identity and evade the editorial re-freeze mechanism.

## Verification

| Check | Result / scope |
|---|---|
| Complete release audit | 37 papers, 7,400 questions; official structure, options, key-to-bank consistency, explanations, difficulty and historical/repetition exclusions pass |
| Independent text solver | 56 categorical questions and 63 seating questions; exhaustive Venn models / seating permutations, independent of generator explanations |
| Upcoming solver results | No unresolved categorical/seating failures from Mock 18 onward |
| Negative regression checks | Removing an existence premise or a necessary seating clue exposes ambiguity; wording/explanation changes alter release identity |
| Source-to-export comparison | All 37 PHP paper exports exactly equal the audited resolved papers |
| Automated JS tests | `npm run test:mpt-release` (20 tests) and `npm run test:all` pass |
| Production build | `npm run build:hostinger` passes, including route/content/export gates |
| Database rules | PHP unit/flag, refreeze, three-daily and end-to-end MPT security tests pass locally on isolated MariaDB 10.11 |
| Wording-only update | Same question IDs, option order and keys survive; updated wording receives a different fingerprint; started and near-start papers retain their full frozen content |
| Examination flow | Server scoring/results, submissions, entry close, sweep/rank, history/admin controls, 50 concurrent registrations for a last slot, withdrawal/reapplication, roll-number guards and three daily slots pass |

## Protection of existing exams

No compiled question through Mock 17 was changed. On installation, the existing transactional re-freeze mechanism updates only future DRAFT/PUBLISHED mocks more than 15 minutes from opening, without attempts. It retains mock identity, registrations, sessions, roll numbers and schedule; backs up old questions and logs each replacement. Running, completed, cancelled, attempted and near-start papers are excluded. No completed result was rescored.

The independent solver records **12 historical/running wording warnings** in Mocks 11–17. These concern unstated category-existence or adjacency conventions; they are explicitly reported, not certified away. Any dispute about an already delivered question needs owner review of the actual frozen paper and the existing void/rescore controls. This review has no owner-authenticated production database export, so it does not claim to have independently compared every live frozen question with the repository.

## Sources and limits

Primary sources consulted for the factual checks/corrections:

- [Government of India, Ministry of External Affairs annual report 2008–2009](https://www.mea.gov.in/Uploads/PublicationDocs/170_Annual-Report-2008-2009.pdf): the eight-subject Composite Dialogue was resumed in 2004.
- [Delhi Tourism, Qutab Minar](https://www.delhitourism.gov.in/tourist_place/qutab_minar.html): Aibak's first storey, Iltutmish's three additions and later repairs.
- [IETF RFC 9724, section 2.1](https://www.rfc-editor.org/rfc/rfc9724.html#section-2.1): universally and locally administered MAC addresses.
- [US Department of Energy, Passive Solar Design](https://www1.eere.energy.gov/buildings/publications/pdfs/building_america/29236.pdf): south-facing glazing for the applicable solar design context.
- [Pakistan PID, 14 September 2026 ECC release](https://pid.gov.pk/site/press_detail/33920): the Ministry of IT & Telecom deploys/manages the Fuel Pass System; this existing bank answer was corroborated.
- [UN SDG Report 2026 key messages](https://unstats.un.org/sdgs/files/report/2026/SDGs_Report_Key_Messages_2026.pdf): 36% of the 139 targets with trend data are on track or making moderate progress; this existing bank answer was corroborated.

The new seven papers contain 921 authored practice items, 400 generated-and-verified items, 42 bank-reviewed items and 37 current-affairs items. **None is labelled past-paper-reviewed.** Source labels and a bank `verified` flag are not independent proof that every fact was rechecked here, nor proof that a question appeared in an official FPSC paper. The source bank has only 73 past-paper-reviewed questions, insufficient for 1,400 distinct past-paper-only items. This is a structural audit, exhaustive verification of the supported logic/seating forms, and targeted factual/editorial review; it is not a claim of independent factual authentication of all 7,400 questions.
