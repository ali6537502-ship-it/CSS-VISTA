# CSS VISTA — independent student-data recovery runbook

**Status (19 November 2026): implementation prepared for review; NOT configured on production; NO student data copied.**

This document covers the existing native PHP/MySQL account system and future personal student notes. Do not claim an independent backup is working until the owner proves a successful off-host snapshot, an isolated restore, and verified student records. The backup procedure is intentionally independent of GitHub CI and browser JavaScript.

## Verified architecture and risks

- `docs/hostinger-native-accounts.md` and `docs/hostinger-account-cutover.md` document the September 2026 migration to Hostinger-native accounts. The historic Supabase source is **not** a continuous backup of newer accounts.
- Current authoritative student records include the MySQL `users` table (stable UUIDs, portable password hashes), student profiles, progress, activity, quiz/question attempts, native learning/assessment records, Factbook, notes once added, and all other database tables.
- Some private images and other uploads are files, outside MySQL; the configured `CSSV_PRIVATE_STORAGE_DIR` and production runtime config must be protected along with the database. Independently inventory any other file roots before calling the backup complete.
- Public GitHub source code and generated site assets do **not** contain live student records and are not substitutes for a database backup.
- Device/browser exports cover only selected state and cannot guarantee recovery of students' accounts, passwords, private photos, notes, or server-managed records.
- A prior document mentions an encrypted off-host backup policy. **Its schedule, destination, live operation and latest restore have not been verified here.**

## Protection model

1. **Primary:** existing Hostinger MySQL/MariaDB and private file storage, unchanged.
2. **Independent recovery copy:** encrypted `restic` snapshots sent directly from the server to a repository controlled through a **different provider and administrative account**, not Hostinger or public web space. The initial script captures a consistent InnoDB logical database dump (provided no concurrent DDL), the entire configured private file root and the exact matching private runtime configuration.
3. **Additional failure domain:** second separate protected copy or provider-side replicated, versioned/immutable storage, with separate administrator authority and key escrow. Merely placing another directory on Hostinger is not independent.
4. **Device editing:** future My VISTA Notes must use authenticated server-owned records, autosave acknowledgements, optimistic version numbers, conflict-safe unsynced drafts and revision recovery. Do not put personal notes in GitHub or bundled frontend files.

The `restic` repository password must be saved independently of Hostinger, securely and offline or in an administrator-controlled secrets vault. Losing this password makes encrypted backups unreadable. Save recovery details for the domain registrar, backup provider, app secret and mail account separately from the hosting account.

### Current tool limitations

The repository includes **no live cloud-storage credentials or Hostinger management access**. The backup CLI cannot initialize an account, start a production cron, determine whether file roots are complete, or demonstrate a restored student login. GitHub test fixtures prove the scripts' fail-closed mechanics only. Do **not** put any database password, backup key, student export, live SQL dump or private config in a Git commit, issue, PR, Actions artifact or ChatGPT conversation.

## Production prerequisites (owner/operator action)

- Provision a remote S3-compatible bucket or supported `restic` backend in an account **independent of Hostinger**. Enable provider-side object versioning, protected retention and monitoring. Verify restic's lock-file behavior and retention compatibility with the provider's immutability mechanism; do not assume every Object Lock setting works with restic.
- Create dedicated least-privilege DB backup credentials and remote storage credentials. Provision a private backup password file (0600) and a root/owner-only environment file (0600) outside `public_html`. Never share or log their contents.
- Install and verify `bash`, `restic`, `mariadb-dump` or `mysqldump`, `gzip`, `sha256sum`, `mktemp` and `flock` in the Hostinger CLI runtime. Shared-hosting restrictions may prevent this; a separate authorized backup runner or managed database backup facility is then required.
- Identify the production `CSSV_PRIVATE_STORAGE_DIR`, `CSSV_CONFIG_FILE`, and all additional persistent/private storage paths. Confirm none live inside build artifacts or disposable releases. Existing app config may reside at `/home/<account>/cssv-private/config.php` or an operator-selected equivalent; use the **actual** verified path.
- Ensure the database uses recoverable transactional tables and stop concurrent schema migrations while dumping. A logical snapshot plus separately collected files is not an atomic cross-resource transaction. Preserve versioned/immutable filenames for private files and test recovery of matching content. For strict consistency, adopt coordinated snapshot/backup windows.
- Confirm safe free disk space for the temporary compressed dump and enough provider quota for retention. No source or student table is altered by this script.

### Private configuration contract

The operator must create a private shell environment file outside Git, with variables sourced by the backup CLI:

