# My VISTA Notes — release and recovery guide

**Development status: not live. Release is blocked until independently verified backups are operational.**

## What was implemented

The protected account route /account/notes uses the existing Hostinger-native login, unchanged account UUIDs and required-profile gate. It is separate from the public /notes study-material catalogue.

Students can create nested folders (maximum five levels), write and rename notes, move them between folders, pin them, restore deleted notes and folders, and add any number of pages to a note.

The editor has bold, italic, underline, strike, headings, font selection/size, highlight and text colors, paragraphs and lists, table insertion, link insertion, alignment, quotes, undo/redo and page history. Each page is a separate document object. Only the active page HTML is loaded at once.

**No total word-count limit is imposed on a note.** To prevent oversized requests and a massive single editor DOM, one individual page has a 2 MiB rich-text transfer ceiling. A student can continue on a new page, limited ultimately by real storage quotas and network/browser capacities. Do not promise literally unlimited physical storage or zero lag.

The API uses signed-in session ownership, prepared SQL, CSRF on writes, per-page version checks, idempotent last-request replays and previous-version snapshots. A stale device receives a conflict instead of overwriting a newer page. Deleted data is soft-deleted rather than destroyed. Browser IndexedDB holds best-effort account-specific unsynced drafts; it does not provide an independent backup.

Every page load and HTML paste is sanitized. Raw stored rich text must always be treated as untrusted markup.

A lightweight metadata check runs on visible tabs every 30 seconds, downloading a fresh page only when its version has changed and no unsent local edits exist.

## Disaster recovery and actual backup status

The operational source of truth remains Hostinger MySQL and private storage. Backup tooling is in a separate draft, PR #199. There is no evidence yet of a configured independent storage destination, actual off-host snapshot, restore drill or recovery monitoring. DO NOT tell students three copies are running.

Once approved and configured, a backup must capture the entire live MySQL database, including users, profiles, password hashes, progress, notes, folders, individual note pages and revisions. It must also capture private files and the matching runtime application configuration/secret. A new Hostinger account or different provider can recreate compatible tables from the SQL dump and preserve UUIDs, but only after a tested restore. Browser-only drafts are not included in a MySQL dump.

Encrypted snapshots must be outside the Hostinger failure domain, with independently accessible encryption keys and preferably a second immutable provider-managed copy. Retention, monitoring, restored hashes/row counts and separate recovery credentials must be verified. Daily backups alone can lose edits newer than the last copy; strong RPO requires binlog point-in-time recovery or replication.

## Fail-closed two-sided release switch

Both switches default to **off**, so a future code merge alone does not expose private writing.

- Website build: set `VITE_CSSV_PERSONAL_NOTES_ENABLED=true` only for an approved production build. Otherwise the Notes sidebar, mobile navigation and Library shortcut stay hidden, and a direct visit redirects to the dashboard.
- Private PHP runtime config (outside Git and public_html): set `CSSV_NOTES_ENABLED=1` only after independent backups and a real restore are verified. If absent or any value other than `1`, all Notes API requests reject with HTTP 503 and cannot create or modify student records.
- Both settings are required. Do not leave a public feature enabled while the private API is unavailable. Roll back by disabling the server-side flag first if a backup or security problem arises.
- Treat these switches as an operational safety mechanism, **not** proof that an actual independent backup exists. Backup job health and recovered data must be checked separately.
## Non-negotiable deployment checklist

1. Establish and independently verify real backup operation and a full isolated recovery; provision the provider and restricted credentials outside the repository.
2. Test the additive schema in server/sql/student_notes_v1.sql against a representative Hostinger MySQL/MariaDB environment, including prepared migration rollback and old-account record preservation.
3. Run the disposable database tests in tests/notes and the full TypeScript build/route audit, plus account/profile/CSRF isolation checks.
4. Test rich editing and formatting, heavy paste, mobile browsers, offline interruptions, account switching, parallel devices, history, folder cycles and 2 MiB page-size boundaries.
5. Confirm server storage limits, alerts and realistic restore time. Obtain release approval only when cloud snapshots are recoverable.
6. Merge and deploy only after these checks; verify the exact deployed fingerprint and a real signed-in student's note workflow. A draft PR is not a release.


## Sidebar discovery and one-step lesson capture

- The `My Notes` link is always displayed in the student sidebar, mobile account drawer, mobile bottom navigation and My Library, so students can discover their private notebook. When the backend release flag is disabled, the `/account/notes` page clearly explains that encrypted off-host recovery must be verified before personal data can be saved.
- A reusable `Paste to My Notes` shortcut appears in optional-subject lesson pages, Islamic Studies reference topics, guided study lessons, Grammar Course lessons and the General Science course header. It never uploads text until the student deliberately pastes or clicks Save.
- Students may highlight text and click the button to prefill it, paste into the capture field to save instantly, or click `Paste clipboard & save` after granting browser permission. A separate Save button supports editing before submission.
- The API `lesson_capture` stores one private note with an escaped lesson title and first-party source path, plus one text page in a single transaction. It validates the authenticated owner and accepts an idempotent client-generated UUID so a network retry does not duplicate the note.
- Failed capture attempts retain a best-effort account-scoped device draft; the status is not misrepresented as an account save. Successful saves link directly to the new note at `/account/notes?note=<id>`.
- The cloud API remains fail-closed unless `CSSV_NOTES_ENABLED=1` is configured privately on the server. A public sidebar entry or visible shortcut does **not** imply the feature is active or that independent backups have been activated.

## Safe staged publishing

The product shell (sidebar link, status page and disabled lesson shortcut) may be released separately from enabling private note persistence. This staged release does not add or modify live student notes while the server-side release flag remains off. Enabling the live Notes service still requires successful independent off-host backups and a full restore rehearsal first. Do not promise live saving until verified.
## Known limitations

The rich text editor uses native browser editing commands, requiring a mobile-browser compatibility pass before production approval. This first implementation does not upload images/attachments, support formula authoring, offer full-text content search, or export whole multi-page notes in one PDF. The only download action exports the active page as HTML. These features must not be advertised as already built.

Private device drafts are stored in the browser profile and can disappear if browser storage is cleared, incognito mode expires or a device fails. Students must see the difference between a saved cloud page and an unsynced local draft.

No one can truthfully promise 100% protection from every technical failure. The release standard is verified recovery, observable backups and clear recovery-point limits.
