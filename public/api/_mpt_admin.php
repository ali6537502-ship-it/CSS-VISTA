<?php
declare(strict_types=1);

// Owner-only MPT administration (Section 18). Every change is validated here,
// requires a written reason where it affects a candidate, and is logged to
// mpt_events as ADMIN_ACTION / RESCORED.
require_once __DIR__ . '/_native_admin.php';
require_once __DIR__ . '/_mpt.php';

const CSSV_MPT_RESCORE_BATCH = 200;

function mpt_admin_reason(array $body): string
{
    $reason = trim((string)($body['reason'] ?? ''));
    if (mb_strlen($reason) < 5 || mb_strlen($reason) > 500) cssv_fail('Write a reason (5–500 characters). It is kept in the audit log.', 422, 'reason_required');
    return $reason;
}

function mpt_admin_mock(PDO $pdo, mixed $slug, bool $forUpdate = false): array
{
    if (!is_string($slug) || !preg_match('/^mpt-mock-\d{3,6}$/', $slug)) cssv_fail('Mock not found.', 404, 'not_found');
    $stmt = $pdo->prepare('SELECT * FROM mpt_mocks WHERE public_slug=?' . ($forUpdate ? ' FOR UPDATE' : ''));
    $stmt->execute([$slug]);
    return $stmt->fetch() ?: cssv_fail('Mock not found.', 404, 'not_found');
}

function mpt_admin_log(PDO $pdo, string $action, ?string $mockId, array $payload, ?string $applicationId = null, ?string $attemptId = null, ?string $userId = null): void
{
    mpt_event($pdo, 'ADMIN_ACTION', $userId, $mockId, $applicationId, $attemptId, ['action' => $action, 'by' => 'owner'] + $payload);
}

/** Papers still usable for new mocks in the current exported series (D-04). */
function mpt_admin_runway(PDO $pdo): array
{
    $manifest = mpt_paper_manifest();
    if ($manifest === null) return ['available' => 0, 'total' => 0, 'publishable' => false, 'series' => null, 'exhausted_at' => mpt_meta_get($pdo, 'paper_runway_exhausted_at')];
    $used = $pdo->prepare('SELECT COUNT(*) FROM mpt_mocks WHERE paper_series=?');
    $used->execute([$manifest['series']]);
    $usedCount = (int)$used->fetchColumn();
    $total = count($manifest['papers']);
    return [
        'available' => max(0, $total - $usedCount),
        'total' => $total,
        'publishable' => !empty($manifest['publishable']),
        'series' => $manifest['series'],
        'generated_at' => $manifest['generated_at'] ?? null,
        'exhausted_at' => mpt_meta_get($pdo, 'paper_runway_exhausted_at'),
        'daily_slots_remaining' => intdiv(max(0, $total - $usedCount), count(CSSV_MPT_DAILY_SLOTS)),
    ];
}

