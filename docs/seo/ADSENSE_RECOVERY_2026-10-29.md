# AdSense recovery — 29 October 2026

The owner supplied the current **Low-value content** decision in this conversation. The connected Gmail notification received 28 October (Pakistan time) identifies css-vista.com but does not name individual offending pages. No specific copyright infringement or factual error is established by that generic decision.

## Fresh evidence

- Public `deployment-fingerprint.json` matched main `dc3dc3d19407d1c1619aaf319de04e87c725b4fb` before this work. Recent repository changes are reaching production.
- Public robots.txt permits crawling, and the sitemap index returns XML successfully. These checks do not establish Google's indexing decisions.
- The daily-publication API returned nine accessible editions, dated 19–27 October. Its initial library HTML is a noindex, ad-free utility shell. A static snapshot of its records would risk resurfacing owner-withdrawn material; the existing database-controlled availability must remain authoritative. No private edition has been published or made indexable.
- GSC Wizard refuses all reads with `subscription_required`. No purchase was made. Current audience and Google-selected indexing data remain unknown.

## Corrected owner provenance

The owner explicitly confirmed that **Sir Ali Hassan Sargana wrote the book summaries and optional-subject notes**. This supersedes the earlier ambiguous provider statement for those two collections. The statement does not cover handwritten notes already attributed to Sadia Zahoor, third-party book authors, embedded illustrations, newspaper editions or reproduction licences. No production method, editorial review date or credentials have been invented.

The owner corrected an accidental answer and then selected **“No, or I'm unsure”** about permission to republish third-party book covers, images and PDFs. Treat those permissions as unverified. Do not treat the withdrawn intermediate answer as consent or evidence of a licence.

## Implemented scope

- Replace the 100 catalogue/reader publisher-cover displays with original typographic CSS Vista reading-guide cards. This does not reproduce publisher artwork or imitate a publisher cover.
- Use the existing CSS Vista logo for book-reader social previews. Block HTTP delivery of the unverified `/book-summaries/covers/` artwork with an early Apache 410 rule. Repository originals and source metadata remain preserved for review, and the actual summaries stay accessible.
- Distinguish **Book by** from **Summary by**, including the printable reader, generated initial HTML and Article structured data. Attribute optional notes at the library and topic levels from the owner's confirmed statement.
- Describe CSS Vista as an independent study resource in print branding, consistently with its existing disclaimer.

No original educational body, quotation qualification, student record, account, paid feature or private material is rewritten or removed. A title/author citation is not publication permission. These are bounded trust and asset-use improvements; they do not establish that Google selected these issues as the reason for rejection.

## Remaining work before another review

1. Resolve item-level rights for other third-party images, newspaper scans and reproduced PDFs. The existing `editorial/rights-inventory.json` identifies known assets, and its earlier unknown permission fields remain unknown unless supported separately. A claim of original notes does not automatically cover images embedded in them. Where no appropriate basis can be established, replace the asset or link to the authorized source rather than host the reproduction.
2. Complete claim-specific editorial review for the unresolved quotations, optional-note claims and Journal event details already listed in the dated editorial reports. A disclaimer and correct author name do not verify the claims.
3. Verify actual AdSense account exclusions, regional consent delivery and a representative mobile session. The computer tool could intermittently read Edge but stopped navigation when it could not establish the current URL. Do not infer those account settings from source code.
4. Examine genuine traffic and user-interest evidence when Search Console/analytics is available. No fabricated activity, traffic purchase or numeric approval threshold is proposed.

Do not attest that all issues are fixed or submit another review merely because CI passes. Google decides approval. Record the actual PR checks and deployed fingerprint after release; preparation alone is not a live fix.
