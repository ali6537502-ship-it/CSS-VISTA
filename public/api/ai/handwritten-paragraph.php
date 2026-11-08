<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/_bootstrap.php';
require_once dirname(__DIR__) . '/_mistral.php';

$pdo = cssv_db();
$session = cssv_require_user($pdo, true);
$userId = (string)$session['user_id'];
cssv_ai_ensure_schema($pdo);

$scanLimit = cssv_ai_daily_limit('CSSV_AI_HANDWRITING_SCAN_DAILY_LIMIT', 5);
$evaluationLimit = cssv_ai_daily_limit('CSSV_AI_HANDWRITING_EVAL_DAILY_LIMIT', 5);

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $scanUsage = cssv_ai_usage($pdo, $userId, 'handwritten_paragraph_scan');
    $evalUsage = cssv_ai_usage($pdo, $userId, 'handwritten_paragraph_evaluation');
    cssv_json([
        'ok' => true,
        'enabled' => cssv_ai_feature_enabled($userId) && (bool)cssv_env('MISTRAL_API_KEY'),
        'limits' => [
            'scan' => ['limit' => $scanLimit, 'used' => $scanUsage['calls'], 'remaining' => max(0, $scanLimit - $scanUsage['calls'])],
            'evaluation' => ['limit' => $evaluationLimit, 'used' => $evalUsage['calls'], 'remaining' => max(0, $evaluationLimit - $evalUsage['calls'])],
        ],
    ]);
}

cssv_require_method('POST');
cssv_require_csrf($session);

if (!cssv_ai_feature_enabled($userId)) {
    cssv_fail('This AI writing pilot is not enabled for your account yet.', 403, 'ai_feature_unavailable');
}

$mode = '';
$contentType = strtolower((string)($_SERVER['CONTENT_TYPE'] ?? ''));
if (str_starts_with($contentType, 'multipart/form-data')) {
    $mode = trim((string)($_POST['mode'] ?? ''));
} else {
    $request = cssv_request_json(24576);
    $mode = trim((string)($request['mode'] ?? ''));
}

