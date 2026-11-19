#!/usr/bin/env bash
# CSS VISTA: automated independent backup freshness check.
# Run on a monitored host. A nonzero exit must alert the owner.
set -Eeuo pipefail
umask 077
fail(){ printf 'CSSV_BACKUP_HEALTH_ERROR: %s\n' "$*" >&2; exit 1; }
[[ $# -eq 0 ]] || fail 'No command-line arguments accepted.'
if [[ -n "${CSSV_BACKUP_ENV_FILE:-}" ]]; then
  [[ "$CSSV_BACKUP_ENV_FILE" = /* && -f "$CSSV_BACKUP_ENV_FILE" && ! -L "$CSSV_BACKUP_ENV_FILE" ]] ||
    fail 'Expected a private absolute non-symlink environment file.'
  set -a
  # shellcheck disable=SC1090
  source "$CSSV_BACKUP_ENV_FILE"
  set +a
fi
: "${CSSV_BACKUP_REPOSITORY:?CSSV_BACKUP_REPOSITORY required}"
: "${CSSV_BACKUP_PASSWORD_FILE:?CSSV_BACKUP_PASSWORD_FILE required}"
case "$CSSV_BACKUP_REPOSITORY" in
  s3:*|b2:*|azure:*|gs:*|sftp:*|rest:*|rclone:*) ;;
  *) fail 'Backup monitoring requires an off-host repository.' ;;
esac
[[ "$CSSV_BACKUP_PASSWORD_FILE" = /* && -f "$CSSV_BACKUP_PASSWORD_FILE" ]] ||
  fail 'Private repository password file is missing.'
command -v restic >/dev/null 2>&1 || fail 'Restic is not installed.'
command -v php >/dev/null 2>&1 || fail 'PHP CLI is not available for snapshot time verification.'
max_hours="${CSSV_BACKUP_MAX_AGE_HOURS:-30}"
[[ "$max_hours" =~ ^[0-9]+$ && "$max_hours" -ge 1 && "$max_hours" -le 168 ]] ||
  fail 'Maximum backup age must be between 1 and 168 hours.'
export RESTIC_REPOSITORY="$CSSV_BACKUP_REPOSITORY"
export RESTIC_PASSWORD_FILE="$CSSV_BACKUP_PASSWORD_FILE"

# Don't trust a green cron run: check that remote snapshots actually exist.
restic snapshots --tag cssvista --json | php -r '
  $hours=(int)$argv[1];
  $data=json_decode(stream_get_contents(STDIN),true);
  if(!is_array($data) || count($data)===0) {fwrite(STDERR,"CSSV_BACKUP_HEALTH_ERROR: No remote snapshots.\n");exit(3);}
  $latest=0;
  foreach($data as $snapshot){
    $ts=strtotime((string)($snapshot["time"]??""));
    if($ts!==false && $ts<time()+300) $latest=max($latest,$ts);
  }
  if($latest<=0){fwrite(STDERR,"CSSV_BACKUP_HEALTH_ERROR: No valid snapshot timestamp.\n");exit(3);}
  $age=time()-$latest;
  if($age>$hours*3600){fwrite(STDERR,"CSSV_BACKUP_HEALTH_ERROR: Latest snapshot exceeds the maximum backup age.\n");exit(4);}
  printf("CSSV_BACKUP_HEALTH_OK: Latest remote snapshot %s UTC; %d minutes old.\n",gmdate("Y-m-d H:i:s",$latest),(int)floor($age/60));
' "$max_hours"

# This does not prove restore integrity. Schedule isolated restore exercises
# with the separate recovery script and full app database checks.
