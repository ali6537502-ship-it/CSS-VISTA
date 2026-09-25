<?php
declare(strict_types=1);

// MPT examination services. Every rule that decides eligibility, identity,
// time, attempts or scores is enforced here; the browser only displays.
require_once __DIR__ . '/_account_auth.php';
require_once __DIR__ . '/_mpt_core.php';
require_once __DIR__ . '/_mpt_schema.php';

const CSSV_MPT_PAPER_DIR = __DIR__ . '/_mpt_papers';
const CSSV_MPT_DAILY_SLOTS = ['1500' => '15:00', '2230' => '22:30'];
const CSSV_MPT_PKT = 'Asia/Karachi';

function mpt_now_ms(): int
{
    return (int)floor(microtime(true) * 1000);
}

function mpt_pkt(int $ms, string $format = 'g:i A'): string
{
    return (new DateTimeImmutable('@' . intdiv($ms, 1000)))->setTimezone(new DateTimeZone(CSSV_MPT_PKT))->format($format) . ' PKT';
}

// ---------------------------------------------------------------- schema & flag

function mpt_ensure_schema(PDO $pdo): void
{
    static $ready = false;
    if ($ready) return;
    try {
        $version = $pdo->query("SELECT meta_value FROM mpt_meta WHERE meta_key='schema_version'")->fetchColumn();
        if ((int)$version >= CSSV_MPT_SCHEMA_VERSION) { $ready = true; return; }
    } catch (Throwable) {
        // Tables do not exist yet.
    }
    if ((int)$pdo->query("SELECT GET_LOCK('cssvista-mpt-schema',10)")->fetchColumn() !== 1) {
        cssv_fail('The examination service is starting. Please try again.', 503, 'mpt_schema_busy');
    }
    try {
        foreach (cssv_mpt_schema_statements() as $statement) $pdo->exec($statement);
        $pdo->prepare("INSERT INTO mpt_meta (meta_key,meta_value) VALUES ('schema_version',?) ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value)")
            ->execute([(string)CSSV_MPT_SCHEMA_VERSION]);
        $ready = true;
    } finally {
        $pdo->query("SELECT RELEASE_LOCK('cssvista-mpt-schema')");
    }
}

/** off | pilot | on. Pilot admits only CSSV_MPT_PILOT_EMAILS (comma separated). */
function mpt_flag_mode(): string
{
    $mode = strtolower((string)cssv_env('CSSV_MPT_APPLICATION_FLOW', 'off'));
    return in_array($mode, ['off', 'pilot', 'on'], true) ? $mode : 'off';
}

function mpt_enabled_for(?array $session): bool
{
    $mode = mpt_flag_mode();
    if ($mode === 'on') return true;
    if ($mode !== 'pilot' || $session === null) return false;
    $allowed = array_filter(array_map(static fn($e) => strtolower(trim($e)), explode(',', (string)cssv_env('CSSV_MPT_PILOT_EMAILS', ''))));
    return in_array(strtolower((string)$session['email']), $allowed, true);
}

function mpt_require_enabled(?array $session): void
{
    if (!mpt_enabled_for($session)) cssv_fail('The MPT application service is not available yet.', 404, 'mpt_not_enabled');
}

