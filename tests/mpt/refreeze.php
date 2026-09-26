<?php
declare(strict_types=1);
// Integration test for re-freezing unstarted mocks from a newer editorial release
// (docs/mpt/DECISIONS.md D-54). Needs the isolated CI database:
//   CI=true CSSV_DB_NAME=cssvista_briefing_test ... php tests/current-affairs/setup.php
//   CI=true CSSV_DB_NAME=cssvista_briefing_test ... php tests/mpt/refreeze.php
if (getenv('CI') !== 'true' || getenv('CSSV_DB_NAME') !== 'cssvista_briefing_test') throw new RuntimeException('Isolated CI database required.');

$phase = $argv[1] ?? 'driver';
$fixtures = sys_get_temp_dir() . '/cssv-mpt-refreeze';

function fixture_paper(string $prefix, int $n): array
{
    $sections = ['Islamic Studies' => 20, 'Urdu' => 20, 'English' => 50, 'General Abilities' => 60, 'General Knowledge' => 50];
    $rows = [];
    foreach ($sections as $section => $count) {
        for ($i = 1; $i <= $count; $i++) {
            $rows[] = ['id' => sprintf('%s-p%d-%s-%d', $prefix, $n, substr(md5($section), 0, 4), $i), 'section' => $section, 'topic' => 'Fixture', 'difficulty' => 'Intermediate',
                'q' => "$prefix paper $n $section question $i?", 'o' => ['One', 'Two', 'Three', 'Four'], 'a' => $i % 4, 'e' => 'Fixture explanation.'];
        }
    }
    return $rows;
}

function write_manifest(string $dir, array $manifest, array $papers): void
{
    if (!is_dir($dir)) mkdir($dir, 0777, true);
    foreach (glob("$dir/*.php") ?: [] as $file) unlink($file);
    $opaque = static fn($v) => "<?php\nreturn '" . base64_encode(json_encode($v)) . "';\n";
    foreach ($papers as $i => $paper) file_put_contents(sprintf('%s/paper-%03d.php', $dir, $i + 1), $opaque($paper));
    $manifest['papers'] = array_map(static fn($p, $i) => ['index' => $i + 1, 'count' => count($p)], $papers, array_keys($papers));
    file_put_contents("$dir/manifest.php", $opaque($manifest));
}

