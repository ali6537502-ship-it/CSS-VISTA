<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/public/api/_current_affairs_model.php';
$fixture=json_decode(file_get_contents(dirname(__DIR__).'/examples/current-affairs/test-edition.json'),true,64,JSON_THROW_ON_ERROR);
function check(bool $condition, string $message): void { if (!$condition) throw new RuntimeException($message); }
function rejects(array $data, string $message, bool $allowTest=true): void {
    try { ca_validate_dataset($data,$allowTest); }
    catch (InvalidArgumentException) { return; }
    throw new RuntimeException($message);
}
check(ca_validate_dataset($fixture,true)===$fixture,'Validation changed source wording.');
rejects($fixture,'Production accepted a test edition.',false);
$bad=$fixture; $bad['date']='2099-02-30'; rejects($bad,'Invalid date accepted.');
$bad=$fixture; $bad['published_at']='2099-01-01T25:00:00+05:00'; rejects($bad,'Invalid time accepted.');
$bad=$fixture; $bad['published_at']='2099-01-01T23:00:00-05:00'; rejects($bad,'Wrong Pakistan date accepted.');
$bad=$fixture; $bad['stories'][]=$bad['stories'][0]; rejects($bad,'Duplicate IDs accepted.');
$bad=$fixture; $bad['stories'][0]['sources']=[]; rejects($bad,'Unsourced story accepted.');
$bad=$fixture; $bad['stories'][0]['sources'][0]['url']='javascript:alert(1)'; rejects($bad,'Unsafe source URL accepted.');
$bad=$fixture; $bad['stories'][0]['statistics'][0]['source']='Invented'; rejects($bad,'Unsourced number accepted.');
$bad=$fixture; unset($bad['stories'][0]['statistics'][0]['year']); rejects($bad,'Undated number accepted.');
$bad=$fixture; $bad['stories'][0]['statistics'][0]['value']=42; rejects($bad,'A number was silently converted into source wording.');
$minimal=$fixture; $minimal['stories']=[$fixture['stories'][1]]; check(ca_validate_dataset($minimal,true)===$minimal,'Missing optional sections failed.');
$root=dirname(__DIR__).'/content/current-affairs';
if (is_dir($root)) foreach (new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root,FilesystemIterator::SKIP_DOTS)) as $file) {
    if ($file->getExtension()==='json') ca_validate_dataset(json_decode(file_get_contents($file->getPathname()),true,64,JSON_THROW_ON_ERROR));
}
echo "Current affairs: PHP validation and source-integrity checks passed.\n";