/** Standard bootstrap for a candidate endpoint. */
function mpt_candidate_request(string ...$methods): array
{
    cssv_require_method(...$methods);
    header('Cache-Control: no-store, private, max-age=0');
    header('X-Robots-Tag: noindex, nofollow');
    $pdo = cssv_db();
    $session = cssv_require_user($pdo);
    mpt_require_enabled($session);
    if (!in_array(strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET')), ['GET', 'HEAD'], true)) {
        account_require_json_origin();
        cssv_require_csrf($session);
    }
    mpt_ensure_schema($pdo);
    mpt_maintain($pdo);
    return [$pdo, $session];
}

// ---------------------------------------------------------------- audit & limits

function mpt_event(PDO $pdo, string $type, ?string $userId, ?string $mockId = null, ?string $applicationId = null, ?string $attemptId = null, array $payload = []): void
{
    // Append-only: application code never updates or deletes mpt_events.
    $pdo->prepare('INSERT INTO mpt_events (user_id,mock_id,application_id,attempt_id,event_type,payload,ip_hash,user_agent,created_at) VALUES (?,?,?,?,?,?,?,?,?)')
        ->execute([
            $userId, $mockId, $applicationId, $attemptId, substr($type, 0, 40),
            $payload ? json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) : null,
            PHP_SAPI === 'cli' ? null : cssv_hash_secret(cssv_ip_prefix()),
            PHP_SAPI === 'cli' ? 'cli' : mb_substr((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 300),
            mpt_db_time(mpt_now_ms()),
        ]);
}

/** Per-account limit (D-20): a shared academy NAT must not lock out a whole room. */
function mpt_rate_limit(PDO $pdo, string $eventType, string $userId, int $max, int $windowSeconds, string $message): void
{
    $stmt = $pdo->prepare('SELECT COUNT(*) FROM login_security_events WHERE event_type=? AND user_id=? AND occurred_at>=?');
    $stmt->execute([$eventType, $userId, gmdate('Y-m-d H:i:s', time() - $windowSeconds)]);
    if ((int)$stmt->fetchColumn() >= $max) cssv_fail($message, 429, 'rate_limited');
}

function mpt_ip_flood_guard(PDO $pdo, string $eventType, int $max, int $windowSeconds): void
{
    $stmt = $pdo->prepare('SELECT COUNT(*) FROM login_security_events WHERE event_type=? AND ip_prefix_hash=? AND occurred_at>=?');
    $stmt->execute([$eventType, cssv_hash_secret(cssv_ip_prefix()), gmdate('Y-m-d H:i:s', time() - $windowSeconds)]);
    if ((int)$stmt->fetchColumn() >= $max) cssv_fail('Too many requests. Please try again in a minute.', 429, 'rate_limited');
}

// ---------------------------------------------------------------- paper store

function mpt_paper_manifest(): ?array
{
    static $manifest = false;
    if ($manifest !== false) return $manifest;
    $file = CSSV_MPT_PAPER_DIR . '/manifest.php';
    $manifest = null;
    if (is_file($file)) {
        $decoded = json_decode((string)base64_decode((string)(require $file), true), true);
        if (is_array($decoded) && isset($decoded['series'], $decoded['papers']) && is_array($decoded['papers'])) $manifest = $decoded;
    }
    return $manifest;
}

function mpt_paper_questions(int $index): ?array
{
    $file = CSSV_MPT_PAPER_DIR . '/paper-' . str_pad((string)$index, 3, '0', STR_PAD_LEFT) . '.php';
    if (!is_file($file)) return null;
    $decoded = json_decode((string)base64_decode((string)(require $file), true), true);
    return is_array($decoded) ? $decoded : null;
}

/**
 * Copies the first exported paper that shares no question with any previously
 * frozen paper into mpt_mock_questions. Returns false when the runway is empty.
 */
function mpt_freeze_next_paper(PDO $pdo, array $mock): bool
{
    $manifest = mpt_paper_manifest();
    if ($manifest === null || empty($manifest['publishable'])) return false;
    $used = $pdo->prepare('SELECT 1 FROM mpt_mock_questions WHERE question_id=? LIMIT 1');
    $refUsed = $pdo->prepare('SELECT 1 FROM mpt_mocks WHERE paper_ref=? LIMIT 1');
    foreach ($manifest['papers'] as $paper) {
        $ref = $manifest['series'] . ':' . $paper['index'];
        $refUsed->execute([$ref]);
        if ($refUsed->fetchColumn()) continue;
        $questions = mpt_paper_questions((int)$paper['index']);
        if (!$questions || count($questions) !== (int)$paper['count']) continue;
        $overlap = false;
        foreach ($questions as $question) {
            $used->execute([(string)$question['id']]);
            if ($used->fetchColumn()) { $overlap = true; break; }
        }
        if ($overlap) continue;
        $insert = $pdo->prepare('INSERT INTO mpt_mock_questions (mock_id,position,question_id,section,topic,difficulty,stem,options,correct_index,explanation) VALUES (?,?,?,?,?,?,?,?,?,?)');
        foreach (array_values($questions) as $position => $question) {
            $insert->execute([
                $mock['id'], $position + 1, (string)$question['id'], (string)$question['section'],
                isset($question['topic']) ? mb_substr((string)$question['topic'], 0, 191) : null,
                isset($question['difficulty']) ? (string)$question['difficulty'] : null,
                (string)$question['q'], json_encode(array_values($question['o']), JSON_UNESCAPED_UNICODE),
                (int)$question['a'], isset($question['e']) ? (string)$question['e'] : null,
            ]);
        }
        $count = count($questions);
        $pdo->prepare('UPDATE mpt_mocks SET paper_ref=?,paper_series=?,paper_frozen_at=?,total_questions=?,total_marks=?*marks_per_question WHERE id=?')
            ->execute([$ref, $manifest['series'], mpt_db_time(mpt_now_ms()), $count, $count, $mock['id']]);
        return true;
    }
    return false;
}

// ---------------------------------------------------------------- automatic schedule (D-01)

function mpt_meta_set(PDO $pdo, string $key, string $value): void
{
    $pdo->prepare('INSERT INTO mpt_meta (meta_key,meta_value) VALUES (?,?) ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value)')->execute([$key, $value]);
}

function mpt_meta_get(PDO $pdo, string $key): ?string
{
    $stmt = $pdo->prepare('SELECT meta_value FROM mpt_meta WHERE meta_key=?');
    $stmt->execute([$key]);
    $value = $stmt->fetchColumn();
    return $value === false ? null : (string)$value;
}

/** Creates one mock row (and its single session) with a frozen paper, or nothing. */
function mpt_create_mock(PDO $pdo, array $spec): ?array
{
    $pdo->beginTransaction();
    try {
        $pdo->query("INSERT IGNORE INTO mpt_meta (meta_key,meta_value) VALUES ('mock_number_seq','0')");
        $seq = $pdo->query("SELECT meta_value FROM mpt_meta WHERE meta_key='mock_number_seq' FOR UPDATE")->fetchColumn();
        $number = max((int)$seq, (int)$pdo->query('SELECT COALESCE(MAX(mock_number),0) FROM mpt_mocks')->fetchColumn()) + 1;
        $id = cssv_uuid_v4();
        $open = (int)$spec['exam_open_ms'];
        $duration = (int)($spec['duration_minutes'] ?? 200);
        $closeOffset = (int)($spec['close_offset_minutes'] ?? 10);
        $mock = [
            'id' => $id,
            'public_slug' => mpt_mock_slug($number),
            'mock_number' => $number,
            'schedule_key' => $spec['schedule_key'] ?? null,
            'title' => $spec['title'] ?? ('CSS MPT Mock ' . $number),
            'application_open_at' => mpt_db_time((int)($spec['application_open_ms'] ?? $open - 86400000)),
            'application_close_at' => mpt_db_time($open + $closeOffset * 60000),
            'exam_open_at' => mpt_db_time($open),
            'entry_close_at' => mpt_db_time($open + (int)($spec['entry_close_offset_minutes'] ?? $closeOffset) * 60000),
            'exam_end_at' => mpt_db_time($open + $duration * 60000),
            'duration_minutes' => $duration,
            'roll_issue_delay_minutes' => (int)($spec['roll_issue_delay_minutes'] ?? 10),
            'created_by' => (string)($spec['created_by'] ?? 'system'),
        ];
        $pdo->prepare('INSERT INTO mpt_mocks (id,public_slug,mock_number,schedule_key,title,status,application_open_at,application_close_at,exam_open_at,entry_close_at,exam_end_at,duration_minutes,roll_issue_delay_minutes,created_by) VALUES (?,?,?,?,?,\'DRAFT\',?,?,?,?,?,?,?,?)')
            ->execute([$mock['id'], $mock['public_slug'], $number, $mock['schedule_key'], $mock['title'], $mock['application_open_at'], $mock['application_close_at'], $mock['exam_open_at'], $mock['entry_close_at'], $mock['exam_end_at'], $duration, $mock['roll_issue_delay_minutes'], $mock['created_by']]);
        $pdo->prepare('INSERT INTO mpt_sessions (id,mock_id,starts_at,ends_at,capacity) VALUES (?,?,?,?,?)')
            ->execute([cssv_uuid_v4(), $id, $mock['exam_open_at'], $mock['exam_end_at'], $spec['capacity'] ?? null]);
        if (!mpt_freeze_next_paper($pdo, $mock)) {
            $pdo->rollBack();
            return null;
        }
        $pdo->prepare("UPDATE mpt_mocks SET status='PUBLISHED' WHERE id=?")->execute([$id]);
        $pdo->prepare("UPDATE mpt_meta SET meta_value=? WHERE meta_key='mock_number_seq'")->execute([(string)$number]);
        mpt_event($pdo, 'ADMIN_ACTION', null, $id, null, null, ['action' => 'mock_created', 'by' => $mock['created_by'], 'schedule_key' => $mock['schedule_key']]);
        $pdo->commit();
        return $mock;
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $error;
    }
}

/** Ensures the next daily 15:00 / 22:30 PKT slots exist while papers remain. */
function mpt_auto_schedule(PDO $pdo, int $nowMs): void
{
    if (mpt_flag_mode() === 'off' || strtolower((string)cssv_env('CSSV_MPT_AUTO_SCHEDULE', 'on')) === 'off') return;
    $zone = new DateTimeZone(CSSV_MPT_PKT);
    $today = (new DateTimeImmutable('@' . intdiv($nowMs, 1000)))->setTimezone($zone)->setTime(0, 0);
    $exists = $pdo->prepare('SELECT 1 FROM mpt_mocks WHERE schedule_key=? LIMIT 1');
    for ($day = 0; $day <= 2; $day++) {
        foreach (CSSV_MPT_DAILY_SLOTS as $slot => $clock) {
            [$h, $m] = array_map('intval', explode(':', $clock));
            $open = (int)$today->modify("+$day day")->setTime($h, $m)->format('U') * 1000;
            // Applications open 24 h ahead; stop creating once applications would already be closed.
            if ($open - $nowMs > 86400000 || $nowMs >= $open + 10 * 60000) continue;
            $key = 'daily-' . $today->modify("+$day day")->format('Y-m-d') . '-' . $slot;
            $exists->execute([$key]);
            if ($exists->fetchColumn()) continue;
            try {
                $created = mpt_create_mock($pdo, ['exam_open_ms' => $open, 'schedule_key' => $key]);
            } catch (PDOException $error) {
                if (($error->errorInfo[1] ?? 0) === 1062) continue; // Created concurrently.
                throw $error;
            }
            if ($created === null) {
                mpt_meta_set($pdo, 'paper_runway_exhausted_at', mpt_db_time($nowMs));
                return;
            }
        }
    }
}

// ---------------------------------------------------------------- maintenance / sweeper (D-09)

/** Cheap, throttled, lock-protected: runs the scheduler and sweeper at most every 15 s. */
function mpt_maintain(PDO $pdo, bool $force = false): array
{
    $now = mpt_now_ms();
    if (!$force) {
        $last = mpt_ms(mpt_meta_get($pdo, 'last_maintenance_at'));
        if ($last !== null && $now - $last < 15000) return ['skipped' => true];
    }
    if ((int)$pdo->query("SELECT GET_LOCK('cssvista-mpt-maintain',0)")->fetchColumn() !== 1) return ['skipped' => true];
    try {
        mpt_meta_set($pdo, 'last_maintenance_at', mpt_db_time($now));
        mpt_auto_schedule($pdo, $now);
        return mpt_sweep($pdo, $now, $force ? 500 : 50);
    } finally {
        $pdo->query("SELECT RELEASE_LOCK('cssvista-mpt-maintain')");
    }
}

function mpt_sweep(PDO $pdo, int $nowMs, int $limit): array
{
    $report = ['auto_submitted' => 0, 'absent_marked' => 0, 'ranked' => 0];
    $graceCutoff = mpt_db_time($nowMs - CSSV_MPT_SAVE_GRACE_SECONDS * 1000);
    $expired = $pdo->prepare("SELECT id FROM mpt_attempts WHERE status='IN_PROGRESS' AND expires_at<=? ORDER BY expires_at LIMIT " . (int)$limit);
    $expired->execute([$graceCutoff]);
    foreach ($expired->fetchAll(PDO::FETCH_COLUMN) as $attemptId) {
        if (mpt_finalize_attempt($pdo, (string)$attemptId, 'TIME_EXPIRED')['finalized_now'] ?? false) $report['auto_submitted']++;
    }

    $closed = $pdo->prepare("SELECT id FROM mpt_mocks WHERE status='PUBLISHED' AND absent_marked_at IS NULL AND entry_close_at<=? LIMIT 20");
    $closed->execute([mpt_db_time($nowMs)]);
    foreach ($closed->fetchAll(PDO::FETCH_COLUMN) as $mockId) {
        $absent = $pdo->prepare("SELECT a.id,a.user_id FROM mpt_applications a WHERE a.mock_id=? AND a.status='ACTIVE' AND NOT EXISTS (SELECT 1 FROM mpt_attempts t WHERE t.application_id=a.id)");
        $absent->execute([$mockId]);
        foreach ($absent->fetchAll() as $row) {
            mpt_event($pdo, 'MARKED_ABSENT', (string)$row['user_id'], (string)$mockId, (string)$row['id']);
            $report['absent_marked']++;
        }
        $pdo->prepare('UPDATE mpt_mocks SET absent_marked_at=? WHERE id=?')->execute([mpt_db_time($nowMs), $mockId]);
    }

    // Rank once, after every attempt of the mock has ended and been finalised.
    $ended = $pdo->prepare("SELECT m.id,m.rank_min_candidates FROM mpt_mocks m WHERE m.status='PUBLISHED' AND m.ranks_computed_at IS NULL AND m.exam_end_at<=? AND NOT EXISTS (SELECT 1 FROM mpt_attempts t WHERE t.mock_id=m.id AND t.status='IN_PROGRESS') LIMIT 10");
    $ended->execute([$graceCutoff]);
    foreach ($ended->fetchAll() as $mock) {
        mpt_compute_ranks($pdo, (string)$mock['id'], (int)$mock['rank_min_candidates'], $nowMs);
        $report['ranked']++;
    }
    return $report;
}

function mpt_compute_ranks(PDO $pdo, string $mockId, int $minimum, int $nowMs): void
{
    $rows = $pdo->prepare("SELECT id,score FROM mpt_attempts WHERE mock_id=? AND status IN ('SUBMITTED','AUTO_SUBMITTED') AND voided_at IS NULL");
    $rows->execute([$mockId]);
    $scores = [];
    foreach ($rows->fetchAll() as $row) $scores[(string)$row['id']] = (float)$row['score'];
    $pdo->beginTransaction();
    try {
        $pdo->prepare('UPDATE mpt_attempts SET rank_position=NULL,rank_candidates=NULL,percentile=NULL WHERE mock_id=?')->execute([$mockId]);
        if (count($scores) >= max(1, $minimum)) {
            $update = $pdo->prepare('UPDATE mpt_attempts SET rank_position=?,rank_candidates=?,percentile=? WHERE id=?');
            foreach (mpt_rank($scores) as $id => $rank) $update->execute([$rank['rank'], $rank['candidates'], $rank['percentile'], $id]);
        }
        $pdo->prepare('UPDATE mpt_mocks SET ranks_computed_at=? WHERE id=?')->execute([mpt_db_time($nowMs), $mockId]);
        mpt_event($pdo, 'RESULT_GENERATED', null, $mockId, null, null, ['ranked' => count($scores) >= max(1, $minimum), 'completed' => count($scores)]);
        $pdo->commit();
    } catch (Throwable $error) {
        $pdo->rollBack();
        throw $error;
    }
}

// ---------------------------------------------------------------- lookups

function mpt_mock_by_slug(PDO $pdo, mixed $slug, bool $forUpdate = false): ?array
{
    if (!is_string($slug) || !preg_match('/^mpt-mock-\d{3,6}$/', $slug)) return null;
    $stmt = $pdo->prepare('SELECT * FROM mpt_mocks WHERE public_slug=? AND status<>\'DRAFT\'' . ($forUpdate ? ' FOR UPDATE' : ''));
    $stmt->execute([$slug]);
    return $stmt->fetch() ?: null;
}

function mpt_session_for(PDO $pdo, string $mockId, bool $forUpdate = false): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM mpt_sessions WHERE mock_id=? ORDER BY starts_at LIMIT 1' . ($forUpdate ? ' FOR UPDATE' : ''));
    $stmt->execute([$mockId]);
    return $stmt->fetch() ?: null;
}

