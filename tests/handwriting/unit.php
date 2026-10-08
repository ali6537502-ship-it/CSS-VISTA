<?php
declare(strict_types=1);
require __DIR__.'/../../public/api/_bootstrap_core.php';require __DIR__.'/../../public/api/_handwriting.php';
putenv('CSSV_HANDWRITING_ENABLED=0');
function check(bool $v,string $label): void {if(!$v)throw new RuntimeException($label);}
check(cssv_handwriting_configuration()['enabled']===false,'No policy/provider flags: feature must be closed');
check(cssv_handwriting_extraction_result(['readable'=>true,'text'=>'TEST ONLY: She go to school.','uncertain'=>true,'reason'=>'Check wording.'])['uncertain'],'Uncertainty preserved');
foreach([['readable'=>false,'text'=>'Guessed text','uncertain'=>false,'reason'=>''],['readable'=>true,'text'=>"First paragraph.\n\nSecond paragraph.",'uncertain'=>false,'reason'=>''],['readable'=>'yes','text'=>'Text','uncertain'=>false,'reason'=>''],['readable'=>true,'text'=>'Text','uncertain'=>false,'reason'=>'','confidence'=>100]] as $bad){try{cssv_handwriting_extraction_result($bad);throw new RuntimeException('Invalid extraction accepted');}catch(InvalidArgumentException){}}
check(cssv_handwriting_extraction_result(['readable'=>false,'text'=>'','uncertain'=>true,'reason'=>'Unreadable.'])['text']==='','Unreadable image must not invent words');
// Real decoder: camera orientation and metadata removal, independent of DB fixtures.
$image=imagecreatetruecolor(400,600);imagefill($image,0,0,imagecolorallocate($image,255,255,255));ob_start();imagejpeg($image);$jpg=ob_get_clean();imagedestroy($image);
$exif="Exif\0\0"."II".pack('vV',42,8).pack('v',1).pack('vvVVV',0x0112,3,1,6,0);$app="\xFF\xE1".pack('n',strlen($exif)+2).$exif;
$fixture=tempnam(sys_get_temp_dir(),'cssv-handwriting-unit-');file_put_contents($fixture,substr($jpg,0,2).$app.substr($jpg,2));
try{$decoded=cssv_handwriting_decode($fixture);check($decoded['width']===600 && $decoded['height']===400,'JPEG orientation preserved during normalization');check(!str_contains($decoded['bytes'],'Exif'),'EXIF removed');}finally{unlink($fixture);}
$sql=file_get_contents(__DIR__.'/../../server/sql/014_handwriting_workflow.sql');preg_match_all('/CREATE TABLE IF NOT EXISTS [\s\S]*?;/',$sql,$m);check(array_map(fn($s)=>trim($s,"; \n\r"),$m[0])===cssv_handwriting_schema_statements(),'SQL/PHP mirror parity');
echo "PASS: closed configuration, strict/readable transcription, one-paragraph bounds, uncertainty and additive table parity.\n";
