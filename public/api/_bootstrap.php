<?php
declare(strict_types=1);

// Resolve the private Hostinger runtime config without ever exposing its path
// or values. Deployments may swap public_html to a fresh hbuild release, so a
// config that was placed in an earlier release must be recovered once and then
// persisted under the account home outside the public web root.
$configCandidates = [];
$explicitConfig = getenv('CSSV_CONFIG_FILE');
if ($explicitConfig !== false && trim((string)$explicitConfig) !== '') {
    $configCandidates[] = trim((string)$explicitConfig);
}

$home = trim((string)(getenv('HOME') ?: ($_SERVER['HOME'] ?? '')));
if (function_exists('posix_geteuid') && function_exists('posix_getpwuid')) {
    $account = @posix_getpwuid(posix_geteuid());
    if (is_array($account) && !empty($account['dir']) && $home === '') {
        $home = rtrim((string)$account['dir'], '/\\');
    }
}
$currentOwner = trim((string)get_current_user());
if ($home === '' && $currentOwner !== '' && preg_match('/^[A-Za-z0-9._-]+$/', $currentOwner)) {
    $home = DIRECTORY_SEPARATOR . 'home' . DIRECTORY_SEPARATOR . $currentOwner;
}

$persistentConfig = $home !== ''
    ? rtrim($home, '/\\') . DIRECTORY_SEPARATOR . 'cssv-private' . DIRECTORY_SEPARATOR . 'config.php'
    : '';
if ($persistentConfig !== '') {
    $configCandidates[] = $persistentConfig;
}

$documentRoot = rtrim((string)($_SERVER['DOCUMENT_ROOT'] ?? ''), '/\\');
$searchRoots = [];
if ($documentRoot !== '') {
    $configCandidates[] = $documentRoot . DIRECTORY_SEPARATOR . 'config.php';
    $searchRoots[] = $documentRoot;
}
$searchRoots[] = __DIR__;
if ($home !== '') {
    $searchRoots[] = $home;
    $domainRoot = rtrim($home, '/\\') . DIRECTORY_SEPARATOR . 'domains' . DIRECTORY_SEPARATOR . 'css-vista.com';
    if (is_dir($domainRoot)) {
        $searchRoots[] = $domainRoot;
        $configCandidates[] = $domainRoot . DIRECTORY_SEPARATOR . 'public_html' . DIRECTORY_SEPARATOR . 'config.php';
    }
}

// Collect fixed ancestor candidates plus any hbuild directories beside them.
$hbuildRoots = [];
foreach (array_unique($searchRoots) as $root) {
    $cursor = rtrim((string)$root, '/\\');
    for ($level = 0; $level < 10; $level++) {
        if ($cursor === '' || $cursor === DIRECTORY_SEPARATOR || $cursor === '.') {
            break;
        }
        $configCandidates[] = $cursor . DIRECTORY_SEPARATOR . 'config.php';
        $configCandidates[] = $cursor . DIRECTORY_SEPARATOR . 'cssv-private' . DIRECTORY_SEPARATOR . 'config.php';
        $configCandidates[] = dirname($cursor) . DIRECTORY_SEPARATOR . 'cssv-private' . DIRECTORY_SEPARATOR . 'config.php';

        if (basename($cursor) === 'hbuilds' && is_dir($cursor)) {
            $hbuildRoots[] = $cursor;
        }
        $beside = $cursor . DIRECTORY_SEPARATOR . 'hbuilds';
        if (is_dir($beside)) {
            $hbuildRoots[] = $beside;
        }

        $parent = dirname($cursor);
        if ($parent === $cursor) {
            break;
        }
        $cursor = $parent;
    }
}

// Hostinger hbuild layouts differ slightly between accounts. Scan only a
// bounded hbuild tree (not the account home) and only files named config.php.
$historicConfigs = [];
foreach (array_unique($hbuildRoots) as $hbuildRoot) {
    try {
        $directory = new RecursiveDirectoryIterator(
            $hbuildRoot,
            FilesystemIterator::SKIP_DOTS | FilesystemIterator::CURRENT_AS_FILEINFO
        );
        $iterator = new RecursiveIteratorIterator($directory, RecursiveIteratorIterator::SELF_FIRST);
        $iterator->setMaxDepth(5);
        foreach ($iterator as $entry) {
            if (!$entry instanceof SplFileInfo || !$entry->isFile() || $entry->getFilename() !== 'config.php') {
                continue;
            }
            $path = $entry->getPathname();
            if (is_readable($path)) {
                $historicConfigs[$path] = $entry->getMTime();
            }
        }
    } catch (Throwable $error) {
        // A retained release may be unreadable; simply continue to the next
        // bounded root. Never emit paths or filesystem details to the client.
    }
}
if ($historicConfigs !== []) {
    arsort($historicConfigs, SORT_NUMERIC);
    foreach (array_keys($historicConfigs) as $historicConfig) {
        $configCandidates[] = $historicConfig;
    }
}

$selectedConfig = '';
foreach (array_unique($configCandidates) as $candidate) {
    if (!is_string($candidate) || $candidate === '' || !is_file($candidate) || !is_readable($candidate)) {
        continue;
    }
    $probe = @file_get_contents($candidate);
    if (!is_string($probe)) {
        continue;
    }
    // Avoid accidentally selecting an unrelated config.php from a framework
    // or retained build. These key names identify the CSS Vista runtime file.
    if (str_contains($probe, 'CSSV_DB_HOST') && str_contains($probe, 'CSSV_APP_SECRET')) {
        $selectedConfig = $candidate;
        break;
    }
}

// If the valid config was recovered from an old release, persist it outside
// public_html so future release swaps do not lose it again.
if ($selectedConfig !== '' && $persistentConfig !== '' && $selectedConfig !== $persistentConfig) {
    $privateDir = dirname($persistentConfig);
    if ((is_dir($privateDir) || @mkdir($privateDir, 0700, true)) && is_writable($privateDir)) {
        $contents = @file_get_contents($selectedConfig);
        if (is_string($contents) && $contents !== '') {
            $tmp = $persistentConfig . '.tmp-' . bin2hex(random_bytes(6));
            if (@file_put_contents($tmp, $contents, LOCK_EX) !== false) {
                @chmod($tmp, 0600);
                if (@rename($tmp, $persistentConfig)) {
                    $selectedConfig = $persistentConfig;
                } else {
                    @unlink($tmp);
                }
            }
        }
    }
}

if ($selectedConfig !== '') {
    putenv('CSSV_CONFIG_FILE=' . $selectedConfig);
}

require_once __DIR__ . '/_bootstrap_core.php';
