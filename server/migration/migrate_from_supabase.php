<?php
declare(strict_types=1);

/**
 * CSS Vista zero-loss Supabase -> Hostinger migration runner.
 *
 * CLI ONLY. It never deletes source data, never exports plaintext passwords, and
 * never logs student fields. Existing Supabase UUIDs are preserved. Accounts are
 * imported without password hashes and keep auth_source=supabase so the one-time
 * login bridge can verify each existing password and rehash it locally.
 *
 * Usage:
 *   php server/migration/migrate_from_supabase.php --snapshot
 *   php server/migration/migrate_from_supabase.php --dry-run
 *   php server/migration/migrate_from_supabase.php --apply
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

ini_set('display_errors', '0');
set_time_limit(0);

const CSSV_SOURCE_PROJECT = 'puxdxzvzzwqglxjtiyre';
const CSSV_PAGE_SIZE = 500;

final class MigrationFailure extends RuntimeException {}

$runtimeConfig = [];
$configPath = getenv('CSSV_CONFIG_FILE');
if ($configPath === false || trim($configPath) === '') {
    $configPath = dirname(__DIR__, 3) . DIRECTORY_SEPARATOR . 'cssv-private' . DIRECTORY_SEPARATOR . 'config.php';
}
if (is_string($configPath) && is_file($configPath)) {
    $loaded = require $configPath;
    if (is_array($loaded)) {
        $runtimeConfig = $loaded;
    }
}

function cfg(string $name, ?string $default = null): ?string
{
    global $runtimeConfig;
    $value = getenv($name);
    if ($value !== false && trim((string)$value) !== '') {
        return trim((string)$value);
    }
    if (array_key_exists($name, $runtimeConfig) && trim((string)$runtimeConfig[$name]) !== '') {
        return trim((string)$runtimeConfig[$name]);
    }
    return $default;
}

function out(string $message): void
{
    fwrite(STDOUT, $message . PHP_EOL);
}

function fail(string $message): never
{
    throw new MigrationFailure($message);
}

function uuid4(): string
{
    $bytes = random_bytes(16);
    $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);
    $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);
    $hex = bin2hex($bytes);
    return sprintf('%s-%s-%s-%s-%s', substr($hex, 0, 8), substr($hex, 8, 4), substr($hex, 12, 4), substr($hex, 16, 4), substr($hex, 20, 12));
}

function mysqlTimestamp(mixed $value): ?string
{
    if ($value === null || $value === '') {
        return null;
    }
    try {
        return (new DateTimeImmutable((string)$value))
            ->setTimezone(new DateTimeZone('UTC'))
            ->format('Y-m-d H:i:s.u');
    } catch (Throwable) {
        fail('Source contains an invalid timestamp.');
    }
}

function jsonValue(mixed $value): ?string
{
    if ($value === null) {
        return null;
    }
    if (is_string($value)) {
        try {
            $decoded = json_decode($value, true, 128, JSON_THROW_ON_ERROR);
            return json_encode($decoded, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            return json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        }
    }
    return json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
}

function canonicalize(mixed $value): mixed
{
    if (!is_array($value)) {
        return $value;
    }
    if (array_is_list($value)) {
        return array_map('canonicalize', $value);
    }
    ksort($value, SORT_STRING);
    foreach ($value as $key => $item) {
        $value[$key] = canonicalize($item);
    }
    return $value;
}

function normalizeForDigest(mixed $value, bool $isJson, bool $isBool): mixed
{
    if ($value === null) {
        return null;
    }
    if ($isJson) {
        if (is_string($value)) {
            try {
                $value = json_decode($value, true, 128, JSON_THROW_ON_ERROR);
            } catch (JsonException) {
            }
        }
        return canonicalize($value);
    }
    if ($isBool) {
        return (int)(bool)$value;
    }
    return $value;
}

function sourceBase(): string
{
    $url = rtrim((string)cfg('CSSV_SUPABASE_URL', ''), '/');
    if ($url === '') {
        fail('CSSV_SUPABASE_URL is not configured.');
    }
    return $url;
}

function serviceKey(): string
{
    $key = (string)cfg('CSSV_SUPABASE_SERVICE_ROLE_KEY', '');
    if ($key === '') {
        fail('CSSV_SUPABASE_SERVICE_ROLE_KEY is required for the private migration runner.');
    }
    return $key;
}

function httpJson(string $method, string $url, ?array $payload = null, array $headers = []): array
{
    if (!function_exists('curl_init')) {
        fail('PHP cURL is required for migration.');
    }
    $ch = curl_init($url);
    if ($ch === false) {
        fail('Could not initialise the migration HTTP client.');
    }
    $responseHeaders = [];
    $baseHeaders = [
        'apikey: ' . serviceKey(),
        'Authorization: Bearer ' . serviceKey(),
        'Accept: application/json',
    ];
    if ($payload !== null) {
        $baseHeaders[] = 'Content-Type: application/json';
    }
    $baseHeaders = array_merge($baseHeaders, $headers);
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST => strtoupper($method),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT => 60,
        CURLOPT_HTTPHEADER => $baseHeaders,
        CURLOPT_HEADERFUNCTION => static function ($curl, string $line) use (&$responseHeaders): int {
            $length = strlen($line);
            $parts = explode(':', $line, 2);
            if (count($parts) === 2) {
                $responseHeaders[strtolower(trim($parts[0]))] = trim($parts[1]);
            }
            return $length;
        },
    ]);
    if ($payload !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));
    }
    $body = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    if (!is_string($body)) {
        fail('Source request failed: ' . ($error !== '' ? $error : 'no response'));
    }
    $decoded = null;
    if ($body !== '') {
        try {
            $decoded = json_decode($body, true, 256, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            fail('Source returned malformed JSON.');
        }
    }
    return ['status' => $status, 'body' => $decoded, 'headers' => $responseHeaders];
}

function fetchAuthUsers(): array
{
    $all = [];
    $seenUserIds = [];
    for ($page = 1; $page <= 10000; $page++) {
        $response = httpJson('GET', sourceBase() . '/auth/v1/admin/users?page=' . $page . '&per_page=' . CSSV_PAGE_SIZE);
        if ($response['status'] < 200 || $response['status'] >= 300 || !is_array($response['body'])) {
            fail('Could not read Supabase Auth users.');
        }
        $users = $response['body']['users'] ?? [];
        if (!is_array($users)) {
            fail('Supabase Auth users response is invalid.');
        }
        foreach ($users as $user) {
            if (is_array($user)) {
                $all[] = $user;
            }
        }
        if (count($users) === 0) {
            break;
        }
        $newIds = 0;
        foreach ($users as $user) {
            $id = is_array($user) ? (string)($user['id'] ?? '') : '';
            if ($id !== '' && !isset($seenUserIds[$id])) {
                $seenUserIds[$id] = true;
                $newIds++;
            }
        }
        if ($newIds === 0) {
            break;
        }
    }
    return $all;
}

function fetchPublicTable(string $table, array $keys): array
{
    $all = [];
    for ($offset = 0; $offset < 10000000; $offset += CSSV_PAGE_SIZE) {
        $end = $offset + CSSV_PAGE_SIZE - 1;
        $order = implode(',', array_map(static fn(string $key): string => $key . '.asc', $keys));
        $response = httpJson(
            'GET',
            sourceBase() . '/rest/v1/' . rawurlencode($table) . '?select=*&order=' . rawurlencode($order),
            null,
            ['Range-Unit: items', 'Range: ' . $offset . '-' . $end]
        );
        if (!in_array($response['status'], [200, 206], true) || !is_array($response['body'])) {
            fail('Could not read source table ' . $table . '.');
        }
        $rows = array_values(array_filter($response['body'], 'is_array'));
        array_push($all, ...$rows);
        if (count($rows) < CSSV_PAGE_SIZE) {
            break;
        }
    }
    return $all;
}

function assertStorageEmpty(): void
{
    $response = httpJson('GET', sourceBase() . '/storage/v1/bucket');
    if ($response['status'] < 200 || $response['status'] >= 300 || !is_array($response['body'])) {
        fail('Could not verify Supabase Storage before migration.');
    }
    foreach ($response['body'] as $bucket) {
        if (!is_array($bucket) || empty($bucket['id'])) {
            continue;
        }
        $probe = httpJson('POST', sourceBase() . '/storage/v1/object/list/' . rawurlencode((string)$bucket['id']), [
            'prefix' => '',
            'limit' => 1,
            'offset' => 0,
            'sortBy' => ['column' => 'name', 'order' => 'asc'],
        ]);
        if ($probe['status'] < 200 || $probe['status'] >= 300 || !is_array($probe['body'])) {
            fail('Could not verify one Supabase Storage bucket.');
        }
        if (count($probe['body']) > 0) {
            fail('Supabase Storage is no longer empty. Binary storage migration must be completed before cutover.');
        }
    }
}

function db(): PDO
{
    $host = cfg('CSSV_DB_HOST');
    $port = cfg('CSSV_DB_PORT', '3306');
    $name = cfg('CSSV_DB_NAME');
    $user = cfg('CSSV_DB_USER');
    $pass = cfg('CSSV_DB_PASSWORD');
    if (!$host || !$name || !$user || $pass === null) {
        fail('Hostinger database credentials are not configured.');
    }
    try {
        $pdo = new PDO(
            sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $host, $port, $name),
            $user,
            $pass,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::ATTR_STRINGIFY_FETCHES => false,
            ]
        );
        $pdo->exec("SET time_zone = '+00:00'");
        return $pdo;
    } catch (Throwable) {
        fail('Hostinger database is not reachable.');
    }
}

$tableMap = require __DIR__ . '/table-map.php';
function specs(): array
{
    global $tableMap;
    return $tableMap;
}

function transformedRow(array $row, array $spec, bool $deferParent = false): array
{
    $jsonCols = array_flip($spec['json'] ?? []);
    $boolCols = array_flip($spec['bool'] ?? []);
    $timestampCols = array_flip($spec['ts'] ?? []);
    $result = [];
    foreach ($spec['columns'] as $column) {
        $value = $row[$column] ?? null;
        if ($deferParent && $column === 'parent_id') {
            $value = null;
        } elseif (isset($jsonCols[$column])) {
            $value = jsonValue($value);
        } elseif (isset($boolCols[$column]) && $value !== null) {
            $value = (int)(bool)$value;
        } elseif (isset($timestampCols[$column])) {
            $value = mysqlTimestamp($value);
        }
        $result[$column] = $value;
    }
    return $result;
}

function quoted(string $identifier): string
{
    if (!preg_match('/^[a-z][a-z0-9_]*$/', $identifier)) {
        fail('Unsafe SQL identifier in migration specification.');
    }
    return '`' . $identifier . '`';
}

function upsertRows(PDO $pdo, string $table, array $rows, array $spec): void
{
    if ($rows === []) {
        return;
    }
    $columns = $spec['columns'];
    $keyLookup = array_flip($spec['keys']);
    $insertColumns = implode(',', array_map('quoted', $columns));
    $placeholders = implode(',', array_fill(0, count($columns), '?'));
    $updates = [];
    foreach ($columns as $column) {
        if (!isset($keyLookup[$column])) {
            $updates[] = quoted($column) . '=VALUES(' . quoted($column) . ')';
        }
    }
    if ($updates === []) {
        $updates[] = quoted($columns[0]) . '=' . quoted($columns[0]);
    }
    $sql = 'INSERT INTO ' . quoted($table) . ' (' . $insertColumns . ') VALUES (' . $placeholders . ') ON DUPLICATE KEY UPDATE ' . implode(',', $updates);
    $stmt = $pdo->prepare($sql);
    foreach ($rows as $source) {
        $row = transformedRow($source, $spec, !empty($spec['defer_parent']));
        $stmt->execute(array_values($row));
    }
    if (!empty($spec['defer_parent'])) {
        $parent = $pdo->prepare('UPDATE factbook_categories SET parent_id=? WHERE id=? AND user_id=?');
        foreach ($rows as $source) {
            if (!empty($source['parent_id'])) {
                $parent->execute([(string)$source['parent_id'], (string)$source['id'], (string)$source['user_id']]);
            }
        }
    }
}

function sourceUsersForTarget(array $authUsers): array
{
    $rows = [];
    foreach ($authUsers as $user) {
        if (empty($user['id']) || empty($user['email'])) {
            fail('Supabase Auth returned a user without an id or email.');
        }
        $rows[] = [
            'id' => (string)$user['id'],
            'email' => strtolower(trim((string)$user['email'])),
            'email_verified_at' => mysqlTimestamp($user['email_confirmed_at'] ?? null),
            'last_sign_in_at' => mysqlTimestamp($user['last_sign_in_at'] ?? null),
            'raw_metadata' => jsonValue($user['user_metadata'] ?? []),
            'created_at' => mysqlTimestamp($user['created_at'] ?? null),
        ];
    }
    return $rows;
}

function upsertUsers(PDO $pdo, array $rows): void
{
    $sql = "INSERT INTO users (id,email,password_hash,auth_source,email_verified_at,last_sign_in_at,raw_metadata,created_at) "
        . "VALUES (?,?,NULL,'supabase',?,?,?,?) "
        . "ON DUPLICATE KEY UPDATE email=VALUES(email),email_verified_at=VALUES(email_verified_at),"
        . "last_sign_in_at=VALUES(last_sign_in_at),raw_metadata=VALUES(raw_metadata),created_at=VALUES(created_at)";
    $stmt = $pdo->prepare($sql);
    foreach ($rows as $row) {
        $stmt->execute([$row['id'],$row['email'],$row['email_verified_at'],$row['last_sign_in_at'],$row['raw_metadata'],$row['created_at']]);
    }
}

function digestRows(array $rows, array $columns, array $keys, array $jsonCols = [], array $boolCols = []): string
{
    $jsonLookup = array_flip($jsonCols);
    $boolLookup = array_flip($boolCols);
    $prepared = [];
    foreach ($rows as $row) {
        $data = [];
        foreach ($columns as $column) {
            $data[$column] = normalizeForDigest($row[$column] ?? null, isset($jsonLookup[$column]), isset($boolLookup[$column]));
        }
        $keyParts = [];
        foreach ($keys as $key) {
            $keyParts[] = (string)($row[$key] ?? '');
        }
        $prepared[] = implode("\x1f", $keyParts) . "\x1e" . json_encode(canonicalize($data), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    }
    sort($prepared, SORT_STRING);
    return hash('sha256', implode("\n", $prepared));
}

function targetRows(PDO $pdo, string $table, array $columns, array $keys): array
{
    $select = implode(',', array_map('quoted', $columns));
    $order = implode(',', array_map('quoted', $keys));
    $stmt = $pdo->query('SELECT ' . $select . ' FROM ' . quoted($table) . ' ORDER BY ' . $order);
    return $stmt->fetchAll();
}

function recordAudit(PDO $pdo, string $migrationId, string $sourceTable, string $targetTable, int $sourceCount, int $targetCount, string $sourceDigest, string $targetDigest, bool $verified): void
{
    $stmt = $pdo->prepare(
        'INSERT INTO migration_table_audits (migration_id,source_table,target_table,source_count,target_count,source_digest,target_digest,verified) '
        . 'VALUES (?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE source_count=VALUES(source_count),target_count=VALUES(target_count),'
        . 'source_digest=VALUES(source_digest),target_digest=VALUES(target_digest),verified=VALUES(verified),checked_at=NOW(6)'
    );
    $stmt->execute([$migrationId,$sourceTable,$targetTable,$sourceCount,$targetCount,$sourceDigest,$targetDigest,$verified ? 1 : 0]);
}

function sourceSnapshot(array $authUsers, array $sourceTables): array
{
    $counts = ['auth.users' => count($authUsers)];
    foreach ($sourceTables as $table => $rows) {
        $counts['public.' . $table] = count($rows);
    }
    return [
        'source_project' => CSSV_SOURCE_PROJECT,
        'captured_at_utc' => gmdate('c'),
        'counts' => $counts,
        'contains_personal_data' => false,
    ];
}

$options = array_slice($argv, 1);
$apply = in_array('--apply', $options, true);
$snapshotOnly = in_array('--snapshot', $options, true);
$dryRun = in_array('--dry-run', $options, true) || (!$apply && !$snapshotOnly);
if ($apply && ($snapshotOnly || in_array('--dry-run', $options, true))) {
    fail('Choose exactly one mode: --snapshot, --dry-run, or --apply.');
}

$sourceTables = [];
$pdo = null;
$lockHeld = false;
$migrationId = null;

try {
    out('CSS Vista migration: source=' . CSSV_SOURCE_PROJECT . ' mode=' . ($apply ? 'APPLY' : ($snapshotOnly ? 'SNAPSHOT' : 'DRY-RUN')));
    assertStorageEmpty();
    $authUsers = fetchAuthUsers();
    foreach (specs() as $table => $spec) {
        $sourceTables[$table] = fetchPublicTable($table, $spec['keys']);
    }
    $snapshot = sourceSnapshot($authUsers, $sourceTables);
    out('Source users: ' . count($authUsers));
    foreach ($sourceTables as $table => $rows) {
        out('Source ' . $table . ': ' . count($rows));
    }
    out('Supabase Storage: empty');

    if ($snapshotOnly) {
        out(json_encode($snapshot, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));
        exit(0);
    }

    $pdo = db();
    $lockHeld = (int)$pdo->query("SELECT GET_LOCK('cssv_supabase_migration',0)")->fetchColumn() === 1;
    if (!$lockHeld) {
        fail('Another migration process already holds the target lock.');
    }
    try {
        $pdo->query('SELECT 1 FROM migration_runs LIMIT 1');
    } catch (Throwable) {
        fail('Hostinger schema is not installed. Apply server/sql/001 and 002 before migration.');
    }

    if ($dryRun) {
        out('Target database reachable; schema present; no writes performed.');
        foreach (specs() as $table => $_spec) {
            $count = (int)$pdo->query('SELECT COUNT(*) FROM ' . quoted($table))->fetchColumn();
            out('Target ' . $table . ': ' . $count);
        }
        out('Target users: ' . (int)$pdo->query('SELECT COUNT(*) FROM users')->fetchColumn());
        out('DRY-RUN PASSED. --apply is required to copy data.');
        exit(0);
    }

    $migrationId = uuid4();
    $run = $pdo->prepare('INSERT INTO migration_runs (id,source_project,source_snapshot_at,status,notes) VALUES (?,?,NOW(6),\'running\',?)');
    $run->execute([$migrationId, CSSV_SOURCE_PROJECT, 'Zero-loss Supabase import; no source deletes; password hashes intentionally not exported.']);

    $pdo->beginTransaction();
    try {
        $userRows = sourceUsersForTarget($authUsers);
        upsertUsers($pdo, $userRows);
        foreach (specs() as $table => $spec) {
            upsertRows($pdo, $table, $sourceTables[$table], $spec);
        }
        $pdo->commit();
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $error;
    }

    $allVerified = true;
    $userColumns = ['id','email','email_verified_at','last_sign_in_at','raw_metadata','created_at'];
    $sourceUserDigest = digestRows($userRows, $userColumns, ['id'], ['raw_metadata']);
    $targetUserRows = targetRows($pdo, 'users', $userColumns, ['id']);
    $targetUserDigest = digestRows($targetUserRows, $userColumns, ['id'], ['raw_metadata']);
    $usersVerified = count($userRows) === count($targetUserRows) && hash_equals($sourceUserDigest, $targetUserDigest);
    recordAudit($pdo, $migrationId, 'auth.users', 'users', count($userRows), count($targetUserRows), $sourceUserDigest, $targetUserDigest, $usersVerified);
    $allVerified = $allVerified && $usersVerified;
    out('Verify users: ' . ($usersVerified ? 'PASS' : 'FAIL'));

    foreach (specs() as $table => $spec) {
        $sourceNormalized = [];
        foreach ($sourceTables[$table] as $row) {
            $sourceNormalized[] = transformedRow($row, $spec, false);
        }
        $target = targetRows($pdo, $table, $spec['columns'], $spec['keys']);
        $sourceDigest = digestRows($sourceNormalized, $spec['columns'], $spec['keys'], $spec['json'] ?? [], $spec['bool'] ?? []);
        $targetDigest = digestRows($target, $spec['columns'], $spec['keys'], $spec['json'] ?? [], $spec['bool'] ?? []);
        $verified = count($sourceNormalized) === count($target) && hash_equals($sourceDigest, $targetDigest);
        recordAudit($pdo, $migrationId, 'public.' . $table, $table, count($sourceNormalized), count($target), $sourceDigest, $targetDigest, $verified);
        $allVerified = $allVerified && $verified;
        out('Verify ' . $table . ': ' . ($verified ? 'PASS' : 'FAIL'));
    }

    $stable = true;
    $authUsersAfter = fetchAuthUsers();
    $userRowsAfter = sourceUsersForTarget($authUsersAfter);
    $sourceUserDigestAfter = digestRows($userRowsAfter, $userColumns, ['id'], ['raw_metadata']);
    if (count($userRowsAfter) !== count($userRows) || !hash_equals($sourceUserDigest, $sourceUserDigestAfter)) {
        $stable = false;
    }
    foreach (specs() as $table => $spec) {
        $rowsAfter = fetchPublicTable($table, $spec['keys']);
        $normalizedAfter = [];
        foreach ($rowsAfter as $row) {
            $normalizedAfter[] = transformedRow($row, $spec, false);
        }
        $beforeNormalized = [];
        foreach ($sourceTables[$table] as $row) {
            $beforeNormalized[] = transformedRow($row, $spec, false);
        }
        $beforeDigest = digestRows($beforeNormalized, $spec['columns'], $spec['keys'], $spec['json'] ?? [], $spec['bool'] ?? []);
        $afterDigest = digestRows($normalizedAfter, $spec['columns'], $spec['keys'], $spec['json'] ?? [], $spec['bool'] ?? []);
        if (count($normalizedAfter) !== count($beforeNormalized) || !hash_equals($beforeDigest, $afterDigest)) {
            $stable = false;
            out('Source changed during copy: ' . $table);
        }
    }
    $allVerified = $allVerified && $stable;
    out('Verify source stability: ' . ($stable ? 'PASS' : 'FAIL (safe rerun required)'));

    $finish = $pdo->prepare('UPDATE migration_runs SET status=?,completed_at=NOW(6),notes=CONCAT(COALESCE(notes,\'\'),?) WHERE id=?');
    $finish->execute([$allVerified ? 'verified' : 'failed', $allVerified ? ' Reconciliation passed.' : ' Reconciliation failed; do not cut over.', $migrationId]);
    if (!$allVerified) {
        fail('Migration copied data but reconciliation failed. Supabase remains authoritative; do not cut over.');
    }
    out('MIGRATION VERIFIED. No Supabase data was changed or deleted.');
    out('Existing accounts remain on the Supabase bridge until frontend cutover tests are approved.');
} catch (Throwable $error) {
    if ($pdo instanceof PDO && $migrationId !== null) {
        try {
            $stmt = $pdo->prepare("UPDATE migration_runs SET status='failed',completed_at=NOW(6),notes=CONCAT(COALESCE(notes,''),' Migration process failed safely.') WHERE id=?");
            $stmt->execute([$migrationId]);
        } catch (Throwable) {
        }
    }
    fwrite(STDERR, 'Migration stopped safely: ' . $error->getMessage() . PHP_EOL);
    exit(1);
} finally {
    if ($pdo instanceof PDO && $lockHeld) {
        try {
            $pdo->query("SELECT RELEASE_LOCK('cssv_supabase_migration')");
        } catch (Throwable) {
        }
    }
}
