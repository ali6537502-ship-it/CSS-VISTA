# Hostinger operator checklist — student account and Notes recovery

**Status:** Configuration instructions only. No live backup or cron has been activated by this repository.

The current Hostinger-native MySQL database must be protected **before** personal student Notes becomes available. Do not paste passwords, secret keys, SQL exports or student records into GitHub issues, pull requests or chat.

## Hostinger and independent storage

1. Use an independently owned S3-compatible storage account and backup bucket outside Hostinger (for example, a separate AWS S3 or Backblaze B2 account). Enable strong administrator MFA, least-privilege backup credentials, versioning and a reviewed immutability/retention model. A second remote copy under separately controlled credentials is recommended. Ensure the chosen retention policy works with restic's repository locks and cleanup operations.
2. Confirm access to the actual Hostinger **SSH Access** and **Cron Jobs** controls. The available features depend on the hosting plan. Relevant official guides:
   - https://support.hostinger.com/en/articles/1583645-how-to-enable-ssh-access
   - https://support.hostinger.com/en/articles/1583465-how-to-set-up-a-cron-job-at-hostinger
3. On the authorized CLI server, verify the commands `restic`, `mariadb-dump` (or `mysqldump`), `gzip`, `flock`, `sha256sum` and `php` are installed. If the hosting plan cannot run these tools, use an authorized independent backup runner or database-managed backup service. Do not change production PHP/MySQL permissions just to bypass a missing CLI capability.
4. Inventory **every** live MySQL table and private file root, not only new Notes tables. Preserve passwords hashes, stable user UUIDs, profile files, account settings, student progress, folder/page/revision tables and the matching application configuration and encryption secrets.

## Private runtime configuration

Create a restricted, root/owner-accessible private config file outside `public_html`, git and build artifacts. Use `chmod 600` and prohibit unnecessary user/group access. It should provide the variable names documented in `docs/disaster-recovery.md`, including the actual current database host/name/backup-only username/password, private runtime config path, private upload root, remote restic repository URI and a **separately stored** restic passphrase file.

For S3-compatible storage, the provider credentials belong in the same trusted private runtime configuration or a secure credentials helper, not in the URL, command line or the website frontend.

Initialize the remote restic repository only **after** confirming it is not a local/Hostinger path:

```bash
set -a
source /absolute/private/path/backup.env
set +a
export RESTIC_REPOSITORY="$CSSV_BACKUP_REPOSITORY"
export RESTIC_PASSWORD_FILE="$CSSV_BACKUP_PASSWORD_FILE"
restic init
```

Run the initial encrypted off-host backup:

```bash
CSSV_BACKUP_ENV_FILE=/absolute/private/path/backup.env \
  bash server/bin/cssv-offsite-backup.sh
```

Check that the remote snapshot exists and passes the freshness monitor:

```bash
CSSV_BACKUP_ENV_FILE=/absolute/private/path/backup.env \
  bash server/bin/cssv-offsite-health.sh
```

## Restoration requirement before student release

On a separately provisioned, secured test machine (not the live server), with authorized read access to the encrypted backup, run:

```bash
CSSV_BACKUP_ENV_FILE=/absolute/private/path/backup.env \
  bash server/bin/cssv-verify-offsite-restore.sh /absolute/private/path/new-empty-restore
```

The restore verifier checks the SQL gzip and checksum and confirms config and file-root presence. **That is not yet a full recovery test.** Complete the drill by importing into an empty disposable MySQL database, restoring files, checking table counts, original IDs, password-hash compatibility, private Notes access, page history and representative login workflows. Disable outbound emails and external side effects in the disposable environment. Securely destroy restored test records when no longer required.

Record the snapshot timestamp, time to restore, row-count reconciliation, outstanding gaps and any potential data-loss window. If restoration fails, do not enable Notes.

## Monitoring and activation

Only after a complete successful restore should the operator create a daily Hostinger Cron Job or an independent scheduled runner invoking the backup script, and a separate frequent monitoring check. Configure external alert delivery on any failed backup or stale snapshot, and verify alerts actually arrive. Set the maximum freshness age to reflect the schedule; **daily backups can still lose up to a day of newer work**. Stronger guarantees require separately designed and tested MySQL point-in-time recovery/replication.

After verified backup operation, full cross-device Notes tests, an approved rollout and a documented rollback plan, enable both of these flags deliberately:

- Client build: `VITE_CSSV_PERSONAL_NOTES_ENABLED=true`
- Hostinger private PHP config: `CSSV_NOTES_ENABLED=1`

The production release is complete **only after** a live signed-in test student can create and recover a note, the backup monitors are healthy, and a recovery drill has demonstrated a full restore. Keep the old Hostinger database until migration reconciliation succeeds. Never describe a green GitHub workflow as proof of a live off-host backup.