function mpt_application_for(PDO $pdo, string $userId, string $mockId, bool $forUpdate = false): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM mpt_applications WHERE user_id=? AND mock_id=?' . ($forUpdate ? ' FOR UPDATE' : ''));
    $stmt->execute([$userId, $mockId]);
    return $stmt->fetch() ?: null;
}

/** Owner-only: another user's code is indistinguishable from a missing one. */
function mpt_application_by_code(PDO $pdo, string $userId, mixed $code): ?array
{
    if (!is_string($code) || !preg_match('/^MPTA-\d{3,6}-[2-9A-HJKMNP-Z]{6}$/', $code)) return null;
    $stmt = $pdo->prepare('SELECT * FROM mpt_applications WHERE application_code=? AND user_id=?');
    $stmt->execute([$code, $userId]);
    return $stmt->fetch() ?: null;
}

function mpt_mock_by_id(PDO $pdo, string $id): array
{
    $stmt = $pdo->prepare('SELECT * FROM mpt_mocks WHERE id=?');
    $stmt->execute([$id]);
    return $stmt->fetch();
}

function mpt_latest_attempt(PDO $pdo, string $applicationId): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM mpt_attempts WHERE application_id=? ORDER BY attempt_no DESC LIMIT 1');
    $stmt->execute([$applicationId]);
    return $stmt->fetch() ?: null;
}

function mpt_attempts_used(PDO $pdo, string $applicationId): int
{
    $stmt = $pdo->prepare('SELECT COUNT(*) FROM mpt_attempts WHERE application_id=?');
    $stmt->execute([$applicationId]);
    return (int)$stmt->fetchColumn();
}

function mpt_state(PDO $pdo, array $mock, ?array $application, ?array $attempt, int $nowMs, bool $signedIn, ?array $session = null): array
{
    $session ??= mpt_session_for($pdo, (string)$mock['id']);
    if ($application !== null) $application['attempts_used'] = mpt_attempts_used($pdo, (string)$application['id']);
    return mpt_candidate_state($mock, $session, $application, $attempt, $nowMs, $signedIn);
}

function mpt_candidate_profile(PDO $pdo, array $session, bool $create = false): array
{
    $profile = $pdo->prepare('SELECT display_name,phone,whatsapp FROM student_profiles WHERE user_id=?');
    $profile->execute([$session['user_id']]);
    $row = $profile->fetch() ?: [];
    $code = $pdo->prepare('SELECT candidate_code FROM mpt_candidates WHERE user_id=?');
    $code->execute([$session['user_id']]);
    $candidateCode = $code->fetchColumn() ?: null;
    if ($candidateCode === null && $create) {
        for ($i = 0; $i < 10 && $candidateCode === null; $i++) {
            $try = mpt_candidate_code();
            $insert = $pdo->prepare('INSERT IGNORE INTO mpt_candidates (user_id,candidate_code) VALUES (?,?)');
            $insert->execute([$session['user_id'], $try]);
            $code->execute([$session['user_id']]);
            $candidateCode = $code->fetchColumn() ?: null;
        }
    }
    return [
        'name' => (string)($row['display_name'] ?? $session['display_name'] ?? ''),
        'email' => (string)$session['email'],
        'mobile' => ($row['phone'] ?? '') !== '' ? (string)$row['phone'] : (($row['whatsapp'] ?? '') !== '' ? (string)$row['whatsapp'] : null),
        'candidate_code' => $candidateCode,
    ];
}

// ---------------------------------------------------------------- payloads

function mpt_public_mock(array $mock): array
{
    return [
        'slug' => $mock['public_slug'],
        'mock_number' => (int)$mock['mock_number'],
        'title' => $mock['title'],
        'status' => $mock['status'],
        'application_open_at' => mpt_iso(mpt_ms($mock['application_open_at'])),
        'application_close_at' => mpt_iso(mpt_ms($mock['application_close_at'])),
        'exam_open_at' => mpt_iso(mpt_ms($mock['exam_open_at'])),
        'entry_close_at' => mpt_iso(mpt_ms($mock['entry_close_at'])),
        'exam_end_at' => mpt_iso(mpt_ms($mock['exam_end_at'])),
        'duration_minutes' => (int)$mock['duration_minutes'],
        'roll_issue_delay_minutes' => (int)$mock['roll_issue_delay_minutes'],
        'total_questions' => (int)$mock['total_questions'],
        'total_marks' => (float)$mock['total_marks'],
        'negative_marking' => (float)$mock['negative_marking'],
        'pass_percentage' => $mock['pass_percentage'] === null ? null : (float)$mock['pass_percentage'],
        'results_release_policy' => $mock['results_release_policy'],
        'answer_review_policy' => $mock['answer_review_policy'],
        'fee' => 'FREE',
    ];
}

/** The roll number leaves the server only once now >= roll_number_visible_at. */
function mpt_application_payload(PDO $pdo, array $application, array $mock, array $state, int $nowMs): array
{
    $visibleAt = mpt_ms($state['timestamps']['roll_number_visible_at']);
    $visible = $application['status'] !== 'WITHDRAWN' && $visibleAt !== null && $nowMs >= $visibleAt;
    if ($visible && $application['roll_number_revealed_at'] === null) {
        $mark = $pdo->prepare('UPDATE mpt_applications SET roll_number_revealed_at=? WHERE id=? AND roll_number_revealed_at IS NULL');
        $mark->execute([mpt_db_time($nowMs), $application['id']]);
        if ($mark->rowCount() === 1) mpt_event($pdo, 'ROLL_NUMBER_ISSUED', (string)$application['user_id'], (string)$mock['id'], (string)$application['id']);
    }
    return [
        'application_code' => $application['application_code'],
        'status' => $application['status'],
        'applied_at' => mpt_iso(mpt_ms($application['applied_at'])),
        'roll_number' => $visible ? $application['roll_number'] : null,
        'roll_number_visible_at' => $state['timestamps']['roll_number_visible_at'],
        'cancel_reason' => $application['status'] === 'CANCELLED' ? $application['cancel_reason'] : null,
    ];
}

function mpt_card(PDO $pdo, array $mock, ?array $application, int $nowMs, bool $signedIn, bool $exposeRoll = true): array
{
    $attempt = $application ? mpt_latest_attempt($pdo, (string)$application['id']) : null;
    $state = mpt_state($pdo, $mock, $application, $attempt, $nowMs, $signedIn);
    $applicationPayload = null;
    if ($application && $exposeRoll) {
        $applicationPayload = mpt_application_payload($pdo, $application, $mock, $state, $nowMs);
    } elseif ($application) {
        $applicationPayload = ['application_code' => $application['application_code'], 'status' => $application['status'], 'applied_at' => mpt_iso(mpt_ms($application['applied_at'])), 'roll_number' => null, 'roll_number_visible_at' => $state['timestamps']['roll_number_visible_at'], 'cancel_reason' => null];
    }
    return [
        'mock' => mpt_public_mock($mock),
        'state' => $state,
        'application' => $applicationPayload,
        'attempt' => $attempt ? mpt_attempt_summary($attempt) : null,
    ];
}

function mpt_attempt_summary(array $attempt): array
{
    $final = in_array($attempt['status'], ['SUBMITTED', 'AUTO_SUBMITTED'], true);
    return [
        'status' => $attempt['status'],
        'started_at' => mpt_iso(mpt_ms($attempt['started_at'])),
        'expires_at' => mpt_iso(mpt_ms($attempt['expires_at'])),
        'submitted_at' => mpt_iso(mpt_ms($attempt['submitted_at'])),
        'submit_reason' => $attempt['submit_reason'],
        'score' => $final ? (float)$attempt['score'] : null,
        'total_marks' => $final ? (float)$attempt['total_marks'] : null,
        'percentage' => $final ? (float)$attempt['percentage'] : null,
    ];
}

function mpt_server_clock(): array
{
    return ['server_time' => mpt_iso(mpt_now_ms())];
}

// ---------------------------------------------------------------- apply (8.1)

