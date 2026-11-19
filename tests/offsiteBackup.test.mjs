import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, chmodSync, readFileSync, readdirSync, existsSync, rmSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const backup = join(root, 'server/bin/cssv-offsite-backup.sh')
const restore = join(root, 'server/bin/cssv-verify-offsite-restore.sh')
const run = (file, args = [], env = {}) => spawnSync('bash', [file, ...args], { encoding: 'utf8', timeout: 15000, env })

test('backup and restore scripts pass bash syntax checking', () => {
  for (const file of [backup, restore]) {
    const result = spawnSync('bash', ['-n', file], { encoding: 'utf8' })
    assert.equal(result.status, 0, result.stderr)
  }
})

test('backup refuses a local repository and missing private configuration', () => {
  const missing = run(backup, [], { PATH: process.env.PATH, HOME: process.env.HOME })
  assert.notEqual(missing.status, 0)
  assert.match(missing.stderr, /Missing required private configuration/)
})

function sandbox() {
  const home = mkdtempSync(join(tmpdir(), 'cssvista-backup-tests-'))
  const bin = join(home, 'bin')
  const privateDir = join(home, 'student-files')
  const configDir = join(home, 'private-config')
  const tempDir = join(home, 'temporary')
  mkdirSync(bin); mkdirSync(privateDir); mkdirSync(configDir); mkdirSync(tempDir)
  const config = join(configDir, 'config.php')
  const passwordFile = join(configDir, 'restic-password')
  writeFileSync(config, '<?php return ["CSSV_APP_SECRET"=>"fixture-only"];')
  writeFileSync(passwordFile, 'test-restic-passphrase')
  writeFileSync(join(privateDir, 'student-file.txt'), 'only a disposable test fixture')
  chmodSync(passwordFile, 0o600)
  const receipt = join(home, 'backup-receipt.gz')
  const resticStub = '#!/usr/bin/env bash\n' +
    'set -euo pipefail\n' +
    'case "$1" in\n' +
    '  cat) exit 0 ;;\n' +
    '  backup)\n' +
    '    for arg in "$@"; do\n' +
    '      if [[ -d "$arg" && -f "$arg/mysql.sql.gz" ]]; then cp "$arg/mysql.sql.gz" "$MOCK_BACKUP_RECEIPT"; fi\n' +
    '    done\n' +
    '    [[ -s "$MOCK_BACKUP_RECEIPT" ]] || exit 44\n' +
    '    exit 0 ;;\n' +
    '  snapshots) printf "fixture snapshot\\n"; exit 0 ;;\n' +
    '  restore)\n' +
    '    target=""\n' +
    '    argv=("$@")\n' +
    '    for ((i=0;i<${#argv[@]};i++)); do\n' +
    '      if [[ "${argv[i]}" == "--target" ]]; then target="${argv[i+1]}"; fi\n' +
    '    done\n' +
    '    [[ -n "$target" ]] || exit 45\n' +
    '    archive="$target/tmp/cssvista-backup.fake"\n' +
    '    mkdir -p "$archive" "$target$CSSV_PRIVATE_STORAGE_DIR" "$target$(dirname "$CSSV_CONFIG_FILE")"\n' +
    '    cp "$CSSV_CONFIG_FILE" "$target$CSSV_CONFIG_FILE"\n' +
    '    printf "test SQL only\\n" | gzip -c > "$archive/mysql.sql.gz"\n' +
    '    (cd "$archive" && sha256sum mysql.sql.gz > mysql.sql.gz.sha256)\n' +
    '    exit 0 ;;\n' +
    '  *) exit 46 ;;\n' +
    'esac\n'
  const dumpStub = '#!/usr/bin/env bash\n' +
    '[[ "$MYSQL_PWD" == "test-database-password" ]] || exit 3\n' +
    'printf -- "-- TEST ONLY: no actual database is contacted\\nCREATE TABLE fixture (id INT);\\n"\n'
  writeFileSync(join(bin, 'restic'), resticStub)
  writeFileSync(join(bin, 'mariadb-dump'), dumpStub)
  chmodSync(join(bin, 'restic'), 0o700)
  chmodSync(join(bin, 'mariadb-dump'), 0o700)
  const env = {
    PATH: bin + ':' + process.env.PATH,
    HOME: home,
    TMPDIR: tempDir,
    CSSV_DB_HOST: 'example.invalid',
    CSSV_DB_NAME: 'disposable_test_database',
    CSSV_DB_USER: 'fixture-only',
    CSSV_DB_PASSWORD: 'test-database-password',
    CSSV_CONFIG_FILE: config,
    CSSV_PRIVATE_STORAGE_DIR: privateDir,
    CSSV_BACKUP_REPOSITORY: 's3:https://example.invalid/recovery-bucket',
    CSSV_BACKUP_PASSWORD_FILE: passwordFile,
    CSSV_BACKUP_TEMP_DIR: tempDir,
    CSSV_BACKUP_LOCK_FILE: join(tempDir, 'backup.lock'),
    MOCK_BACKUP_RECEIPT: receipt,
  }
  return { home, env, tempDir, receipt }
}

test('backup creates a compressed SQL snapshot, uploads it and removes its temporary dump', () => {
  const s = sandbox()
  try {
    const result = run(backup, [], s.env)
    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, /Encrypted remote snapshot uploaded/)
    assert.ok(existsSync(s.receipt))
    assert.ok(readFileSync(s.receipt).length > 20)
    assert.equal(readdirSync(s.tempDir).filter(name => name.startsWith('cssvista-backup.')).length, 0)
    assert.doesNotMatch(result.stdout + result.stderr, /test-database-password|test-restic-passphrase/)
    const invalid = run(backup, [], { ...s.env, CSSV_BACKUP_REPOSITORY: join(s.home, 'same-host-local-copy') })
    assert.notEqual(invalid.status, 0)
    assert.match(invalid.stderr, /off-host/)
  } finally {
    rmSync(s.home, { recursive: true, force: true })
  }
})

test('restore works only into a new private directory and verifies archive integrity', () => {
  const s = sandbox()
  try {
    const target = join(s.home, 'restored-test')
    const restored = run(restore, [target], s.env)
    assert.equal(restored.status, 0, restored.stderr)
    assert.match(restored.stdout, /CSSV_RESTORE_VERIFIED/)
    assert.ok(existsSync(target + s.env.CSSV_CONFIG_FILE))
    assert.ok(existsSync(target + s.env.CSSV_PRIVATE_STORAGE_DIR))
    const again = run(restore, [target], s.env)
    assert.notEqual(again.status, 0)
    assert.match(again.stderr, /must not already exist/)
  } finally {
    rmSync(s.home, { recursive: true, force: true })
  }
})
