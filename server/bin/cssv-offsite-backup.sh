#!/usr/bin/env bash
# CSS Vista: encrypted, off-host student/account backup. CLI only.
# This script does not contain, print, or commit any secret.
set -Eeuo pipefail
umask 077

fail() { printf 'CSSV_BACKUP_ERROR: %s\n' "$*" >&2; exit 1; }
info() { printf 'CSSV_BACKUP: %s\n' "$*"; }

[[ $# -eq 0 ]] || fail 'No command-line arguments are accepted.'
if [[ -n "${CSSV_BACKUP_ENV_FILE:-}" ]]; then
  [[ "$CSSV_BACKUP_ENV_FILE" = /* && -f "$CSSV_BACKUP_ENV_FILE" && ! -L "$CSSV_BACKUP_ENV_FILE" ]] ||
    fail 'Backup environment file must be an absolute, existing, non-symlink private file.'
  # This file is maintained only on the server, outside public_html and Git.
  set -a
  # shellcheck disable=SC1090
  source "$CSSV_BACKUP_ENV_FILE"
  set +a
fi

for key in CSSV_DB_HOST CSSV_DB_NAME CSSV_DB_USER CSSV_DB_PASSWORD CSSV_CONFIG_FILE CSSV_PRIVATE_STORAGE_DIR CSSV_BACKUP_REPOSITORY CSSV_BACKUP_PASSWORD_FILE; do
  [[ -n "${!key:-}" ]] || fail "Missing required private configuration: $key"
done

# Reject local repositories: a backup that shares the web host cannot survive
# loss of the hosting account. Provider independence must also be checked by the owner.
case "$CSSV_BACKUP_REPOSITORY" in
  s3:*|b2:*|azure:*|gs:*|sftp:*|rest:*|rclone:*) ;;
  *) fail 'Backup repository must use a configured off-host restic backend.' ;;
esac
for private_path in "$CSSV_CONFIG_FILE" "$CSSV_BACKUP_PASSWORD_FILE" "$CSSV_PRIVATE_STORAGE_DIR"; do
  [[ "$private_path" = /* && "$private_path" != "/" && "$private_path" != *"/public_html/"* && "$private_path" != *"/public_html" && "$private_path" != *"/dist/"* ]] ||
    fail 'Backup files and configuration must live at absolute private paths outside public_html and build output.'
  [[ ! -L "$private_path" ]] || fail 'Private paths must not be symlinks.'
done
[[ -f "$CSSV_CONFIG_FILE" && -r "$CSSV_CONFIG_FILE" ]] || fail 'Private application configuration is not readable.'
[[ -f "$CSSV_BACKUP_PASSWORD_FILE" && -r "$CSSV_BACKUP_PASSWORD_FILE" ]] || fail 'Private restic password file is not readable.'
[[ -d "$CSSV_PRIVATE_STORAGE_DIR" && -r "$CSSV_PRIVATE_STORAGE_DIR" ]] || fail 'Private file storage is not readable.'
[[ "$CSSV_PRIVATE_STORAGE_DIR" != "/home" && "$CSSV_PRIVATE_STORAGE_DIR" != "/tmp" ]] || fail 'Private storage path is too broad.'

for tool in bash gzip sha256sum mktemp flock restic; do
  command -v "$tool" >/dev/null 2>&1 || fail "Required CLI tool is missing: $tool"
done
if command -v mariadb-dump >/dev/null 2>&1; then
  dump_bin="$(command -v mariadb-dump)"
elif command -v mysqldump >/dev/null 2>&1; then
  dump_bin="$(command -v mysqldump)"
else
  fail 'MariaDB/MySQL database dump CLI is not installed.'
fi

export RESTIC_REPOSITORY="$CSSV_BACKUP_REPOSITORY"
export RESTIC_PASSWORD_FILE="$CSSV_BACKUP_PASSWORD_FILE"

# One backup at a time. File locking avoids persistent/stale lock directories.
lock_file="${CSSV_BACKUP_LOCK_FILE:-${TMPDIR:-/tmp}/cssvista-offsite-backup.lock}"
[[ "$lock_file" = /* && "$lock_file" != *"/public_html/"* ]] || fail 'Lock file must be outside public_html.'
exec 9>"$lock_file"
flock -n 9 || fail 'Another backup is already running.'

# Check remote credentials/repository before making a sensitive local dump.
restic cat config >/dev/null || fail 'Remote backup repository is not ready. Initialize it separately after reviewing the destination.'

temp_base="${CSSV_BACKUP_TEMP_DIR:-${TMPDIR:-/tmp}}"
[[ "$temp_base" = /* && -d "$temp_base" && "$temp_base" != *"/public_html/"* ]] ||
  fail 'Backup temporary directory must exist outside public_html.'
stage="$(mktemp -d "$temp_base/cssvista-backup.XXXXXXXX")"
chmod 700 "$stage"
cleanup() { rm -rf -- "$stage"; }
trap cleanup EXIT

# MYSQL_PWD is scoped to the dump process; passwords never enter argv or stdout.
# --single-transaction is consistent for InnoDB tables, provided DDL is not run
# while dumping. Maintenance/DDL must be paused during the backup window.
MYSQL_PWD="$CSSV_DB_PASSWORD" "$dump_bin" \
  --single-transaction --quick --triggers --routines --events --hex-blob \
  --default-character-set=utf8mb4 --no-tablespaces \
  "--host=$CSSV_DB_HOST" "--port=${CSSV_DB_PORT:-3306}" "--user=$CSSV_DB_USER" \
  "$CSSV_DB_NAME" | gzip -c > "$stage/mysql.sql.gz"
[[ -s "$stage/mysql.sql.gz" ]] || fail 'Database dump was empty.'
gzip -t "$stage/mysql.sql.gz" || fail 'Database archive failed its gzip integrity check.'
(cd "$stage" && sha256sum mysql.sql.gz > mysql.sql.gz.sha256)
printf 'CSS Vista account recovery snapshot\nUTC: %s\nFormat: MySQL/MariaDB logical dump + private files + runtime config\n' \
  "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" > "$stage/README.txt"

# Restic encrypts contents before uploading to a remote provider. The private
# runtime config is intentionally included: some encrypted data cannot be
# recovered without the matching application secret.
restic backup --tag cssvista --tag student-accounts --tag disaster-recovery \
  "$stage" "$CSSV_PRIVATE_STORAGE_DIR" "$CSSV_CONFIG_FILE"

# A successful upload alone is not a verified restore. This confirms the
# snapshot is discoverable; use the isolated restore verifier separately.
restic snapshots --tag cssvista --latest 1 >/dev/null
info 'Encrypted remote snapshot uploaded and discoverable. Run isolated restoration verification separately.'
