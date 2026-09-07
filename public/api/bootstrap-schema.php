<?php
declare(strict_types=1);
require_once __DIR__ . '/_bootstrap.php';
cssv_require_method('POST');

$provided = trim((string)($_SERVER['HTTP_X_CSSV_BOOTSTRAP_TOKEN'] ?? ''));
$expected = trim((string)cssv_env('CSSV_BOOTSTRAP_TOKEN', ''));
if ($provided === '' || $expected === '' || !hash_equals(hash('sha256', $expected), hash('sha256', $provided))) {
    cssv_fail('Not found.', 404, 'not_found');
}

$pdo = cssv_db();
$coreNames = ['users','student_profiles','auth_sessions','migration_runs'];
$placeholders = implode(',', array_fill(0, count($coreNames), '?'));
$coreStmt = $pdo->prepare("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name IN ($placeholders)");
$coreStmt->execute($coreNames);
$coreCount = (int)$coreStmt->fetchColumn();

if ($coreCount === 4) {
    cssv_json(['ok' => true, 'schema_ready' => true, 'already_installed' => true]);
}

$totalTables = (int)$pdo->query('SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE()')->fetchColumn();
if ($totalTables !== 0) {
    cssv_fail('Target database is not empty, so automatic bootstrap was refused.', 409, 'database_not_empty');
}

// Hostinger can suppress .sql files in a public deployment. Ship the same
// non-sensitive schema payload as a blocked .txt asset for local PHP reads.
$schemaFile = __DIR__ . '/_bootstrap_schema.txt';
$raw = @file_get_contents($schemaFile);
if (!is_string($raw) || trim($raw) === '') {
    cssv_fail('Bootstrap schema is unavailable.', 503, 'schema_unavailable');
}

try {
    $sql = preg_replace('/^\s*--.*$/m', '', $raw);
    if (!is_string($sql)) {
        throw new RuntimeException('schema_parse_failed');
    }
    $statements = preg_split('/;\s*(?:\r?\n|$)/', $sql);
    if (!is_array($statements)) {
        throw new RuntimeException('schema_parse_failed');
    }
    foreach ($statements as $statement) {
        $statement = trim($statement);
        if ($statement !== '') {
            $pdo->exec($statement);
        }
    }

    $indexExists = static function (PDO $pdo, string $table, string $index): bool {
        $stmt = $pdo->prepare('SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?');
        $stmt->execute([$table, $index]);
        return (int)$stmt->fetchColumn() > 0;
    };
    if (!$indexExists($pdo, 'batch_registrations', 'batch_registration_email_uidx')) {
        $pdo->exec('ALTER TABLE batch_registrations ADD UNIQUE KEY batch_registration_email_uidx (batch_id,email)');
    }
    if (!$indexExists($pdo, 'login_security_events', 'login_security_event_type_time_idx')) {
        $pdo->exec('ALTER TABLE login_security_events ADD KEY login_security_event_type_time_idx (event_type,occurred_at)');
    }

    $constraintExists = static function (PDO $pdo, string $table, string $constraint): bool {
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_schema = DATABASE() AND table_name = ? AND constraint_type = 'CHECK' AND constraint_name = ?");
        $stmt->execute([$table, $constraint]);
        return (int)$stmt->fetchColumn() > 0;
    };
    if (!$constraintExists($pdo, 'student_profiles', 'student_profiles_photo_size_15k_chk')) {
        $pdo->exec('ALTER TABLE student_profiles ADD CONSTRAINT student_profiles_photo_size_15k_chk CHECK (profile_photo_bytes IS NULL OR profile_photo_bytes <= 15360)');
    }
    if (!$constraintExists($pdo, 'batch_registrations', 'batch_registrations_photo_size_15k_chk')) {
        $pdo->exec('ALTER TABLE batch_registrations ADD CONSTRAINT batch_registrations_photo_size_15k_chk CHECK (photo_bytes <= 15360)');
    }

    $coreStmt->execute($coreNames);
    $ready = (int)$coreStmt->fetchColumn() === 4;
    if (!$ready) {
        throw new RuntimeException('schema_verification_failed');
    }

    cssv_json([
        'ok' => true,
        'schema_ready' => true,
        'already_installed' => false,
        'table_count' => (int)$pdo->query('SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE()')->fetchColumn(),
    ]);
} catch (Throwable $error) {
    error_log('CSSV one-time schema bootstrap failed: ' . $error->getMessage());
    cssv_fail('Schema bootstrap failed safely. Existing Supabase production remains unchanged.', 500, 'bootstrap_failed');
}
