<?php
declare(strict_types=1);

// Exercise the real endpoint and profile gate with disposable files and a
// stubbed session/database boundary. No production accounts or files are used.
$root = dirname(__DIR__);
if (($argv[1] ?? '') === 'case') {
    require $argv[2] . '/student/' . ($argv[3] ?? 'resources.php');
    exit;
}
$dir = sys_get_temp_dir() . '/cssv-resources-' . bin2hex(random_bytes(8));
mkdir($dir . '/student', 0700, true);
mkdir($dir . '/_resource_files', 0700, true);
copy($root . '/public/api/student/resources.php', $dir . '/student/resources.php');
copy($root . '/public/api/student/resources-public-key.php', $dir . '/student/resources-public-key.php');
copy($root . '/public/api/_resources.php', $dir . '/_resources.php');
$profileSource = file_get_contents($root . '/public/api/_profile.php');
$profileStatus = substr($profileSource, strpos($profileSource, 'function cssv_profile_status('));
$profileStatus = substr($profileStatus, 0, strpos($profileStatus, 'function cssv_profile_for_user('));
$authSource = file_get_contents($root . '/public/api/_bootstrap_core.php');
$gate = substr($authSource, strpos($authSource, 'function cssv_require_user('));
$gate = substr($gate, 0, strpos($gate, 'function cssv_is_admin('));
$gate = str_replace("require_once __DIR__ . '/_profile.php';", '', $gate);
$stubs = <<<'PHP'
if (!class_exists('PDO')) { class PDO {} }
class ResourceTestPDO extends PDO { public function __construct() {} }
function cssv_db(): PDO { return new ResourceTestPDO(); }
function cssv_private_storage_dir(string $child = ''): string {
    $path = getenv('CSSV_RESOURCE_STORAGE') . '/' . $child;
    if (!is_dir($path)) mkdir($path, 0700, true);
    return $path;
}
function cssv_require_method(string $method): void {}
function cssv_current_session(PDO $pdo): ?array {
    return getenv('CSSV_RESOURCE_CASE') === 'anonymous' ? null : ['user_id' => 'fixture-user'];
}
function cssv_profile_for_user(PDO $pdo, string $id): array {
    $p = ['profile_photo_path'=>'fixture.jpg','profile_photo_bytes'=>1024,'display_name'=>'Fixture','phone'=>'123','date_of_birth'=>'2000-01-01','gender'=>'Other','city'=>'Fixture','province_region'=>'Fixture','country'=>'Pakistan','css_attempt_year'=>2027,'preparation_level'=>'Starting','optional_subjects'=>['History'],'education'=>'Fixture'];
    if (getenv('CSSV_RESOURCE_CASE') === 'incomplete') $p['education'] = '';
    return $p;
}
// ASCII-only fixture subjects let this unit test also run with php -n.
if (!function_exists('mb_strlen')) { function mb_strlen(string $value): int { return strlen($value); } }
function cssv_fail(string $message, int $status, string $error): never { cssv_json(['status'=>$status,'error'=>$error]); }
function cssv_json(array $value): never { echo json_encode($value); exit; }
$_GET = json_decode(getenv('CSSV_RESOURCE_QUERY'), true);
if (getenv('CSSV_RESOURCE_CASE') === 'changed') $_SERVER['HTTP_X_CSSV_USER'] = 'different-user';
PHP;
file_put_contents($dir . '/_bootstrap.php', "<?php\n" . $stubs . "\n" . $profileStatus . "\n" . $gate);
$run = static function (string $case, array $query, string $endpoint = 'resources.php') use ($dir): string {
    $env = array_merge(getenv(), ['CSSV_RESOURCE_CASE'=>$case,'CSSV_RESOURCE_QUERY'=>json_encode($query),'CSSV_RESOURCE_STORAGE'=>$dir.'/private']);
    $process = proc_open([PHP_BINARY, '-n', __FILE__, 'case', $dir, $endpoint], [1=>['pipe','w'],2=>['pipe','w']], $pipes, null, $env);
    $out = stream_get_contents($pipes[1]); $err = stream_get_contents($pipes[2]);
    fclose($pipes[1]); fclose($pipes[2]);
    if (proc_close($process) !== 0 || $err !== '') throw new RuntimeException($err ?: $out);
    return $out;
};
$check = static function (bool $ok, string $label): void { if (!$ok) throw new RuntimeException($label); };
try {
    foreach ([[], ['view'=>'download','id'=>'urdu-grammar']] as $query) {
        $check(json_decode($run('anonymous',$query),true)['status'] === 401, 'Anonymous access blocked');
        $check(json_decode($run('incomplete',$query),true)['status'] === 403, 'Incomplete profile blocked');
        $check(json_decode($run('changed',$query),true)['status'] === 409, 'Account switch blocked');
    }
    $check(json_decode($run('complete',[]),true)['resources'][0]['available'] === false, 'Unuploaded book stays unavailable');
    $check(json_decode($run('complete',['view'=>'download','id'=>'urdu-grammar']),true)['status'] === 404, 'Missing book cannot download');
    $public = json_decode($run('anonymous', [], 'resources-public-key.php'), true);
    $check($public['ok'] && str_starts_with($public['public_key'], '-----BEGIN PUBLIC KEY-----'), 'Only public encryption key is exposed');
    $pdf = "%PDF-1.4\nDISPOSABLE ACCESS TEST\n%%EOF\n";
    $key = random_bytes(32); $iv = random_bytes(12);
    $cipher = openssl_encrypt($pdf, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag);
    $check(openssl_public_encrypt($key, $wrapped, $public['public_key'], OPENSSL_PKCS1_OAEP_PADDING), 'Encryption key wrapped');
    $payload = ['key_id'=>$public['key_id'],'wrapped_key'=>base64_encode($wrapped),'iv'=>base64_encode($iv),'tag'=>base64_encode($tag),'ciphertext'=>base64_encode($cipher),'sha256'=>hash('sha256',$pdf)];
    file_put_contents($dir . '/_resource_files/urdu-grammar.php', "<?php return " . var_export($payload, true) . ";\n");
    $check(json_decode($run('complete',[]),true)['resources'][0]['available'] === true, 'Uploaded book becomes available');
    $check($run('complete',['view'=>'download','id'=>'urdu-grammar']) === $pdf, 'Complete profile downloads exact bytes');
    $check(json_decode($run('incomplete',['view'=>'download','id'=>'urdu-grammar']),true)['status'] === 403, 'Cleared required field relocks an uploaded book');
    $check(json_decode($run('complete',['view'=>'download','id'=>'../_bootstrap']),true)['status'] === 404, 'Unknown paths rejected');
    $payload['tag'] = base64_encode(random_bytes(16));
    file_put_contents($dir . '/_resource_files/urdu-grammar.php', "<?php return " . var_export($payload,true) . ";\n");
    $check(json_decode($run('complete',['view'=>'download','id'=>'urdu-grammar']),true)['status'] === 503, 'Corrupt file rejected');
    echo "PASS: resources require login and a complete saved profile; account switches, missing files, traversal and corrupt downloads are blocked.\n";
} finally {
    $remove = static function (string $path) use (&$remove): void {
        if (is_dir($path)) { foreach (scandir($path) as $name) if ($name !== '.' && $name !== '..') $remove($path . '/' . $name); rmdir($path); }
        else unlink($path);
    };
    $remove($dir);
}
