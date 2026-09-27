<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/_mpt_question_bank.php';
[$pdo, $session] = mpt_candidate_request('GET');
cssv_json(['ok' => true] + mpt_question_bank_paper($pdo, $session, $_GET['mock'] ?? null) + mpt_server_clock());
