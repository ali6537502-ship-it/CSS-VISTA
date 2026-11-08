<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/_bootstrap.php';
cssv_require_method('GET','POST');
$pdo=cssv_db();$session=cssv_require_user($pdo);
if($_SERVER['REQUEST_METHOD']==='POST')cssv_require_csrf($session);
cssv_fail('The standalone General Ability feature has been removed. Your earlier records are retained.',410,'ability_retired');
