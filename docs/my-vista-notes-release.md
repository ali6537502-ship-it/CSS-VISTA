# My VISTA Notes — release and recovery guide

**Release decision:** The owner requested that student Notes be activated on the existing Hostinger-native MySQL account system without waiting for independently automated backups. Manual backup downloads are the owner's chosen recovery process. This does not establish or verify any automated off-host backup. Do not claim automatic backups or guaranteed recovery.

## What was implemented

The protected account route /account/notes uses the existing Hostinger-native login, unchanged account UUIDs and required-profile gate. It is separate from the public /notes study-material catalogue.

Students can create nested folders (maximum five levels), write and rename notes, move them between folders, pin them, restore deleted notes and folders, and add any number of pages to a note.

The editor has bold, italic, underline, strike, headings, font selection/size, highlight and text colors, paragraphs and lists, table insertion, link insertion, alignment, quotes, undo/redo and page history. Each page is a separate document object. Only the active page HTML is loaded at once.

**No total word-count limit is imposed on a note.** To prevent oversized requests and a massive single editor DOM, one individual page has a 2 MiB rich-text transfer ceiling. A student can continue on a new page, limited ultimately by real storage quotas and network/browser capacities. Do not promise literally unlimited physical storage or zero lag.

The API uses signed-in session ownership, prepared SQL, CSRF on writes, per-page version checks, idempotent last-request replays and previous-version snapshots. A stale device receives a conflict instead of overwriting a newer page. Deleted data is soft-deleted rather than destroyed. Browser IndexedDB holds best-effort account-specific unsynced drafts; it does not provide an independent backup.

Every page load and HTML paste is sanitized. Raw stored rich text must always be treated as untrusted markup.

A lightweight metadata check runs on visible tabs every 30 seconds, downloading a fresh page only when its version has changed and no unsent local edits exist.

## Disaster recovery and actual backup status

The operational source of truth remains Hostinger MySQL and private storage. Optional encrypted backup tooling is included in the main repository, but it is not running automatically. There is no evidence yet of a configured independent storage destination, actual off-host snapshot, restore drill or recovery monitoring. DO NOT tell students three copies are running.

Once approved and configured, a backup must capture the entire live MySQL database, including users, profiles, password hashes, progress, notes, folders, individual note pages and revisions. It must also capture private files and the matching runtime application configuration/secret. A new Hostinger account or different provider can recreate compatible tables from the SQL dump and preserve UUIDs, but only after a tested restore. Browser-only drafts are not included in a MySQL dump.

Encrypted snapshots must be outside the Hostinger failure domain, with independently accessible encryption keys and preferably a second immutable provider-managed copy. Retention, monitoring, restored hashes/row counts and separate recovery credentials must be verified. Daily backups alone can lose edits newer than the last copy; strong RPO requires binlog point-in-time recovery or replication.

## Direct native-account activation

The frontend now loads the full Notes editor at `/account/notes` without a backup-specific release flag, and the PHP Notes endpoint no longer requires `CSSV_NOTES_ENABLED`. The backend still requires an authenticated existing student account, the existing profile gate, account-scoped SQL and CSRF protection on every write. Schema creation is additive and uses four new tables; existing student records are not rewritten. The backend may need MySQL table-creation privilege on first access, or the approved `server/sql/student_notes_v1.sql` migration must be applied separately by an administrator.

The owner will manage backup downloads manually. Verify actual database and private-file download contents frequently; manual copies do not protect writing newer than the latest downloaded copy. If live checks show database/schema or permission errors, keep the editor unavailable until the issue is resolved rather than claiming a successful save.
## Non-negotiable deployment checklist

1. Owner acknowledges the risks of manual downloads and records the latest available complete Hostinger database and private-files backup.
2. Test the additive schema in server/sql/student_notes_v1.sql against a representative Hostinger MySQL/MariaDB environment, including prepared migration rollback and old-account record preservation.
3. Run the disposable database tests in tests/notes and the full TypeScript build/route audit, plus account/profile/CSRF isolation checks.
4. Test rich editing and formatting, heavy paste, mobile browsers, offline interruptions, account switching, parallel devices, history, folder cycles and 2 MiB page-size boundaries.
5. Confirm server storage limits, MySQL CREATE TABLE privileges for the additive first-use schema, runtime database availability and expected backup-loss window. Do not imply automatic external recovery.
6. Build, test and merge the activation, verify the actual Hostinger deployment fingerprint, then sign in with a designated test student to create, refresh, re-open and paste from a lesson; verify all operations return saved-to-account confirmation. Do not claim live operation until these checks succeed.


## Sidebar discovery and one-step lesson capture

- The `My Notes` link is displayed in the student sidebar, mobile account drawer, bottom navigation and My Library. The protected `/account/notes` route opens the native-account editor after successful authentication and profile checks.
- A reusable `Paste to My Notes` shortcut appears in optional-subject lesson pages, Islamic Studies reference topics, guided study lessons, Grammar Course lessons and the General Science course header. It never uploads text until the student deliberately pastes or clicks Save.
- Students may highlight text and click the button to prefill it, paste into the capture field to save instantly, or click `Paste clipboard & save` after granting browser permission. A separate Save button supports editing before submission.
- The API `lesson_capture` stores one private note with an escaped lesson title and first-party source path, plus one text page in a single transaction. It validates the authenticated owner and accepts an idempotent client-generated UUID so a network retry does not duplicate the note.
- Failed capture attempts retain a best-effort account-scoped device draft; the status is not misrepresented as an account save. Successful saves link directly to the new note at `/account/notes?note=<id>`.
- The cloud API still requires authenticated access and CSRF on changes. Opening the editor does not prove automatic backups exist; a successful save to MySQL is not a verified manual backup.

## Direct publishing

After the tests pass, merge the activation branch and verify the installed website build. Account-owned notes live in the existing MySQL database, not in GitHub. The owner accepts the manual-backup recovery risk and should regularly download and safeguard the full database and private files. The application must not claim that an independently monitored off-host recovery copy is in operation.
## Known limitations

The rich text editor uses native browser editing commands, requiring a mobile-browser compatibility pass before production approval. This first implementation does not upload images/attachments, support formula authoring, offer full-text content search, or export whole multi-page notes in one PDF. The only download action exports the active page as HTML. These features must not be advertised as already built.

Private device drafts are stored in the browser profile and can disappear if browser storage is cleared, incognito mode expires or a device fails. Students must see the difference between a saved cloud page and an unsynced local draft.

No one can promise 100% protection from every technical failure. Manual backups can be outdated, lost or incomplete; the owner has explicitly chosen to proceed with that risk.
