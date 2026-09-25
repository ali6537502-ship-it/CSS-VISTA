<?php
declare(strict_types=1);

// Pure MPT examination rules: no database, no HTTP, no globals. Everything that
// decides eligibility, timing or scoring is defined here once and exercised by
// tests/mpt/unit.php against the same fixture table as src/lib/mpt/state.ts.

const CSSV_MPT_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const CSSV_MPT_SAVE_GRACE_SECONDS = 30;
const CSSV_MPT_TOKEN_TTL_SECONDS = 900;

// ---------------------------------------------------------------- time

function mpt_ms(?string $value): ?int
{
    if ($value === null || $value === '') return null;
    // Database values are naive UTC (`Y-m-d H:i:s.v`); API/fixture values are ISO 8601.
    $normalised = preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d+)?$/', $value) ? str_replace(' ', 'T', $value) . 'Z' : $value;
    try {
        $date = new DateTimeImmutable($normalised);
    } catch (Throwable) {
        return null;
    }
    return (int)$date->format('Uv');
}

function mpt_iso(?int $ms): ?string
{
    if ($ms === null) return null;
    $seconds = intdiv($ms, 1000);
    $millis = $ms - $seconds * 1000;
    if ($millis < 0) { $seconds -= 1; $millis += 1000; }
    return gmdate('Y-m-d\TH:i:s', $seconds) . sprintf('.%03dZ', $millis);
}

function mpt_db_time(int $ms): string
{
    $seconds = intdiv($ms, 1000);
    return gmdate('Y-m-d H:i:s', $seconds) . sprintf('.%03d', $ms - $seconds * 1000);
}

/**
 * Section 1A #4: min(applied + delay, max(applied, exam_open)). Computed on read
 * from the mock's *current* exam_open_at so a reschedule moves every reveal.
 */
function mpt_roll_visible_at(int $appliedAtMs, int $examOpenAtMs, int $delayMinutes): int
{
    return min($appliedAtMs + $delayMinutes * 60000, max($appliedAtMs, $examOpenAtMs));
}

// ---------------------------------------------------------------- roll numbers & codes

const CSSV_MPT_DAMM = [
    [0, 3, 1, 7, 5, 9, 8, 6, 4, 2],
    [7, 0, 9, 2, 1, 5, 4, 8, 6, 3],
    [4, 2, 0, 6, 8, 7, 1, 3, 5, 9],
    [1, 7, 5, 0, 9, 8, 3, 4, 2, 6],
    [6, 1, 2, 3, 0, 4, 5, 9, 7, 8],
    [3, 6, 7, 4, 2, 0, 9, 5, 8, 1],
    [5, 8, 6, 9, 7, 2, 0, 1, 3, 4],
    [8, 9, 4, 5, 3, 6, 2, 0, 1, 7],
    [9, 4, 3, 8, 6, 1, 7, 2, 0, 5],
    [2, 5, 8, 1, 4, 3, 6, 7, 9, 0],
];

function mpt_damm_digit(string $digits): int
{
    $interim = 0;
    foreach (str_split($digits) as $digit) $interim = CSSV_MPT_DAMM[$interim][(int)$digit];
    return $interim;
}

// Roll numbers have no upper limit (owner decision D-13): six digits while a mock
// has room, then seven, eight… The first digit is 1-9 and the last is a Damm check
// digit, so a longer number never collides with a shorter one.
const CSSV_MPT_ROLL_MIN_DIGITS = 6;
const CSSV_MPT_ROLL_MAX_DIGITS = 12;

/** Strips spaces; returns the digits or null when the shape is wrong. */
function mpt_normalise_roll(mixed $value): ?string
{
    if (!is_string($value) && !is_int($value)) return null;
    $digits = preg_replace('/\s+/', '', (string)$value);
    return preg_match('/^[1-9]\d{' . (CSSV_MPT_ROLL_MIN_DIGITS - 1) . ',' . (CSSV_MPT_ROLL_MAX_DIGITS - 1) . '}$/', (string)$digits) ? (string)$digits : null;
}

function mpt_roll_is_well_formed(mixed $value): bool
{
    $roll = mpt_normalise_roll($value);
    return $roll !== null && mpt_damm_digit($roll) === 0;
}

/**
 * Length for the next roll number in a mock that already holds $issued numbers.
 * Each length is used until it is at most ~45% full, which keeps random
 * collisions (and retries) rare however many candidates apply.
 */
