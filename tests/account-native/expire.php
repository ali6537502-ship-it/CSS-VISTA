<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'||getenv('CI')!=='true'||getenv('CSSV_DB_NAME')!=='cssvista_briefing_test')exit(1);
require_once dirname(__DIR__,2).'/public/api/_bootstrap_core.php';
$email=$argv[1]??'';if(!str_ends_with($email,'@example.invalid'))exit(1);
$pdo=cssv_db();
if (($argv[2]??'')==='clear-test-rate') { $pdo->exec("DELETE FROM login_security_events WHERE event_type='reset-failed'"); exit; }
foreach(['password_reset_tokens','account_verification_tokens','account_reset_codes'] as $table)$pdo->prepare("UPDATE $table SET expires_at=DATE_SUB(NOW(6),INTERVAL 1 SECOND) WHERE user_id IN (SELECT id FROM users WHERE email=?)")->execute([$email]);
