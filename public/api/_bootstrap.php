<?php
declare(strict_types=1);

// Hostinger deployments can expose a document root that is nested under an
// internal build directory while File Manager shows the account-level root.
// Search only fixed, private cssv-private/config.php locations while walking
// upward from both the document root and physical API script path. No secret
// values or absolute paths are ever emitted.
$configCandidates = [];
$explicitConfig = getenv('CSSV_CONFIG_FILE');
if ($explicitConfig !== false && trim((string)$explicitConfig) !== '') {
    $configCandidates[] = trim((string)$explicitConfig);
}

$searchRoots = [];
$documentRoot = rtrim((string)($_SERVER['DOCUMENT_ROOT'] ?? ''), '/\\');
if ($documentRoot !== '') {
    $searchRoots[] = $documentRoot;
}
$searchRoots[] = __DIR__;

foreach ($searchRoots as $root) {
    $cursor = $root;
    for ($level = 0; $level < 8; $level++) {
        if ($cursor === '' || $cursor === DIRECTORY_SEPARATOR || $cursor === '.') {
            break;
        }
        $configCandidates[] = $cursor . DIRECTORY_SEPARATOR . 'cssv-private' . DIRECTORY_SEPARATOR . 'config.php';
        $configCandidates[] = dirname($cursor) . DIRECTORY_SEPARATOR . 'cssv-private' . DIRECTORY_SEPARATOR . 'config.php';
        $parent = dirname($cursor);
        if ($parent === $cursor) {
            break;
        }
        $cursor = $parent;
    }
}

foreach (array_unique($configCandidates) as $candidate) {
    if (is_string($candidate) && $candidate !== '' && is_file($candidate) && is_readable($candidate)) {
        putenv('CSSV_CONFIG_FILE=' . $candidate);
        break;
    }
}

require_once __DIR__ . '/_bootstrap_core.php';
