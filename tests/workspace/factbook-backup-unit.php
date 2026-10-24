<?php
declare(strict_types=1);
require_once __DIR__.'/../../public/api/_factbook_backup.php';
function check(bool $ok,string $message): void {if(!$ok)throw new RuntimeException($message);}
check(trim(file_get_contents(__DIR__.'/../../server/sql/028_factbook_backup_receipts.sql'))===fb_backup_schema().';','Runtime and migration schema differ.');
check(json_encode(fb_backup_canonical(json_decode('{"z":{},"a":[{},[]]}'))) === '{"a":[{},[]],"z":{}}','Canonical hashing lost object/array types.');
$backup=['format'=>'css-vista-factbook','version'=>2,'json_encoding'=>'stored-json','subjects'=>[],'categories'=>[],'entries'=>[],'collections'=>[],'preferences'=>null,'related'=>[],'media_blobs'=>[]];
foreach(fb_schema() as $table=>$_)if(!in_array($table,['factbook_subjects','factbook_categories','factbook_entries','factbook_collections','factbook_preferences'],true))$backup['related'][$table]=[];
[$tables,$blobs]=fb_backup_graph($backup);fb_backup_validate($tables,$blobs,'00000000-0000-4000-a000-000000000001');
foreach([array_merge($backup,['unexpected'=>[]]),array_merge($backup,['json_encoding'=>'unknown']),array_merge($backup,['related'=>[]])] as $bad){try{fb_backup_graph($bad);throw new RuntimeException('Malformed backup accepted.');}catch(InvalidArgumentException){}}
$tables['factbook_subjects']=array_fill(0,10001,[]);try{fb_backup_validate($tables,[],'00000000-0000-4000-a000-000000000001');throw new RuntimeException('Row limit ignored.');}catch(InvalidArgumentException){}
echo "PASS: backup migration parity, canonical JSON object/array fidelity, empty graph, unsupported/missing sections and record bound.\n";
