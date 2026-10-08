#!/usr/bin/env php
<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
require_once dirname(__DIR__,2).'/public/api/_bootstrap_core.php';
require_once dirname(__DIR__,2).'/public/api/_ai.php';
try{$pdo=cssv_db();cssv_learning_ensure($pdo);echo json_encode(cssv_ai_sweep($pdo),JSON_THROW_ON_ERROR)."\n";}
catch(Throwable $e){fwrite(STDERR,'AI recovery failed: '.get_class($e)."\n");exit(1);}
