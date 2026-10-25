# Owner-supplied daily editions — 19–25 October 2026

The owner supplied and authorized publication of seven completed PDFs. Edition dates were checked against the dates printed inside the documents. Original PDF bytes are preserved, with SHA-256 integrity metadata and genuine first-page PNG previews rendered at 720px width.

| Edition date | Pages | Reader |
| --- | ---: | --- |
| 19 October 2026 | 15 | `/current-affairs-daily/2026-10-19` |
| 20 October 2026 | 14 | `/current-affairs-daily/2026-10-20` |
| 21 October 2026 | 15 | `/current-affairs-daily/2026-10-21` |
| 22 October 2026 | 17 | `/current-affairs-daily/2026-10-22` |
| 23 October 2026 | 15 | `/current-affairs-daily/2026-10-23` |
| 24 October 2026 | 17 | `/current-affairs-daily/2026-10-24` |
| 25 October 2026 | 14 | `/current-affairs-daily/2026-10-25` |

Total: 7 supplied editions, 107 pages. The latest edition is 25 October; publishing timestamps reflect actual publication preparation on 25 October, separately from each edition date. Issue numbers are included only where printed in the actual first page. Metadata descriptions are neutral publication information, not additional current-affairs reporting.

The 25 October PDF contains a C2PA Content Credentials container. The GitHub validator recognizes this bounded, non-executable provenance metadata and records its digest; it continues rejecting arbitrary attachments, unknown container types, active/external SVG content and PDF JavaScript. This is not cryptographic signature or factual verification. Stripping the provenance or rewriting the original PDF was unnecessary.

The existing public library gains quick date links, a visible interactive calendar, edition/result counts, authentic cover links and chronological month groups with consistent card alignment. Search, reading, downloads and local bookmarks/resume continue through the same unified catalogue. No separate archive or authentication system is introduced. The protected Current Affairs resources, Daily Briefing and historical weekly publications retain their existing controls.

Validation: `npm run validate:daily-pdf` parses all seven documents. `npm run test:daily-pdf` includes seven targeted provenance tests alongside the twelve existing validator tests. The browser publication check uses the actual supplied files and covers at 320/768/1440px, exercises calendar/search and PDF navigation, and checks that a browser-downloaded PDF retains the supplied SHA-256. Its catalogue/file routes are intercepted local fixtures; live deployment, endpoint accessibility and all seven download hashes must be verified separately after the release.

The existing GitHub-to-Hostinger pipeline packages these binaries under denied server-only release paths. Only the public controlled API can deliver them. The homepage latest-edition widget updates from the same catalogue without hardcoded filenames. Future daily PDFs continue through the documented routine in [the operations guide](current-affairs-daily.md).
