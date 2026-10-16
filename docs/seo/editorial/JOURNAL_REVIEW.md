# VISTA Journal accessibility and provenance review

Reviewed 15 October 2026. This is a source-image and public-endpoint review, not an AdSense decision or verification that Google indexed an article. The owner's production release hold remains in force; these changes are prepared on the development branch.

## Completed improvements

The existing six archive pieces have **accessible text editions transcribed from all 11 existing repository images**. The original image files remain unchanged. The source-of-truth files are `public/opinions/transcripts/index.json` and the six referenced JSON records. Each record contains the full reading body, original-date evidence, original image paths and SHA-256 fingerprints, transcription method and explicit limits on external publication/rights verification. The text was produced by OCR followed by visual comparison against every original page. Multi-column sentence order was restored manually; line wrapping and repeated running headers/footers were removed. Repeated decorative pullquotes are omitted where documented, and the Pacific article's statistics panel is represented as a list. No new educational article was invented or paraphrased from a title.

`node scripts/editorial/build-journal-transcripts.mjs` produces the deterministic `src/data/journalTranscripts.generated.json` used synchronously by the existing `/journal` React component and its normal static render. `--check` detects stale generated text, source-image changes, archived-body fingerprint changes, missing bodies/evidence, unsafe paths, duplicate slugs/images, page-order errors and unsupported or undated clarification notes. This is the existing React/static architecture, with no new public route family and no newly published CMS draft.

Native HTML `details` elements keep all six text bodies in the page response and accessible to ordinary readers, including without JavaScript. The existing image reader remains available and links back to the corresponding text edition. Original-image links let readers compare the transcript with its source. The application does not fetch private content or manufacture a text article from the empty CMS endpoint. Titles, bylines, printed historical dates and original claims are preserved; transcription dates are not shown as article publication dates.

The submission invitation no longer promises an unverified twice-weekly publication cadence. Editorial review and the existing submission channel remain available; no scheduling settings or content publication state were changed.

## Archive metadata and evidence

All dates below come from the printed first page, rather than deployment time. They are evidence of what the supplied image says, not independent confirmation of an external publisher's publication event.

| Existing slug | Source-image title | Printed byline | Printed date | Repair |
| --- | --- | --- | --- | --- |
| `opinion-ali-hassan` | When the Pacific Breathes Fire, Pakistan Burns | Ali Hassan Sargana | Tuesday, April 28, 2026 | Replace imprecise April 2026 with 28 April 2026; accessible three-page text. |
| `opinion-eid-eve-chaman-phatak` | When Eid Turns to Ash | Ali Hassan Sargana | Monday, May 25, 2026 | Replace year-only metadata with 25 May 2026; retain existing descriptive archive subtitle; accessible two-page text. |
| `opinion-machines-at-war` | Machines at War: The AI Question Nobody in Islamabad Is Asking | Ali Hassan Sargana | Published April 24, 2026 03:00pm PKT | Replace year-only metadata with 24 April 2026; remove unsupported Dawn outlet assertion; accessible three-page text. |
| `opinion-power-without-peace` | Power Without Peace | Ali Hassan Sargana | Opinion / April 20, 2026 | Existing date preserved; accessible two-column reading order. |
| `opinion-the-next-48-hours` | THE NEXT 48 HOURS - Between blockade and bargain | Ali Hassan Sargana | OPINION - April 21, 2026 | Existing date preserved; accessible three-column reading order and original subtitle. |
| `opinion-harassers-calculus` | Why harassers dare | Ali Hassan Sargana | Opinion / June 12, 2026 | Replace year-only metadata with 12 June 2026; retain existing descriptive archive subtitle; accessible three-column text. |

The Machines images say “OPINION” and carry the named byline; they do not show a Dawn masthead or an original publication URL. The previous source label `Dawn - Opinion` therefore overstated verified provenance. It is now the neutral `Opinion`. This review does **not** assert that the author was never published by Dawn. Direct public requests to Dawn's search pages for the author's full name and “Machines at War” returned HTTP 200 on 15 October, but only the generic JavaScript search shell in raw HTML. Those responses do not establish either publication or non-publication. No publisher URL has been guessed and no external publisher's full article has been newly copied.

Public requests checked:

