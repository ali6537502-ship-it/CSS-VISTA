<?php
declare(strict_types=1);

require_once __DIR__ . '/_mpt.php';

/**
 * Read-only Previous MPT Question Bank.
 *
 * Security invariant: no question row leaves the server unless the authenticated
 * user owns an eligible application/attempt for the same mock and the official
 * exam window has already ended. This file never mutates attempts, answers,
 * results, ranks, applications, roll numbers or mock scheduling.
 */

function mpt_question_bank_has_participation(PDO $pdo, string $userId): bool
{
    $stmt = $pdo->prepare("SELECT EXISTS(
        SELECT 1
        FROM mpt_applications a
        WHERE a.user_id=?
          AND (
            a.status='ACTIVE'
            OR EXISTS(
                SELECT 1
                FROM mpt_attempts t
                WHERE t.application_id=a.id
                  AND t.user_id=a.user_id
                  AND t.mock_id=a.mock_id
                  AND t.voided_at IS NULL
                  AND t.status IN ('IN_PROGRESS','SUBMITTED','AUTO_SUBMITTED')
            )
          )
    )");
    $stmt->execute([$userId]);
    return (bool)$stmt->fetchColumn();
}

function mpt_question_bank(PDO $pdo, array $session): array
{
    $userId = (string)$session['user_id'];
    $hasParticipation = mpt_question_bank_has_participation($pdo, $userId);
    if (!$hasParticipation) {
        return ['has_participation' => false, 'mocks' => []];
    }

    $stmt = $pdo->prepare("SELECT
            m.id,m.public_slug,m.mock_number,m.title,m.exam_open_at,m.exam_end_at,
            COUNT(q.position) AS question_count
        FROM mpt_mocks m
        JOIN mpt_applications a ON a.mock_id=m.id
        JOIN mpt_mock_questions q ON q.mock_id=m.id
        WHERE a.user_id=?
          AND (
            a.status='ACTIVE'
            OR EXISTS(
                SELECT 1
                FROM mpt_attempts t
                WHERE t.application_id=a.id
                  AND t.user_id=a.user_id
                  AND t.mock_id=a.mock_id
                  AND t.voided_at IS NULL
                  AND t.status IN ('IN_PROGRESS','SUBMITTED','AUTO_SUBMITTED')
            )
          )
          AND m.status IN ('PUBLISHED','ARCHIVED')
          AND m.cancelled_at IS NULL
          AND m.paper_frozen_at IS NOT NULL
          AND m.exam_end_at<=UTC_TIMESTAMP(3)
        GROUP BY m.id,m.public_slug,m.mock_number,m.title,m.exam_open_at,m.exam_end_at
        ORDER BY m.exam_open_at DESC,m.mock_number DESC");
    $stmt->execute([$userId]);

    $mocks = array_map(static fn(array $row): array => [
        'slug' => $row['public_slug'],
        'mock_number' => (int)$row['mock_number'],
        'title' => $row['title'],
        'exam_open_at' => mpt_iso(mpt_ms($row['exam_open_at'])),
        'exam_end_at' => mpt_iso(mpt_ms($row['exam_end_at'])),
        'question_count' => (int)$row['question_count'],
        'status' => 'COMPLETED',
    ], $stmt->fetchAll());

    return ['has_participation' => true, 'mocks' => $mocks];
}

function mpt_question_bank_paper(PDO $pdo, array $session, mixed $slugIn): array
{
    $slug = trim((string)$slugIn);
    if ($slug === '' || strlen($slug) > 40) {
        cssv_fail('Question bank paper not available.', 404, 'not_found');
    }

    $userId = (string)$session['user_id'];
    $stmt = $pdo->prepare("SELECT m.*
        FROM mpt_mocks m
        JOIN mpt_applications a ON a.mock_id=m.id
        WHERE m.public_slug=?
          AND a.user_id=?
          AND (
            a.status='ACTIVE'
            OR EXISTS(
                SELECT 1
                FROM mpt_attempts t
                WHERE t.application_id=a.id
                  AND t.user_id=a.user_id
                  AND t.mock_id=a.mock_id
                  AND t.voided_at IS NULL
                  AND t.status IN ('IN_PROGRESS','SUBMITTED','AUTO_SUBMITTED')
            )
          )
          AND m.status IN ('PUBLISHED','ARCHIVED')
          AND m.cancelled_at IS NULL
          AND m.paper_frozen_at IS NOT NULL
          AND m.exam_end_at<=UTC_TIMESTAMP(3)
        LIMIT 1");
    $stmt->execute([$slug, $userId]);
    $mock = $stmt->fetch();
    if (!$mock) cssv_fail('Question bank paper not available.', 404, 'not_found');

    $now = mpt_now_ms();
    $end = (int)mpt_ms($mock['exam_end_at']);
    $answerReviewOpen = match ((string)$mock['answer_review_policy']) {
        'IMMEDIATE' => true,
        'AFTER_WINDOW' => $now >= $end + (int)($mock['results_delay_minutes'] ?? 30) * 60000,
        default => false,
    };

    $questionsStmt = $pdo->prepare('SELECT position,section,stem,options,correct_index,explanation FROM mpt_mock_questions WHERE mock_id=? ORDER BY position');
    $questionsStmt->execute([$mock['id']]);
    $rows = $questionsStmt->fetchAll();
    if (!$rows) cssv_fail('Question bank paper not available.', 404, 'not_found');

    $subjects = [];
    $subjectIndex = [];
    $questions = [];
    foreach ($rows as $row) {
        $section = (string)$row['section'];
        if (!array_key_exists($section, $subjectIndex)) {
            $subjectIndex[$section] = count($subjects);
            $subjects[] = ['subject' => $section, 'count' => 0];
        }
        $subjects[$subjectIndex[$section]]['count']++;

        $questions[] = [
            'p' => (int)$row['position'],
            'section' => $section,
            'q' => $row['stem'],
            'o' => json_decode((string)$row['options'], true, 16, JSON_THROW_ON_ERROR),
            'correct' => $answerReviewOpen ? (int)$row['correct_index'] : null,
            'explanation' => $answerReviewOpen ? $row['explanation'] : null,
        ];
    }

    return [
        'mock' => [
            'slug' => $mock['public_slug'],
            'mock_number' => (int)$mock['mock_number'],
            'title' => $mock['title'],
            'exam_open_at' => mpt_iso(mpt_ms($mock['exam_open_at'])),
            'exam_end_at' => mpt_iso(mpt_ms($mock['exam_end_at'])),
            'question_count' => count($questions),
            'status' => 'COMPLETED',
        ],
        'subjects' => $subjects,
        'questions' => $questions,
        'answers_available' => $answerReviewOpen,
    ];
}