function mpt_roll_digits_for(int $issued): int
{
    $digits = CSSV_MPT_ROLL_MIN_DIGITS;
    while ($digits < CSSV_MPT_ROLL_MAX_DIGITS && $issued >= (int)(0.45 * 9 * 10 ** ($digits - 2))) $digits++;
    return $digits;
}

/** CSPRNG digits (first 1-9) plus a Damm check digit; $digits includes the check digit. */
function mpt_generate_roll(int $digits = CSSV_MPT_ROLL_MIN_DIGITS): string
{
    $digits = max(CSSV_MPT_ROLL_MIN_DIGITS, min(CSSV_MPT_ROLL_MAX_DIGITS, $digits));
    $body = (string)random_int(1, 9);
    for ($i = 0; $i < $digits - 2; $i++) $body .= (string)random_int(0, 9);
    return $body . mpt_damm_digit($body);
}

/** Left-to-right groups of three: 482 917, 482 917 3. */
function mpt_format_roll(string $roll): string
{
    return trim(implode(' ', str_split($roll, 3)));
}

function mpt_random_code(int $length): string
{
    $alphabet = CSSV_MPT_CODE_ALPHABET;
    $max = strlen($alphabet) - 1;
    $out = '';
    for ($i = 0; $i < $length; $i++) $out .= $alphabet[random_int(0, $max)];
    return $out;
}

function mpt_application_code(int $mockNumber): string
{
    return 'MPTA-' . str_pad((string)$mockNumber, 3, '0', STR_PAD_LEFT) . '-' . mpt_random_code(6);
}

function mpt_candidate_code(): string
{
    return 'CSSV-' . mpt_random_code(6);
}

function mpt_mock_slug(int $mockNumber): string
{
    return 'mpt-mock-' . str_pad((string)$mockNumber, 3, '0', STR_PAD_LEFT);
}

// ---------------------------------------------------------------- state engine

/**
 * The single rule set for every CTA (Section 6). Inputs are stored facts only:
 *   $mock        status, application_open_at, application_close_at, exam_open_at,
 *                entry_close_at, exam_end_at, roll_issue_delay_minutes,
 *                results_release_policy
 *   $session     capacity (nullable), reserved_count
 *   $application status, applied_at, attempt_allowance, attempts_used  (null = none)
 *   $attempt     latest attempt: status, expires_at, submitted_at        (null = none)
 * Timestamps may be ISO strings or naive UTC database strings.
 */
function mpt_candidate_state(array $mock, ?array $session, ?array $application, ?array $attempt, int $nowMs, bool $signedIn): array
{
    $t = [
        'application_open_at' => mpt_ms($mock['application_open_at'] ?? null),
        'application_close_at' => mpt_ms($mock['application_close_at'] ?? null),
        'exam_open_at' => mpt_ms($mock['exam_open_at'] ?? null),
        'entry_close_at' => mpt_ms($mock['entry_close_at'] ?? null),
        'exam_end_at' => mpt_ms($mock['exam_end_at'] ?? null),
        'roll_number_visible_at' => null,
        'attempt_expires_at' => null,
        'result_available_at' => null,
    ];
    $status = (string)($mock['status'] ?? 'DRAFT');

    if ($application !== null && ($application['status'] ?? '') === 'WITHDRAWN') $application = null;
    if ($application !== null) {
        $applied = mpt_ms($application['applied_at'] ?? null) ?? $nowMs;
        $t['roll_number_visible_at'] = mpt_roll_visible_at($applied, (int)$t['exam_open_at'], (int)($mock['roll_issue_delay_minutes'] ?? 10));
    }
    // A voided attempt only stops counting when the admin granted a re-sit.
    if ($attempt !== null && ($attempt['status'] ?? '') === 'VOIDED' && $application !== null
        && (int)($application['attempts_used'] ?? 1) < (int)($application['attempt_allowance'] ?? 1)) {
        $attempt = null;
    }

    $phase = mpt_state_phase($status, $mock, $session, $application, $attempt, $t, $nowMs, $signedIn);
    if ($attempt !== null) {
        $t['attempt_expires_at'] = mpt_ms($attempt['expires_at'] ?? null);
        $submitted = mpt_ms($attempt['submitted_at'] ?? null) ?? $t['attempt_expires_at'];
        if (in_array($phase, ['SUBMITTED_PENDING_RESULT', 'RESULT_AVAILABLE'], true)) {
            $t['result_available_at'] = mpt_result_release_at($mock, (int)$submitted, (int)$t['exam_end_at']);
        }
    }

    $next = null;
    foreach ($t as $value) if ($value !== null && $value > $nowMs && ($next === null || $value < $next)) $next = $value;

    return [
        'phase' => $phase,
        'primary_action' => CSSV_MPT_PRIMARY_ACTIONS[$phase],
        'exam_in_progress' => $t['exam_open_at'] !== null && $nowMs >= $t['exam_open_at'] && $nowMs < (int)$t['exam_end_at'],
        'timestamps' => array_map('mpt_iso', $t),
        'next_transition_at' => mpt_iso($next),
    ];
}

