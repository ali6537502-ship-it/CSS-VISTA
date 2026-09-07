<?php
declare(strict_types=1);

// Hostinger deployments can expose a document root that is nested under an
// internal build directory while File Manager shows the account-level root.
// Search only fixed config locations. No secret values or absolute paths are
// ever emitted.
$configCandidates = [];
$explicitConfig = getenv('CSSV_CONFIG_FILE');
if ($explicitConfig !== false && trim((string)$explicitConfig) !== '') {
    $configCandidates[] = trim((string)$explicitConfig);
}

// Account-home candidates. These cover Hostinger setups where PHP executes
// from an internal build path while File Manager is rooted at /home/<account>.
$home = trim((string)(getenv('HOME') ?: ($_SERVER['HOME'] ?? '')));
if ($home !== '') {
    $configCandidates[] = rtrim($home, '/\\') . DIRECTORY_SEPARATOR . 'cssv-private' . DIRECTORY_SEPARATOR . 'config.php';
}
if (function_exists('posix_geteuid') && function_exists('posix_getpwuid')) {
    $account = @posix_getpwuid(posix_geteuid());
    if (is_array($account) && !empty($account['dir'])) {
        $configCandidates[] = rtrim((string)$account['dir'], '/\\') . DIRECTORY_SEPARATOR . 'cssv-private' . DIRECTORY_SEPARATOR . 'config.php';
    }
}
$currentOwner = trim((string)get_current_user());
if ($currentOwner !== '' && preg_match('/^[A-Za-z0-9._-]+$/', $currentOwner)) {
    $configCandidates[] = DIRECTORY_SEPARATOR . 'home' . DIRECTORY_SEPARATOR . $currentOwner . DIRECTORY_SEPARATOR . 'cssv-private' . DIRECTORY_SEPARATOR . 'config.php';
}

$searchRoots = [];
$documentRoot = rtrim((string)($_SERVER['DOCUMENT_ROOT'] ?? ''), '/\\');
if ($documentRoot !== '') {
    // Simple fallback for shared hosting: config.php may live directly in the
    // web root. public/.htaccess blocks direct HTTP access to this file.
    $configCandidates[] = $documentRoot . DIRECTORY_SEPARATOR . 'config.php';
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
