<?php
declare(strict_types=1);
// Real database regression: schedule migration preserves identities and papers.
if (getenv('CI') !== 'true' || getenv('CSSV_DB_NAME') !== 'cssvista_briefing_test') throw new RuntimeException('Disposable CI database required.');
require dirname(__DIR__, 2) . '/dist/api/_mpt.php';
$pdo = cssv_db();
mpt_ensure_schema($pdo);
$ids = [];
$user = cssv_uuid_v4();
$key = 'schedule_three_daily_v1';
$originalMarker = mpt_meta_get($pdo, $key);
$now = (int)mpt_ms('2031-03-10T08:00:00Z'); // 13:00 PKT
$assert = static function (bool $ok, string $label): void { if (!$ok) throw new RuntimeException($label); echo "ok $label\n"; };
try {
    $pdo->prepare("INSERT INTO users(id,email,password_hash,auth_source,created_at) VALUES(?,?,?,'local',NOW(6))")->execute([$user, 'three-daily-' . bin2hex(random_bytes(4)) . '@example.invalid', password_hash('TEST ONLY', PASSWORD_BCRYPT)]);
    $create = function (string $iso, ?string $schedule, string $by = 'system') use ($pdo, &$ids): array {
        $row = mpt_create_mock($pdo, ['exam_open_ms' => (int)mpt_ms($iso), 'schedule_key' => $schedule, 'created_by' => $by]);
        if (!$row) throw new RuntimeException('Test paper unavailable.');
        $ids[] = $row['id'];
        return $row;
    };
    $first = $create('2031-03-10T10:00:00Z', 'daily-2031-03-10-1500');
    $second = $create('2031-03-10T17:30:00Z', 'daily-2031-03-10-2230');
    $third = $create('2031-03-11T10:00:00Z', 'daily-2031-03-11-1500');
    $manual = $create('2031-03-10T13:00:00Z', null, 'owner');
    $near = $create('2031-03-10T08:10:00Z', 'daily-2031-03-10-1310');
    $held = $create('2026-09-29T10:00:00Z', 'daily-2026-09-29-1500');
    $session = mpt_session_for($pdo, $first['id']);
    $app = cssv_uuid_v4();
    $pdo->prepare('INSERT INTO mpt_applications(id,application_code,user_id,mock_id,session_id,roll_number,applied_at) VALUES(?,?,?,?,?,?,?)')->execute([$app, 'MPTA-999-234567', $user, $first['id'], $session['id'], '123456', mpt_db_time($now - 60000)]);
    $pdo->prepare('UPDATE mpt_sessions SET reserved_count=1 WHERE id=?')->execute([$session['id']]);
    $read = static function (string $id) use ($pdo): array { $s = $pdo->prepare('SELECT * FROM mpt_mocks WHERE id=?'); $s->execute([$id]); return $s->fetch(); };
    $paper = static function (string $id) use ($pdo): array { $s = $pdo->prepare('SELECT * FROM mpt_mock_questions WHERE mock_id=? ORDER BY position'); $s->execute([$id]); return $s->fetchAll(); };
    $beforePaper = $paper($first['id']);
    $beforeFirst = $read($first['id']);
    $untouched = [$read($manual['id']), $read($near['id']), $read($held['id'])];
    $pdo->prepare('DELETE FROM mpt_meta WHERE meta_key=?')->execute([$key]);
    $assert(mpt_migrate_three_daily($pdo, $now) === 3, 'only safely unstarted automatic mocks move');
    $assert($read($first['id'])['exam_open_at'] === mpt_db_time((int)mpt_ms('2031-03-10T09:00:00Z')), 'afternoon starts at 14:00 PKT');
    $assert($read($second['id'])['exam_open_at'] === mpt_db_time((int)mpt_ms('2031-03-10T17:30:00Z')), 'manual 18:00 sitting is respected');
    $assert($read($third['id'])['exam_open_at'] === mpt_db_time((int)mpt_ms('2031-03-11T09:00:00Z')), 'future schedule stays chronological');
    $assert([$read($manual['id']), $read($near['id']), $read($held['id'])] === $untouched, 'manual, near-start and September held mocks remain unchanged');
    $assert($paper($first['id']) === $beforePaper && $read($first['id'])['paper_ref'] === $beforeFirst['paper_ref'], 'frozen questions and paper identity remain unchanged');
    $s = $pdo->prepare('SELECT roll_number,mock_id,session_id FROM mpt_applications WHERE id=?'); $s->execute([$app]);
    $assert($s->fetch() === ['roll_number' => '123456', 'mock_id' => $first['id'], 'session_id' => $session['id']], 'application and roll number survive migration');
    $updated = mpt_session_for($pdo, $first['id']);
    $assert((int)$updated['reserved_count'] === 1 && $updated['starts_at'] === $read($first['id'])['exam_open_at'], 'session timing and reservation count remain consistent');
    $assert(mpt_migrate_three_daily($pdo, $now) === 0, 'migration is idempotent');
    // A September held paper reintroduced with different IDs must still be blocked.
    $historical = $paper($held['id']);
    $pdo->prepare("UPDATE mpt_mock_questions SET question_id=CONCAT('test-alias-',question_id) WHERE mock_id=?")->execute([$held['id']]);
    $pdo->prepare('UPDATE mpt_mocks SET paper_ref=NULL WHERE id=?')->execute([$held['id']]);
    $fresh = $create('2031-03-12T09:00:00Z', null, 'owner');
    $assert($read($fresh['id'])['paper_ref'] !== mpt_paper_manifest()['series'] . ':6', 'September completed paper is rejected even with changed IDs');
    $oldKeys = array_fill_keys(array_map(static fn($q) => mpt_question_text_key($q['stem']), $historical), true);
    foreach ($paper($fresh['id']) as $q) $assert(!isset($oldKeys[mpt_question_text_key($q['stem'])]), 'new question does not repeat the held paper');
} finally {
    // Only this guarded test's records are removed.
    foreach ($ids as $id) {
        foreach (['mpt_events', 'mpt_applications', 'mpt_mock_questions', 'mpt_sessions', 'mpt_mocks'] as $table) {
            $column = $table === 'mpt_mocks' ? 'id' : 'mock_id';
            $pdo->prepare("DELETE FROM $table WHERE $column=?")->execute([$id]);
        }
    }
    $pdo->prepare('DELETE FROM users WHERE id=?')->execute([$user]);
    $pdo->prepare('DELETE FROM mpt_meta WHERE meta_key=?')->execute([$key]);
    if ($originalMarker !== null) mpt_meta_set($pdo, $key, $originalMarker);
    mpt_meta_set($pdo, 'mock_number_seq', (string)$pdo->query('SELECT COALESCE(MAX(mock_number),0) FROM mpt_mocks')->fetchColumn());
}
echo "Three-daily schedule migration verified.\n";
