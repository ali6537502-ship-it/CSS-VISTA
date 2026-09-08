<?php
declare(strict_types=1);
require_once __DIR__ . '/../_bootstrap.php';
require_once __DIR__ . '/../_admin_auth.php';
cssv_require_method('POST');
$pdo = cssv_db();
cssv_admin_ensure_schema($pdo);
$body = cssv_request_json();
$email = cssv_normalize_email($body['email'] ?? '');
$purpose = (string)($body['purpose'] ?? '');
if (!cssv_is_owner_email($email) || !in_array($purpose, ['setup', 'reset'], true)) cssv_fail('This admin account is not available.', 403, 'owner_only');
$check = $pdo->prepare('SELECT 1 FROM admin_accounts WHERE email=? AND disabled_at IS NULL LIMIT 1');
$check->execute([$email]);
$configured = (bool)$check->fetchColumn();
if ($purpose === 'setup' && $configured) cssv_fail('The private admin account already exists. Use Sign in or Forgot password.', 409, 'already_configured');
if ($purpose === 'reset' && !$configured) cssv_fail('Create the private admin account first.', 409, 'not_configured');
cssv_admin_create_code($pdo, $email, $purpose);
cssv_json(['ok' => true, 'message' => 'A six-digit code was sent from the CSS Vista website server.']);