function mpt_apply(PDO $pdo, array $session, mixed $slug, ?string $idempotencyKey): array
{
    $userId = (string)$session['user_id'];
    mpt_rate_limit($pdo, 'mpt-apply', $userId, 10, 60, 'Too many application requests. Please wait a minute.');
    mpt_ip_flood_guard($pdo, 'mpt-apply', 120, 60);
    cssv_log_security_event($pdo, 'mpt-apply', $userId);
    $candidate = mpt_candidate_profile($pdo, $session, true);
    if (trim($candidate['name']) === '') cssv_fail('Add your full name to your profile before applying.', 422, 'profile_name_required');

    $pdo->beginTransaction();
    try {
        $mock = mpt_mock_by_slug($pdo, $slug);
        if (!$mock) { $pdo->rollBack(); cssv_fail('This MPT Mock was not found.', 404, 'mock_not_found'); }
        $sessionRow = mpt_session_for($pdo, (string)$mock['id'], true); // serialises applies for this mock
        $now = mpt_now_ms();
        $existing = mpt_application_for($pdo, $userId, (string)$mock['id'], true);
        if ($existing && $existing['status'] === 'ACTIVE') {
            $pdo->commit();
            return ['status' => 200, 'already_applied' => true, 'card' => mpt_card($pdo, $mock, $existing, mpt_now_ms(), true)];
        }
        if ($existing && $existing['status'] === 'CANCELLED') {
            $pdo->rollBack();
            cssv_fail('This application is no longer active.', 409, 'application_cancelled');
        }
        if ($mock['status'] !== 'PUBLISHED') { $pdo->rollBack(); cssv_fail('Applications are not open for this MPT Mock.', 409, 'applications_closed'); }
        if ($now < mpt_ms($mock['application_open_at'])) { $pdo->rollBack(); cssv_fail('Applications for this MPT Mock open at ' . mpt_pkt((int)mpt_ms($mock['application_open_at']), 'j M, g:i A') . '.', 409, 'applications_not_open'); }
        if ($now >= mpt_ms($mock['application_close_at'])) { $pdo->rollBack(); cssv_fail('Applications for this MPT Mock closed at ' . mpt_pkt((int)mpt_ms($mock['application_close_at'])) . '.', 409, 'applications_closed'); }
        if ($sessionRow['capacity'] !== null && (int)$sessionRow['reserved_count'] >= (int)$sessionRow['capacity']) {
            $pdo->rollBack();
            cssv_fail('All slots for this MPT Mock have been reserved.', 409, 'slots_full');
        }
        $appliedAt = mpt_db_time($now);
        if ($existing) {
            // Reactivate a withdrawn application: same roll number, new applied_at (D-26).
            $pdo->prepare("UPDATE mpt_applications SET status='ACTIVE',applied_at=?,cancelled_at=NULL,cancel_reason=NULL,roll_number_revealed_at=NULL WHERE id=?")
                ->execute([$appliedAt, $existing['id']]);
            $applicationId = (string)$existing['id'];
            mpt_event($pdo, 'APPLICATION_SUBMITTED', $userId, (string)$mock['id'], $applicationId, null, ['reactivated' => true, 'idempotency_key' => $idempotencyKey]);
        } else {
            $applicationId = cssv_uuid_v4();
            $inserted = false;
            for ($try = 0; $try < 10 && !$inserted; $try++) {
                try {
                    $pdo->prepare("INSERT INTO mpt_applications (id,application_code,user_id,mock_id,session_id,roll_number,status,applied_at,source) VALUES (?,?,?,?,?,?,'ACTIVE',?,'web')")
                        ->execute([$applicationId, mpt_application_code((int)$mock['mock_number']), $userId, $mock['id'], $sessionRow['id'], mpt_generate_roll(), $appliedAt]);
                    $inserted = true;
                } catch (PDOException $error) {
                    if (($error->errorInfo[1] ?? 0) !== 1062) throw $error;
                    // A concurrent request for the same user+mock won; return it.
                    if (mpt_application_for($pdo, $userId, (string)$mock['id'])) break;
                    // Otherwise a roll-number or code collision: regenerate.
                }
            }
            if (!$inserted) {
                $again = mpt_application_for($pdo, $userId, (string)$mock['id']);
                $pdo->commit();
                if ($again) return ['status' => 200, 'already_applied' => true, 'card' => mpt_card($pdo, $mock, $again, mpt_now_ms(), true)];
                cssv_fail('We could not reserve your slot. Please try again.', 503, 'roll_generation_failed');
            }
            mpt_event($pdo, 'APPLICATION_SUBMITTED', $userId, (string)$mock['id'], $applicationId, null, ['idempotency_key' => $idempotencyKey]);
        }
        $pdo->prepare('UPDATE mpt_sessions SET reserved_count=reserved_count+1 WHERE id=?')->execute([$sessionRow['id']]);
        mpt_event($pdo, 'SLOT_RESERVED', $userId, (string)$mock['id'], $applicationId, null, ['session_id' => $sessionRow['id']]);
        $pdo->commit();
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $error;
    }
    $application = mpt_application_for($pdo, $userId, (string)$mock['id']);
    return ['status' => 201, 'already_applied' => false, 'card' => mpt_card($pdo, $mock, $application, mpt_now_ms(), true)];
}

function mpt_withdraw(PDO $pdo, array $session, mixed $code): array
{
    $pdo->beginTransaction();
    try {
        $application = mpt_application_by_code($pdo, (string)$session['user_id'], $code);
        if (!$application) { $pdo->rollBack(); cssv_fail('Application not found.', 404, 'not_found'); }
        $mock = mpt_mock_by_id($pdo, (string)$application['mock_id']);
        $sessionRow = mpt_session_for($pdo, (string)$mock['id'], true);
        $application = mpt_application_for($pdo, (string)$session['user_id'], (string)$mock['id'], true);
        if ($application['status'] !== 'ACTIVE') { $pdo->rollBack(); cssv_fail('This application is no longer active.', 409, 'application_inactive'); }
        if (mpt_now_ms() >= mpt_ms($mock['exam_open_at'])) { $pdo->rollBack(); cssv_fail('Applications can only be withdrawn before the exam opens.', 409, 'withdraw_closed'); }
        $pdo->prepare("UPDATE mpt_applications SET status='WITHDRAWN',cancelled_at=?,cancel_reason='Withdrawn by candidate' WHERE id=?")->execute([mpt_db_time(mpt_now_ms()), $application['id']]);
        $pdo->prepare('UPDATE mpt_sessions SET reserved_count=GREATEST(reserved_count,1)-1 WHERE id=?')->execute([$sessionRow['id']]);
        mpt_event($pdo, 'APPLICATION_CANCELLED', (string)$session['user_id'], (string)$mock['id'], (string)$application['id'], null, ['reason' => 'withdrawn']);
        $pdo->commit();
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $error;
    }
    $application = mpt_application_for($pdo, (string)$session['user_id'], (string)$mock['id']);
    return mpt_card($pdo, $mock, $application, mpt_now_ms(), true);
}

// ---------------------------------------------------------------- verify (8.2)

function mpt_verify_fail(PDO $pdo, array $session, ?array $mock, string $code, string $message, int $status, bool $countsAsGuess, array $extra = []): never
{
    if ($countsAsGuess) cssv_log_security_event($pdo, 'mpt-verify-fail', (string)$session['user_id']);
    mpt_event($pdo, 'ROLL_VERIFY_FAIL', (string)$session['user_id'], $mock['id'] ?? null, null, null, ['reason' => $code]);
    cssv_json(['ok' => false, 'error' => $code, 'message' => $message] + $extra, $status);
}

function mpt_verify(PDO $pdo, array $session, mixed $slug, mixed $rollInput): array
{
    $userId = (string)$session['user_id'];
    mpt_rate_limit($pdo, 'mpt-verify-fail', $userId, 5, 600, 'Too many incorrect attempts. Please wait a few minutes, then copy the Roll Number from your application.');
    $mock = mpt_mock_by_slug($pdo, $slug);
    if (!$mock) cssv_fail('This MPT Mock was not found.', 404, 'mock_not_found');
    $now = mpt_now_ms();

    // 1. Six digits with a valid check digit.
    if (!mpt_roll_is_well_formed($rollInput)) {
        mpt_verify_fail($pdo, $session, $mock, 'roll_format', 'Please check your Roll Number — one digit looks wrong.', 422, true);
    }
    $roll = (string)mpt_normalise_roll($rollInput);
    // 2-4. Exists, visible, owned by this user, for this mock. Not found and
    // someone else's share one message so valid numbers cannot be discovered.
    $stmt = $pdo->prepare('SELECT * FROM mpt_applications WHERE mock_id=? AND roll_number=?');
    $stmt->execute([$mock['id'], $roll]);
    $application = $stmt->fetch() ?: null;
    $visible = false;
    if ($application && $application['user_id'] === $userId) {
        $visible = $now >= mpt_roll_visible_at((int)mpt_ms($application['applied_at']), (int)mpt_ms($mock['exam_open_at']), (int)$mock['roll_issue_delay_minutes']);
    }
    if (!$application || $application['user_id'] !== $userId || !$visible || $application['status'] === 'WITHDRAWN') {
        $other = $pdo->prepare("SELECT m.exam_open_at,a.applied_at,m.roll_issue_delay_minutes FROM mpt_applications a JOIN mpt_mocks m ON m.id=a.mock_id WHERE a.user_id=? AND a.roll_number=? AND a.mock_id<>? AND a.status='ACTIVE'");
        $other->execute([$userId, $roll, $mock['id']]);
        foreach ($other->fetchAll() as $row) {
            if ($now >= mpt_roll_visible_at((int)mpt_ms($row['applied_at']), (int)mpt_ms($row['exam_open_at']), (int)$row['roll_issue_delay_minutes'])) {
                mpt_verify_fail($pdo, $session, $mock, 'roll_other_mock', 'This Roll Number belongs to a different MPT Mock. Open the correct mock from your dashboard.', 422, false);
            }
        }
        mpt_verify_fail($pdo, $session, $mock, 'roll_not_linked', "This Roll Number isn't linked to your account for this mock. Please use the Roll Number shown in your own My CSS Vista application.", 422, true);
    }
    // 5-6. Application and mock active.
    if ($application['status'] !== 'ACTIVE' || $mock['status'] !== 'PUBLISHED') {
        mpt_verify_fail($pdo, $session, $mock, 'application_inactive', 'This application is no longer active.', 409, false);
    }
    $attempt = mpt_latest_attempt($pdo, (string)$application['id']);
    $used = mpt_attempts_used($pdo, (string)$application['id']);
    $inProgress = $attempt && $attempt['status'] === 'IN_PROGRESS' && $now < mpt_ms($attempt['expires_at']);
    // 8. Already completed.
    if ($attempt && in_array($attempt['status'], ['SUBMITTED', 'AUTO_SUBMITTED'], true)
        || ($attempt && $attempt['status'] === 'IN_PROGRESS' && !$inProgress)) {
        mpt_verify_fail($pdo, $session, $mock, 'already_completed', 'You have already completed this mock.', 409, false, ['application_code' => $application['application_code']]);
    }
    // 7. Inside the entry window (an attempt already in progress may resume).
    if (!$inProgress) {
        if ($now < mpt_ms($mock['exam_open_at'])) {
            mpt_verify_fail($pdo, $session, $mock, 'entry_not_open', 'Your slot is reserved. Entry opens at ' . mpt_pkt((int)mpt_ms($mock['exam_open_at'])) . '.', 409, false, ['entry_opens_at' => mpt_iso(mpt_ms($mock['exam_open_at']))]);
        }
        if ($now >= mpt_ms($mock['entry_close_at']) || $now >= mpt_ms($mock['exam_end_at'])) {
            mpt_verify_fail($pdo, $session, $mock, 'entry_closed', 'Entry for this MPT Mock closed at ' . mpt_pkt((int)mpt_ms($mock['entry_close_at'])) . '.', 409, false);
        }
        // 9. Attempt allowance (voided attempts need an admin re-sit).
        if ($used >= (int)$application['attempt_allowance']) {
            mpt_verify_fail($pdo, $session, $mock, 'already_completed', 'You have already used your attempt for this mock.', 409, false, ['application_code' => $application['application_code']]);
        }
    }

    mpt_event($pdo, 'ROLL_VERIFY_SUCCESS', $userId, (string)$mock['id'], (string)$application['id']);
    $token = mpt_sign_token([
        'u' => $userId, 'a' => (string)$application['id'], 'm' => (string)$mock['id'],
        'e' => intdiv($now, 1000) + CSSV_MPT_TOKEN_TTL_SECONDS, 'v' => 1,
    ], cssv_secret());
    $candidate = mpt_candidate_profile($pdo, $session);
    $open = (int)mpt_ms($mock['exam_open_at']); $end = (int)mpt_ms($mock['exam_end_at']);
    $sections = $pdo->prepare('SELECT section,COUNT(*) questions,MIN(position) first_position FROM mpt_mock_questions WHERE mock_id=? GROUP BY section ORDER BY first_position');
    $sections->execute([$mock['id']]);
    return [
        'verification_token' => $token,
        'sections' => array_map(static fn(array $row): array => ['label' => $row['section'], 'count' => (int)$row['questions']], $sections->fetchAll()),
        'token_expires_at' => mpt_iso($now + CSSV_MPT_TOKEN_TTL_SECONDS * 1000),
        'resume' => $inProgress,
        'candidate' => ['name' => $candidate['name'], 'candidate_code' => $candidate['candidate_code'], 'roll_number' => $roll, 'application_code' => $application['application_code']],
        'mock' => mpt_public_mock($mock),
        'time_allowance_seconds' => $inProgress ? max(0, intdiv((int)mpt_ms($attempt['expires_at']) - $now, 1000)) : mpt_time_allowance_seconds($now, $open, $end),
        'minutes_late' => $inProgress ? 0 : mpt_minutes_late($now, $open),
    ];
}

