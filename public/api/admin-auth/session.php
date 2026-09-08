<?php
declare(strict_types=1);
require_once __DIR__ . '/../_bootstrap.php';
require_once __DIR__ . '/../_admin_auth.php';
cssv_require_method('GET');
$pdo = cssv_db();
cssv_admin_ensure_schema($pdo);
$session = cssv_admin_current_session($pdo, true);
if (!$session) cssv_fail('Private admin sign-in required.', 401, 'admin_authentication_required');
cssv_json(['ok' => true, 'authenticated' => true, 'email' => $session['email'], 'csrf_token' => (string)($_COOKIE[CSSV_ADMIN_CSRF_COOKIE] ?? '')]);
