<?php
declare(strict_types=1);

// Hostinger can report a document root that differs from the physical script path.
// Resolve the private config from an explicit override first, then from both
// document-root-relative and script-relative locations. Secrets stay outside
// public_html and are never emitted by this loader.
$documentRoot = rtrim((string)($_SERVER['DOCUMENT_ROOT'] ?? ''), '/\\');
$configCandidates = [];
$explicitConfig = getenv('CSSV_CONFIG_FILE');
if ($explicitConfig !== false && trim((string)$explicitConfig) !== '') {
    $configCandidates[] = trim((string)$explicitConfig);
}
if ($documentRoot !== '') {
    $configCandidates[] = dirname($documentRoot) . DIRECTORY_SEPARATOR . 'cssv-private' . DIRECTORY_SEPARATOR . 'config.php';
}
$configCandidates[] = dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'cssv-private' . DIRECTORY_SEPARATOR . 'config.php';

foreach (array_unique($configCandidates) as $candidate) {
    if (is_string($candidate) && $candidate !== '' && is_file($candidate) && is_readable($candidate)) {
        putenv('CSSV_CONFIG_FILE=' . $candidate);
        break;
    }
}

require_once __DIR__ . '/_bootstrap_core.php';
