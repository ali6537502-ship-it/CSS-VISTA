<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/_bootstrap.php';
require_once dirname(__DIR__) . '/_current_affairs.php';
cssv_require_method('POST');
$pdo=null;
try {
    $authorization=(string)($_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '');
    if (!preg_match('/^Bearer (cssv_ca_[A-Za-z0-9_-]{64})$/D',$authorization,$match)) cssv_fail('A valid publishing token is required.',401,'publisher_authentication_required');
    $pdo=cssv_db();
    // Schema setup and token issuance are restricted to existing authenticated
    // account/admin entry points. Anonymous callers cannot trigger a migration.
    $q=$pdo->prepare('SELECT id FROM current_affairs_publish_tokens WHERE token_hash=? AND revoked_at IS NULL AND expires_at>NOW(6)');
    $q->execute([cssv_hash_secret($match[1])]);$id=$q->fetchColumn();
    if (!$id) cssv_fail('The publishing token is invalid or expired.',401,'publisher_authentication_required');
    cssv_enforce_rate_limit($pdo,'ca_publish',null,60,900);
    cssv_log_security_event($pdo,'ca_publish');
    $result=ca_publish($pdo,ca_request_json());
    $pdo->prepare('UPDATE current_affairs_publish_tokens SET last_used_at=NOW(6) WHERE id=?')->execute([$id]);
    cssv_json(['ok'=>true]+$result);
} catch (Throwable $e) { ca_problem($e,$pdo,true); }
