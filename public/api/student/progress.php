<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/_bootstrap.php';
cssv_require_method('GET', 'PUT', 'DELETE');

$pdo = cssv_db();
$session = cssv_require_user($pdo);
$userId = (string)$session['user_id'];
$method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));

if ($method === 'GET') {
    $stmt = $pdo->prepare('SELECT payload,client_updated_at,updated_at FROM student_progress WHERE user_id=?');
    $stmt->execute([$userId]);
    $row = $stmt->fetch();
    $payload = $row ? json_decode((string)$row['payload'], true) : [];
    cssv_json([
        'ok' => true,
        'payload' => is_array($payload) ? $payload : [],
        'client_updated_at' => $row['client_updated_at'] ?? null,
        'updated_at' => $row['updated_at'] ?? null,
    ]);
}

cssv_require_csrf($session);
if ($method === 'DELETE') {
    $pdo->beginTransaction();
    try {
        foreach (['question_attempts', 'quiz_attempts', 'student_activity', 'student_progress'] as $table) {
            $pdo->prepare('DELETE FROM ' . $table . ' WHERE user_id=?')->execute([$userId]);
        }
        $pdo->commit();
    } catch (Throwable $error) {
        $pdo->rollBack();
        error_log('CSSV progress reset failed: ' . get_class($error) . ' ' . $error->getCode());
        cssv_fail('Progress could not be reset.', 503, 'progress_reset_failed');
    }
    cssv_json(['ok' => true]);
}

$body = cssv_request_json(4 * 1024 * 1024);
$payload = $body['payload'] ?? null;
if (!is_array($payload) || ($payload !== [] && array_is_list($payload))) {
    cssv_fail('Progress data is invalid.', 422, 'invalid_progress');
}
$encoded = json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
if (!is_string($encoded) || strlen($encoded) > 3 * 1024 * 1024) {
    cssv_fail('Progress data is too large.', 413, 'progress_too_large');
}

function cssv_progress_record(mixed $value): array
{
    return is_array($value) && !array_is_list($value) ? $value : [];
}

function cssv_progress_list(mixed $value, int $limit): array
{
    return is_array($value) && array_is_list($value) ? array_slice($value, 0, $limit) : [];
}

function cssv_progress_datetime(mixed $value): ?string
{
    $iso = cssv_progress_iso($value);
    if ($iso === null) return null;
    return (new DateTimeImmutable($iso))->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
}

function cssv_progress_iso(mixed $value): ?string
{
    if (!is_string($value) && !is_int($value) && !is_float($value)) return null;
    try {
        if (is_numeric($value)) {
            $milliseconds = (int)round((float)$value);
            $seconds = intdiv($milliseconds, 1000);
            $millis = abs($milliseconds % 1000);
            $date = (new DateTimeImmutable('@' . $seconds))->setTimezone(new DateTimeZone('UTC'));
            $iso = $date->format('Y-m-d\\TH:i:s') . sprintf('.%03dZ', $millis);
        } else {
            $date = (new DateTimeImmutable((string)$value))->setTimezone(new DateTimeZone('UTC'));
            $iso = $date->format('Y-m-d\\TH:i:s.v\\Z');
            $seconds = $date->getTimestamp();
        }
    } catch (Throwable) {
        return null;
    }
    if ($seconds < 946684800 || $seconds > time() + 86400) return null;
    return $iso;
}

$progress = cssv_progress_record($payload['cssvista:progress:v1'] ?? []);
$state = cssv_progress_record($payload['cssvista:v1'] ?? []);
$now = gmdate('Y-m-d H:i:s');

