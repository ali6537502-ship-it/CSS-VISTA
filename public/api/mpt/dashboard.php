<?php
declare(strict_types=1);
// One call for the whole My CSS Vista MPT area (Section 20 budget).
require_once dirname(__DIR__) . '/_mpt.php';
[$pdo, $session] = mpt_candidate_request('GET');
cssv_json(['ok' => true] + mpt_dashboard($pdo, $session));