function run_phase(string $phase, string $dir): string
{
    $env = getenv();
    $env['CSSV_MPT_TEST_PAPER_DIR'] = $dir;
    $proc = proc_open([PHP_BINARY, __FILE__, $phase], [1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes, null, $env);
    $out = stream_get_contents($pipes[1]) . stream_get_contents($pipes[2]);
    $code = proc_close($proc);
    if ($code !== 0) { fwrite(STDERR, $out); exit(1); }
    return $out;
}

$failures = 0;
function check(bool $ok, string $label): void
{
    global $failures;
    if (!$ok) { $failures++; fwrite(STDERR, "FAIL $label\n"); } else echo "ok $label\n";
}

if ($phase === 'driver') {
    write_manifest("$fixtures/legacy", ['series' => 'legacyseries0001', 'publishable' => true], [fixture_paper('legacy', 1), fixture_paper('legacy', 2), fixture_paper('legacy', 3), fixture_paper('legacy', 4)]);
    write_manifest("$fixtures/release2", ['series' => 'release2series001', 'editorial_release' => 2, 'replace_unstarted_below_release' => 2, 'publishable' => true], [fixture_paper('r2', 1), fixture_paper('r2', 2), fixture_paper('r2', 3)]);
    write_manifest("$fixtures/release3-empty", ['series' => 'release3series001', 'editorial_release' => 3, 'replace_unstarted_below_release' => 3, 'publishable' => true], [fixture_paper('legacy', 3)]);
    echo run_phase('seed', "$fixtures/legacy");
    echo run_phase('refreeze', "$fixtures/release2");
    echo run_phase('exhausted', "$fixtures/release3-empty");
    echo "MPT refreeze integration: done\n";
    exit(0);
}

require_once __DIR__ . '/../../public/api/_mpt.php';
$pdo = cssv_db();
mpt_ensure_schema($pdo);
$state = "$fixtures/state.json";

if ($phase === 'seed') {
    foreach (['mpt_paper_replacements', 'mpt_paper_backups', 'mpt_attempt_answers', 'mpt_attempts', 'mpt_applications', 'mpt_sessions', 'mpt_mock_questions', 'mpt_mocks', 'mpt_meta', 'mpt_candidates'] as $table) $pdo->exec("DELETE FROM $table");
    $now = mpt_now_ms();
    $userId = cssv_uuid_v4();
    $pdo->prepare("INSERT INTO users(id,email,password_hash,auth_source,email_verified_at,created_at) VALUES(?,?,?,'local',NOW(6),NOW(6))")
        ->execute([$userId, 'refreeze-' . substr($userId, 0, 8) . '@example.invalid', password_hash('TEST ONLY', PASSWORD_BCRYPT)]);
    $mocks = [];
    foreach (['future' => 2 * 86400000, 'future_no_apps' => 3 * 86400000, 'started' => 86400000, 'soon' => 5 * 86400000] as $label => $offset) {
        $mock = mpt_create_mock($pdo, ['exam_open_ms' => $now + $offset, 'schedule_key' => "refreeze-$label"]);
        check($mock !== null, "seed created $label mock with a legacy paper");
        $mocks[$label] = $mock['id'];
    }
    // "started": exam opened an hour ago and a candidate is sitting it.
    $pdo->prepare('UPDATE mpt_mocks SET exam_open_at=?, entry_close_at=?, exam_end_at=? WHERE id=?')
        ->execute([mpt_db_time($now - 3600000), mpt_db_time($now - 3000000), mpt_db_time($now + 8400000), $mocks['started']]);
    // "soon": opens in five minutes — inside the safety margin.
    $pdo->prepare('UPDATE mpt_mocks SET exam_open_at=?, application_close_at=?, entry_close_at=?, exam_end_at=? WHERE id=?')
        ->execute([mpt_db_time($now + 300000), mpt_db_time($now + 300000), mpt_db_time($now + 900000), mpt_db_time($now + 12300000), $mocks['soon']]);
    $apps = [];
    foreach (['future', 'started'] as $label) {
        $session = $pdo->prepare('SELECT id FROM mpt_sessions WHERE mock_id=?');
        $session->execute([$mocks[$label]]);
        $appId = cssv_uuid_v4();
        $pdo->prepare("INSERT INTO mpt_applications (id,application_code,user_id,mock_id,session_id,roll_number,status,applied_at) VALUES (?,?,?,?,?,?,'ACTIVE',?)")
            ->execute([$appId, 'MPTA-900-' . strtoupper(substr(md5($label), 0, 6)), $userId, $mocks[$label], $session->fetchColumn(), $label === 'future' ? '1234565' : '7654326', mpt_db_time($now - 60000)]);
        $apps[$label] = $appId;
    }
    $pdo->prepare("INSERT INTO mpt_attempts (id,application_id,user_id,mock_id,status,started_at,expires_at,active_session_id) VALUES (?,?,?,?,'IN_PROGRESS',?,?,?)")
        ->execute([cssv_uuid_v4(), $apps['started'], $userId, $mocks['started'], mpt_db_time($now - 3000000), mpt_db_time($now + 8400000), str_repeat('a', 64)]);
    $fingerprints = [];
    foreach ($mocks as $label => $id) $fingerprints[$label] = mpt_frozen_paper($pdo, $id)['fingerprint'];
    file_put_contents($state, json_encode(['mocks' => $mocks, 'apps' => $apps, 'fingerprints' => $fingerprints]));
    exit($failures ? 1 : 0);
}

$seed = json_decode((string)file_get_contents($state), true);
$mock = static function (string $id) use ($pdo): array { $s = $pdo->prepare('SELECT * FROM mpt_mocks WHERE id=?'); $s->execute([$id]); return $s->fetch(); };

if ($phase === 'refreeze') {
    $before = array_map($mock, $seed['mocks']);
    $appBefore = $pdo->query('SELECT id,mock_id,session_id,roll_number,application_code,status FROM mpt_applications ORDER BY id')->fetchAll();
    $result = mpt_refreeze_unstarted($pdo, mpt_now_ms(), 60);
    check($result['replaced'] === 2, 'exactly the two unstarted, unattempted mocks outside the margin are re-frozen');
    foreach (['future', 'future_no_apps'] as $label) {
        $after = $mock($seed['mocks'][$label]);
        check($after['paper_series'] === 'release2series001', "$label now uses the new release");
        check(mpt_frozen_paper($pdo, $seed['mocks'][$label])['fingerprint'] !== $seed['fingerprints'][$label], "$label paper changed");
        foreach (['id', 'public_slug', 'mock_number', 'schedule_key', 'exam_open_at', 'exam_end_at', 'application_open_at', 'application_close_at', 'entry_close_at', 'status'] as $col) {
            check($after[$col] === $before[$label][$col], "$label keeps $col");
        }
        $count = $pdo->prepare('SELECT COUNT(*) FROM mpt_mock_questions WHERE mock_id=? AND question_id LIKE ?');
        $count->execute([$seed['mocks'][$label], 'r2-%']);
        check((int)$count->fetchColumn() === 200, "$label has 200 new questions");
    }
    foreach (['started', 'soon'] as $label) {
        check(mpt_frozen_paper($pdo, $seed['mocks'][$label])['fingerprint'] === $seed['fingerprints'][$label], "$label paper untouched");
        check($mock($seed['mocks'][$label])['paper_series'] === 'legacyseries0001', "$label keeps its series");
    }
    check($pdo->query('SELECT id,mock_id,session_id,roll_number,application_code,status FROM mpt_applications ORDER BY id')->fetchAll() === $appBefore, 'applications, sessions and roll numbers unchanged');
    check((int)$pdo->query('SELECT COUNT(*) FROM mpt_attempts')->fetchColumn() === 1, 'attempts unchanged');
    $log = $pdo->query('SELECT r.*, b.fingerprint AS backup_fp, b.question_count FROM mpt_paper_replacements r JOIN mpt_paper_backups b ON b.id=r.backup_id')->fetchAll();
    check(count($log) === 2, 'two replacement log rows with backups');
    foreach ($log as $row) {
        $label = array_search($row['mock_id'], $seed['mocks'], true);
        check($row['old_fingerprint'] === $seed['fingerprints'][$label] && $row['backup_fp'] === $row['old_fingerprint'], "$label backup fingerprint matches the old paper");
        check((int)$row['question_count'] === 200 && $row['old_series'] === 'legacyseries0001' && $row['new_series'] === 'release2series001', "$label log records old and new series");
        check($row['new_fingerprint'] === mpt_frozen_paper($pdo, $row['mock_id'])['fingerprint'], "$label log records the new fingerprint");
        check(str_contains($row['reason'], 'editorial release 2'), "$label log records the reason");
    }
    $again = mpt_refreeze_unstarted($pdo, mpt_now_ms(), 60);
    check($again['replaced'] === 0, 're-running is idempotent');
    $overlap = $pdo->query('SELECT question_id, COUNT(DISTINCT mock_id) c FROM mpt_mock_questions GROUP BY question_id HAVING c > 1')->fetchAll();
    check(count($overlap) === 0, 'no question is frozen into two mocks');
    exit($failures ? 1 : 0);
}

if ($phase === 'exhausted') {
    // Release 3 supersedes release 2, but its only paper overlaps a frozen one: nothing may be lost.
    $before = mpt_frozen_paper($pdo, $seed['mocks']['future'])['fingerprint'];
    $result = mpt_refreeze_unstarted($pdo, mpt_now_ms(), 60);
    check($result['replaced'] === 0, 'no replacement without a fresh paper');
    check(mpt_frozen_paper($pdo, $seed['mocks']['future'])['fingerprint'] === $before, 'the existing paper survives a failed re-freeze (transaction rolled back)');
    check((int)$pdo->query("SELECT COUNT(*) FROM mpt_mock_questions WHERE mock_id=" . $pdo->quote($seed['mocks']['future']))->fetchColumn() === 200, 'no partial paper left behind');
    check((int)$pdo->query('SELECT COUNT(*) FROM mpt_paper_backups')->fetchColumn() === 2, 'no orphan backup from the rolled-back attempt');
    check(mpt_meta_get($pdo, 'paper_runway_exhausted_at') !== null, 'runway exhaustion recorded');
    exit($failures ? 1 : 0);
}