function mpt_admin_mock_stats(PDO $pdo, array $mock): array
{
    $id = (string)$mock['id'];
    $q = static function (string $sql) use ($pdo, $id) { $s = $pdo->prepare($sql); $s->execute([$id]); return $s->fetchColumn(); };
    $applications = (int)$q("SELECT COUNT(*) FROM mpt_applications WHERE mock_id=? AND status='ACTIVE'");
    $started = (int)$q("SELECT COUNT(DISTINCT application_id) FROM mpt_attempts WHERE mock_id=? AND status<>'VOIDED'");
    $completed = (int)$q("SELECT COUNT(*) FROM mpt_attempts WHERE mock_id=? AND status IN ('SUBMITTED','AUTO_SUBMITTED') AND voided_at IS NULL");
    $inProgress = (int)$q("SELECT COUNT(*) FROM mpt_attempts WHERE mock_id=? AND status='IN_PROGRESS'");
    $entryClosed = mpt_now_ms() >= mpt_ms($mock['entry_close_at']);
    $average = $q("SELECT AVG(score) FROM mpt_attempts WHERE mock_id=? AND status IN ('SUBMITTED','AUTO_SUBMITTED') AND voided_at IS NULL");
    $dist = $pdo->prepare("SELECT LEAST(9,FLOOR(percentage/10)) bucket,COUNT(*) n FROM mpt_attempts WHERE mock_id=? AND status IN ('SUBMITTED','AUTO_SUBMITTED') AND voided_at IS NULL GROUP BY bucket");
    $dist->execute([$id]);
    $buckets = array_fill(0, 10, 0);
    foreach ($dist->fetchAll() as $row) $buckets[(int)$row['bucket']] = (int)$row['n'];
    return [
        'applications' => $applications,
        'started' => $started,
        'in_progress' => $inProgress,
        'completed' => $completed,
        'appeared' => $started,
        'absent' => $entryClosed ? max(0, $applications - $started) : null,
        'average_score' => $average === null ? null : round((float)$average, 2),
        'completion_rate' => $applications > 0 && $entryClosed ? round($completed / $applications * 100, 1) : null,
        'distribution' => array_map(static fn($n, $i) => ['from' => $i * 10, 'to' => $i === 9 ? 100 : $i * 10 + 9, 'count' => $n], $buckets, array_keys($buckets)),
    ];
}

function mpt_admin_mock_row(PDO $pdo, array $mock, bool $withStats = true): array
{
    $session = mpt_session_for($pdo, (string)$mock['id']);
    return mpt_public_mock($mock) + [
        'id' => $mock['id'],
        'schedule_key' => $mock['schedule_key'],
        'capacity' => $session && $session['capacity'] !== null ? (int)$session['capacity'] : null,
        'reserved_count' => $session ? (int)$session['reserved_count'] : 0,
        'rank_min_candidates' => (int)$mock['rank_min_candidates'],
        'results_delay_minutes' => (int)$mock['results_delay_minutes'],
        'scoring_version' => (int)$mock['scoring_version'],
        'paper_ref' => $mock['paper_ref'],
        'ranks_computed_at' => mpt_iso(mpt_ms($mock['ranks_computed_at'])),
        'cancel_reason' => $mock['cancel_reason'],
        'created_by' => $mock['created_by'],
    ] + ($withStats ? ['stats' => mpt_admin_mock_stats($pdo, $mock)] : []);
}

function mpt_admin_overview(PDO $pdo): array
{
    $rows = $pdo->query('SELECT * FROM mpt_mocks ORDER BY exam_open_at DESC LIMIT 60')->fetchAll();
    return [
        'flag' => mpt_flag_mode(),
        'auto_schedule' => strtolower((string)cssv_env('CSSV_MPT_AUTO_SCHEDULE', 'on')) !== 'off',
        'runway' => mpt_admin_runway($pdo),
        'last_maintenance_at' => mpt_iso(mpt_ms(mpt_meta_get($pdo, 'last_maintenance_at'))),
        'mocks' => array_map(static fn(array $mock) => mpt_admin_mock_row($pdo, $mock), $rows),
    ] + mpt_server_clock();
}

