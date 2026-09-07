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

$isWeb = PHP_SAPI !== 'cli';
$migrationSucceeded = false;

if ($isWeb) {
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header('Referrer-Policy: no-referrer');
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

    if (($_SERVER['HTTPS'] ?? '') !== 'on' && ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') !== 'https') {
        http_response_code(400);
        exit('Open this migration runner using HTTPS.');
    }

    if (session_status() !== PHP_SESSION_ACTIVE) {
        session_name('cssv_migration');
        session_start([
            'cookie_httponly' => true,
            'cookie_secure' => true,
            'cookie_samesite' => 'Strict',
        ]);
    }
    if (empty($_SESSION['cssv_migration_csrf'])) {
        $_SESSION['cssv_migration_csrf'] = bin2hex(random_bytes(32));
    }

    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET') {
        $dryRunPassed = !empty($_SESSION['cssv_migration_dry_run_passed']);
        header('Content-Type: text/html; charset=utf-8');
        $csrf = htmlspecialchars((string)$_SESSION['cssv_migration_csrf'], ENT_QUOTES, 'UTF-8');
        $action = $dryRunPassed ? 'apply' : 'dry-run';
        $button = $dryRunPassed ? 'Copy and verify Supabase data' : 'Run safe dry run';
        $warning = $dryRunPassed
            ? '<p><strong>Dry run passed.</strong> The next action copies data to Hostinger and does not delete or modify Supabase.</p><label><input type="checkbox" required> I understand this copies data into Hostinger.</label>'
            : '<p>This first check is read-only. It does not write to Hostinger or modify Supabase.</p>';
        echo '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CSS Vista migration</title><style>body{font-family:system-ui;background:#f4f7f5;color:#173d32;margin:0;padding:32px}.card{max-width:680px;margin:7vh auto;background:#fff;border-radius:20px;padding:32px;box-shadow:0 15px 45px #173d3220}h1{margin-top:0}label{display:block;margin:18px 0}input[type=password]{box-sizing:border-box;width:100%;padding:12px;border:1px solid #b8c9c2;border-radius:10px}button{background:#075c43;color:#fff;border:0;border-radius:10px;padding:13px 18px;font-weight:700;cursor:pointer}.note{color:#567068;font-size:14px}</style></head><body><main class="card"><h1>CSS Vista migration</h1>' . $warning . '<form method="post"><input type="hidden" name="csrf" value="' . $csrf . '"><input type="hidden" name="mode" value="' . $action . '"><label>Migration code<input type="password" name="migration_code" required autocomplete="off"></label><button type="submit">' . $button . '</button></form><p class="note">Keep this page open until the result appears.</p></main></body></html>';
        exit;
    }

    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        http_response_code(405);
        exit('Method not allowed.');
    }
    $csrf = (string)($_POST['csrf'] ?? '');
    if ($csrf === '' || !hash_equals((string)$_SESSION['cssv_migration_csrf'], $csrf)) {
        http_response_code(403);
        exit('Security check failed. Reload and try again.');
    }
    $migrationCode = (string)($_POST['migration_code'] ?? '');
    if (!hash_equals('__CSSV_MIGRATION_TOKEN__', $migrationCode)) {
        http_response_code(403);
        exit('Migration code is incorrect.');
    }
    $webMode = (string)($_POST['mode'] ?? '');
    if (!in_array($webMode, ['dry-run', 'apply'], true)) {
        http_response_code(400);
        exit('Invalid migration mode.');
    }
    if ($webMode === 'apply' && empty($_SESSION['cssv_migration_dry_run_passed'])) {
        http_response_code(409);
        exit('Run the dry run successfully before applying the migration.');
    }
    header('Content-Type: text/plain; charset=utf-8');
    $argv = [__FILE__, $webMode === 'apply' ? '--apply' : '--dry-run'];
}

ini_set('display_errors', '0');
set_time_limit(0);

const CSSV_SOURCE_PROJECT = 'puxdxzvzzwqglxjtiyre';
const CSSV_PAGE_SIZE = 500;

final class MigrationFailure extends RuntimeException {}

