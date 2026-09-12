<?php
declare(strict_types=1);
// Temporary, signed transfer from the existing account database. This endpoint
// accepts no SQL, credentials, file paths or arbitrary table/column names.
require_once __DIR__ . '/_bootstrap.php';
cssv_require_method('POST');
$grant = require __DIR__ . '/_account_migration_key.php';
if (time() >= strtotime($grant['expires_at'])) cssv_fail('Migration window has closed.', 410, 'migration_closed');
$raw = file_get_contents('php://input', false, null, 0, 4 * 1024 * 1024 + 1);
$signature = base64_decode((string)($_SERVER['HTTP_X_CSSV_MIGRATION_SIGNATURE'] ?? ''), true);
if (!is_string($raw) || strlen($raw) > 4 * 1024 * 1024 || !is_string($signature)
    || openssl_verify($raw, $signature, $grant['public_key'], OPENSSL_ALGO_SHA256) !== 1) {
    cssv_fail('Signed migration request required.', 401, 'migration_signature_required');
}
try { $body = json_decode($raw, true, 64, JSON_THROW_ON_ERROR); }
catch (Throwable) { cssv_fail('Invalid migration payload.', 422, 'invalid_migration'); }
if (!is_array($body) || ($body['scope'] ?? '') !== $grant['scope']
    || !preg_match('/^[a-zA-Z0-9_-]{1,100}$/', (string)($body['batch_id'] ?? ''))) {
    cssv_fail('Invalid migration scope.', 422, 'invalid_migration');
}
$pdo = cssv_db();
$pdo->exec("CREATE TABLE IF NOT EXISTS account_cutover_batches (
    batch_id VARCHAR(100) PRIMARY KEY, payload_sha256 CHAR(64) NOT NULL,
    dataset VARCHAR(80) NOT NULL, row_count INT UNSIGNED NOT NULL,
    result JSON NOT NULL, completed_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
$pdo->exec("CREATE TABLE IF NOT EXISTS account_cutover_state (
    id TINYINT PRIMARY KEY, sealed_at DATETIME(6) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
$pdo->exec('INSERT IGNORE INTO account_cutover_state(id) VALUES(1)');
if ($pdo->query('SELECT sealed_at FROM account_cutover_state WHERE id=1')->fetchColumn()) cssv_fail('Migration is sealed.', 410, 'migration_closed');
$map = require __DIR__ . '/_account_migration_map.php';
$map['users'] = [
    'columns' => ['id','email','password_hash','email_verified_at','last_sign_in_at','raw_metadata','created_at','disabled_at'],
    'keys' => ['id'], 'json' => ['raw_metadata'],
    'ts' => ['email_verified_at','last_sign_in_at','created_at','disabled_at'],
];
// Activity IDs are local sequence numbers; preserve the stable user/event key.
foreach (['student_activity'=>'event_key','quiz_attempts'=>'attempt_key','question_attempts'=>'event_key'] as $table=>$key) {
    $map[$table]['columns'] = array_values(array_diff($map[$table]['columns'], ['id']));
    $map[$table]['keys'] = ['user_id', $key];
}
function cutover_quote(string $name): string { return '`' . $name . '`'; }
function cutover_transform(array $source, array $spec): array {
    $row = [];
    foreach ($spec['columns'] as $column) {
        if (!array_key_exists($column, $source)) throw new RuntimeException('missing_column');
        $value = $source[$column];
        if (in_array($column, $spec['json'] ?? [], true)) $value = $value === null ? null : json_encode($value, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        elseif (in_array($column, $spec['ts'] ?? [], true)) $value = $value === null ? null : cssv_parse_timestamp((string)$value);
        elseif (in_array($column, $spec['bool'] ?? [], true)) $value = (int)(bool)$value;
        $row[$column] = $value;
    }
    return $row;
}
function cutover_backup($stream, string $table, array $row): void {
    $iv = random_bytes(12);
    $tag = '';
    $plaintext = json_encode(['table'=>$table,'row'=>$row], JSON_THROW_ON_ERROR);
    $encrypted = openssl_encrypt($plaintext, 'aes-256-gcm', hash('sha256', cssv_secret(), true), OPENSSL_RAW_DATA, $iv, $tag, 'cssvista-account-cutover-v1');
    if (!is_string($encrypted) || fwrite($stream, base64_encode($iv . $tag . $encrypted) . "\n") === false) throw new RuntimeException('backup_failed');
}
if ((int)$pdo->query("SELECT GET_LOCK('cssvista-account-cutover', 10)")->fetchColumn() !== 1) cssv_fail('Migration busy.', 409, 'migration_busy');
try {
    if ($pdo->query('SELECT sealed_at FROM account_cutover_state WHERE id=1')->fetchColumn()) cssv_fail('Migration is sealed.', 410, 'migration_closed');
    $check = $pdo->prepare('SELECT payload_sha256,result FROM account_cutover_batches WHERE batch_id=?');
    $check->execute([$body['batch_id']]);
    if ($previous = $check->fetch()) {
        if (!hash_equals($previous['payload_sha256'], hash('sha256', $raw))) cssv_fail('Batch ID conflict.', 409, 'migration_batch_conflict');
        cssv_json(json_decode($previous['result'], true));
    }
    if (($body['action'] ?? '') === 'status') {
        $counts = [];
        foreach (array_keys($map) as $table) $counts[$table] = (int)$pdo->query('SELECT COUNT(*) FROM ' . cutover_quote($table))->fetchColumn();
        cssv_json(['ok'=>true,'counts'=>$counts,'users_with_password'=>(int)$pdo->query("SELECT COUNT(*) FROM users WHERE password_hash IS NOT NULL AND password_hash<>''")->fetchColumn(), 'batches'=>$pdo->query('SELECT batch_id,dataset,row_count,completed_at FROM account_cutover_batches ORDER BY completed_at')->fetchAll()]);
    }
    if (($body['action'] ?? '') === 'seal') {
        $pdo->beginTransaction();
        $pdo->exec("UPDATE users SET auth_source='local' WHERE password_hash IS NOT NULL AND password_hash<>'' AND auth_source IN ('supabase','dual')");
        $pdo->exec('UPDATE account_cutover_state SET sealed_at=NOW(6) WHERE id=1');
        $pdo->commit();
        cssv_json(['ok'=>true,'sealed'=>true]);
    }
    $table = (string)($body['dataset'] ?? '');
    $rows = $body['rows'] ?? null;
    if (($body['action'] ?? '') !== 'import' || !isset($map[$table]) || !is_array($rows) || !array_is_list($rows) || count($rows)>500) throw new RuntimeException('invalid_dataset');
    $spec = $map[$table];
    $directory = cssv_private_storage_dir('migration-backups');
    $backup = fopen($directory . '/' . $body['batch_id'] . '.aesgcm', 'ab');
    if (!is_resource($backup)) throw new RuntimeException('backup_failed');
    chmod($directory . '/' . $body['batch_id'] . '.aesgcm', 0600);
    $inserted = 0; $updated = 0; $preserved = 0;
    $pdo->beginTransaction();
    foreach ($rows as $source) {
        if (!is_array($source)) throw new RuntimeException('invalid_row');
        $row = cutover_transform($source, $spec);
        $where = implode(' AND ', array_map(static fn($key)=>cutover_quote($key).'=?', $spec['keys']));
        $keyValues = array_map(static fn($key)=>$row[$key], $spec['keys']);
        $select = $pdo->prepare('SELECT * FROM '.cutover_quote($table).' WHERE '.$where.' FOR UPDATE');
        $select->execute($keyValues);
        $existing = $select->fetch();
        if ($existing && isset($row['user_id']) && !hash_equals((string)$existing['user_id'], (string)$row['user_id'])) throw new RuntimeException('ownership_conflict');
        if ($table === 'users') {
            if (!preg_match('/^[a-f0-9-]{36}$/i', (string)$row['id']) || !filter_var($row['email'], FILTER_VALIDATE_EMAIL)
                || !preg_match('/^\$(?:2[aby]\$|argon2(?:id|i)\$)/', (string)$row['password_hash'])) throw new RuntimeException('invalid_identity');
            $email = $pdo->prepare('SELECT id FROM users WHERE email=?'); $email->execute([$row['email']]);
            $emailId = $email->fetchColumn();
            if ($emailId && !hash_equals((string)$emailId, (string)$row['id'])) throw new RuntimeException('email_identity_conflict');
            if ($existing && $existing['auth_source'] === 'local' && $existing['password_hash']) { $preserved++; continue; }
            $row['auth_source'] = 'dual';
            $row['auth_migrated_at'] = gmdate('Y-m-d H:i:s');
        } elseif ($existing && isset($row['updated_at'], $existing['updated_at']) && strcmp((string)$existing['updated_at'], (string)$row['updated_at']) > 0) {
            $preserved++; continue;
        }
        if ($existing) {
            cutover_backup($backup, $table, $existing);
            $fields = array_values(array_diff(array_keys($row), $spec['keys']));
            if ($fields) {
                $sql = 'UPDATE '.cutover_quote($table).' SET '.implode(',', array_map(static fn($key)=>cutover_quote($key).'=?', $fields)).' WHERE '.$where;
                $pdo->prepare($sql)->execute([...array_map(static fn($key)=>$row[$key], $fields), ...$keyValues]);
            }
            $updated++;
        } else {
            $fields = array_keys($row);
            $pdo->prepare('INSERT INTO '.cutover_quote($table).' ('.implode(',',array_map('cutover_quote',$fields)).') VALUES ('.implode(',',array_fill(0,count($fields),'?')).')')->execute(array_values($row));
            $inserted++;
        }
        $select->execute($keyValues);
        $stored = $select->fetch();
        if (!$stored) throw new RuntimeException('reconciliation_failed');
        // Verify every copied field after MySQL conversion; never return values.
        foreach ($row as $column=>$value) {
            $actual = $stored[$column] ?? null;
            if (in_array($column, $spec['json'] ?? [], true)) {
                if (($actual === null ? null : json_decode((string)$actual,true)) != ($value === null ? null : json_decode((string)$value,true))) throw new RuntimeException('json_reconciliation_failed');
            } elseif (in_array($column, $spec['ts'] ?? [], true) || $column === 'auth_migrated_at') {
                if (cssv_parse_timestamp($actual) !== cssv_parse_timestamp($value)) throw new RuntimeException('timestamp_reconciliation_failed');
            } elseif ((string)$actual !== (string)$value) throw new RuntimeException('field_reconciliation_failed');
        }
    }
    fclose($backup);
    $result = ['ok'=>true,'dataset'=>$table,'received'=>count($rows),'inserted'=>$inserted,'updated'=>$updated,'preserved_newer'=>$preserved,'reconciled'=>true];
    $pdo->prepare('INSERT INTO account_cutover_batches(batch_id,payload_sha256,dataset,row_count,result) VALUES(?,?,?,?,?)')->execute([$body['batch_id'],hash('sha256',$raw),$table,count($rows),json_encode($result,JSON_THROW_ON_ERROR)]);
    $pdo->commit();
    cssv_json($result);
} catch (Throwable $error) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    error_log('CSSV signed migration failed: ' . get_class($error) . ' ' . (string)$error->getCode());
    cssv_fail('Migration batch failed and was rolled back.', 503, 'migration_batch_failed');
} finally {
    $pdo->query("SELECT RELEASE_LOCK('cssvista-account-cutover')");
}