function mpt_admin_applications(PDO $pdo, array $mock, string $search, int $page, int $perPage = 50, ?string $appeared = null): array
{
    $where = 'a.mock_id=?';
    $params = [$mock['id']];
    // Appeared = started an attempt that was not voided.
    if ($appeared === 'yes') $where .= " AND EXISTS (SELECT 1 FROM mpt_attempts t WHERE t.application_id=a.id AND t.status<>'VOIDED')";
    if ($appeared === 'no') $where .= " AND a.status='ACTIVE' AND NOT EXISTS (SELECT 1 FROM mpt_attempts t WHERE t.application_id=a.id AND t.status<>'VOIDED')";
    if ($search !== '') {
        $where .= ' AND (a.roll_number=? OR a.application_code=? OR u.email LIKE ? OR p.display_name LIKE ?)';
        $like = '%' . addcslashes($search, '%_\\') . '%';
        array_push($params, $search, strtoupper($search), $like, $like);
    }
    $count = $pdo->prepare("SELECT COUNT(*) FROM mpt_applications a JOIN users u ON u.id=a.user_id LEFT JOIN student_profiles p ON p.user_id=a.user_id WHERE $where");
    $count->execute($params);
    $limit = $perPage > 0 ? ' LIMIT ' . (int)$perPage . ' OFFSET ' . (int)(($page - 1) * $perPage) : '';
    $stmt = $pdo->prepare("SELECT a.*,u.email,p.display_name,c.candidate_code FROM mpt_applications a JOIN users u ON u.id=a.user_id LEFT JOIN student_profiles p ON p.user_id=a.user_id LEFT JOIN mpt_candidates c ON c.user_id=a.user_id WHERE $where ORDER BY a.applied_at$limit");
    $stmt->execute($params);
    $now = mpt_now_ms();
    $rows = [];
    foreach ($stmt->fetchAll() as $row) {
        $attempt = mpt_latest_attempt($pdo, (string)$row['id']);
        $state = mpt_state($pdo, $mock, $row, $attempt, $now, true);
        $rows[] = [
            'candidate' => (string)($row['display_name'] ?? ''),
            'email' => $row['email'],
            'candidate_code' => $row['candidate_code'],
            'roll_number' => $row['roll_number'],
            'application_code' => $row['application_code'],
            'applied_at' => mpt_iso(mpt_ms($row['applied_at'])),
            'status' => $row['status'],
            'attempt_allowance' => (int)$row['attempt_allowance'],
            'phase' => $state['phase'],
            'appeared' => $attempt !== null && $attempt['status'] !== 'VOIDED',
            'score' => $attempt && in_array($attempt['status'], ['SUBMITTED', 'AUTO_SUBMITTED'], true) ? (float)$attempt['score'] : null,
        ];
    }
    return ['rows' => $rows, 'total' => (int)$count->fetchColumn(), 'page' => $page, 'per_page' => $perPage];
}

function mpt_admin_attempts(PDO $pdo, array $mock, int $page, int $perPage = 50): array
{
    $count = $pdo->prepare('SELECT COUNT(*) FROM mpt_attempts WHERE mock_id=?');
    $count->execute([$mock['id']]);
    $stmt = $pdo->prepare('SELECT t.*,a.roll_number,a.application_code,p.display_name,u.email FROM mpt_attempts t JOIN mpt_applications a ON a.id=t.application_id JOIN users u ON u.id=t.user_id LEFT JOIN student_profiles p ON p.user_id=t.user_id WHERE t.mock_id=? ORDER BY t.started_at LIMIT ' . (int)$perPage . ' OFFSET ' . (int)(($page - 1) * $perPage));
    $stmt->execute([$mock['id']]);
    return ['rows' => array_map(static fn(array $row) => [
        'candidate' => (string)($row['display_name'] ?? ''),
        'email' => $row['email'],
        'roll_number' => $row['roll_number'],
        'application_code' => $row['application_code'],
        'attempt_no' => (int)$row['attempt_no'],
        'status' => $row['status'],
        'started_at' => mpt_iso(mpt_ms($row['started_at'])),
        'submitted_at' => mpt_iso(mpt_ms($row['submitted_at'])),
        'submit_reason' => $row['submit_reason'],
        'score' => $row['score'] === null ? null : (float)$row['score'],
        'percentage' => $row['percentage'] === null ? null : (float)$row['percentage'],
        'visibility_changes' => (int)$row['visibility_changes'],
        'device_takeovers' => (int)$row['device_takeovers'],
        'void_reason' => $row['void_reason'],
    ], $stmt->fetchAll()), 'total' => (int)$count->fetchColumn(), 'page' => $page, 'per_page' => $perPage];
}