if ($mode === 'ocr') {
    $remaining = cssv_ai_reserve_call($pdo, $userId, 'handwritten_paragraph_scan', $scanLimit);
    try {
        $file = $_FILES['image'] ?? null;
        if (!is_array($file) || (int)($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            cssv_ai_refund_call($pdo, $userId, 'handwritten_paragraph_scan');
            cssv_fail('Upload one clear handwritten paragraph image.', 422, 'image_required');
        }

        $maxBytes = (int)(cssv_env('CSSV_AI_IMAGE_MAX_BYTES', '5242880') ?? '5242880');
        $size = (int)($file['size'] ?? 0);
        if ($size < 1024 || $size > $maxBytes) {
            cssv_ai_refund_call($pdo, $userId, 'handwritten_paragraph_scan');
            cssv_fail('The image must be between 1 KB and 5 MB.', 422, 'image_size_invalid');
        }
        $tmp = (string)($file['tmp_name'] ?? '');
        if ($tmp === '' || !is_uploaded_file($tmp)) {
            cssv_ai_refund_call($pdo, $userId, 'handwritten_paragraph_scan');
            cssv_fail('The uploaded image is invalid.', 422, 'invalid_upload');
        }

        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mime = (string)$finfo->file($tmp);
        if (!in_array($mime, ['image/jpeg', 'image/png', 'image/webp'], true)) {
            cssv_ai_refund_call($pdo, $userId, 'handwritten_paragraph_scan');
            cssv_fail('Use a JPG, PNG, or WebP image.', 422, 'image_type_invalid');
        }
        $dimensions = @getimagesize($tmp);
        if (!is_array($dimensions) || (int)$dimensions[0] < 400 || (int)$dimensions[1] < 400 || ((int)$dimensions[0] * (int)$dimensions[1]) > 30000000) {
            cssv_ai_refund_call($pdo, $userId, 'handwritten_paragraph_scan');
            cssv_fail('Use a clear page image with readable dimensions.', 422, 'image_dimensions_invalid');
        }

        $bytes = file_get_contents($tmp);
        if (!is_string($bytes) || $bytes === '') {
            cssv_ai_refund_call($pdo, $userId, 'handwritten_paragraph_scan');
            cssv_fail('Could not read the uploaded image.', 422, 'image_read_failed');
        }

        $model = cssv_env('CSSV_MISTRAL_OCR_MODEL', 'mistral-ocr-latest') ?? 'mistral-ocr-latest';
        $response = cssv_mistral_request('/v1/ocr', [
            'model' => $model,
            'document' => [
                'type' => 'image_url',
                'image_url' => 'data:' . $mime . ';base64,' . base64_encode($bytes),
            ],
            'confidence_scores_granularity' => 'page',
        ], 60);

        $pages = is_array($response['pages'] ?? null) ? $response['pages'] : [];
        $markdown = isset($pages[0]['markdown']) && is_string($pages[0]['markdown']) ? $pages[0]['markdown'] : '';
        $text = cssv_ai_clean_ocr_text($markdown);
        if ($text === '' || mb_strlen($text) < 20) {
            cssv_ai_refund_call($pdo, $userId, 'handwritten_paragraph_scan');
            cssv_fail('The handwriting could not be read reliably. Try a clearer, straighter image.', 422, 'ocr_text_unreadable');
        }
        $confidence = null;
        if (isset($pages[0]['confidence_scores']['page_confidence']) && is_numeric($pages[0]['confidence_scores']['page_confidence'])) {
            $confidence = round((float)$pages[0]['confidence_scores']['page_confidence'], 4);
        }
        cssv_ai_record_usage($pdo, $userId, 'handwritten_paragraph_scan', 0, 0, 1);

        cssv_json([
            'ok' => true,
            'text' => mb_substr($text, 0, 8000),
            'confidence' => $confidence,
            'remaining' => $remaining,
            'message' => 'Check the extracted text and correct any misread word before evaluation.',
        ]);
    } catch (Throwable $error) {
        cssv_ai_refund_call($pdo, $userId, 'handwritten_paragraph_scan');
        if ($error instanceof Error) error_log('CSSV handwriting OCR error: ' . $error->getMessage());
        throw $error;
    }
}

if ($mode !== 'evaluate') {
    cssv_fail('Choose a valid AI writing action.', 422, 'invalid_ai_action');
}

$text = trim((string)($request['text'] ?? ''));
if (mb_strlen($text) < 40 || mb_strlen($text) > 6000) {
    cssv_fail('Your confirmed paragraph must contain between 40 and 6,000 characters.', 422, 'paragraph_length_invalid');
}

$remaining = cssv_ai_reserve_call($pdo, $userId, 'handwritten_paragraph_evaluation', $evaluationLimit);
try {
    $model = cssv_env('CSSV_MISTRAL_TEXT_MODEL', 'mistral-small-latest') ?? 'mistral-small-latest';
    $system = <<<'PROMPT'
You are the CSS VISTA English Writing Professor. Evaluate ONE student-written paragraph for learning, not for rewriting.

Rules:
- Diagnose the student's own writing precisely.
- Never invent an error that is not present in the submitted text.
- Quote only short exact excerpts from the student's paragraph when locating an issue.
- Do NOT provide a polished replacement paragraph.
- Do NOT provide a complete model paragraph.
- Explain each important issue simply and give a short hint so the student rewrites it.
- Prioritize grammar, sentence structure, clarity, coherence, transitions, vocabulary, punctuation, and formal academic expression.
- Do not reward unnecessarily complicated vocabulary.
- Scores measure the submitted paragraph only and must be internally consistent.
- error_code must be a stable lowercase snake_case label such as subject_verb_agreement, article_usage, run_on_sentence, weak_transition, vague_expression, punctuation, tense_consistency, fragment, word_choice, repetition, coherence, topic_sentence.
- severity must be low, medium, or high.
Return JSON only with exactly this top-level structure:
{
  "overall_score": 0,
  "summary": "brief diagnosis",
  "strengths": ["specific strength"],
  "dimensions": {
    "grammar": 0,
    "sentence_structure": 0,
    "coherence": 0,
    "vocabulary": 0,
    "punctuation": 0,
    "expression": 0
  },
  "issues": [
    {
      "category": "Grammar",
      "error_code": "stable_snake_case_code",
      "severity": "low|medium|high",
      "excerpt": "short exact excerpt",
      "explanation": "what is wrong and why",
      "hint": "a short hint without rewriting the sentence"
    }
  ],
  "rewrite_task": "one focused instruction for the student"
}
Every score is an integer from 0 to 100. Return no markdown and no fields outside this structure.
PROMPT;

    $response = cssv_mistral_request('/v1/chat/completions', [
        'model' => $model,
        'messages' => [
            ['role' => 'system', 'content' => $system],
            ['role' => 'user', 'content' => "Evaluate this paragraph:\n\n" . $text],
        ],
        'temperature' => 0.1,
        'max_tokens' => 1400,
        'response_format' => ['type' => 'json_object'],
    ], 60);

    [$inputTokens, $outputTokens] = cssv_mistral_usage_tokens($response);
    cssv_ai_record_usage($pdo, $userId, 'handwritten_paragraph_evaluation', $inputTokens, $outputTokens, 0);

    $content = cssv_mistral_message_text($response);
    try {
        $evaluation = json_decode($content, true, 64, JSON_THROW_ON_ERROR);
    } catch (JsonException $error) {
        cssv_ai_refund_call($pdo, $userId, 'handwritten_paragraph_evaluation');
        error_log('CSSV paragraph evaluation JSON parse failed: ' . $error->getMessage());
        cssv_fail('The evaluator returned an invalid result. Please try again.', 502, 'ai_evaluation_invalid');
    }
    if (!is_array($evaluation)) {
        cssv_ai_refund_call($pdo, $userId, 'handwritten_paragraph_evaluation');
        cssv_fail('The evaluator returned an invalid result. Please try again.', 502, 'ai_evaluation_invalid');
    }

    $evaluation['overall_score'] = max(0, min(100, (int)($evaluation['overall_score'] ?? 0)));
    $evaluation['summary'] = mb_substr(trim((string)($evaluation['summary'] ?? '')), 0, 1200);
    $evaluation['rewrite_task'] = mb_substr(trim((string)($evaluation['rewrite_task'] ?? 'Rewrite the paragraph after applying the feedback above.')), 0, 1200);
    $evaluation['strengths'] = array_values(array_slice(array_filter(array_map(
        static fn($item) => mb_substr(trim((string)$item), 0, 300),
        is_array($evaluation['strengths'] ?? null) ? $evaluation['strengths'] : []
    )), 0, 5));

    $dimensions = is_array($evaluation['dimensions'] ?? null) ? $evaluation['dimensions'] : [];
    $normalDimensions = [];
    foreach (['grammar','sentence_structure','coherence','vocabulary','punctuation','expression'] as $key) {
        $normalDimensions[$key] = max(0, min(100, (int)($dimensions[$key] ?? 0)));
    }
    $evaluation['dimensions'] = $normalDimensions;

    $issues = [];
    foreach (is_array($evaluation['issues'] ?? null) ? $evaluation['issues'] : [] as $issue) {
        if (!is_array($issue)) continue;
        $severity = strtolower(trim((string)($issue['severity'] ?? 'medium')));
        if (!in_array($severity, ['low','medium','high'], true)) $severity = 'medium';
        $errorCode = strtolower(trim((string)($issue['error_code'] ?? 'writing_issue')));
        $errorCode = preg_replace('/[^a-z0-9_]+/', '_', $errorCode) ?: 'writing_issue';
        $issues[] = [
            'category' => mb_substr(trim((string)($issue['category'] ?? 'Writing')), 0, 80),
            'error_code' => mb_substr($errorCode, 0, 80),
            'severity' => $severity,
            'excerpt' => mb_substr(trim((string)($issue['excerpt'] ?? '')), 0, 300),
            'explanation' => mb_substr(trim((string)($issue['explanation'] ?? '')), 0, 900),
            'hint' => mb_substr(trim((string)($issue['hint'] ?? '')), 0, 500),
        ];
        if (count($issues) >= 12) break;
    }
    $evaluation['issues'] = $issues;

    $attemptId = cssv_uuid_v4();
    $pdo->beginTransaction();
    $stmt = $pdo->prepare('INSERT INTO ai_writing_attempts (id,user_id,feature,source_text,evaluation,provider,model) VALUES (?,?,?,?,?,?,?)');
    $stmt->execute([
        $attemptId,
        $userId,
        'handwritten_paragraph',
        $text,
        json_encode($evaluation, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
        'mistral',
        $model,
    ]);
    if ($issues !== []) {
        $errorStmt = $pdo->prepare('INSERT INTO ai_writing_errors (attempt_id,user_id,error_code,category,severity,excerpt,explanation) VALUES (?,?,?,?,?,?,?)');
        foreach ($issues as $issue) {
            $errorStmt->execute([$attemptId, $userId, $issue['error_code'], $issue['category'], $issue['severity'], $issue['excerpt'] ?: null, $issue['explanation'] ?: null]);
        }
    }
    $pdo->commit();

    cssv_json([
        'ok' => true,
        'attempt_id' => $attemptId,
        'evaluation' => $evaluation,
        'remaining' => $remaining,
    ]);
} catch (Throwable $error) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    cssv_ai_refund_call($pdo, $userId, 'handwritten_paragraph_evaluation');
    if ($error instanceof Error) error_log('CSSV paragraph evaluation error: ' . $error->getMessage());
    throw $error;
}
