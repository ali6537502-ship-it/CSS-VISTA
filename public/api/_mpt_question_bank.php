<?php
declare(strict_types=1);

require_once __DIR__ . '/_mpt.php';

/**
 * Read-only archive of completed official MPT mock papers.
 *
 * Every signed-in student can review all frozen, non-cancelled papers only
 * after their official exam window ends. Answer keys remain subject to the
 * original per-mock release policy. No application or attempt is created,
 * modified, or exposed by these endpoints.
 */
function mpt_question_bank(PDO $pdo, array $session): array
{
    // Authentication is enforced by mpt_candidate_request before this call.
    $stmt = $pdo->query("SELECT
            m.public_slug,m.mock_number,m.title,m.exam_open_at,m.exam_end_at,
            COUNT(q.position) AS question_count
        FROM mpt_mocks m
        JOIN mpt_mock_questions q ON q.mock_id=m.id
        WHERE m.status IN ('PUBLISHED','ARCHIVED')
          AND m.cancelled_at IS NULL
          AND m.paper_frozen_at IS NOT NULL
          AND m.exam_end_at<=UTC_TIMESTAMP(3)
        GROUP BY m.id,m.public_slug,m.mock_number,m.title,m.exam_open_at,m.exam_end_at
        ORDER BY m.exam_open_at DESC,m.mock_number DESC");

    $mocks = array_map(static fn(array $row): array => [
        'slug' => $row['public_slug'],
        'mock_number' => (int)$row['mock_number'],
        'title' => $row['title'],
        'exam_open_at' => mpt_iso(mpt_ms($row['exam_open_at'])),
        'exam_end_at' => mpt_iso(mpt_ms($row['exam_end_at'])),
        'question_count' => (int)$row['question_count'],
        'status' => 'COMPLETED',
    ], $stmt->fetchAll());

    return ['mocks' => $mocks];
}

function mpt_question_bank_paper(PDO $pdo, array $session, mixed $slugIn): array
{
    $slug = trim((string)$slugIn);
    if ($slug === '' || strlen($slug) > 40) {
        cssv_fail('Question bank paper not available.', 404, 'not_found');
    }

    $stmt = $pdo->prepare("SELECT m.*
        FROM mpt_mocks m
        WHERE m.public_slug=?
          AND m.status IN ('PUBLISHED','ARCHIVED')
          AND m.cancelled_at IS NULL
          AND m.paper_frozen_at IS NOT NULL
          AND m.exam_end_at<=UTC_TIMESTAMP(3)
          AND EXISTS (
              SELECT 1 FROM mpt_mock_questions q WHERE q.mock_id=m.id
          )
        LIMIT 1");
    $stmt->execute([$slug]);
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