// ---------------------------------------------------------------- attempt runtime (8.3, 8.4, 9)

function mpt_client_id(mixed $value): string
{
    if (!is_string($value) || !preg_match('/^[A-Za-z0-9_-]{16,64}$/', $value)) cssv_fail('Refresh this page to continue.', 400, 'invalid_client');
    return $value;
}

function mpt_device_key(array $session, string $clientId): string
{
    return hash_hmac('sha256', 'mpt-device|' . $session['session_id'] . '|' . $clientId, cssv_secret());
}

/** The paper as the candidate sees it: positions, never bank ids or keys. */
function mpt_paper_for_candidate(PDO $pdo, string $mockId): array
{
    $stmt = $pdo->prepare('SELECT position,section,stem,options FROM mpt_mock_questions WHERE mock_id=? ORDER BY position');
    $stmt->execute([$mockId]);
    return array_map(static fn(array $row): array => [
        'p' => (int)$row['position'],
        'section' => $row['section'],
        'q' => $row['stem'],
        'o' => json_decode((string)$row['options'], true),
    ], $stmt->fetchAll());
}

function mpt_saved_answers(PDO $pdo, string $attemptId): array
{
    $stmt = $pdo->prepare('SELECT q.position,a.selected_option FROM mpt_attempt_answers a JOIN mpt_attempts t ON t.id=a.attempt_id JOIN mpt_mock_questions q ON q.mock_id=t.mock_id AND q.question_id=a.question_id WHERE a.attempt_id=? AND a.selected_option IS NOT NULL');
    $stmt->execute([$attemptId]);
    $out = [];
    foreach ($stmt->fetchAll() as $row) $out[(string)$row['position']] = (int)$row['selected_option'];
    return $out;
}

function mpt_runtime_payload(PDO $pdo, array $attempt, array $mock, bool $withPaper): array
{
    $now = mpt_now_ms();
    $payload = [
        'attempt' => [
            'status' => $attempt['status'],
            'started_at' => mpt_iso(mpt_ms($attempt['started_at'])),
            'expires_at' => mpt_iso(mpt_ms($attempt['expires_at'])),
            'save_version' => (int)$attempt['save_version'],
            'current_position' => (int)$attempt['current_position'],
            'remaining_seconds' => max(0, intdiv((int)mpt_ms($attempt['expires_at']) - $now, 1000)),
        ],
        'server_time' => mpt_iso($now),
        'mock' => mpt_public_mock($mock),
    ];
    if ($withPaper) {
        $payload['paper'] = mpt_paper_for_candidate($pdo, (string)$mock['id']);
        $payload['answers'] = mpt_saved_answers($pdo, (string)$attempt['id']);
    }
    return $payload;
}

function mpt_start(PDO $pdo, array $session, mixed $token, mixed $clientIdInput): array
{
    $userId = (string)$session['user_id'];
    $clientId = mpt_client_id($clientIdInput);
    $claims = is_string($token) ? mpt_read_token($token, cssv_secret(), mpt_now_ms()) : null;
    if (!$claims || !hash_equals($userId, (string)$claims['u'])) cssv_fail('Please verify your Roll Number again to enter the examination.', 403, 'verification_required');
    mpt_rate_limit($pdo, 'mpt-start', $userId, 20, 600, 'Too many start requests. Please wait a few minutes.');
    cssv_log_security_event($pdo, 'mpt-start', $userId);
    $device = mpt_device_key($session, $clientId);

    $pdo->beginTransaction();
    try {
        $appStmt = $pdo->prepare('SELECT * FROM mpt_applications WHERE id=? AND user_id=? AND mock_id=? FOR UPDATE');
        $appStmt->execute([$claims['a'], $userId, $claims['m']]);
        $application = $appStmt->fetch();
        $mock = $application ? mpt_mock_by_id($pdo, (string)$application['mock_id']) : null;
        if (!$application || !$mock || $application['status'] !== 'ACTIVE' || $mock['status'] !== 'PUBLISHED') {
            $pdo->rollBack();
            cssv_fail('This application is no longer active.', 409, 'application_inactive');
        }
        $now = mpt_now_ms();
        $attempt = mpt_latest_attempt($pdo, (string)$application['id']);
        if ($attempt && $attempt['status'] === 'IN_PROGRESS' && $now < mpt_ms($attempt['expires_at'])) {
            // Resume after verification; a different device takes over (D-16).
            $takeover = !hash_equals((string)$attempt['active_session_id'], $device);
            $pdo->prepare('UPDATE mpt_attempts SET active_session_id=?,device_takeovers=device_takeovers+? WHERE id=?')->execute([$device, $takeover ? 1 : 0, $attempt['id']]);
            mpt_event($pdo, $takeover ? 'DEVICE_TAKEOVER' : 'ATTEMPT_RESUMED', $userId, (string)$mock['id'], (string)$application['id'], (string)$attempt['id']);
            $pdo->commit();
            $attempt = mpt_latest_attempt($pdo, (string)$application['id']);
            return ['status' => 200, 'resumed' => true] + mpt_runtime_payload($pdo, $attempt, $mock, true);
        }
        if ($attempt && $attempt['status'] !== 'VOIDED') {
            $pdo->rollBack();
            cssv_fail('You have already completed this mock.', 409, 'already_completed');
        }
        if (mpt_attempts_used($pdo, (string)$application['id']) >= (int)$application['attempt_allowance']) {
            $pdo->rollBack();
            cssv_fail('You have already used your attempt for this mock.', 409, 'already_completed');
        }
        if ($now < mpt_ms($mock['exam_open_at'])) { $pdo->rollBack(); cssv_fail('Entry opens at ' . mpt_pkt((int)mpt_ms($mock['exam_open_at'])) . '.', 409, 'entry_not_open'); }
        if ($now >= mpt_ms($mock['entry_close_at']) || $now >= mpt_ms($mock['exam_end_at'])) { $pdo->rollBack(); cssv_fail('Entry for this MPT Mock closed at ' . mpt_pkt((int)mpt_ms($mock['entry_close_at'])) . '.', 409, 'entry_closed'); }
        $visibleAt = mpt_roll_visible_at((int)mpt_ms($application['applied_at']), (int)mpt_ms($mock['exam_open_at']), (int)$mock['roll_issue_delay_minutes']);
        if ($now < $visibleAt) { $pdo->rollBack(); cssv_fail('Your Roll Number has not been issued yet.', 409, 'roll_not_issued'); }

        $attemptId = cssv_uuid_v4();
        $pdo->prepare("INSERT INTO mpt_attempts (id,application_id,attempt_no,user_id,mock_id,status,started_at,expires_at,active_session_id,scoring_version) VALUES (?,?,?,?,?,'IN_PROGRESS',?,?,?,?)")
            ->execute([$attemptId, $application['id'], ($attempt ? (int)$attempt['attempt_no'] : 0) + 1, $userId, $mock['id'], mpt_db_time($now), $mock['exam_end_at'], $device, $mock['scoring_version']]);
        mpt_event($pdo, 'ATTEMPT_STARTED', $userId, (string)$mock['id'], (string)$application['id'], $attemptId, ['minutes_late' => mpt_minutes_late($now, (int)mpt_ms($mock['exam_open_at']))]);
        $pdo->commit();
    } catch (PDOException $error) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        if (($error->errorInfo[1] ?? 0) === 1062) cssv_fail('Your examination has already started. Refresh to continue.', 409, 'attempt_exists');
        throw $error;
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $error;
    }
    $attempt = mpt_latest_attempt($pdo, (string)$application['id']);
    return ['status' => 201, 'resumed' => false] + mpt_runtime_payload($pdo, $attempt, $mock, true);
}

