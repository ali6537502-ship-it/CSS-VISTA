<?php
declare(strict_types=1);
// Pure MPT rule tests. Needs no database: `php tests/mpt/unit.php`.
require __DIR__ . '/../../public/api/_mpt_core.php';
require __DIR__ . '/../../public/api/_mpt_schema.php';

$failures = 0; $passes = 0;
function check(bool $ok, string $label): void
{
    global $failures, $passes;
    if ($ok) { $passes++; return; }
    $failures++;
    fwrite(STDERR, "FAIL: $label\n");
}

// State engine: every shared fixture.
$fixture = json_decode((string)file_get_contents(__DIR__ . '/../fixtures/mpt-state-cases.json'), true, 32, JSON_THROW_ON_ERROR);
foreach ($fixture['cases'] as $case) {
    $state = mpt_candidate_state($case['mock'], $case['session'], $case['application'], $case['attempt'], (int)mpt_ms($case['now']), $case['signedIn']);
    foreach ($case['expect'] as $key => $expected) {
        $actual = match ($key) {
            'phase', 'primary_action', 'exam_in_progress', 'next_transition_at' => $state[$key],
            default => $state['timestamps'][$key],
        };
        check($actual === $expected, "{$case['name']}: $key expected " . json_encode($expected) . ' got ' . json_encode($actual));
    }
}

// Section 1A reveal rule, directly.
$open = (int)mpt_ms('2026-10-01T10:00:00Z');
check(mpt_roll_visible_at($open - 7200000, $open, 10) === $open - 7200000 + 600000, 'reveal 10 min after applying');
check(mpt_roll_visible_at($open - 300000, $open, 10) === $open, 'reveal at exam open when applied 5 min before');
check(mpt_roll_visible_at($open + 180000, $open, 10) === $open + 180000, 'instant reveal when applied late');

// Roll numbers: shape, check digit, and error detection.
$seen = [];
for ($i = 0; $i < 3000; $i++) {
    $roll = mpt_generate_roll();
    check((bool)preg_match('/^[1-9]\d{5}$/', $roll), "roll shape $roll");
    check(mpt_roll_is_well_formed($roll), "roll check digit $roll");
    $seen[$roll] = true;
}
check(count($seen) > 2900, 'roll numbers are random, not sequential');
$sample = array_slice(array_keys($seen), 0, 300);
foreach ($sample as $roll) {
    $roll = (string)$roll;
    for ($p = 0; $p < 6; $p++) {
        for ($d = 0; $d <= 9; $d++) {
            if ((int)$roll[$p] === $d) continue;
            $typo = substr_replace($roll, (string)$d, $p, 1);
            check(!mpt_roll_is_well_formed($typo), "single-digit typo accepted $roll -> $typo");
        }
    }
    for ($p = 0; $p < 5; $p++) {
        if ($roll[$p] === $roll[$p + 1]) continue;
        $swap = $roll; $swap[$p] = $roll[$p + 1]; $swap[$p + 1] = $roll[$p];
        check(!mpt_roll_is_well_formed($swap), "adjacent transposition accepted $roll -> $swap");
    }
}
check(mpt_normalise_roll(' 482 91 7 ') === '482917', 'spaces are ignored');
check(mpt_normalise_roll('048291') === null, 'leading zero rejected');
check(mpt_normalise_roll('48291') === null && mpt_normalise_roll('4829170') === null, 'length must be six');
check(mpt_normalise_roll('48a917') === null, 'digits only');
check(mpt_format_roll('482917') === '482 917', 'grouped display');

// Codes.
check((bool)preg_match('/^MPTA-031-[2-9A-HJKMNP-Z]{6}$/', mpt_application_code(31)), 'application code format');
check((bool)preg_match('/^MPTA-1204-/', mpt_application_code(1204)), 'application code grows past 3 digits');
check((bool)preg_match('/^CSSV-[2-9A-HJKMNP-Z]{6}$/', mpt_candidate_code()), 'candidate code format');
check(mpt_mock_slug(7) === 'mpt-mock-007', 'slug format');

// Timing (Section 1A #6).
$end = $open + 200 * 60000;
check(mpt_time_allowance_seconds($open - 60000, $open, $end) === 12000, 'early starter gets the full duration');
check(mpt_time_allowance_seconds($open + 8 * 60000, $open, $end) === 192 * 60, 'starting 8 min late leaves duration - 8');
check(mpt_minutes_late($open + 8 * 60000 + 59000, $open) === 8, 'minutes late floors');
check(mpt_time_allowance_seconds($end, $open, $end) === 0, 'nothing left at the hard end');

