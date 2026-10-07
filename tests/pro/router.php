<?php
declare(strict_types=1);
if (getenv('CI')!=='true' || getenv('CSSV_DB_NAME')!=='cssvista_briefing_test') { http_response_code(404); exit; }
$root=dirname(__DIR__,2).'/public';
$path=rawurldecode((string)parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH));
if (str_contains($path,'..') || preg_match('~^/api/_~',$path)) { http_response_code(404); exit; }
if (is_file($root.$path)) return false;
http_response_code(404);