/** Loads the caller's current attempt for a mock and enforces the device lock. */
function mpt_owned_attempt(PDO $pdo, array $session, mixed $slug, string $clientId, bool $forUpdate = false): array
{
    $mock = mpt_mock_by_slug($pdo, $slug);
    $application = $mock ? mpt_application_for($pdo, (string)$session['user_id'], (string)$mock['id']) : null;
    $attempt = $application ? mpt_latest_attempt($pdo, (string)$application['id']) : null;
    if (!$attempt) cssv_fail('No examination is in progress for this mock.', 404, 'not_found');
    if ($forUpdate) {
        $lock = $pdo->prepare('SELECT * FROM mpt_attempts WHERE id=? FOR UPDATE');
        $lock->execute([$attempt['id']]);
        $attempt = $lock->fetch();
    }
    if ($attempt['status'] === 'IN_PROGRESS' && !hash_equals((string)$attempt['active_session_id'], mpt_device_key($session, $clientId))) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        cssv_fail('This exam is open on another device. Continue here?', 409, 'device_conflict');
    }
    return [$mock, $application, $attempt];
}

function mpt_resume(PDO $pdo, array $session, mixed $slug, mixed $clientIdInput): array
{
    $clientId = mpt_client_id($clientIdInput);
    [$mock, , $attempt] = mpt_owned_attempt($pdo, $session, $slug, $clientId);
    if ($attempt['status'] !== 'IN_PROGRESS' || mpt_now_ms() >= mpt_ms($attempt['expires_at'])) {
        cssv_json(['ok' => false, 'error' => 'attempt_finished', 'message' => 'This examination has ended.'], 409);
    }
    return mpt_runtime_payload($pdo, $attempt, $mock, true);
}

function mpt_save(PDO $pdo, array $session, array $body): array
{
    $clientId = mpt_client_id($body['client_id'] ?? null);
    $version = filter_var($body['save_version'] ?? null, FILTER_VALIDATE_INT);
    $changes = $body['changes'] ?? [];
    if ($version === false || $version < 1 || !is_array($changes) || count($changes) > 200) cssv_fail('Invalid save.', 422, 'invalid_save');

    $pdo->beginTransaction();
    try {
        [$mock, , $attempt] = mpt_owned_attempt($pdo, $session, $body['mock'] ?? null, $clientId, true);
        $now = mpt_now_ms();
        if ($attempt['status'] !== 'IN_PROGRESS' || $now >= mpt_ms($attempt['expires_at']) + CSSV_MPT_SAVE_GRACE_SECONDS * 1000) {
            $pdo->rollBack();
            cssv_json(['ok' => false, 'error' => 'attempt_finished', 'message' => 'Time is up. Your saved answers have been submitted.'], 409);
        }
        if ($version <= (int)$attempt['save_version']) {
            $pdo->rollBack();
            cssv_json(['ok' => false, 'error' => 'stale_save', 'message' => 'Newer answers were already saved.', 'save_version' => (int)$attempt['save_version']] + mpt_server_clock(), 409);
        }
        $lookup = $pdo->prepare('SELECT question_id FROM mpt_mock_questions WHERE mock_id=? AND position=?');
        $upsert = $pdo->prepare('INSERT INTO mpt_attempt_answers (attempt_id,question_id,selected_option,answered_at) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE selected_option=VALUES(selected_option),answered_at=VALUES(answered_at)');
        foreach ($changes as $change) {
            $position = filter_var($change['p'] ?? null, FILTER_VALIDATE_INT);
            $option = $change['o'] ?? null;
            if ($position === false || ($option !== null && (!is_int($option) || $option < 0 || $option > 3))) {
                $pdo->rollBack();
                cssv_fail('Invalid answer.', 422, 'invalid_answer');
            }
            $lookup->execute([$mock['id'], $position]);
            $questionId = $lookup->fetchColumn();
            if ($questionId === false) { $pdo->rollBack(); cssv_fail('Invalid answer.', 422, 'invalid_answer'); }
            $upsert->execute([$attempt['id'], $questionId, $option, mpt_db_time($now)]);
        }
        $current = filter_var($body['current_position'] ?? null, FILTER_VALIDATE_INT);
        $visibility = filter_var($body['visibility_changes'] ?? 0, FILTER_VALIDATE_INT);
        $pdo->prepare('UPDATE mpt_attempts SET save_version=?,last_saved_at=?,current_position=COALESCE(?,current_position),visibility_changes=GREATEST(visibility_changes,?) WHERE id=?')
            ->execute([$version, mpt_db_time($now), $current === false ? null : max(0, min(1000, $current)), $visibility === false ? 0 : max(0, min(100000, $visibility)), $attempt['id']]);
        $pdo->commit();
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $error;
    }
    return [
        'save_version' => $version,
        'remaining_seconds' => max(0, intdiv((int)mpt_ms($attempt['expires_at']) - $now, 1000)),
    ] + mpt_server_clock();
}

// ---------------------------------------------------------------- submit & scoring (8.5)

/**
 * Idempotent finalisation, used by manual submit and the sweeper alike. Scores
 * against the frozen key in mpt_mock_questions and refreshes the user's stats.
 */
function mpt_finalize_attempt(PDO $pdo, string $attemptId, string $reason): array
{
    $pdo->beginTransaction();
    try {
        $lock = $pdo->prepare('SELECT * FROM mpt_attempts WHERE id=? FOR UPDATE');
        $lock->execute([$attemptId]);
        $attempt = $lock->fetch();
        if (!$attempt || $attempt['status'] !== 'IN_PROGRESS') {
            $pdo->commit();
            return ['finalized_now' => false, 'attempt' => $attempt];
        }
        $mock = mpt_mock_by_id($pdo, (string)$attempt['mock_id']);
        $now = mpt_now_ms();
        $expires = (int)mpt_ms($attempt['expires_at']);
        $submittedAt = min($now, $expires);
        mpt_score_attempt($pdo, $attempt, $mock);
        $status = $reason === 'MANUAL' ? 'SUBMITTED' : 'AUTO_SUBMITTED';
        $pdo->prepare('UPDATE mpt_attempts SET status=?,submitted_at=?,submit_reason=?,time_taken_seconds=? WHERE id=?')
            ->execute([$status, mpt_db_time($submittedAt), $reason, max(0, intdiv($submittedAt - (int)mpt_ms($attempt['started_at']), 1000)), $attemptId]);
        mpt_refresh_user_stats($pdo, (string)$attempt['user_id']);
        mpt_event($pdo, $status, (string)$attempt['user_id'], (string)$mock['id'], (string)$attempt['application_id'], $attemptId, ['reason' => $reason]);
        $pdo->commit();
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $error;
    }
    $lock->execute([$attemptId]);
    return ['finalized_now' => true, 'attempt' => $lock->fetch()];
}

/** Writes score, per-answer correctness and subject scores. Caller holds the attempt lock. */
function mpt_score_attempt(PDO $pdo, array $attempt, array $mock): void
{
    $questions = $pdo->prepare('SELECT question_id,section,correct_index FROM mpt_mock_questions WHERE mock_id=? ORDER BY position');
    $questions->execute([$mock['id']]);
    $answers = $pdo->prepare('SELECT question_id,selected_option FROM mpt_attempt_answers WHERE attempt_id=?');
    $answers->execute([$attempt['id']]);
    $selected = [];
    foreach ($answers->fetchAll() as $row) $selected[(string)$row['question_id']] = $row['selected_option'] === null ? null : (int)$row['selected_option'];
    $result = mpt_score($questions->fetchAll(), $selected, (float)$mock['marks_per_question'], (float)$mock['negative_marking']);

    $mark = $pdo->prepare('UPDATE mpt_attempt_answers SET is_correct=? WHERE attempt_id=? AND question_id=?');
    foreach ($result['per_question'] as $qid => $correct) if ($correct !== null) $mark->execute([$correct ? 1 : 0, $attempt['id'], $qid]);
    $pdo->prepare('DELETE FROM mpt_attempt_subject_scores WHERE attempt_id=?')->execute([$attempt['id']]);
    $subject = $pdo->prepare('INSERT INTO mpt_attempt_subject_scores (attempt_id,subject_key,questions,attempted,correct,incorrect,score,accuracy) VALUES (?,?,?,?,?,?,?,?)');
    foreach ($result['subjects'] as $key => $row) $subject->execute([$attempt['id'], $key, $row['questions'], $row['attempted'], $row['correct'], $row['incorrect'], $row['score'], $row['accuracy']]);
    $pdo->prepare('UPDATE mpt_attempts SET score=?,total_marks=?,correct_count=?,incorrect_count=?,unanswered_count=?,percentage=?,accuracy=?,scoring_version=? WHERE id=?')
        ->execute([$result['score'], $result['total_marks'], $result['correct'], $result['incorrect'], $result['unanswered'], $result['percentage'], $result['accuracy'], $mock['scoring_version'], $attempt['id']]);
}

/** Only SUBMITTED/AUTO_SUBMITTED, non-voided attempts count. Absences never count as zero. */
function mpt_refresh_user_stats(PDO $pdo, string $userId): void
{
    $stmt = $pdo->prepare("SELECT COUNT(*) n,AVG(score) avg_score,MAX(score) hi,MIN(score) lo,AVG(percentage) avg_pct,MAX(percentage) hi_pct,AVG(accuracy) avg_acc,COALESCE(SUM(correct_count),0) c,COALESCE(SUM(incorrect_count),0) i FROM mpt_attempts WHERE user_id=? AND status IN ('SUBMITTED','AUTO_SUBMITTED') AND voided_at IS NULL");
    $stmt->execute([$userId]);
    $agg = $stmt->fetch();
    $latest = $pdo->prepare("SELECT score,percentage FROM mpt_attempts WHERE user_id=? AND status IN ('SUBMITTED','AUTO_SUBMITTED') AND voided_at IS NULL ORDER BY submitted_at DESC LIMIT 1");
    $latest->execute([$userId]);
    $last = $latest->fetch() ?: ['score' => null, 'percentage' => null];
    $pdo->prepare('INSERT INTO mpt_user_stats (user_id,attempts_completed,avg_score,highest_score,lowest_score,latest_score,avg_percentage,highest_percentage,latest_percentage,avg_accuracy,total_correct,total_incorrect) VALUES (?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE attempts_completed=VALUES(attempts_completed),avg_score=VALUES(avg_score),highest_score=VALUES(highest_score),lowest_score=VALUES(lowest_score),latest_score=VALUES(latest_score),avg_percentage=VALUES(avg_percentage),highest_percentage=VALUES(highest_percentage),latest_percentage=VALUES(latest_percentage),avg_accuracy=VALUES(avg_accuracy),total_correct=VALUES(total_correct),total_incorrect=VALUES(total_incorrect)')
        ->execute([$userId, (int)$agg['n'], $agg['avg_score'], $agg['hi'], $agg['lo'], $last['score'], $agg['avg_pct'], $agg['hi_pct'], $last['percentage'], $agg['avg_acc'], (int)$agg['c'], (int)$agg['i']]);
}

