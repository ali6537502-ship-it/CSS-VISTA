<?php
declare(strict_types=1);
require_once __DIR__.'/../../public/api/_topics_writing.php';
$sql=trim(preg_replace('/^--.*$/m','',file_get_contents(__DIR__.'/../../server/sql/027_topic_writing_bindings.sql')));
if(rtrim($sql,";\n\r ")!==cssv_topic_writing_schema()[0])throw new RuntimeException('Topic writing migration parity failed.');
echo "PASS: topic binding additive migration/runtime parity.\n";