/**
 * When a submitted attempt's result (score card, answer review, rank) opens.
 * AFTER_WINDOW (default): results_delay_minutes after exam_end_at, so every
 * candidate has finished and every attempt is scored first (owner: 30 minutes).
 */
function mpt_result_release_at(array $mock, int $submittedMs, int $examEndMs): int
{
    if (($mock['results_release_policy'] ?? 'AFTER_WINDOW') !== 'AFTER_WINDOW') return $submittedMs;
    return max($submittedMs, $examEndMs + (int)($mock['results_delay_minutes'] ?? 30) * 60000);
}

const CSSV_MPT_PRIMARY_ACTIONS = [
    'LOGIN_REQUIRED' => 'login',
    'NOT_YET_OPEN' => null,
    'APPLICATIONS_OPEN' => 'apply',
    'SLOTS_FULL' => null,
    'APPLICATIONS_CLOSED' => null,
    'ROLL_NUMBER_PENDING' => 'view_application',
    'SLOT_RESERVED' => 'view_roll_number',
    'ENTRY_OPEN' => 'enter_exam',
    'IN_PROGRESS' => 'continue_exam',
    'SUBMITTED_PENDING_RESULT' => 'view_submission',
    'RESULT_AVAILABLE' => 'view_result',
    'ABSENT' => 'view_application',
    'CANCELLED' => null,
];

function mpt_state_phase(string $status, array $mock, ?array $session, ?array $application, ?array $attempt, array $t, int $now, bool $signedIn): string
{
    if ($status === 'CANCELLED') return 'CANCELLED';

    if ($attempt !== null) {
        $attemptStatus = (string)($attempt['status'] ?? '');
        if ($attemptStatus === 'VOIDED') return 'CANCELLED';
        $expires = mpt_ms($attempt['expires_at'] ?? null) ?? 0;
        if ($attemptStatus === 'IN_PROGRESS' && $now < $expires) return 'IN_PROGRESS';
        // Submitted, or expired and awaiting the sweeper (treated as submitted).
        $submitted = mpt_ms($attempt['submitted_at'] ?? null) ?? $expires;
        return $now >= mpt_result_release_at($mock, $submitted, (int)$t['exam_end_at']) ? 'RESULT_AVAILABLE' : 'SUBMITTED_PENDING_RESULT';
    }

    if ($application !== null) {
        if (($application['status'] ?? '') === 'CANCELLED') return 'CANCELLED';
        if ($now >= (int)$t['entry_close_at']) return 'ABSENT';
        if ($now < (int)$t['roll_number_visible_at']) return 'ROLL_NUMBER_PENDING';
        if ($now < (int)$t['exam_open_at']) return 'SLOT_RESERVED';
        return 'ENTRY_OPEN';
    }

    if ($status !== 'PUBLISHED') {
        return ($status === 'ARCHIVED') ? 'APPLICATIONS_CLOSED' : 'NOT_YET_OPEN';
    }
    if ($now < (int)$t['application_open_at']) return 'NOT_YET_OPEN';
    if ($now >= (int)$t['application_close_at']) return 'APPLICATIONS_CLOSED';
    if (!$signedIn) return 'LOGIN_REQUIRED';
    $capacity = $session['capacity'] ?? null;
    if ($capacity !== null && (int)($session['reserved_count'] ?? 0) >= (int)$capacity) return 'SLOTS_FULL';
    return 'APPLICATIONS_OPEN';
}

// ---------------------------------------------------------------- timing

