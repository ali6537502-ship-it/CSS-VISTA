<?php
declare(strict_types=1);
// Disposable-database helper for tests/mpt/security.mjs. Refuses to run anywhere
// except the CI test database. Commands print JSON.
//   users <n> <prefix>                       complete-profile accounts + live sessions
//   mock <open-offset-min> [capacity]        a published mock with a frozen paper
//   set <slug> <column> <value>              adjust a mock setting
//   travel <slug> <minutes>                  move a mock (and its facts) into the past
//   reserved <slug> <n>                      set the slot counter (roll-length tests)
//   roll <slug> <user-id>                    the stored roll number (never via the API)
//   key <slug>                               frozen answer key by position
//   sweep                                    run the scheduler + sweeper once
//   autoschedule <iso-now>                   run the daily scheduler at a given time
//   events <slug> <type>                     count audit events
//   table <sql-count-query>                  scalar helper for assertions
if (PHP_SAPI !== 'cli' || getenv('CI') !== 'true' || getenv('CSSV_DB_NAME') !== 'cssvista_briefing_test') {
    fwrite(STDERR, "Disposable CI database required\n");
    exit(2);
}
$_SERVER['DOCUMENT_ROOT'] = dirname(__DIR__, 2) . '/dist';
require dirname(__DIR__, 2) . '/dist/api/_mpt.php';
$pdo = cssv_db();
mpt_ensure_schema($pdo);
$command = $argv[1] ?? '';
$out = static function (mixed $value): never { echo json_encode($value, JSON_UNESCAPED_SLASHES), PHP_EOL; exit(0); };

