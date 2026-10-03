<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/_bootstrap.php';
require_once dirname(__DIR__) . '/_resources.php';
cssv_require_method('GET');
$pdo = cssv_db();
// Recheck saved profile values on every request, including direct downloads.
cssv_require_user($pdo);

// Repository payloads are encrypted with this server's public key. Only the
// private runtime can decrypt them, after checking the student's saved profile.
$catalogue = [
    'urdu-grammar' => ['id' => 'urdu-grammar', 'title' => 'Qawaid-e-Urdu by Sir Ali Hassan Sargana', 'format' => 'PDF', 'filename' => 'Qawaid-e-Urdu-by-Sir-Ali-Hassan-Sargana.pdf', 'cover'=>'/books/qawaid-e-urdu-cover.jpg'],
];
$view = (string)($_GET['view'] ?? 'list');
if (!in_array($view, ['list', 'download'], true)) cssv_fail('Resource view not found.', 404, 'resource_not_found');
if ($view === 'list') {
    $resources = [];
    foreach ($catalogue as $id => $resource) {
        $resource['available'] = is_file(dirname(__DIR__) . '/_resource_files/' . $id . '.php');
        $resources[] = $resource;
    }
    cssv_json(['ok' => true, 'resources' => $resources]);
}
$id = (string)($_GET['id'] ?? '');
if (!isset($catalogue[$id])) cssv_fail('Resource not found.', 404, 'resource_not_found');
$path = dirname(__DIR__) . '/_resource_files/' . $id . '.php';
if (!is_file($path)) cssv_fail('This book has not been uploaded yet.', 404, 'resource_unavailable');
$payload = require $path;
if (!is_array($payload)) cssv_fail('This book is temporarily unavailable.', 503, 'resource_unavailable');
$pdf = cssv_resource_decrypt($payload);
header_remove('Content-Type');
header('Content-Type: application/pdf');
header('Content-Disposition: attachment; filename="' . $catalogue[$id]['filename'] . '"');
header('Content-Length: ' . strlen($pdf));
header('Cache-Control: private, no-store, no-cache, must-revalidate, max-age=0');
header('X-Robots-Tag: noindex, nofollow, noarchive');
header('X-Content-Type-Options: nosniff');
echo $pdf;
exit;