$runtimeConfig = [];
if ($isWeb) {
    $documentRoot = rtrim((string)($_SERVER['DOCUMENT_ROOT'] ?? ''), "/\\");
    if ($documentRoot === '' || !is_dir($documentRoot)) {
        http_response_code(500);
        exit('Could not detect the Hostinger document root.');
    }
    $configPath = dirname($documentRoot) . DIRECTORY_SEPARATOR . 'cssv-private' . DIRECTORY_SEPARATOR . 'config.php';
} else {
    $configPath = getenv('CSSV_CONFIG_FILE');
    if ($configPath === false || trim($configPath) === '') {
        $configPath = dirname(__DIR__, 3) . DIRECTORY_SEPARATOR . 'cssv-private' . DIRECTORY_SEPARATOR . 'config.php';
    }
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
    if (PHP_SAPI === 'cli') {
        fwrite(STDOUT, $message . PHP_EOL);
        return;
    }
    echo $message . "\n";
    if (function_exists('ob_flush')) {
        @ob_flush();
    }
    flush();
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

function supabaseAdminKey(): string
{
    // Prefer a revocable opaque key and retain the legacy variable only as a
    // temporary fallback for installations that have not rotated yet.
    $key = (string)cfg('CSSV_SUPABASE_SECRET_KEY', '');
    if ($key === '') {
        $key = (string)cfg('CSSV_SUPABASE_SERVICE_ROLE_KEY', '');
    }
    if ($key === '') {
        fail('CSSV_SUPABASE_SECRET_KEY is required for the private migration runner.');
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
    $adminKey = supabaseAdminKey();
    $baseHeaders = [
        'apikey: ' . $adminKey,
        'Accept: application/json',
    ];
    // Opaque sb_secret_ keys are not JWTs and must not be sent as Bearer
    // tokens. Legacy service_role keys are JWTs and still need this header.
    if (!str_starts_with($adminKey, 'sb_secret_')) {
        $baseHeaders[] = 'Authorization: Bearer ' . $adminKey;
    }
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

$tableMap = [
    'student_profiles' => [
        'columns' => ['user_id','display_name','avatar_url','created_at','updated_at','last_seen_at'],
        'keys' => ['user_id'], 'ts' => ['created_at','updated_at','last_seen_at'],
    ],
    'student_progress' => [
        'columns' => ['user_id','payload','client_updated_at','updated_at'],
        'keys' => ['user_id'], 'json' => ['payload'], 'ts' => ['client_updated_at','updated_at'],
    ],
    'student_activity' => [
        'columns' => ['id','user_id','event_key','activity_type','label','path','metadata','occurred_at','created_at'],
        'keys' => ['id'], 'json' => ['metadata'], 'ts' => ['occurred_at','created_at'],
    ],
    'quiz_attempts' => [
        'columns' => ['id','user_id','attempt_key','quiz_type','category','score','total','metadata','completed_at','created_at'],
        'keys' => ['id'], 'json' => ['metadata'], 'ts' => ['completed_at','created_at'],
    ],
    'question_attempts' => [
        'columns' => ['id','user_id','event_key','question_id','category','topic','subtopic','mode','difficulty','selected_option','correct','attempted_at','created_at'],
        'keys' => ['id'], 'bool' => ['correct'], 'ts' => ['attempted_at','created_at'],
    ],
    'admin_users' => [
        'columns' => ['user_id','created_at','created_by'],
        'keys' => ['user_id'], 'ts' => ['created_at'],
    ],
    'site_content' => [
        'columns' => ['id','content','updated_at','updated_by'],
        'keys' => ['id'], 'json' => ['content'], 'ts' => ['updated_at'],
    ],
    'site_content_versions' => [
        'columns' => ['id','content','created_at','created_by'],
        'keys' => ['id'], 'json' => ['content'], 'ts' => ['created_at'],
    ],
    'mcq_error_reports' => [
        'columns' => ['id','user_id','question_id','note','status','created_at','resolved_at','resolved_by'],
        'keys' => ['id'], 'ts' => ['created_at','resolved_at'],
    ],
    'custom_test_series_requests' => [
        'columns' => ['request_id','user_id','student_name','student_email','phone','subjects','test_count','scheduling_mode','start_date','duration_days','gap_days','schedule','unit_price','total_fee','status','created_at','updated_at'],
        'keys' => ['request_id'], 'json' => ['subjects','schedule'], 'ts' => ['created_at','updated_at'],
    ],
    'factbook_subjects' => [
        'columns' => ['id','user_id','name','description','icon','cover_style','accent_color','exam_label','target_date','position','category_count','entry_count','archived_at','deleted_at','created_at','updated_at'],
        'keys' => ['id'], 'ts' => ['archived_at','deleted_at','created_at','updated_at'],
    ],
    'factbook_categories' => [
        'columns' => ['id','user_id','subject_id','parent_id','name','icon','color','position','entry_count','archived_at','deleted_at','created_at','updated_at'],
        'keys' => ['id'], 'ts' => ['archived_at','deleted_at','created_at','updated_at'], 'defer_parent' => true,
    ],
    'factbook_entries' => [
        'columns' => ['id','user_id','subject_id','category_id','title','entry_type','content','importance','revision_status','bookmarked','source_count','personal_remarks','search_text','position','archived_at','deleted_at','created_at','updated_at'],
        'keys' => ['id'], 'json' => ['content'], 'bool' => ['bookmarked'], 'ts' => ['archived_at','deleted_at','created_at','updated_at'],
    ],
    'factbook_entry_blocks' => [
        'columns' => ['id','user_id','entry_id','block_type','content','position','created_at','updated_at'],
        'keys' => ['id'], 'json' => ['content'], 'ts' => ['created_at','updated_at'],
    ],
    'factbook_sources' => [
        'columns' => ['id','user_id','entry_id','title','author_organization','publication_year','page_number','web_address','accessed_on','verification_note','position','created_at','updated_at'],
        'keys' => ['id'], 'ts' => ['created_at','updated_at'],
    ],
    'factbook_tags' => [
        'columns' => ['id','user_id','name','color','created_at','updated_at'],
        'keys' => ['id'], 'ts' => ['created_at','updated_at'],
    ],
    'factbook_entry_tags' => [
        'columns' => ['user_id','entry_id','tag_id','created_at'],
        'keys' => ['entry_id','tag_id'], 'ts' => ['created_at'],
    ],
    'factbook_collections' => [
        'columns' => ['id','user_id','name','description','color','position','archived_at','deleted_at','created_at','updated_at'],
        'keys' => ['id'], 'ts' => ['archived_at','deleted_at','created_at','updated_at'],
    ],
    'factbook_collection_entries' => [
        'columns' => ['user_id','collection_id','entry_id','position','created_at'],
        'keys' => ['collection_id','entry_id'], 'ts' => ['created_at'],
    ],
    'factbook_media' => [
        'columns' => ['id','user_id','entry_id','storage_path','file_name','mime_type','byte_size','width','height','caption','alt_text','source','created_at','updated_at'],
        'keys' => ['id'], 'ts' => ['created_at','updated_at'],
    ],
    'factbook_revisions' => [
        'columns' => ['id','user_id','entry_id','snapshot','created_at'],
        'keys' => ['id'], 'json' => ['snapshot'], 'ts' => ['created_at'],
    ],
    'factbook_preferences' => [
        'columns' => ['user_id','default_view','default_print_layout','source_reminders','autosave_enabled','revision_labels','created_at','updated_at'],
        'keys' => ['user_id'], 'bool' => ['source_reminders','autosave_enabled','revision_labels'], 'ts' => ['created_at','updated_at'],
    ],
];
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
        if ($isWeb) {
            $_SESSION['cssv_migration_dry_run_passed'] = true;
            out('Return to the migration link to start the verified copy.');
        }
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
    $migrationSucceeded = true;
} catch (Throwable $error) {
    if ($pdo instanceof PDO && $migrationId !== null) {
        try {
            $stmt = $pdo->prepare("UPDATE migration_runs SET status='failed',completed_at=NOW(6),notes=CONCAT(COALESCE(notes,''),' Migration process failed safely.') WHERE id=?");
            $stmt->execute([$migrationId]);
        } catch (Throwable) {
        }
    }
    if (PHP_SAPI === 'cli') {
        fwrite(STDERR, 'Migration stopped safely: ' . $error->getMessage() . PHP_EOL);
    } else {
        http_response_code(500);
        out('Migration stopped safely: ' . $error->getMessage());
    }
    exit(1);
} finally {
    if ($pdo instanceof PDO && $lockHeld) {
        try {
            $pdo->query("SELECT RELEASE_LOCK('cssv_supabase_migration')");
        } catch (Throwable) {
        }
    }
}



if ($isWeb && $apply && $migrationSucceeded) {
    $deleted = @unlink(__FILE__);
    out('One-time migration runner self-delete: ' . ($deleted ? 'successful.' : 'not confirmed; delete this file manually.'));
}

