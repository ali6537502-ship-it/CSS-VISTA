<?php
declare(strict_types=1);
// Owner-only application read: ?code=MPTA-… or ?mock=mpt-mock-NNN (apply screen).
require_once dirname(__DIR__) . '/_mpt.php';
[$pdo, $session] = mpt_candidate_request('GET');
$now = mpt_now_ms();
if (isset($_GET['code'])) {
    $application = mpt_application_by_code($pdo, (string)$session['user_id'], $_GET['code']);
    if (!$application) cssv_fail('Application not found.', 404, 'not_found');
    $mock = mpt_mock_by_id($pdo, (string)$application['mock_id']);
} else {
    $mock = mpt_mock_by_slug($pdo, $_GET['mock'] ?? null);
    if (!$mock) cssv_fail('This MPT Mock was not found.', 404, 'mock_not_found');
    $application = mpt_application_for($pdo, (string)$session['user_id'], (string)$mock['id']);
}
cssv_json(['ok' => true, 'candidate' => mpt_candidate_profile($pdo, $session)] + mpt_card($pdo, $mock, $application, $now, true) + mpt_server_clock());
