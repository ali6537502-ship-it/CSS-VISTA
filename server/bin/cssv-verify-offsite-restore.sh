#!/usr/bin/env bash
# Restore proof for an off-host CSS Vista snapshot.
# Never imports, replaces, or alters a live student database.
set -Eeuo pipefail
umask 077
fail() { printf 'CSSV_RESTORE_ERROR: %s\n' "$*" >&2; exit 1; }
[[ $# -eq 1 ]] || fail 'Supply exactly one NEW absolute destination directory.'
target="$1"
[[ "$target" = /* && "$target" != "/" && "$target" != *"/public_html/"* && "$target" != *"/public_html" ]] ||
  fail 'Destination must be a private absolute path outside public_html.'
[[ ! -e "$target" && ! -L "$target" ]] || fail 'Destination must not already exist. No existing files will be overwritten.'

if [[ -n "${CSSV_BACKUP_ENV_FILE:-}" ]]; then
  [[ "$CSSV_BACKUP_ENV_FILE" = /* && -f "$CSSV_BACKUP_ENV_FILE" && ! -L "$CSSV_BACKUP_ENV_FILE" ]] ||
    fail 'Private backup environment file was not found.'
  set -a
  # shellcheck disable=SC1090
  source "$CSSV_BACKUP_ENV_FILE"
  set +a
fi
for key in CSSV_CONFIG_FILE CSSV_PRIVATE_STORAGE_DIR CSSV_BACKUP_REPOSITORY CSSV_BACKUP_PASSWORD_FILE; do
  [[ -n "${!key:-}" ]] || fail "Missing private configuration: $key"
done
case "$CSSV_BACKUP_REPOSITORY" in
  s3:*|b2:*|azure:*|gs:*|sftp:*|rest:*|rclone:*) ;;
  *) fail 'Expected a configured remote restic backend.' ;;
esac
[[ -f "$CSSV_BACKUP_PASSWORD_FILE" && -r "$CSSV_BACKUP_PASSWORD_FILE" ]] || fail 'Backup password file not available.'
[[ "$CSSV_CONFIG_FILE" = /* && "$CSSV_PRIVATE_STORAGE_DIR" = /* ]] || fail 'Source paths must be absolute.'
command -v restic >/dev/null 2>&1 || fail 'Install restic.'
command -v sha256sum >/dev/null 2>&1 || fail 'Install sha256sum.'
command -v gzip >/dev/null 2>&1 || fail 'Install gzip.'

export RESTIC_REPOSITORY="$CSSV_BACKUP_REPOSITORY"
export RESTIC_PASSWORD_FILE="$CSSV_BACKUP_PASSWORD_FILE"
mkdir -m 700 -- "$target"
# This intentionally restores all snapshot contents into a separate directory,
# including sensitive app configuration. Keep the destination strictly private.
restic restore latest --tag cssvista --target "$target"

# Restic recreates the original absolute paths below --target.
[[ -f "$target$CSSV_CONFIG_FILE" ]] || fail 'Runtime config is missing from restored snapshot.'
[[ -d "$target$CSSV_PRIVATE_STORAGE_DIR" ]] || fail 'Private file root is missing from restored snapshot.'
mapfile -d '' checks < <(find "$target" -type f -name 'mysql.sql.gz.sha256' -print0)
[[ ${#checks[@]} -eq 1 ]] || fail 'Expected exactly one database checksum manifest.'
archive_dir="$(dirname "${checks[0]}")"
[[ -f "$archive_dir/mysql.sql.gz" ]] || fail 'Database archive is missing.'
(cd "$archive_dir" && sha256sum -c mysql.sql.gz.sha256 >/dev/null)
gzip -t "$archive_dir/mysql.sql.gz"
printf 'CSSV_RESTORE_VERIFIED: Remote snapshot restored; database checksum, gzip and private-file presence validated.\n'
printf 'NEXT: Import into a new, disposable database and test ownership/account recovery before changing production.\n'
printf 'SECURITY: This directory includes password hashes and app secrets. Restrict access and securely dispose of it after verification.\n'