// Scoring parity with GKQuiz.tsx:527 (1 mark per correct, no negative marking).
$questions = [
    ['question_id' => 'q1', 'section' => 'English', 'correct_index' => 2],
    ['question_id' => 'q2', 'section' => 'English', 'correct_index' => 0],
    ['question_id' => 'q3', 'section' => 'Urdu', 'correct_index' => 1],
    ['question_id' => 'q4', 'section' => 'Urdu', 'correct_index' => 3],
];
$result = mpt_score($questions, ['q1' => 2, 'q2' => 1, 'q3' => 1, 'q4' => null]);
check($result['score'] === 2.0 && $result['correct'] === 2 && $result['incorrect'] === 1 && $result['unanswered'] === 1, 'basic score');
check($result['total_marks'] === 4.0 && $result['percentage'] === 50.0, 'percentage of total');
check($result['accuracy'] === 66.67, 'accuracy is correct / attempted');
check($result['subjects']['English']['correct'] === 1 && $result['subjects']['Urdu']['attempted'] === 1, 'subject breakdown');
check($result['per_question'] === ['q1' => true, 'q2' => false, 'q3' => true, 'q4' => null], 'per-question correctness');
$negative = mpt_score($questions, ['q1' => 0, 'q2' => 1, 'q3' => 0, 'q4' => 3], 1.0, 0.25);
check($negative['score'] === 0.25, 'negative marking when configured');
check(mpt_score($questions, ['q1' => 0, 'q2' => 1, 'q3' => 0], 1.0, 0.5)['score'] === 0.0, 'score never below zero');
$empty = mpt_score($questions, []);
check($empty['accuracy'] === null && $empty['unanswered'] === 4 && $empty['score'] === 0.0, 'no answers');

// Ranking.
$ranks = mpt_rank(['a' => 150.0, 'b' => 120.0, 'c' => 120.0, 'd' => 90.0]);
check($ranks['a']['rank'] === 1 && $ranks['b']['rank'] === 2 && $ranks['c']['rank'] === 2 && $ranks['d']['rank'] === 4, 'competition ranking');
check($ranks['a']['percentile'] === 75.0 && $ranks['d']['percentile'] === 0.0, 'percentile strictly below');

// Verification token.
$secret = str_repeat('k', 48);
$now = (int)mpt_ms('2026-10-01T10:00:00Z');
$token = mpt_sign_token(['u' => 'user', 'a' => 'app', 'm' => 'mock', 'e' => intdiv($now, 1000) + 900], $secret);
check(mpt_read_token($token, $secret, $now)['a'] === 'app', 'token round-trip');
check(mpt_read_token($token, $secret, $now + 900000) === null, 'token expires');
check(mpt_read_token($token, str_repeat('x', 48), $now) === null, 'token needs the server secret');
[$body, $sig] = explode('.', $token);
$forged = rtrim(strtr(base64_encode('{"u":"other","a":"app","m":"mock","e":9999999999}'), '+/', '-_'), '=') . '.' . $sig;
check(mpt_read_token($forged, $secret, $now) === null, 'tampered claims rejected');

// Schema mirror: server/sql/010 must equal the runtime schema.
$sql = (string)file_get_contents(__DIR__ . '/../../server/sql/010_mpt_exam_system.sql');
foreach (cssv_mpt_schema_statements() as $statement) {
    check(str_contains($sql, $statement . ';'), 'server/sql/010 mirrors ' . strtok($statement, '('));
}
$down = (string)file_get_contents(__DIR__ . '/../../server/sql/010_mpt_exam_system.down.sql');
foreach (cssv_mpt_schema_drop_statements() as $statement) check(str_contains($down, $statement . ';'), "rollback has $statement");

// Time helpers.
check(mpt_ms('2026-10-01 10:00:00.250') === mpt_ms('2026-10-01T10:00:00.250Z'), 'naive database time is UTC');
check(mpt_iso(mpt_ms('2026-10-01T15:00:00+05:00')) === '2026-10-01T10:00:00.000Z', 'offsets normalise to UTC');

fwrite(STDOUT, "MPT unit: $passes passed, $failures failed\n");
exit($failures === 0 ? 0 : 1);