switch ($command) {
    case 'users':
        $n = (int)($argv[2] ?? 1); $prefix = preg_replace('/[^a-z0-9-]/', '', (string)($argv[3] ?? 'mpt'));
        $users = [];
        for ($i = 0; $i < $n; $i++) {
            $id = cssv_uuid_v4();
            $email = "$prefix-$i-" . bin2hex(random_bytes(3)) . '@example.invalid';
            $pdo->prepare("INSERT INTO users (id,email,password_hash,auth_source,created_at) VALUES (?,?,?,'local',NOW(6))")->execute([$id, $email, password_hash('TEST ONLY', PASSWORD_BCRYPT)]);
            $pdo->prepare("INSERT INTO student_profiles (user_id,display_name,phone,date_of_birth,gender,city,province_region,country,css_attempt_year,preparation_level,optional_subjects,education,profile_photo_path,profile_photo_mime,profile_photo_bytes,profile_completed_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW(6))")
                ->execute([$id, "TEST ONLY Candidate $i", '+923001234567', '2000-01-01', 'Other', 'TEST City', 'TEST Region', 'Pakistan', 2027, 'Starting out', '["TEST Subject"]', 'TEST Degree', 'test/photo.jpg', 'image/jpeg', 1000]);
            $token = rtrim(strtr(base64_encode(random_bytes(48)), '+/', '-_'), '=');
            $csrf = rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '=');
            $pdo->prepare('INSERT INTO auth_sessions (id,user_id,token_hash,csrf_hash,user_agent_hash,ip_prefix_hash,expires_at) VALUES (?,?,?,?,NULL,?,?)')
                ->execute([cssv_uuid_v4(), $id, cssv_hash_secret($token), cssv_hash_secret($csrf), cssv_hash_secret('test'), gmdate('Y-m-d H:i:s', time() + 86400)]);
            $users[] = ['id' => $id, 'email' => $email, 'session' => $token, 'csrf' => $csrf];
        }
        $out($users);
    case 'mock':
        $open = mpt_now_ms() + (int)round((float)($argv[2] ?? 60) * 60000);
        $mock = mpt_create_mock($pdo, ['exam_open_ms' => $open, 'capacity' => isset($argv[3]) && $argv[3] !== '' ? (int)$argv[3] : null, 'created_by' => 'test']);
        if ($mock === null) { fwrite(STDERR, "No publishable paper available\n"); exit(1); }
        $out(['slug' => $mock['public_slug'], 'id' => $mock['id']]);
    case 'set':
        $allowed = ['results_release_policy', 'answer_review_policy', 'rank_min_candidates', 'negative_marking', 'pass_percentage', 'status'];
        if (!in_array($argv[3] ?? '', $allowed, true)) { fwrite(STDERR, "column not allowed\n"); exit(1); }
        $pdo->prepare("UPDATE mpt_mocks SET `{$argv[3]}`=? WHERE public_slug=?")->execute([$argv[4] === 'NULL' ? null : $argv[4], $argv[2]]);
        $out(['ok' => true]);
    case 'travel':
        $seconds = (int)round((float)$argv[3] * 60);
        $mockId = $pdo->prepare('SELECT id FROM mpt_mocks WHERE public_slug=?');
        $mockId->execute([$argv[2]]);
        $id = (string)$mockId->fetchColumn();
        $shift = static fn(string $table, array $columns, string $where) => $pdo->prepare("UPDATE $table SET " . implode(',', array_map(static fn($c) => "$c=DATE_SUB($c, INTERVAL $seconds SECOND)", $columns)) . " WHERE $where")->execute([$id]);
        $shift('mpt_mocks', ['application_open_at', 'application_close_at', 'exam_open_at', 'entry_close_at', 'exam_end_at'], 'id=?');
        $shift('mpt_applications', ['applied_at'], 'mock_id=?');
        $shift('mpt_attempts', ['started_at', 'expires_at'], 'mock_id=?');
        $pdo->prepare("UPDATE mpt_attempts SET submitted_at=DATE_SUB(submitted_at, INTERVAL $seconds SECOND) WHERE mock_id=? AND submitted_at IS NOT NULL")->execute([$id]);
        $pdo->exec("DELETE FROM mpt_meta WHERE meta_key='last_maintenance_at'");
        $out(['ok' => true]);
    case 'reserved':
        $pdo->prepare('UPDATE mpt_sessions s JOIN mpt_mocks m ON m.id=s.mock_id SET s.reserved_count=? WHERE m.public_slug=?')->execute([(int)$argv[3], $argv[2]]);
        $out(['ok' => true]);
    case 'roll':
        $stmt = $pdo->prepare('SELECT a.roll_number FROM mpt_applications a JOIN mpt_mocks m ON m.id=a.mock_id WHERE m.public_slug=? AND a.user_id=?');
        $stmt->execute([$argv[2], $argv[3]]);
        $out(['roll_number' => $stmt->fetchColumn() ?: null]);
    case 'key':
        $stmt = $pdo->prepare('SELECT q.position,q.correct_index FROM mpt_mock_questions q JOIN mpt_mocks m ON m.id=q.mock_id WHERE m.public_slug=? ORDER BY q.position');
        $stmt->execute([$argv[2]]);
        $out(array_map('intval', array_column($stmt->fetchAll(), 'correct_index', 'position')));
    case 'sweep':
        $out(mpt_maintain($pdo, true));
    case 'autoschedule':
        putenv('CSSV_MPT_AUTO_SCHEDULE=on');
        $before = (int)$pdo->query('SELECT COUNT(*) FROM mpt_mocks WHERE schedule_key IS NOT NULL')->fetchColumn();
        mpt_auto_schedule($pdo, (int)mpt_ms($argv[2]));
        mpt_auto_schedule($pdo, (int)mpt_ms($argv[2])); // idempotent
        $rows = $pdo->query("SELECT schedule_key,exam_open_at,application_open_at,application_close_at,exam_end_at,status FROM mpt_mocks WHERE schedule_key IS NOT NULL ORDER BY exam_open_at")->fetchAll();
        $out(['created' => count($rows) - $before, 'mocks' => $rows]);
    case 'events':
        $stmt = $pdo->prepare('SELECT COUNT(*) FROM mpt_events e JOIN mpt_mocks m ON m.id=e.mock_id WHERE m.public_slug=? AND e.event_type=?');
        $stmt->execute([$argv[2], $argv[3]]);
        $out(['count' => (int)$stmt->fetchColumn()]);
    case 'table':
        if (!preg_match('/^SELECT COUNT\(\*\) FROM mpt_[a-z_]+( WHERE [a-z_=\'A-Z0-9 .-]+)?$/', $argv[2] ?? '')) { fwrite(STDERR, "query not allowed\n"); exit(1); }
        $out(['value' => (int)$pdo->query($argv[2])->fetchColumn()]);
}
fwrite(STDERR, "Unknown command\n");
exit(1);
