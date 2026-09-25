<?php
declare(strict_types=1);
// Resume on the same device without re-verification (D-16).
require_once dirname(__DIR__) . '/_mpt.php';
[$pdo, $session] = mpt_hot_request('GET');
cssv_json(['ok' => true] + mpt_resume($pdo, $session, $_GET['mock'] ?? null, $_GET['client_id'] ?? null));
