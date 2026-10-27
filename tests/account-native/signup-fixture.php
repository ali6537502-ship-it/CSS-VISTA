<?php
declare(strict_types=1);
// Repeated UI runs must not change production rate limits or discard student data.
if (PHP_SAPI !== 'cli' || getenv('CI') !== 'true' || getenv('CSSV_DB_NAME') !== 'cssvista_briefing_test') {
    throw new RuntimeException('Disposable signup fixture database required');
}
require_once dirname(__DIR__, 2) . '/public/api/_bootstrap_core.php';
$pdo = cssv_db();
if ($pdo->query('SELECT DATABASE()')->fetchColumn() !== 'cssvista_briefing_test') {
    throw new RuntimeException('Unexpected fixture database');
}
// Only the requested counters belonging to this harness's existing TEST ONLY
// users. Keep accounts, passwords, sessions, records and all other security events.
$recovery = ($argv[1] ?? '') === 'recovery';
$query = $pdo->prepare("SELECT u.email FROM users u JOIN student_profiles p ON p.user_id=u.id WHERE u.email LIKE ? AND p.display_name LIKE 'TEST ONLY%'");
$query->execute([$recovery ? 'recovery-browser-%@example.invalid' : 'signup-%@example.invalid']);
$statement = $pdo->prepare('DELETE FROM login_security_events WHERE event_type=? AND user_id IS NULL AND email_hash=?');
foreach ($query->fetchAll(PDO::FETCH_COLUMN) as $email) $statement->execute([$recovery ? 'reset-request' : 'account-register', cssv_hash_secret(strtolower($email))]);
echo "Prepared only disposable account-fixture counters; native limiter unchanged.\n";
