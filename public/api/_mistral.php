<?php
declare(strict_types=1);

function cssv_ai_bool_env(string $name, bool $default = false): bool
{
    $value = cssv_env($name);
    if ($value === null) return $default;
    return in_array(strtolower(trim($value)), ['1', 'true', 'yes', 'on'], true);
}

function cssv_ai_feature_enabled(string $userId): bool
{
    if (!cssv_ai_bool_env('CSSV_AI_ENABLED', false)) return false;
    $allow = trim((string)(cssv_env('CSSV_AI_PILOT_USER_IDS', '') ?? ''));
    if ($allow === '') return true;
    $ids = array_values(array_filter(array_map('trim', explode(',', $allow))));
    return in_array($userId, $ids, true);
}

function cssv_ai_daily_limit(string $name, int $default): int
{
    $raw = cssv_env($name);
    if ($raw === null || !preg_match('/^\d+$/', $raw)) return $default;
    return max(1, min(100, (int)$raw));
}

function cssv_ai_ensure_schema(PDO $pdo): void
{
    static $ready = false;
    if ($ready) return;

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS ai_daily_usage (
          user_id CHAR(36) NOT NULL,
          usage_date DATE NOT NULL,
          feature VARCHAR(80) NOT NULL,
          calls INT UNSIGNED NOT NULL DEFAULT 0,
          input_tokens BIGINT UNSIGNED NOT NULL DEFAULT 0,
          output_tokens BIGINT UNSIGNED NOT NULL DEFAULT 0,
          units DECIMAL(12,3) NOT NULL DEFAULT 0,
          updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
          PRIMARY KEY (user_id, usage_date, feature),
          KEY ai_daily_usage_date_idx (usage_date),
          CONSTRAINT ai_daily_usage_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS ai_writing_attempts (
          id CHAR(36) NOT NULL,
          user_id CHAR(36) NOT NULL,
          feature VARCHAR(80) NOT NULL,
          source_text MEDIUMTEXT NOT NULL,
          evaluation JSON NOT NULL,
          provider VARCHAR(32) NOT NULL,
          model VARCHAR(96) NOT NULL,
          created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          PRIMARY KEY (id),
          KEY ai_writing_attempts_user_time_idx (user_id, created_at),
          KEY ai_writing_attempts_feature_idx (feature, created_at),
          CONSTRAINT ai_writing_attempts_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS ai_writing_errors (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          attempt_id CHAR(36) NOT NULL,
          user_id CHAR(36) NOT NULL,
          error_code VARCHAR(80) NOT NULL,
          category VARCHAR(80) NOT NULL,
          severity VARCHAR(16) NOT NULL,
          excerpt VARCHAR(500) NULL,
          explanation VARCHAR(1200) NULL,
          created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          PRIMARY KEY (id),
          KEY ai_writing_errors_user_code_idx (user_id, error_code, created_at),
          KEY ai_writing_errors_user_category_idx (user_id, category, created_at),
          CONSTRAINT ai_writing_errors_attempt_fk FOREIGN KEY (attempt_id) REFERENCES ai_writing_attempts(id) ON DELETE CASCADE,
          CONSTRAINT ai_writing_errors_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    $ready = true;
}

function cssv_ai_usage(PDO $pdo, string $userId, string $feature): array
{
    cssv_ai_ensure_schema($pdo);
    $stmt = $pdo->prepare('SELECT calls,input_tokens,output_tokens,units FROM ai_daily_usage WHERE user_id=? AND usage_date=UTC_DATE() AND feature=? LIMIT 1');
    $stmt->execute([$userId, $feature]);
    $row = $stmt->fetch();
    return [
        'calls' => (int)($row['calls'] ?? 0),
        'input_tokens' => (int)($row['input_tokens'] ?? 0),
        'output_tokens' => (int)($row['output_tokens'] ?? 0),
        'units' => (float)($row['units'] ?? 0),
    ];
}

function cssv_ai_reserve_call(PDO $pdo, string $userId, string $feature, int $limit): int
{
    cssv_ai_ensure_schema($pdo);
    try {
        $pdo->beginTransaction();
        $stmt = $pdo->prepare('SELECT calls FROM ai_daily_usage WHERE user_id=? AND usage_date=UTC_DATE() AND feature=? FOR UPDATE');
        $stmt->execute([$userId, $feature]);
        $current = $stmt->fetchColumn();
        $calls = $current === false ? 0 : (int)$current;
        if ($calls >= $limit) {
            $pdo->rollBack();
            cssv_fail('You have reached today\'s limit for this AI feature.', 429, 'daily_ai_limit_reached');
        }
        if ($current === false) {
            $insert = $pdo->prepare('INSERT INTO ai_daily_usage (user_id,usage_date,feature,calls) VALUES (?,UTC_DATE(),?,1)');
            $insert->execute([$userId, $feature]);
            $calls = 1;
        } else {
            $update = $pdo->prepare('UPDATE ai_daily_usage SET calls=calls+1 WHERE user_id=? AND usage_date=UTC_DATE() AND feature=?');
            $update->execute([$userId, $feature]);
            $calls++;
        }
        $pdo->commit();
        return max(0, $limit - $calls);
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        if ($error instanceof PDOException) {
            error_log('CSSV AI usage reservation failed: ' . $error->getMessage());
            cssv_fail('AI usage tracking is temporarily unavailable.', 503, 'ai_usage_unavailable');
        }
        throw $error;
    }
}

function cssv_ai_refund_call(PDO $pdo, string $userId, string $feature): void
{
    try {
        $stmt = $pdo->prepare('UPDATE ai_daily_usage SET calls=GREATEST(calls-1,0) WHERE user_id=? AND usage_date=UTC_DATE() AND feature=?');
        $stmt->execute([$userId, $feature]);
    } catch (Throwable $error) {
        error_log('CSSV AI usage refund failed: ' . $error->getMessage());
    }
}

function cssv_ai_record_usage(PDO $pdo, string $userId, string $feature, int $inputTokens = 0, int $outputTokens = 0, float $units = 0): void
{
    try {
        $stmt = $pdo->prepare(
            'UPDATE ai_daily_usage SET input_tokens=input_tokens+?,output_tokens=output_tokens+?,units=units+? '
            . 'WHERE user_id=? AND usage_date=UTC_DATE() AND feature=?'
        );
        $stmt->execute([max(0, $inputTokens), max(0, $outputTokens), max(0, $units), $userId, $feature]);
    } catch (Throwable $error) {
        error_log('CSSV AI usage metric write failed: ' . $error->getMessage());
    }
}

function cssv_mistral_request(string $path, array $payload, int $timeoutSeconds = 45): array
{
    $key = cssv_env('MISTRAL_API_KEY');
    if (!$key) cssv_fail('AI service is not configured yet.', 503, 'ai_not_configured');
    if (!function_exists('curl_init')) cssv_fail('AI transport is unavailable on this server.', 503, 'ai_transport_unavailable');

    $url = 'https://api.mistral.ai' . $path;
    $body = json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    if (!is_string($body)) cssv_fail('Could not prepare the AI request.', 500, 'ai_request_failed');

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT => $timeoutSeconds,
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . $key,
            'Content-Type: application/json',
            'Accept: application/json',
        ],
        CURLOPT_POSTFIELDS => $body,
    ]);
    $raw = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if (!is_string($raw) || $raw === '' || $status < 200 || $status >= 300) {
        error_log('CSSV Mistral request failed status=' . $status . ($curlError !== '' ? ' curl=' . $curlError : ''));
        cssv_fail('The AI service could not complete this request. Please try again.', 502, 'ai_provider_failed');
    }

    try {
        $decoded = json_decode($raw, true, 128, JSON_THROW_ON_ERROR);
    } catch (JsonException $error) {
        error_log('CSSV Mistral returned invalid JSON: ' . $error->getMessage());
        cssv_fail('The AI service returned an invalid response.', 502, 'ai_provider_invalid_response');
    }
    if (!is_array($decoded)) cssv_fail('The AI service returned an invalid response.', 502, 'ai_provider_invalid_response');
    return $decoded;
}