function mpt_admin_csv(array $rows): never
{
    header('Content-Type: text/csv; charset=UTF-8');
    header('Content-Disposition: attachment; filename="mpt-applications.csv"');
    $out = fopen('php://output', 'wb');
    fputcsv($out, ['Candidate', 'Email', 'Candidate ID', 'Roll Number', 'Application ID', 'Applied at (UTC)', 'Application status', 'Appeared', 'State', 'Score'], ',', '"', '\\');
    foreach ($rows as $row) {
        // Neutralise spreadsheet formulas in candidate-supplied text.
        $safe = static fn($v) => is_string($v) && preg_match('/^[=+\-@\t\r]/', $v) ? "'" . $v : $v;
        fputcsv($out, array_map($safe, [$row['candidate'], $row['email'], $row['candidate_code'], $row['roll_number'], $row['application_code'], $row['applied_at'], $row['status'], $row['appeared'] ? 'Yes' : 'No', $row['phase'], $row['score']]), ',', '"', '\\');
    }
    fclose($out);
    exit;
}

// ---------------------------------------------------------------- mutations

function mpt_admin_time(mixed $value, string $label): int
{
    $ms = is_string($value) ? mpt_ms($value) : null;
    if ($ms === null) cssv_fail("Enter a valid $label.", 422, 'invalid_time');
    return $ms;
}

function mpt_admin_int(array $body, string $key, int $min, int $max, ?int $default = null): ?int
{
    if (!array_key_exists($key, $body) || $body[$key] === null || $body[$key] === '') return $default;
    $value = filter_var($body[$key], FILTER_VALIDATE_INT);
    if ($value === false || $value < $min || $value > $max) cssv_fail("$key must be between $min and $max.", 422, 'invalid_field');
    return $value;
}

function mpt_admin_create(PDO $pdo, array $body): array
{
    $open = mpt_admin_time($body['exam_open_at'] ?? null, 'exam start time');
    if ($open <= mpt_now_ms()) cssv_fail('The exam must start in the future.', 422, 'invalid_time');
    // Default: applications open immediately and close when the exam starts.
    $applicationOpen = isset($body['application_open_at']) && $body['application_open_at'] !== '' ? mpt_admin_time($body['application_open_at'], 'application opening time') : mpt_now_ms();
    if ($applicationOpen >= $open) cssv_fail('Applications must open before the exam starts.', 422, 'invalid_time');
    $mock = mpt_create_mock($pdo, [
        'exam_open_ms' => $open,
        'application_open_ms' => $applicationOpen,
        'duration_minutes' => mpt_admin_int($body, 'duration_minutes', 10, 600, 200),
        'close_offset_minutes' => mpt_admin_int($body, 'close_offset_minutes', 0, 120, 0),
        'entry_close_offset_minutes' => mpt_admin_int($body, 'entry_close_offset_minutes', 0, 120, 10),
        'roll_issue_delay_minutes' => mpt_admin_int($body, 'roll_issue_delay_minutes', 0, 120, 10),
        'capacity' => mpt_admin_int($body, 'capacity', 1, 1000000),
        'title' => isset($body['title']) && trim((string)$body['title']) !== '' ? native_text($body['title'], 160) : null,
        'created_by' => 'owner',
    ]);
    if ($mock === null) cssv_fail('No fresh official paper is available. Deploy a build with new questions (see the runbook) before creating another mock.', 409, 'no_paper_available');
    return mpt_admin_mock_row($pdo, mpt_admin_mock($pdo, $mock['public_slug']));
}