function mpt_submit(PDO $pdo, array $session, mixed $slug, mixed $clientIdInput): array
{
    $userId = (string)$session['user_id'];
    $clientId = mpt_client_id($clientIdInput);
    mpt_rate_limit($pdo, 'mpt-submit', $userId, 20, 600, 'Too many submit requests. Please wait a moment.');
    cssv_log_security_event($pdo, 'mpt-submit', $userId);
    [$mock, $application, $attempt] = mpt_owned_attempt($pdo, $session, $slug, $clientId);
    if ($attempt['status'] === 'IN_PROGRESS') {
        $late = mpt_now_ms() >= mpt_ms($attempt['expires_at']);
        mpt_finalize_attempt($pdo, (string)$attempt['id'], $late ? 'TIME_EXPIRED' : 'MANUAL');
    }
    return mpt_result($pdo, $session, $application['application_code']);
}

// ---------------------------------------------------------------- results (10)

function mpt_result(PDO $pdo, array $session, mixed $code): array
{
    $application = mpt_application_by_code($pdo, (string)$session['user_id'], $code);
    if (!$application) cssv_fail('Result not found.', 404, 'not_found');
    $mock = mpt_mock_by_id($pdo, (string)$application['mock_id']);
    $attempt = mpt_latest_attempt($pdo, (string)$application['id']);
    $now = mpt_now_ms();
    if ($attempt && $attempt['status'] === 'IN_PROGRESS' && $now >= mpt_ms($attempt['expires_at'])) {
        $attempt = mpt_finalize_attempt($pdo, (string)$attempt['id'], 'TIME_EXPIRED')['attempt'];
    }
    $state = mpt_state($pdo, $mock, $application, $attempt, $now, true);
    $candidate = mpt_candidate_profile($pdo, $session);
    $base = [
        'mock' => mpt_public_mock($mock),
        'state' => $state,
        'application' => mpt_application_payload($pdo, $application, $mock, $state, $now),
        'candidate' => ['name' => $candidate['name'], 'candidate_code' => $candidate['candidate_code']],
    ] + mpt_server_clock();
    if (!$attempt || !in_array($attempt['status'], ['SUBMITTED', 'AUTO_SUBMITTED'], true)) return $base + ['result' => null];
    if ($state['phase'] !== 'RESULT_AVAILABLE') {
        return $base + ['result' => null, 'submission' => ['submitted_at' => mpt_iso(mpt_ms($attempt['submitted_at'])), 'submit_reason' => $attempt['submit_reason'], 'result_available_at' => $state['timestamps']['result_available_at']]];
    }

    // Paper order (Islamic Studies first), not alphabetical.
    $subjects = $pdo->prepare('SELECT s.subject_key,s.questions,s.attempted,s.correct,s.incorrect,s.score,s.accuracy FROM mpt_attempt_subject_scores s WHERE s.attempt_id=? ORDER BY (SELECT MIN(q.position) FROM mpt_mock_questions q WHERE q.mock_id=? AND q.section=s.subject_key)');
    $subjects->execute([$attempt['id'], $mock['id']]);
    $previous = $pdo->prepare("SELECT AVG(percentage) avg_pct,COUNT(*) n FROM mpt_attempts WHERE user_id=? AND id<>? AND status IN ('SUBMITTED','AUTO_SUBMITTED') AND voided_at IS NULL AND submitted_at<?");
    $previous->execute([$session['user_id'], $attempt['id'], $attempt['submitted_at']]);
    $prev = $previous->fetch();
    $afterWindow = $now >= mpt_ms($mock['exam_end_at']);
    $rankVisible = $afterWindow && $attempt['rank_position'] !== null;
    $pass = $mock['pass_percentage'] === null ? null : ((float)$attempt['percentage'] >= (float)$mock['pass_percentage']);
    $reviewOpen = match ($mock['answer_review_policy']) {
        'IMMEDIATE' => true,
        'AFTER_WINDOW' => $afterWindow,
        default => false,
    };
    $result = [
        'score' => (float)$attempt['score'],
        'total_marks' => (float)$attempt['total_marks'],
        'percentage' => (float)$attempt['percentage'],
        'correct' => (int)$attempt['correct_count'],
        'incorrect' => (int)$attempt['incorrect_count'],
        'unanswered' => (int)$attempt['unanswered_count'],
        'accuracy' => $attempt['accuracy'] === null ? null : (float)$attempt['accuracy'],
        'time_taken_seconds' => (int)$attempt['time_taken_seconds'],
        'started_at' => mpt_iso(mpt_ms($attempt['started_at'])),
        'submitted_at' => mpt_iso(mpt_ms($attempt['submitted_at'])),
        'submit_reason' => $attempt['submit_reason'],
        'subjects' => array_map(static fn(array $row): array => [
            'subject' => $row['subject_key'], 'questions' => (int)$row['questions'], 'attempted' => (int)$row['attempted'],
            'correct' => (int)$row['correct'], 'incorrect' => (int)$row['incorrect'], 'score' => (float)$row['score'],
            'accuracy' => $row['accuracy'] === null ? null : (float)$row['accuracy'],
        ], $subjects->fetchAll()),
        'rank' => $rankVisible ? ['position' => (int)$attempt['rank_position'], 'candidates' => (int)$attempt['rank_candidates'], 'percentile' => (float)$attempt['percentile']] : null,
        'passed' => $pass,
        'previous_average_percentage' => (int)$prev['n'] >= 1 ? round((float)$prev['avg_pct'], 2) : null,
        'rescored_at' => mpt_iso(mpt_ms($attempt['rescored_at'])),
        'review_available' => $reviewOpen,
        'review_available_at' => $mock['answer_review_policy'] === 'AFTER_WINDOW' && !$afterWindow ? mpt_iso(mpt_ms($mock['exam_end_at'])) : null,
    ];
    return $base + ['result' => $result];
}

/** Question-by-question review; answer keys only after the review policy allows. */
function mpt_review(PDO $pdo, array $session, mixed $code): array
{
    $payload = mpt_result($pdo, $session, $code);
    if (!($payload['result']['review_available'] ?? false)) cssv_fail('Answer review is not available yet.', 403, 'review_not_available');
    $application = mpt_application_by_code($pdo, (string)$session['user_id'], $code);
    $attempt = mpt_latest_attempt($pdo, (string)$application['id']);
    $stmt = $pdo->prepare('SELECT q.position,q.section,q.stem,q.options,q.correct_index,q.explanation,a.selected_option FROM mpt_mock_questions q LEFT JOIN mpt_attempt_answers a ON a.attempt_id=? AND a.question_id=q.question_id WHERE q.mock_id=? ORDER BY q.position');
    $stmt->execute([$attempt['id'], $application['mock_id']]);
    return ['questions' => array_map(static fn(array $row): array => [
        'p' => (int)$row['position'], 'section' => $row['section'], 'q' => $row['stem'],
        'o' => json_decode((string)$row['options'], true), 'correct' => (int)$row['correct_index'],
        'selected' => $row['selected_option'] === null ? null : (int)$row['selected_option'],
        'explanation' => $row['explanation'],
    ], $stmt->fetchAll())];
}

// ---------------------------------------------------------------- dashboard, history, performance (15)

function mpt_relevant_mocks(PDO $pdo, int $nowMs): array
{
    $stmt = $pdo->prepare("SELECT * FROM mpt_mocks WHERE status IN ('PUBLISHED','CANCELLED') AND exam_end_at>? AND application_open_at<=? ORDER BY exam_open_at LIMIT 6");
    $stmt->execute([mpt_db_time($nowMs), mpt_db_time($nowMs + 86400000 * 3)]);
    return $stmt->fetchAll();
}

function mpt_dashboard(PDO $pdo, array $session): array
{
    $userId = (string)$session['user_id'];
    $now = mpt_now_ms();
    $cards = [];
    foreach (mpt_relevant_mocks($pdo, $now) as $mock) {
        $cards[] = mpt_card($pdo, $mock, mpt_application_for($pdo, $userId, (string)$mock['id']), $now, true);
    }
    $stats = $pdo->prepare('SELECT * FROM mpt_user_stats WHERE user_id=?');
    $stats->execute([$userId]);
    $history = mpt_history($pdo, $session, 1, null, 5);
    $latest = null;
    $latestStmt = $pdo->prepare("SELECT a.application_code FROM mpt_attempts t JOIN mpt_applications a ON a.id=t.application_id WHERE t.user_id=? AND t.status IN ('SUBMITTED','AUTO_SUBMITTED') AND t.voided_at IS NULL ORDER BY t.submitted_at DESC LIMIT 1");
    $latestStmt->execute([$userId]);
    if ($code = $latestStmt->fetchColumn()) {
        $latestResult = mpt_result($pdo, $session, $code);
        $latest = $latestResult['result'] ? ['application_code' => $code, 'mock' => $latestResult['mock'], 'result' => $latestResult['result']] : null;
    }
    return [
        'cards' => $cards,
        'latest' => $latest,
        'stats' => mpt_stats_payload($stats->fetch() ?: null),
        'trend' => mpt_trend($pdo, $userId),
        'history' => $history,
    ] + mpt_server_clock();
}