function cssv_mistral_usage_tokens(array $response): array
{
    $usage = is_array($response['usage'] ?? null) ? $response['usage'] : [];
    return [
        (int)($usage['prompt_tokens'] ?? $usage['input_tokens'] ?? 0),
        (int)($usage['completion_tokens'] ?? $usage['output_tokens'] ?? 0),
    ];
}

function cssv_mistral_message_text(array $response): string
{
    $content = $response['choices'][0]['message']['content'] ?? '';
    if (is_string($content)) return trim($content);
    if (is_array($content)) {
        $parts = [];
        foreach ($content as $chunk) {
            if (is_array($chunk) && isset($chunk['text']) && is_string($chunk['text'])) $parts[] = $chunk['text'];
        }
        return trim(implode("\n", $parts));
    }
    return '';
}

function cssv_ai_clean_ocr_text(string $value): string
{
    $text = preg_replace('/!\[[^\]]*\]\([^)]*\)/u', '', $value) ?? $value;
    $text = preg_replace('/^#{1,6}\s*/mu', '', $text) ?? $text;
    $text = preg_replace('/\r\n?/', "\n", $text) ?? $text;
    $text = preg_replace('/[ \t]+/', ' ', $text) ?? $text;
    $text = preg_replace('/\n{3,}/', "\n\n", $text) ?? $text;
    return trim($text);
}