/** Edits timings and policies. Shortening a window that is already running needs confirm:true. */
function mpt_admin_update(PDO $pdo, array $body): array
{
    $pdo->beginTransaction();
    try {
        $mock = mpt_admin_mock($pdo, $body['slug'] ?? null, true);
        if ($mock['status'] === 'CANCELLED') { $pdo->rollBack(); cssv_fail('A cancelled mock cannot be edited.', 409, 'mock_cancelled'); }
        $now = mpt_now_ms();
        $cur = fn(string $k) => (int)mpt_ms($mock[$k]);
        $open = isset($body['exam_open_at']) ? mpt_admin_time($body['exam_open_at'], 'exam start time') : $cur('exam_open_at');
        $duration = mpt_admin_int($body, 'duration_minutes', 10, 600, (int)$mock['duration_minutes']);
        $appOpen = isset($body['application_open_at']) ? mpt_admin_time($body['application_open_at'], 'application opening time') : $cur('application_open_at');
        $closeOffset = mpt_admin_int($body, 'close_offset_minutes', 0, 120, intdiv($cur('application_close_at') - $cur('exam_open_at'), 60000));
        $entryOffset = mpt_admin_int($body, 'entry_close_offset_minutes', 0, 120, intdiv($cur('entry_close_at') - $cur('exam_open_at'), 60000));
        $next = [
            'application_open_at' => $appOpen,
            'application_close_at' => $open + $closeOffset * 60000,
            'exam_open_at' => $open,
            'entry_close_at' => $open + $entryOffset * 60000,
            'exam_end_at' => $open + $duration * 60000,
        ];
        if (!($next['application_open_at'] < $next['exam_open_at'] && $next['exam_open_at'] <= $next['entry_close_at'] && $next['entry_close_at'] < $next['exam_end_at'] && $next['application_close_at'] < $next['exam_end_at'])) {
            $pdo->rollBack(); cssv_fail('Times must be in order: applications open → exam starts → entry closes → exam ends.', 422, 'invalid_time');
        }
        if ($next['exam_open_at'] !== $cur('exam_open_at') && $next['exam_open_at'] <= $now) {
            $pdo->rollBack(); cssv_fail('The exam start cannot be moved into the past.', 422, 'invalid_time');
        }
        $running = $now >= $cur('exam_open_at') && $now < $cur('exam_end_at');
        $shortens = $next['exam_end_at'] < $cur('exam_end_at') || $next['entry_close_at'] < $cur('entry_close_at') || $next['application_close_at'] < $cur('application_close_at');
        if ($running && ($shortens || $next['exam_open_at'] !== $cur('exam_open_at')) && ($body['confirm'] ?? false) !== true) {
            $pdo->rollBack(); cssv_fail('This mock is running. Shortening or moving it affects candidates who are sitting now. Confirm to continue.', 409, 'confirm_required');
        }
        $reason = mpt_admin_reason($body);
        $policy = static fn(string $key, array $allowed, string $fallback) => isset($body[$key]) ? (in_array($body[$key], $allowed, true) ? $body[$key] : cssv_fail("Invalid $key.", 422, 'invalid_field')) : $fallback;
        $pass = array_key_exists('pass_percentage', $body) ? ($body['pass_percentage'] === null || $body['pass_percentage'] === '' ? null : (float)$body['pass_percentage']) : ($mock['pass_percentage'] === null ? null : (float)$mock['pass_percentage']);
        if ($pass !== null && ($pass < 0 || $pass > 100)) { $pdo->rollBack(); cssv_fail('Pass percentage must be 0–100.', 422, 'invalid_field'); }
        $negative = array_key_exists('negative_marking', $body) ? (float)$body['negative_marking'] : (float)$mock['negative_marking'];
        if ($negative < 0 || $negative > 1) { $pdo->rollBack(); cssv_fail('Negative marking must be 0–1.', 422, 'invalid_field'); }
        if ($negative !== (float)$mock['negative_marking'] && $now >= $cur('exam_open_at')) { $pdo->rollBack(); cssv_fail('Negative marking can only change before the exam opens. Use rescore for key corrections.', 409, 'scoring_locked'); }
        $pdo->prepare('UPDATE mpt_mocks SET results_delay_minutes=? WHERE id=?')->execute([mpt_admin_int($body, 'results_delay_minutes', 0, 1440, (int)$mock['results_delay_minutes']), $mock['id']]);
        $pdo->prepare('UPDATE mpt_mocks SET application_open_at=?,application_close_at=?,exam_open_at=?,entry_close_at=?,exam_end_at=?,duration_minutes=?,roll_issue_delay_minutes=?,results_release_policy=?,answer_review_policy=?,pass_percentage=?,negative_marking=?,rank_min_candidates=?,title=? WHERE id=?')
            ->execute([
                mpt_db_time($next['application_open_at']), mpt_db_time($next['application_close_at']), mpt_db_time($next['exam_open_at']),
                mpt_db_time($next['entry_close_at']), mpt_db_time($next['exam_end_at']), $duration,
                mpt_admin_int($body, 'roll_issue_delay_minutes', 0, 120, (int)$mock['roll_issue_delay_minutes']),
                $policy('results_release_policy', ['IMMEDIATE_SCORE', 'AFTER_WINDOW'], $mock['results_release_policy']),
                $policy('answer_review_policy', ['NEVER', 'AFTER_WINDOW', 'IMMEDIATE'], $mock['answer_review_policy']),
                $pass, $negative, mpt_admin_int($body, 'rank_min_candidates', 1, 100000, (int)$mock['rank_min_candidates']),
                isset($body['title']) ? native_text($body['title'], 160, true) : $mock['title'], $mock['id'],
            ]);
        // Every attempt ends at the (new) exam_end_at.
        $pdo->prepare("UPDATE mpt_attempts SET expires_at=? WHERE mock_id=? AND status='IN_PROGRESS'")->execute([mpt_db_time($next['exam_end_at']), $mock['id']]);
        $pdo->prepare('UPDATE mpt_sessions SET starts_at=?,ends_at=?,capacity=? WHERE mock_id=?')
            ->execute([mpt_db_time($next['exam_open_at']), mpt_db_time($next['exam_end_at']), array_key_exists('capacity', $body) ? mpt_admin_int($body, 'capacity', 1, 1000000) : mpt_session_for($pdo, (string)$mock['id'])['capacity'], $mock['id']]);
        mpt_admin_log($pdo, 'mock_updated', (string)$mock['id'], ['reason' => $reason, 'changes' => array_intersect_key($body, array_flip(['exam_open_at', 'application_open_at', 'duration_minutes', 'close_offset_minutes', 'entry_close_offset_minutes', 'roll_issue_delay_minutes', 'capacity', 'results_release_policy', 'answer_review_policy', 'pass_percentage', 'negative_marking', 'rank_min_candidates', 'title']))]);
        $pdo->commit();
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $error;
    }
    return mpt_admin_mock_row($pdo, mpt_admin_mock($pdo, $body['slug']));
}

