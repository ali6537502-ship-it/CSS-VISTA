<?php
declare(strict_types=1);
// Local browser-test router for tests/mpt/browser.mjs: serves the built API and
// static files from dist/, and the application shell for client routes (as the
// Hostinger .htaccess does for exact and pattern routes). Disposable DB only.
if (getenv('CI') !== 'true' || getenv('CSSV_DB_NAME') !== 'cssvista_briefing_test') { http_response_code(404); exit; }
$root = dirname(__DIR__, 2) . '/dist';
$path = rawurldecode((string)parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));
if (str_contains($path, '..') || preg_match('~^/api/(?:_briefing_release(?:/|$)|_current_affairs|_mpt)~', $path)) { http_response_code(404); exit; }
if (str_starts_with($path, '/api/')) {
    if (is_file($root . $path)) return false;
    http_response_code(404);
    exit;
}
if ($path !== '/' && is_file($root . $path)) return false;
header('Content-Type: text/html; charset=UTF-8');
readfile($root . '/index.html');
