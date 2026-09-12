<?php
declare(strict_types=1);
require_once __DIR__.'/_account_auth.php';
require_once __DIR__.'/_admin_auth.php';
function native_owner(PDO $pdo): array {
    $admin=cssv_require_separate_admin($pdo);
    if(!in_array($_SERVER['REQUEST_METHOD']??'GET',['GET','HEAD'],true)) {
        account_require_json_origin();$cookie=(string)($_COOKIE[CSSV_ADMIN_CSRF_COOKIE]??'');$token=(string)($_SERVER['HTTP_X_CSRF_TOKEN']??'');
        if($cookie===''||$token===''||!hash_equals($cookie,$token)||!hash_equals($admin['csrf_hash'],cssv_hash_secret($token)))cssv_fail('Refresh your admin session before saving.',403,'invalid_csrf');
    } return $admin;
}
function native_text(mixed $value,int $max,bool $required=false): string {
    if(!is_string($value)||mb_strlen($value)>$max||str_contains($value,"\0")||($required&&trim($value)===''))cssv_fail('A required field is missing or too long.',422,'invalid_field');return trim($value);
}