function mpt_admin_cancel_mock(PDO $pdo, array $body): array
{
    $reason = mpt_admin_reason($body);
    $mock = mpt_admin_mock($pdo, $body['slug'] ?? null);
    if ($mock['status'] === 'CANCELLED') cssv_fail('This mock is already cancelled.', 409, 'mock_cancelled');
    $pdo->prepare("UPDATE mpt_mocks SET status='CANCELLED',cancelled_at=?,cancel_reason=? WHERE id=?")->execute([mpt_db_time(mpt_now_ms()), $reason, $mock['id']]);
    mpt_admin_log($pdo, 'mock_cancelled', (string)$mock['id'], ['reason' => $reason]);
    return mpt_admin_mock_row($pdo, mpt_admin_mock($pdo, $body['slug']));
}

function mpt_admin_application(PDO $pdo, mixed $code, bool $forUpdate = false): array
{
    if (!is_string($code) || !preg_match('/^MPTA-\d{3,6}-[2-9A-HJKMNP-Z]{6}$/', $code)) cssv_fail('Application not found.', 404, 'not_found');
    $stmt = $pdo->prepare('SELECT * FROM mpt_applications WHERE application_code=?' . ($forUpdate ? ' FOR UPDATE' : ''));
    $stmt->execute([$code]);
    return $stmt->fetch() ?: cssv_fail('Application not found.', 404, 'not_found');
}

