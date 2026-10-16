# Book sources and review safeguards — 16 October 2026

This continuation resolves the 29 outstanding title/author records without changing the original 100-book library, publication state or access. All 100 identities now have inspected primary bibliographic evidence. This identifies books and authors; it does not certify every analysis or establish permission to reproduce covers, translations or other material.

## Evidence and limits

[The dated evidence](evidence/book-source-review-2026-10-16.json) records the 29 identities, actual source URLs, inspection method, direct-response fingerprints where available, unsuccessful attempts and two quotation decisions. Twenty-six identity records were read directly as HTML, one as a publisher PDF, and two through public web extraction of publisher-provided records. The source ledger remains [the authoritative record](editorial/book-quotation-review.json).

The records distinguish original authors from narrators, foreword contributors and translators. In particular, Nudge names both Thaler and Sunstein, The Second Sex distinguishes Beauvoir from its translators, and the Hurst catalogue identifies Maleeha Lodhi as editor. Short titles and later revised editions are accepted as identity evidence without assuming that every edition has identical text.

Harvard's book endpoints returned empty HTTP 202 responses, so they were not accepted. Harvard Kennedy School's memorial identifies Schelling's book; Tufts' faculty publication record identifies Jalal's book. The public JSTOR record identifies Piketty, Goldhammer and Harvard University Press, but a direct Python request returned a client-challenge page. That challenge's HTTP 200 and hash are not book-content proof. Hurst's catalogue was readable through web extraction while direct requests returned 403; no fresh successful direct-PDF fingerprint is claimed. An unrelated Hurst book and an unsuccessful Crossref candidate were discarded.

## Two additional book-text matches

| Existing book | Inspected passage | Reader behavior |
| --- | --- | --- |
| The Better Angels of Our Nature | Penguin Random House's actual Read Sample text, ISBN 9780143122012, Introduction opening paragraph. The text is supplied in the page's `excerpt_text_list`, rather than ordinary HTML prose. | The current line is identified as an excerpt. Its ellipsis omits a qualifier, and the source continues by saying the decline is not guaranteed to continue. The citation supplies the actual locator; no uninterrupted-progress claim is added. |
| Brave New World | Project Gutenberg Canada's transcription identifying its base edition as Chatto & Windus, London, 1932; Chapter III, the Director citing the proverb. | The existing words are labeled an excerpt because they omit the opening conjunction and alter initial/terminal punctuation. The original commentary is preserved. Canadian public-domain availability does not establish unrestricted rights in other jurisdictions. No full text is bundled with CSS VISTA. |

The current totals are **9 exact matches, 20 excerpt matches, one identified Graham translation, 59 unverified quotation entries and 11 books without a quotation label**. The 29 matches exclude the separate translation correction. Bibliographic records cannot promote an unverified quotation, and absence from a limited sample does not prove that a quotation is false. Original source bodies remain byte-identical.

## Regression prevention

The normal book generator now checks the ledger's inventory, quotation-status counts, verified-passage count and identity count against individual records. A previously stale aggregate identity count is corrected. An empty evidence list, an explicitly unsuccessful response or an unsafe citation cannot support a verified identity. These checks validate the recorded decisions; they do not automatically authenticate external page contents.

Tests cover stale aggregate claims, unsupported identities, the two excerpt locators and preservation of the original analysis. The browser gate adds both excerpt readers, Piketty's bibliography with an unverified quotation, and Lodhi's edited collection without an invented quotation. Each checks the actual static response and React reader on mobile. Final results are recorded in [verification](VERIFICATION.md).

The totals above describe this earlier pass. The owner subsequently authorized the scoped SEO release, while product holds remain. The [final continuation](AUTONOMOUS_RELEASE_2026-10-16.md) adds OUP's actual Sen Introduction (printed page 3) and Routledge's Popper first-edition preface (opening paragraph), both inspected in publisher preview PDFs. [Dated source evidence](evidence/remaining-book-source-review-2026-10-16.json) records the editions, physical PDF pages, fingerprints, ellipses and capitalization qualifications. Latest totals are **9 exact, 22 excerpt, one translation, 57 unverified and 11 without a quotation label**. Original bodies remain unchanged. Current Google account screens, remaining editions/passages, unresolved claim reviews and private rights records remain separate dependencies; public bibliographic evidence alone does not make another AdSense review advisable.
