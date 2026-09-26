<?php
declare(strict_types=1);
// Dumps the papers actually frozen in the database for every mock that has not
// ended, so they can be audited against the editorial release:
//   php server/bin/mpt-frozen-audit.php /absolute/path/to/public_html > frozen.json
//   node scripts/mpt/audit-frozen.mjs frozen.json
// Output contains answer keys: keep it private and delete it after the audit.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
$root = $argv[1] ?? dirname(__DIR__, 2) . '/public';
require_once rtrim($root, '/') . '/api/_mpt.php';
$pdo = cssv_db();
mpt_ensure_schema($pdo);
$now = mpt_now_ms();
$mocks = $pdo->prepare('SELECT * FROM mpt_mocks WHERE exam_end_at > ? ORDER BY exam_open_at');
$mocks->execute([mpt_db_time($now)]);
$attempts = $pdo->prepare('SELECT COUNT(*) FROM mpt_attempts WHERE mock_id=?');
$out = ['generated_at' => mpt_iso($now), 'manifest_series' => mpt_paper_manifest()['series'] ?? null, 'mocks' => []];
foreach ($mocks->fetchAll() as $mock) {
    $attempts->execute([$mock['id']]);
    $paper = mpt_frozen_paper($pdo, (string)$mock['id']);
    $out['mocks'][] = [
        'slug' => $mock['public_slug'],
        'status' => $mock['status'],
        'exam_open_at' => mpt_iso(mpt_ms((string)$mock['exam_open_at'])),
        'started' => mpt_ms((string)$mock['exam_open_at']) <= $now,
        'attempts' => (int)$attempts->fetchColumn(),
        'paper_ref' => $mock['paper_ref'],
        'paper_series' => $mock['paper_series'],
        'editorial_release' => mpt_series_release($pdo, $mock['paper_series']),
        'fingerprint' => $paper['fingerprint'],
        'questions' => array_map(static fn($r) => [
            'id' => $r['question_id'], 'section' => $r['section'], 'topic' => $r['topic'], 'difficulty' => $r['difficulty'],
            'q' => $r['stem'], 'o' => json_decode((string)$r['options'], true), 'a' => (int)$r['correct_index'], 'e' => $r['explanation'],
        ], $paper['rows']),
    ];
}
echo json_encode($out, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR) . PHP_EOL;