function mpt_stats_payload(?array $row): array
{
    $f = static fn($v) => $v === null ? null : (float)$v;
    return [
        'attempts_completed' => (int)($row['attempts_completed'] ?? 0),
        'avg_score' => $f($row['avg_score'] ?? null),
        'highest_score' => $f($row['highest_score'] ?? null),
        'lowest_score' => $f($row['lowest_score'] ?? null),
        'latest_score' => $f($row['latest_score'] ?? null),
        'avg_percentage' => $f($row['avg_percentage'] ?? null),
        'highest_percentage' => $f($row['highest_percentage'] ?? null),
        'latest_percentage' => $f($row['latest_percentage'] ?? null),
        'avg_accuracy' => $f($row['avg_accuracy'] ?? null),
        'total_correct' => (int)($row['total_correct'] ?? 0),
        'total_incorrect' => (int)($row['total_incorrect'] ?? 0),
    ];
}

/** D-23: last 3 vs previous (up to 3); only with >= 3 completed mocks. */
function mpt_trend(PDO $pdo, string $userId): array
{
    $stmt = $pdo->prepare("SELECT t.percentage,t.submitted_at,m.mock_number FROM mpt_attempts t JOIN mpt_mocks m ON m.id=t.mock_id WHERE t.user_id=? AND t.status IN ('SUBMITTED','AUTO_SUBMITTED') AND t.voided_at IS NULL ORDER BY t.submitted_at DESC LIMIT 10");
    $stmt->execute([$userId]);
    $rows = array_reverse($stmt->fetchAll());
    $points = array_map(static fn($r) => ['mock_number' => (int)$r['mock_number'], 'percentage' => (float)$r['percentage'], 'submitted_at' => mpt_iso(mpt_ms($r['submitted_at']))], $rows);
    $label = null;
    if (count($points) >= 3) {
        $values = array_column($points, 'percentage');
        $last = array_slice($values, -3);
        $before = array_slice($values, max(0, count($values) - 6), max(0, count($values) - 3));
        if ($before) {
            $delta = array_sum($last) / count($last) - array_sum($before) / count($before);
            $label = $delta > 2 ? 'IMPROVING' : ($delta < -2 ? 'DECLINING' : 'STEADY');
        }
    }
    return ['points' => $points, 'label' => $label];
}

function mpt_history(PDO $pdo, array $session, int $page, ?string $filter, int $perPage = 20): array
{
    $userId = (string)$session['user_id'];
    $page = max(1, $page);
    $stmt = $pdo->prepare('SELECT a.*,m.public_slug,m.mock_number,m.title,m.exam_open_at,m.exam_end_at,m.status mock_status FROM mpt_applications a JOIN mpt_mocks m ON m.id=a.mock_id WHERE a.user_id=? ORDER BY m.exam_open_at DESC');
    $stmt->execute([$userId]);
    $now = mpt_now_ms();
    $rows = [];
    foreach ($stmt->fetchAll() as $row) {
        if ($row['status'] === 'WITHDRAWN') continue;
        $mock = mpt_mock_by_id($pdo, (string)$row['mock_id']);
        $attempt = mpt_latest_attempt($pdo, (string)$row['id']);
        $state = mpt_state($pdo, $mock, $row, $attempt, $now, true);
        $final = $attempt && in_array($attempt['status'], ['SUBMITTED', 'AUTO_SUBMITTED'], true) && $state['phase'] === 'RESULT_AVAILABLE';
        $visible = $now >= (int)mpt_ms($state['timestamps']['roll_number_visible_at']);
        $rows[] = [
            'application_code' => $row['application_code'],
            'mock_slug' => $row['public_slug'],
            'mock_number' => (int)$row['mock_number'],
            'title' => $row['title'],
            'exam_open_at' => mpt_iso(mpt_ms($row['exam_open_at'])),
            'roll_number' => $visible ? $row['roll_number'] : null,
            'phase' => $state['phase'],
            'score' => $final ? (float)$attempt['score'] : null,
            'total_marks' => $final ? (float)$attempt['total_marks'] : null,
            'percentage' => $final ? (float)$attempt['percentage'] : null,
        ];
    }
    $groups = ['completed' => ['RESULT_AVAILABLE', 'SUBMITTED_PENDING_RESULT'], 'absent' => ['ABSENT'], 'upcoming' => ['ROLL_NUMBER_PENDING', 'SLOT_RESERVED', 'ENTRY_OPEN', 'IN_PROGRESS'], 'cancelled' => ['CANCELLED']];
    if ($filter !== null && isset($groups[$filter])) $rows = array_values(array_filter($rows, static fn($r) => in_array($r['phase'], $groups[$filter], true)));
    $total = count($rows);

    // D-22: legacy browser-scored results, shown but never counted.
    $legacy = [];
    if ($page === 1 && ($filter === null || $filter === 'completed')) {
        $legacyStmt = $pdo->prepare("SELECT category,score,total,completed_at FROM quiz_attempts WHERE user_id=? AND JSON_UNQUOTE(JSON_EXTRACT(metadata,'$.mock_kind'))='mpt' ORDER BY completed_at DESC LIMIT 50");
        $legacyStmt->execute([$userId]);
        foreach ($legacyStmt->fetchAll() as $row) {
            $legacy[] = ['title' => $row['category'], 'score' => (int)$row['score'], 'total' => (int)$row['total'], 'completed_at' => mpt_iso(mpt_ms($row['completed_at']))];
        }
    }
    return [
        'rows' => array_slice($rows, ($page - 1) * $perPage, $perPage),
        'page' => $page,
        'per_page' => $perPage,
        'total' => $total,
        'legacy' => $legacy,
    ];
}

/** D-24: subjects ranked only with >= 40 answered questions; charts use completed attempts only. */
function mpt_performance(PDO $pdo, array $session): array
{
    $userId = (string)$session['user_id'];
    $stats = $pdo->prepare('SELECT * FROM mpt_user_stats WHERE user_id=?');
    $stats->execute([$userId]);
    $series = $pdo->prepare("SELECT t.id,t.score,t.total_marks,t.percentage,t.accuracy,t.submitted_at,m.mock_number,m.title,a.application_code FROM mpt_attempts t JOIN mpt_mocks m ON m.id=t.mock_id JOIN mpt_applications a ON a.id=t.application_id WHERE t.user_id=? AND t.status IN ('SUBMITTED','AUTO_SUBMITTED') AND t.voided_at IS NULL ORDER BY t.submitted_at");
    $series->execute([$userId]);
    $attempts = $series->fetchAll();
    $subjectRows = $pdo->prepare("SELECT s.subject_key,s.attempted,s.correct,s.incorrect,t.submitted_at,m.mock_number FROM mpt_attempt_subject_scores s JOIN mpt_attempts t ON t.id=s.attempt_id JOIN mpt_mocks m ON m.id=t.mock_id WHERE t.user_id=? AND t.status IN ('SUBMITTED','AUTO_SUBMITTED') AND t.voided_at IS NULL ORDER BY t.submitted_at");
    $subjectRows->execute([$userId]);
    $bySubject = [];
    foreach ($subjectRows->fetchAll() as $row) {
        $key = $row['subject_key'];
        $bySubject[$key] ??= ['subject' => $key, 'attempted' => 0, 'correct' => 0, 'points' => []];
        $bySubject[$key]['attempted'] += (int)$row['attempted'];
        $bySubject[$key]['correct'] += (int)$row['correct'];
        $bySubject[$key]['points'][] = ['mock_number' => (int)$row['mock_number'], 'accuracy' => (int)$row['attempted'] > 0 ? round((int)$row['correct'] / (int)$row['attempted'] * 100, 2) : null];
    }
    $subjects = array_values(array_map(static fn($s) => $s + ['accuracy' => $s['attempted'] > 0 ? round($s['correct'] / $s['attempted'] * 100, 2) : null, 'reliable' => $s['attempted'] >= 40], $bySubject));
    $reliable = array_values(array_filter($subjects, static fn($s) => $s['reliable']));
    usort($reliable, static fn($a, $b) => $b['accuracy'] <=> $a['accuracy']);
    return [
        'stats' => mpt_stats_payload($stats->fetch() ?: null),
        'trend' => mpt_trend($pdo, $userId),
        'series' => array_map(static fn($r) => [
            'application_code' => $r['application_code'], 'mock_number' => (int)$r['mock_number'], 'title' => $r['title'],
            'score' => (float)$r['score'], 'total_marks' => (float)$r['total_marks'], 'percentage' => (float)$r['percentage'],
            'accuracy' => $r['accuracy'] === null ? null : (float)$r['accuracy'], 'submitted_at' => mpt_iso(mpt_ms($r['submitted_at'])),
        ], $attempts),
        'subjects' => $subjects,
        'strongest' => count($reliable) >= 2 ? $reliable[0]['subject'] : null,
        'weakest' => count($reliable) >= 2 ? $reliable[count($reliable) - 1]['subject'] : null,
        'subject_threshold' => 40,
    ] + mpt_server_clock();
}

// ---------------------------------------------------------------- public listing

function mpt_public_listing(PDO $pdo, ?array $session): array
{
    $now = mpt_now_ms();
    $out = [];
    $count = $pdo->prepare("SELECT COUNT(*) FROM mpt_applications WHERE mock_id=? AND status='ACTIVE'");
    foreach (mpt_relevant_mocks($pdo, $now) as $mock) {
        $application = $session ? mpt_application_for($pdo, (string)$session['user_id'], (string)$mock['id']) : null;
        $card = mpt_card($pdo, $mock, $application, $now, $session !== null, false);
        $sessionRow = mpt_session_for($pdo, (string)$mock['id']);
        $count->execute([$mock['id']]);
        $registered = (int)$count->fetchColumn();
        // D-25: real counts only, above a threshold; capacity only when configured.
        $card['registered_count'] = $registered >= 25 ? $registered : null;
        $card['slots_available'] = $sessionRow['capacity'] === null ? null : max(0, (int)$sessionRow['capacity'] - (int)$sessionRow['reserved_count']);
        $out[] = $card;
    }
    return ['mocks' => $out] + mpt_server_clock();
}
