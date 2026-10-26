<?php
declare(strict_types=1);
// Repeated UI runs must not change production rate limits or discard student data.
if (getenv('CI') !== 'true' || getenv('CSSV_DB_NAME') !== 'cssvista_briefing_test') {
    throw new RuntimeException('Disposable signup fixture database required');
}
require_once dirname(__DIR__, 2) . '/public/api/_bootstrap_core.php';
$pdo = cssv_db();
if ($pdo->query('SELECT DATABASE()')->fetchColumn() !== 'cssvista_briefing_test') {
    throw new RuntimeException('Unexpected fixture database');
}
// Only the registration counters belonging to this harness's existing TEST ONLY
// users. Keep accounts, passwords, sessions, records and all other security events.
$emails = $pdo->query("SELECT u.email FROM users u JOIN student_profiles p ON p.user_id=u.id WHERE u.email LIKE 'signup-%@example.invalid' AND p.display_name LIKE 'TEST ONLY%'")->fetchAll(PDO::FETCH_COLUMN);
$statement = $pdo->prepare("DELETE FROM login_security_events WHERE event_type='account-register' AND user_id IS NULL AND email_hash=?");
foreach ($emails as $email) $statement->execute([cssv_hash_secret(strtolower($email))]);
echo "Prepared only disposable signup-fixture registration counters; native limiter unchanged.\n";