$pdo->beginTransaction();
try {
    $upsert = $pdo->prepare('INSERT INTO student_progress (user_id,payload,client_updated_at) VALUES (?,?,?) ON DUPLICATE KEY UPDATE payload=VALUES(payload),client_updated_at=VALUES(client_updated_at)');
    $upsert->execute([$userId, $encoded, $now]);

    $activityStmt = $pdo->prepare('INSERT IGNORE INTO student_activity (user_id,event_key,activity_type,label,path,metadata,occurred_at) VALUES (?,?,?,?,?,JSON_OBJECT(),?)');
    foreach (cssv_progress_list($progress['activities'] ?? [], 10000) as $entry) {
        $entry = cssv_progress_record($entry);
        $type = mb_substr(trim((string)($entry['type'] ?? '')), 0, 100);
        $label = mb_substr(trim((string)($entry['label'] ?? '')), 0, 500);
        $path = isset($entry['path']) ? mb_substr((string)$entry['path'], 0, 1000) : null;
        $occurredIso = cssv_progress_iso($entry['ts'] ?? null);
        $occurredAt = cssv_progress_datetime($entry['ts'] ?? null);
        if ($type === '' || $occurredAt === null || $occurredIso === null) continue;
        $eventKey = mb_substr('activity:' . $type . ':' . ($path ?? '') . ':' . $occurredIso, 0, 255);
        $activityStmt->execute([$userId, $eventKey, $type, $label, $path, $occurredAt]);
    }

    $quizStmt = $pdo->prepare('INSERT INTO quiz_attempts (user_id,attempt_key,quiz_type,category,score,total,metadata,completed_at) VALUES (?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE quiz_type=VALUES(quiz_type),category=VALUES(category),score=VALUES(score),total=VALUES(total),metadata=VALUES(metadata),completed_at=VALUES(completed_at)');
    foreach (cssv_progress_list($state['quizResults'] ?? [], 5000) as $entry) {
        $entry = cssv_progress_record($entry);
        $key = mb_substr(trim((string)($entry['id'] ?? '')), 0, 255);
        $type = mb_substr(trim((string)($entry['type'] ?? '')), 0, 120);
        $category = mb_substr(trim((string)($entry['category'] ?? '')), 0, 180);
        $score = filter_var($entry['score'] ?? null, FILTER_VALIDATE_INT);
        $total = filter_var($entry['total'] ?? null, FILTER_VALIDATE_INT);
        $completedAt = cssv_progress_datetime($entry['date'] ?? null);
        if ($key === '' || $type === '' || $score === false || $total === false || $total <= 0 || $score < 0 || $score > $total || $completedAt === null) continue;
        $metadata = json_encode([
            'wrong_topics' => is_array($entry['wrongTopics'] ?? null) ? $entry['wrongTopics'] : [],
            'wrong_topic_counts' => cssv_progress_record($entry['wrongTopicCounts'] ?? []),
            'student_name' => is_string($entry['studentName'] ?? null) ? mb_substr($entry['studentName'], 0, 180) : null,
            'duration_seconds' => is_numeric($entry['durationSeconds'] ?? null) ? max(0, (int)$entry['durationSeconds']) : null,
            'mock_kind' => in_array($entry['mockKind'] ?? null, ['gk', 'mpt'], true) ? $entry['mockKind'] : null,
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $quizStmt->execute([$userId, $key, $type, $category, $score, $total, $metadata ?: '{}', $completedAt]);
    }

    $questionStmt = $pdo->prepare('INSERT IGNORE INTO question_attempts (user_id,event_key,question_id,category,topic,subtopic,mode,difficulty,selected_option,correct,attempted_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
    foreach (cssv_progress_list($progress['attemptEvents'] ?? [], 50000) as $entry) {
        $entry = cssv_progress_record($entry);
        $eventKey = mb_substr(trim((string)($entry['id'] ?? '')), 0, 255);
        $questionId = mb_substr(trim((string)($entry['questionId'] ?? '')), 0, 255);
        $attemptedAt = cssv_progress_datetime($entry['ts'] ?? null);
        if ($eventKey === '' || $questionId === '' || !is_bool($entry['correct'] ?? null) || $attemptedAt === null) continue;
        $selected = is_numeric($entry['selected'] ?? null) ? max(-1, min(20, (int)$entry['selected'])) : null;
        $questionStmt->execute([
            $userId,
            $eventKey,
            $questionId,
            mb_substr((string)($entry['category'] ?? ''), 0, 180),
            isset($entry['topic']) ? mb_substr((string)$entry['topic'], 0, 240) : null,
            isset($entry['subtopic']) ? mb_substr((string)$entry['subtopic'], 0, 240) : null,
            isset($entry['mode']) ? mb_substr((string)$entry['mode'], 0, 80) : null,
            isset($entry['difficulty']) ? mb_substr((string)$entry['difficulty'], 0, 80) : null,
            $selected,
            $entry['correct'] ? 1 : 0,
            $attemptedAt,
        ]);
    }

    $pdo->prepare('UPDATE users SET last_seen_at=NOW(6) WHERE id=?')->execute([$userId]);
    $pdo->prepare('UPDATE student_profiles SET last_seen_at=NOW(6) WHERE user_id=?')->execute([$userId]);
    $pdo->commit();
} catch (Throwable $error) {
    $pdo->rollBack();
    error_log('CSSV progress sync failed: ' . $error->getMessage());
    cssv_fail('Progress could not be synced.', 503, 'progress_sync_failed');
}

cssv_json(['ok' => true, 'updated_at' => $now]);