function mpt_admin_cancel_application(PDO $pdo, array $body): array
{
    $reason = mpt_admin_reason($body);
    $pdo->beginTransaction();
    try {
        $application = mpt_admin_application($pdo, $body['code'] ?? null, true);
        if ($application['status'] !== 'ACTIVE') { $pdo->rollBack(); cssv_fail('This application is not active.', 409, 'application_inactive'); }
        $pdo->prepare("UPDATE mpt_applications SET status='CANCELLED',cancelled_at=?,cancel_reason=? WHERE id=?")->execute([mpt_db_time(mpt_now_ms()), $reason, $application['id']]);
        $pdo->prepare('UPDATE mpt_sessions SET reserved_count=GREATEST(reserved_count,1)-1 WHERE id=?')->execute([$application['session_id']]);
        mpt_event($pdo, 'APPLICATION_CANCELLED', (string)$application['user_id'], (string)$application['mock_id'], (string)$application['id'], null, ['reason' => $reason, 'by' => 'owner']);
        mpt_admin_log($pdo, 'application_cancelled', (string)$application['mock_id'], ['reason' => $reason], (string)$application['id'], null, (string)$application['user_id']);
        $pdo->commit();
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $error;
    }
    return ['ok' => true];
}

function mpt_admin_void_attempt(PDO $pdo, array $body): array
{
    $reason = mpt_admin_reason($body);
    $application = mpt_admin_application($pdo, $body['code'] ?? null);
    $attempt = mpt_latest_attempt($pdo, (string)$application['id']);
    if (!$attempt || $attempt['status'] === 'VOIDED') cssv_fail('There is no attempt to void.', 409, 'no_attempt');
    $pdo->beginTransaction();
    try {
        $pdo->prepare("UPDATE mpt_attempts SET status='VOIDED',voided_at=?,void_reason=?,rank_position=NULL,rank_candidates=NULL,percentile=NULL WHERE id=?")->execute([mpt_db_time(mpt_now_ms()), $reason, $attempt['id']]);
        mpt_refresh_user_stats($pdo, (string)$attempt['user_id']);
        mpt_admin_log($pdo, 'attempt_voided', (string)$attempt['mock_id'], ['reason' => $reason, 'previous_status' => $attempt['status']], (string)$application['id'], (string)$attempt['id'], (string)$attempt['user_id']);
        $pdo->commit();
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $error;
    }
    // Ranks for the mock are recomputed by the sweeper once it is final.
    $pdo->prepare('UPDATE mpt_mocks SET ranks_computed_at=NULL WHERE id=?')->execute([$attempt['mock_id']]);
    return ['ok' => true];
}

function mpt_admin_grant_resit(PDO $pdo, array $body): array
{
    $reason = mpt_admin_reason($body);
    $application = mpt_admin_application($pdo, $body['code'] ?? null);
    $attempt = mpt_latest_attempt($pdo, (string)$application['id']);
    if (!$attempt || $attempt['status'] !== 'VOIDED') cssv_fail('Void the existing attempt before granting a re-sit.', 409, 'void_first');
    $pdo->prepare('UPDATE mpt_applications SET attempt_allowance=attempt_allowance+1 WHERE id=?')->execute([$application['id']]);
    mpt_admin_log($pdo, 'resit_granted', (string)$application['mock_id'], ['reason' => $reason], (string)$application['id'], null, (string)$application['user_id']);
    return ['ok' => true];
}

/**
 * Answer-key correction (Section 10): updates the frozen key, bumps
 * scoring_version and rescores finalised attempts in resumable batches.
 * Call again with the same slug and no corrections until `remaining` is 0.
 */