- `https://www.dawn.com/search?text=Ali%20Hassan%20Sargana`
- `https://www.dawn.com/search?text=Machines%20at%20War`
- `https://www.css-vista.com/api/journal.php` — HTTP 200, `{"ok":true,"articles":[]}` on 15 October 2026. This observes zero rows from that public response, rather than a claim about unpublished/private database articles.

## Dated editorial clarifications completed

Two specific issues are now addressed with clearly separated, dated editorial notes before the original transcript body, rather than relying on the general archive notice. The six reading bodies and all 11 images remain unchanged by this follow-up. Each source record carries `transcriptBodySha256`; the generator validates it, and tests pin the pre-clarification Pacific and Eid body fingerprints.

**Pacific ambient/wet-bulb inference.** On 15 October 2026, the NOAA National Weather Service training page [Dry Bulb, Wet Bulb, and Dew Point Temperatures](https://www.weather.gov/source/zhu/ZHU_Training_Page/definitions/dry_wet_bulb_definition/dry_wet_bulb.html) returned HTTP 200 and explicitly distinguished ambient dry-bulb temperature from wet-bulb temperature. It explains that the difference between those readings depends on air humidity. Response SHA-256: `d5f41c7a0db48d96e3e0f15462b36f974e49395ad7485201b20baa48c131bf7a`. The [NWS Wet-Bulb Temperature glossary entry](https://forecast.weather.gov/glossary.php?word=wet-bulb%20temperature) also returned HTTP 200 and defines wet-bulb temperature through evaporative cooling.

The visible clarification corrects the statistics panel's inference: a reported 51°C ambient-air temperature alone does not establish a wet-bulb reading or show that a human survival threshold was crossed. It links directly to the NOAA/NWS training page and explicitly leaves the reported Jacobabad reading and other historical figures unverified. It does not introduce a universal survival temperature or imply that a particular ambient reading is safe. The original article text and statistics panel remain as written, with the correction distinguished from them.

**Eid calendar inconsistency.** The visible clarification records the image's Monday, 25 May 2026 date, the body's May 24 reference and “before Saturday” wording, and the independently reproducible Gregorian calendar result that 24 May 2026 was Sunday. `new Date(Date.UTC(2026, 4, 24)).getUTCDay()` returns `0`; the following day returns `1`. This demonstrates the internal day/date discrepancy without guessing the intended attack date or casualty facts. Those still require the author's original reporting. The note is dated 15 October 2026 and does not replace the article's printed publication date.

The `editorialNotes` source metadata records issue date, note text, precise primary-source URL, verification date/status and response hash for the NOAA source; the calendar-only note records its reproducible calculation. A scientific-paper URL attempted during the narrow check returned a browser challenge, so no claim from that inaccessible page was used.

## Factual review still required

A faithful transcript does not certify that the historical article's figures, allegations, quotations or legal interpretation are correct. Article bodies were preserved rather than silently rewriting the author's work. These are concrete editorial candidates, not a finding that every article is false:

| Priority | Piece / passage | Required source or correction decision |
| --- | --- | --- |
| P1 | Pacific statistics panel: “51°C ... crossed wet-bulb survival threshold” | The unsupported inference is corrected by the visible NOAA-sourced note above. The original Jacobabad reading and cited study still need their own primary records; the clarification does not authenticate either. |
| P1 | Pacific: 0.18°C/year since 2010; 2025 flood deaths, displacement and GDP loss; Punjab fruit productivity; Sindh heat deaths | Obtain the specific PMD, NDMA, WMO/FAO and original-study reports with dates, definitions, areas and table/page citations. Several named organisations alone do not identify the quoted statistic's actual source. |
| P1 | Eid: May 24 attack called “before Saturday”, in an image dated Monday 25 May 2026 | The visible dated clarification now records the proven calendar discrepancy. Determining the intended event date/day and casualty account still requires the author's original reporting sources. The original image and reading body remain intact. |
| P1 | Eid: attribution of intelligence operations, recruitment, casualties and missing-person commission history | Obtain original reporting/official records. Distinguish attributed reporting and political analysis from established factual findings. |
| P1 | Machines: school casualties, AI target selection, military system deployment and attributed Cooper/Kahn quotations | Record the exact original Washington Post/NPR/CENTCOM/NATO sources, dates and faithful quotation context. The image's references name outlets but provide no article URLs. Claims of exact AI target selection require more than confirmation that a targeting system exists. |
| P1 | Harassers: 93pc / 375pc / 17pc / 56pc statistics and legal scope | Obtain original surveys, denominators, time ranges, FOSPAH reporting and the relevant statutory text. Workforce participation and share of the workforce are different measures. Cite the actual measure rather than silently substituting one. |
| P2 | Peace / Next 48 Hours: evolving negotiations, blockade/ceasefire events and predictions | Link the original dated reporting; retain April dates and clearly preserve opinion/forecast context. Do not present those forecasts as today's news. |

No “fact checked” badge, professional credential, institutional affiliation or publication endorsement was added. Existing biographical sentences printed on the Machines pages were not promoted into independently verified author credentials.

## Rights and editorial sign-off

The images and byline are already owner-provided repository material; the task authorises improving accessibility while preserving the archive. That supports transcribing the supplied material, not a conclusion about third-party reproduction licences, photographs, external publication agreements or the authenticity of every quotation. Each machine-readable record leaves external publisher/URL null and rights status explicitly unresolved. The owner/author should provide original editable files, any original publication links and applicable image/photograph permissions or publication agreements for the private rights register. No new full external article, cover or photograph was sourced or republished.

An original external publication link can be added after it is verified; the generator permits a real HTTPS original URL without inventing an outlet. Editorial corrections should be signed and dated separately from the original image archive. These items remain part of AdSense readiness and do not disappear because the text now renders.

## Verification and changed files

Passed on 15 October 2026:

- Transcript generator and deterministic `--check`: six bodies, 11 unchanged source image fingerprints.
- `node --test tests/journalTranscripts.test.ts`: five tests pass; existing archive/text/date/byline/image parity, restored multi-column transitions, absence of unsupported publisher attribution, archived-body preservation, dated primary-source correction provenance and reproducible calendar clarification.
- Targeted ESLint on `src/pages/VistaJournal.tsx`, `src/data/books.ts`, the generator and transcript tests: passed.
- `npm run typecheck`: passed after the component and metadata changes.

The parent implementation pass records the complete production build, final static HTML and browser verification; this document does not claim those passed before they run.

| File | Purpose |
| --- | --- |
| `src/data/books.ts` | Printed date precision and neutral outlet label; image archive and authored identities retained. |
| `src/pages/VistaJournal.tsx` | Synchronous accessible archive, separate dated editorial clarifications and primary-source link, original-image comparison links, correct subordinate headings and image-reader return link; remove unverified publication cadence promise. |
| `public/opinions/transcripts/index.json` and six referenced JSON files | Full source-supported bodies, unchanged-body fingerprints, separate dated clarification metadata and machine-readable provenance/rights limits. |
| `src/data/journalTranscripts.generated.json` | Deterministic synchronous bundle consumed by the same normal React/static renderer. |
| `scripts/editorial/build-journal-transcripts.mjs` | Source hash/inventory validation, deterministic generation and check mode. |
| `tests/journalTranscripts.test.ts` | Preservation, multi-column reading order, primary-source/dated-note separation and calendar regressions. |
| `docs/seo/editorial/JOURNAL_REVIEW.md` | Evidence, changes, remaining source/rights requirements and verification limits. |

## Further source review — 15 October 2026

Four additional notes now bring the total to six. They identify the climate study window, verify and contextualise the FAO–WMO Punjab case, distinguish survey/participation/complaint measures and delimit the contemporary AI-targeting evidence. See [follow-up](../EDITORIAL_FOLLOWUP.md) for exact sources, verified locators and remaining limitations. The original six reading bodies, images and dates are unchanged. A citation's explicit verification endpoint/scope identifies metadata-only evidence truthfully. The earlier five-test record above is historical; final expanded checks are recorded in the parent verification report.

The Punjab fruit claim is no longer an untraced reference: Box 10 of the actual 2026 FAO–WMO report has been inspected. This supports that specific regional case, not every number in the Pacific article. PDHS's help-seeking denominator is also traced to its original table. FOSPAH's available announcement does not resolve the precise calendar-2024 comparison, and procurement/investigation questions do not settle event-specific targeting claims. Remaining entries in the earlier table should be read with these bounded resolutions.
