# Further primary-source review

Prepared 15 October 2026 on the existing development branch. This is a dated snapshot; [the 16 October review](BOOK_SOURCE_REVIEW_2026-10-16.md) records the later 100-identity/29-passage totals. These are additional, bounded repairs after the first editorial completion record. Production and Google account status have not been changed.

## Four additional Journal clarifications

The real Journal renderer now shows six separate dated clarifications in total. The four new ones below precede the relevant preserved transcript; the original six reading bodies, 11 images and historical publication dates remain intact.

| Existing article | Inspected evidence | Implemented clarification and limits |
| --- | --- | --- |
| Pacific climate article | Safdar et al. (2019), DOI `10.1155/2019/8281201`, abstract/methods; publisher-deposited Crossref abstract | The matching warming figure concerns 15 northern monsoon-belt stations and the 2010–2017 window. It does not measure subsequent years. No new annual rate is inferred from the paper's table units. |
| Same article, agricultural claim | FAO–WMO, *Extreme heat and agriculture* (2026), Box 10, printed page 43 / PDF page 55; source list, PDF page 106 | The report does support the regional fruit-productivity figure. The note identifies its earlier case-study context rather than treating it as a new nationwide measurement or uniform forecast. The correct report was followed from FAO's actual DOI link; an unrelated candidate DOI was discarded. |
| Harassers’ Calculus, percentages | World Bank indicator `SL.TLF.CACT.FE.ZS`; Pakistan DHS 2017–18, Table 16.16, printed page 324 | Distinguish female labour-force participation from women's share of the workforce. Identify the survey's age/marital-status population, reference years and the combined neither-sought-help/nor-told-anyone measure. The source table excludes AJK/GB. No current workplace-harassment prevalence is invented. |
| Same article, complaint trend | FOSPAH announcement presenting Annual Report 2025 | Identify the 2024–25 reporting window and separate harassment from property complaints. The announcement does not establish the archive's precise calendar-2024 comparison. Institutional registrations are not a population prevalence survey. The original period-specific source remains required. |
| Machines at War | NATO Secretary General's Annual Report 2025, printed page 35 / PDF page 36; US Senate Foreign Relations Committee letter of 11 March 2026 | Distinguish documented NATO system acquisition from event-specific US targeting evidence. The contemporary letter asks whether AI was used; it is not an investigative finding that AI selected the school. This is a statement about those sources' scope, not a claim that all later investigations were examined. |

The first two rows share one article-specific note. Existing wet-bulb and calendar notes remain, yielding six notes altogether. A supported regional claim was verified, rather than incorrectly removed because its citation had previously been missing. The remaining casualty, displacement, legal and attributed-quotation questions stay explicit in [Journal review](editorial/JOURNAL_REVIEW.md).

## Book bibliography and quotation scope

Thirteen further publisher records were directly inspected: twelve previously unresolved identities and the partially verified three-author Factfulness record. **71 book identities now have primary evidence; 29 remain unresolved.** The identities, titles and authors in the original 100-book library were not replaced. Foreword authors/editors are distinguished from the original authors.

The reader/static renderer now exposes existing verified bibliographic records as well as quotation sources, including books without a quotation label. Repeated URLs are not added twice. A publisher title/author record keeps its `identity_only` role and cannot satisfy the separate book-quotation evidence gate.

No quotation was upgraded in this follow-up. The current totals remain **27 original-text/excerpt matches, one explicitly identified Graham translation, 61 unverified quotation entries and 11 books without a quotation label**. Fourteen additional public-page/excerpt responses were searched for the existing initial quotation phrases without a match in the available extraction. This limited search does not establish that a phrase is absent from the complete book or that it is fabricated. A university text with similar Friedman wording was not treated as a named-book edition merely on that similarity.

The 13 newly completed identity records are Capitalism and Freedom; Amusing Ourselves to Death; Justice; The Origins of Totalitarianism; The Grand Chessboard; The Twenty Years’ Crisis; The Anarchical Society; Poor Economics; The Rise and Fall of the Great Powers; The Clash of Civilizations and the Remaking of World Order; The End of History and the Last Man; The Plague; and Factfulness. [Captured publisher evidence](evidence/book-bibliography-followup.json) records the exact URLs, inspected titles, hashes, status and verification limits.

## Source availability and provenance

[Source probes](evidence/editorial-next-source-probes.json) distinguish an inspected document from a successful HTTP response. The FAO, NATO, DHS mirror, FOSPAH and World Bank definition were directly available. The Wiley paper was readable through web extraction but direct publisher requests returned 403. Its public, publisher-deposited Crossref abstract independently confirms the period and station count. Both that limitation and the actual verification endpoint are recorded; its response fingerprint is not represented as a fresh full-paper fingerprint.

A Journal source may identify a human citation URL and a separate official `verificationUrl`. The recorded status/hash then belongs to that explicit endpoint, with a mandatory `verificationScope`. The generator refuses unsafe endpoints or missing scope. This permits truthful metadata-based checks while preserving the distinction between an abstract/definition and an entire document.

The MOFA page remained unavailable in direct requests, the old FOSPAH newsletter URL returned 404, and the Harvard book endpoint returned an empty 202 response. Those responses were not accepted as verified content. No primary-source permission, external publication agreement, Google decision or whole-library fact-check is inferred.

## Validation and preservation

New regression coverage checks the climate window, regional context, survey denominator, complaint period, evidence about the strike, explicit API-verification scope, refusal of unsafe/unexplained endpoints and bibliography/quotation separation. Chromium verifies that the added clarifications and primary links are actually available in the Journal reader. The normal build continues to use the original components and existing route/index/ad policies.

Final verification passed: 253 tests, TypeScript, full lint/source audits, complete strict Hostinger build, Hostinger audit and 18 public Chromium routes plus the ad-state fixture. Evidence is in [verification](VERIFICATION.md). The owner release hold remains in force. Remaining permissions, inaccessible editions and Google account access are separate dependencies.
