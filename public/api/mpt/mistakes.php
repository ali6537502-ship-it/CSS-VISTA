<?php
declare(strict_types=1);
// The candidate's wrong-answer bank across completed official mocks.
require_once dirname(__DIR__) . '/_mpt.php';
[$pdo, $session] = mpt_candidate_request('GET');
$subject = isset($_GET['subject']) ? mb_substr((string)$_GET['subject'], 0, 80) : null;
cssv_json(['ok' => true] + mpt_mistakes($pdo, $session, max(1, (int)($_GET['page'] ?? 1)), $subject) + mpt_server_clock());
