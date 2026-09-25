<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/_mpt.php';
[$pdo, $session] = mpt_candidate_request('GET');
$filter = in_array($_GET['status'] ?? '', ['completed', 'absent', 'upcoming', 'cancelled'], true) ? (string)$_GET['status'] : null;
cssv_json(['ok' => true] + mpt_history($pdo, $session, max(1, (int)($_GET['page'] ?? 1)), $filter) + mpt_server_clock());