```sh
# Illustrative VARIABLE NAMES ONLY — supply actual values privately.
CSSV_DB_HOST=...
CSSV_DB_PORT=3306
CSSV_DB_NAME=...
CSSV_DB_USER=...
CSSV_DB_PASSWORD=...
CSSV_CONFIG_FILE=/absolute/private/path/config.php
CSSV_PRIVATE_STORAGE_DIR=/absolute/private/path/owned-files
CSSV_BACKUP_REPOSITORY=s3:https://independent-storage-provider.example/private-recovery
CSSV_BACKUP_PASSWORD_FILE=/absolute/private/path/restic-passphrase
# Provider-specific RESTIC / AWS_* / B2_* credentials are also private.
```

Initialize the encrypted repository separately with the correct private environment and `restic init`; never initialize a repository in the website's `public_html`, `dist`, GitHub, or a directory inside the hosting account.

### First backup

On an authorized CLI host that has the approved credentials:

```sh
CSSV_BACKUP_ENV_FILE=/absolute/private/path/backup.env \
  bash server/bin/cssv-offsite-backup.sh
```

The script refuses local restic paths and missing private configuration, locks out concurrent runs, uses `mariadb-dump`/`mysqldump` with `--single-transaction`, checks the SQL gzip, writes a checksum, uploads encrypted content through restic and checks that the snapshot is discoverable. Temporary unencrypted dump files are restricted to the current user and removed after the command, whether it succeeds or fails. Avoid non-encrypted shared temporary media when possible.

**Only after verifying the first real backup and restore**, schedule an owner-controlled daily cron. Determine the cron host's timezone explicitly and capture nonsecret exit status/monitoring. A backup failure must immediately alert the owner via an independent channel. Never treat “cron executed” as “data backed up.”

## Isolated restore proof

Run this procedure from a separate secured workstation/server with **read-only recovery credentials where feasible** and a **brand-new, empty, private restore directory**:

```sh
CSSV_BACKUP_ENV_FILE=/absolute/private/path/backup.env \
  bash server/bin/cssv-verify-offsite-restore.sh /absolute/private/path/new-disposable-restore
```

The verifier restores the latest tagged snapshot; confirms the saved private application config and file root; validates the compressed MySQL dump checksum and archive integrity. It does **not** connect to any production database or import records.

For a **complete** recovery drill, restore the dump into a separately provisioned, empty **disposable** MySQL database using restricted test credentials. Test table inventory and row counts, original UUID/relationship preservation, unique user ownership, representative password-hash verification through a disabled-email staging login, notes/folder/media references and protected-access denials. Compare against a signed backup-time manifest where available. Ensure no real emails, payments, assignments or notifications are sent during testing. Securely erase test material afterward. Never use a production database as the target of a restore drill.

An archive with a valid checksum is **not** sufficient proof that real student data or the application can be restored.

## Recovery objectives, retention and future work

- **Initial protection:** once daily off-host backups are genuinely running and verified, potential loss may be **up to 24 hours or more**, depending on job delay/failure. This script does **not** claim 5–15-minute recovery point objectives.
- **Next requirement:** implement independently retained database binary logs / managed point-in-time recovery or a properly engineered replica and incremental file sync before targeting **15 minutes or less** of data loss. Verify the achieved interval through real tests. Near-zero loss requires a different resilience model and availability/cost analysis.
- **Recovery time objective:** measure during full staging recovery; it cannot be promised from repository code alone.
- **Retention target:** a provider-enforced recovery policy (for example 30 daily, 12 weekly, 12 monthly restore points), matched to storage cost, privacy/deletion rules and legal obligations. Do not give the unattended uploader the ability to destroy every snapshot. A second independently controlled immutable copy is recommended.
- **Test cadence:** automatic health/backup freshness alerts daily; integrity audits weekly; full isolated recoveries at least monthly and after significant schema, key or storage changes. Periodically rehearse losing the whole Hostinger environment.

## Disaster cutover to another host

1. Secure the domain/DNS registrar, original Git source and off-host backup administrator account.
2. Freeze old-system writes if still available. Record last successful snapshots, backup timestamps and any risk window.
3. Provision a clean hosting environment, restore the database and private files from the verified snapshot, and configure matching secret keys.
4. Apply additive migrations carefully and verify complete account ownership, password hashes, notes, media, progress, history and recovery-mail setup. Revoke/reissue sessions as appropriate.
5. Test representative real workflows with approved staging identities and no external side effects. Reconcile all student counts and checksums; maintain a rollback path.
6. Only after written verification and owner authorization, change DNS and resume writes. Monitor save/sync success, login, recovery, and backup jobs.

## Code review/test commands

```sh
bash -n server/bin/cssv-offsite-backup.sh
bash -n server/bin/cssv-verify-offsite-restore.sh
node --test tests/offsiteBackup.test.mjs
```

**Release gate:** no cron, credentials, cloud backup claim, new personal Notes launch or hosting cutover until the operator provides evidence of a secure independent destination, a successful real encrypted snapshot and successful isolated recovery of actual application records. This branch does not change any existing account route, database table or production release.
