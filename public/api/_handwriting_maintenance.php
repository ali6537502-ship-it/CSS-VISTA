<?php
declare(strict_types=1);
// Packaged with the PHP release for Hostinger cron; never an HTTP endpoint.
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
require_once __DIR__.'/_bootstrap.php';require_once __DIR__.'/_handwriting.php';
try{$pdo=cssv_db();cssv_handwriting_ensure($pdo);$recovery=cssv_ai_sweep($pdo);$cleanup=cssv_handwriting_cleanup($pdo);echo json_encode(['recovery'=>$recovery,'cleanup'=>$cleanup],JSON_THROW_ON_ERROR)."\n";}
catch(Throwable $e){fwrite(STDERR,'Handwriting maintenance failed: '.get_class($e)."\n");exit(1);}