/** Seconds a candidate starting now would have (Section 1A #6). */
function mpt_time_allowance_seconds(int $nowMs, int $examOpenMs, int $examEndMs): int
{
    return max(0, intdiv(max(0, $examEndMs - max($nowMs, $examOpenMs)), 1000));
}

function mpt_minutes_late(int $nowMs, int $examOpenMs): int
{
    return max(0, intdiv($nowMs - $examOpenMs, 60000));
}

// ---------------------------------------------------------------- scoring

/**
 * Server port of the engine rule in src/pages/gk/GKQuiz.tsx:
 *   score = count(selected === correct) - negative * incorrect   (never below 0)
 * $questions: [{question_id, section, correct_index}]; $answers: [question_id => int|null].
 */
function mpt_score(array $questions, array $answers, float $marksPerQuestion = 1.0, float $negativeMarking = 0.0): array
{
    $correct = 0; $incorrect = 0; $subjects = []; $perQuestion = [];
    foreach ($questions as $question) {
        $qid = (string)$question['question_id'];
        $section = (string)$question['section'];
        $subjects[$section] ??= ['questions' => 0, 'attempted' => 0, 'correct' => 0, 'incorrect' => 0];
        $subjects[$section]['questions']++;
        $selected = $answers[$qid] ?? null;
        if ($selected === null) { $perQuestion[$qid] = null; continue; }
        $subjects[$section]['attempted']++;
        $isCorrect = (int)$selected === (int)$question['correct_index'];
        $perQuestion[$qid] = $isCorrect;
        if ($isCorrect) { $correct++; $subjects[$section]['correct']++; }
        else { $incorrect++; $subjects[$section]['incorrect']++; }
    }
    $total = count($questions);
    $totalMarks = round($total * $marksPerQuestion, 2);
    $raw = fn(int $c, int $i): float => max(0.0, round($c * $marksPerQuestion - $i * $negativeMarking, 2));
    $score = $raw($correct, $incorrect);
    $subjectScores = [];
    foreach ($subjects as $key => $row) {
        $attempted = $row['attempted'];
        $subjectScores[$key] = $row + [
            'score' => $raw($row['correct'], $row['incorrect']),
            'accuracy' => $attempted > 0 ? round($row['correct'] / $attempted * 100, 2) : null,
        ];
    }
    $attempted = $correct + $incorrect;
    return [
        'score' => $score,
        'total_marks' => $totalMarks,
        'correct' => $correct,
        'incorrect' => $incorrect,
        'unanswered' => $total - $attempted,
        'percentage' => $totalMarks > 0 ? round($score / $totalMarks * 100, 2) : 0.0,
        'accuracy' => $attempted > 0 ? round($correct / $attempted * 100, 2) : null,
        'subjects' => $subjectScores,
        'per_question' => $perQuestion,
    ];
}

/** Standard competition ranking (1,2,2,4); percentile = % strictly below. */
function mpt_rank(array $scoresById): array
{
    $values = array_values($scoresById);
    $n = count($values);
    $out = [];
    foreach ($scoresById as $id => $score) {
        $higher = 0; $lower = 0;
        foreach ($values as $other) {
            if ($other > $score) $higher++;
            elseif ($other < $score) $lower++;
        }
        $out[$id] = ['rank' => $higher + 1, 'candidates' => $n, 'percentile' => $n > 0 ? round($lower / $n * 100, 2) : 0.0];
    }
    return $out;
}

// ---------------------------------------------------------------- verification token

function mpt_sign_token(array $claims, string $secret): string
{
    $body = rtrim(strtr(base64_encode((string)json_encode($claims, JSON_UNESCAPED_SLASHES)), '+/', '-_'), '=');
    return $body . '.' . hash_hmac('sha256', 'mpt-verify|' . $body, $secret);
}

function mpt_read_token(string $token, string $secret, int $nowMs): ?array
{
    if (strlen($token) > 1024 || substr_count($token, '.') !== 1) return null;
    [$body, $signature] = explode('.', $token, 2);
    if (!hash_equals(hash_hmac('sha256', 'mpt-verify|' . $body, $secret), $signature)) return null;
    $decoded = base64_decode(strtr($body, '-_', '+/'), true);
    $claims = is_string($decoded) ? json_decode($decoded, true) : null;
    if (!is_array($claims) || !isset($claims['u'], $claims['a'], $claims['m'], $claims['e'])) return null;
    if ((int)$claims['e'] <= intdiv($nowMs, 1000)) return null;
    return $claims;
}