function mpt_admin_rescore(PDO $pdo, array $body): array
{
    $mock = mpt_admin_mock($pdo, $body['slug'] ?? null);
    $corrections = $body['corrections'] ?? [];
    if (!is_array($corrections) || count($corrections) > 200) cssv_fail('Invalid corrections.', 422, 'invalid_field');
    if ($corrections) {
        $reason = mpt_admin_reason($body);
        $pdo->beginTransaction();
        try {
            $read = $pdo->prepare('SELECT correct_index FROM mpt_mock_questions WHERE mock_id=? AND position=? FOR UPDATE');
            $write = $pdo->prepare('UPDATE mpt_mock_questions SET correct_index=? WHERE mock_id=? AND position=?');
            $applied = [];
            foreach ($corrections as $correction) {
                $position = filter_var($correction['position'] ?? null, FILTER_VALIDATE_INT);
                $correct = filter_var($correction['correct_index'] ?? null, FILTER_VALIDATE_INT);
                if ($position === false || $correct === false || $correct < 0 || $correct > 3) { $pdo->rollBack(); cssv_fail('Each correction needs a position and a correct option (0–3).', 422, 'invalid_field'); }
                $read->execute([$mock['id'], $position]);
                $before = $read->fetchColumn();
                if ($before === false) { $pdo->rollBack(); cssv_fail("Question $position does not exist in this paper.", 422, 'invalid_field'); }
                if ((int)$before === $correct) continue;
                $write->execute([$correct, $mock['id'], $position]);
                $applied[] = ['position' => $position, 'from' => (int)$before, 'to' => $correct];
            }
            if (!$applied) { $pdo->rollBack(); cssv_fail('Those answers already match the key.', 409, 'no_change'); }
            $pdo->prepare('UPDATE mpt_mocks SET scoring_version=scoring_version+1 WHERE id=?')->execute([$mock['id']]);
            mpt_event($pdo, 'RESCORED', null, (string)$mock['id'], null, null, ['by' => 'owner', 'reason' => $reason, 'corrections' => $applied]);
            $pdo->commit();
        } catch (Throwable $error) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            throw $error;
        }
        $mock = mpt_admin_mock($pdo, $body['slug']);
    }
    $pending = $pdo->prepare("SELECT id FROM mpt_attempts WHERE mock_id=? AND status IN ('SUBMITTED','AUTO_SUBMITTED') AND scoring_version<? LIMIT " . CSSV_MPT_RESCORE_BATCH);
    $pending->execute([$mock['id'], $mock['scoring_version']]);
    $processed = 0;
    foreach ($pending->fetchAll(PDO::FETCH_COLUMN) as $attemptId) {
        $pdo->beginTransaction();
        try {
            $lock = $pdo->prepare('SELECT * FROM mpt_attempts WHERE id=? FOR UPDATE');
            $lock->execute([$attemptId]);
            $attempt = $lock->fetch();
            mpt_score_attempt($pdo, $attempt, $mock);
            $pdo->prepare('UPDATE mpt_attempts SET rescored_at=? WHERE id=?')->execute([mpt_db_time(mpt_now_ms()), $attemptId]);
            mpt_refresh_user_stats($pdo, (string)$attempt['user_id']);
            $pdo->commit();
            $processed++;
        } catch (Throwable $error) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            throw $error;
        }
    }
    $remaining = $pdo->prepare("SELECT COUNT(*) FROM mpt_attempts WHERE mock_id=? AND status IN ('SUBMITTED','AUTO_SUBMITTED') AND scoring_version<?");
    $remaining->execute([$mock['id'], $mock['scoring_version']]);
    $left = (int)$remaining->fetchColumn();
    if ($left === 0 && $mock['ranks_computed_at'] !== null) mpt_compute_ranks($pdo, (string)$mock['id'], (int)$mock['rank_min_candidates'], mpt_now_ms());
    return ['rescored' => $processed, 'remaining' => $left, 'scoring_version' => (int)$mock['scoring_version']];
}
