<?php
declare(strict_types=1);

// Resolve the private Hostinger runtime config without exposing its path or
// values. Keep recovery deliberately cheap: retained Hostinger releases can be
// large, so only a small set of fixed paths/globs is inspected.
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
if ($documentRoot !== '') {
    $configCandidates[] = $documentRoot . DIRECTORY_SEPARATOR . 'config.php';
}

$domainRoot = $home !== ''
    ? rtrim($home, '/\\') . DIRECTORY_SEPARATOR . 'domains' . DIRECTORY_SEPARATOR . 'css-vista.com'
    : '';
if ($domainRoot !== '') {
    $configCandidates[] = $domainRoot . DIRECTORY_SEPARATOR . 'public_html' . DIRECTORY_SEPARATOR . 'config.php';
}

// Fixed nearby locations used by Hostinger shared hosting/build releases.
$roots = array_filter(array_unique([
    $documentRoot,
    $documentRoot !== '' ? dirname($documentRoot) : '',
    $documentRoot !== '' ? dirname(dirname($documentRoot)) : '',
    __DIR__,
    dirname(__DIR__),
    $home,
    $domainRoot,
]));
foreach ($roots as $root) {
    $root = rtrim((string)$root, '/\\');
    $configCandidates[] = $root . DIRECTORY_SEPARATOR . 'config.php';
    $configCandidates[] = $root . DIRECTORY_SEPARATOR . 'cssv-private' . DIRECTORY_SEPARATOR . 'config.php';
    $configCandidates[] = dirname($root) . DIRECTORY_SEPARATOR . 'cssv-private' . DIRECTORY_SEPARATOR . 'config.php';
}

// Search only known hbuild root candidates and only a few shallow layouts.
$hbuildRoots = [];
foreach ($roots as $root) {
    $root = rtrim((string)$root, '/\\');
    foreach ([
        $root . DIRECTORY_SEPARATOR . 'hbuilds',
        dirname($root) . DIRECTORY_SEPARATOR . 'hbuilds',
    ] as $candidateRoot) {
        if (is_dir($candidateRoot) && is_readable($candidateRoot)) {
            $hbuildRoots[] = $candidateRoot;
        }
    }
}
if ($home !== '') {
    $hbuildRoots[] = rtrim($home, '/\\') . DIRECTORY_SEPARATOR . 'hbuilds';
    $hbuildRoots[] = rtrim($home, '/\\') . DIRECTORY_SEPARATOR . 'domains' . DIRECTORY_SEPARATOR . 'css-vista.com' . DIRECTORY_SEPARATOR . 'hbuilds';
}

$historicConfigs = [];
$patterns = [
    '*' . DIRECTORY_SEPARATOR . 'config.php',
    '*' . DIRECTORY_SEPARATOR . 'public_html' . DIRECTORY_SEPARATOR . 'config.php',
    '*' . DIRECTORY_SEPARATOR . '*' . DIRECTORY_SEPARATOR . 'config.php',
    '*' . DIRECTORY_SEPARATOR . '*' . DIRECTORY_SEPARATOR . 'public_html' . DIRECTORY_SEPARATOR . 'config.php',
];
foreach (array_unique($hbuildRoots) as $hbuildRoot) {
    if (!is_dir($hbuildRoot) || !is_readable($hbuildRoot)) {
        continue;
    }
    foreach ($patterns as $pattern) {
        $matches = @glob(rtrim($hbuildRoot, '/\\') . DIRECTORY_SEPARATOR . $pattern);
        if (!is_array($matches)) {
            continue;
        }
        foreach ($matches as $match) {
            if (is_file($match) && is_readable($match)) {
                $historicConfigs[$match] = @filemtime($match) ?: 0;
            }
        }
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
    if (str_contains($probe, 'CSSV_DB_HOST') && str_contains($probe, 'CSSV_APP_SECRET')) {
        $selectedConfig = $candidate;
        break;
    }
}

// Persist a recovered valid runtime config outside public_html so later
// Hostinger release swaps no longer remove it.
if ($selectedConfig !== '' && $persistentConfig !== '' && $selectedConfig !== $persistentConfig) {
    $privateDir = dirname($persistentConfig);
    if ((is_dir($privateDir) || @mkdir($privateDir, 0700, true)) && is_writable($privateDir)) {
        $contents = @file_get_contents($selectedConfig);
        if (is_string($contents) && $contents !== '') {
            try {
                $suffix = bin2hex(random_bytes(6));
            } catch (Throwable) {
                $suffix = (string)mt_rand(100000, 999999);
            }
            $tmp = $persistentConfig . '.tmp-' . $suffix;
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
