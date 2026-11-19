<?php
declare(strict_types=1);
// Disposable CI MySQL database ONLY; never invoke with live account credentials.
$dsn=getenv('CSSV_NOTES_TEST_DSN')?:'';
if($dsn!=='mysql:host=127.0.0.1;port=3306;dbname=cssvista_notes_test;charset=utf8mb4') {
    fwrite(STDERR,"Refusing to run notes integration tests outside the exact disposable MySQL fixture.\n");
    exit(2);
}
require_once dirname(__DIR__,2).'/public/api/_student_notes.php';
function cssv_uuid_v4():string{
    $b=random_bytes(16);$b[6]=chr((ord($b[6])&15)|64);$b[8]=chr((ord($b[8])&63)|128);
    $x=bin2hex($b);
    return substr($x,0,8).'-'.substr($x,8,4).'-'.substr($x,12,4).'-'.substr($x,16,4).'-'.substr($x,20,12);
}
function check(bool $condition,string $label):void{if(!$condition)throw new RuntimeException('FAILED: '.$label);}
function rejects(callable $fn,string $type,string $label):void{
    try{$fn();throw new RuntimeException('Expected error not thrown: '.$label);}
    catch(Throwable $e){if(!$e instanceof $type)throw $e;}
}
$pdo=new PDO($dsn,getenv('CSSV_NOTES_TEST_USER')?:'root',getenv('CSSV_NOTES_TEST_PASSWORD')?:'',[
    PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES=>false
]);
$pdo->exec("CREATE TABLE IF NOT EXISTS users(id CHAR(36) PRIMARY KEY) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
cssv_notes_schema($pdo);
$userA=cssv_uuid_v4();$userB=cssv_uuid_v4();
$pdo->prepare('INSERT INTO users(id) VALUES(?),(?)')->execute([$userA,$userB]);
$parent=null;
for($level=1;$level<=5;$level++){
    $result=cssv_notes_mutate($pdo,$userA,['action'=>'folder_create','name'=>'Level '.$level,'parent_id'=>$parent]);
    $parent=$result['id'];
}
$folder5=$parent;
check(count(cssv_notes_folders($pdo,$userA))===5,'five folders saved');
rejects(fn()=>cssv_notes_mutate($pdo,$userA,['action'=>'folder_create','name'=>'Too deep','parent_id'=>$folder5]),InvalidArgumentException::class,'level six rejected');
rejects(fn()=>cssv_notes_mutate($pdo,$userB,['action'=>'folder_create','name'=>'Attack','parent_id'=>$folder5]),InvalidArgumentException::class,'cross-account parent rejected');
$note=cssv_notes_mutate($pdo,$userA,['action'=>'note_create','folder_id'=>$folder5,'title'=>'Constitutional Development']);
$pageId=$note['page_id'];
check(count(cssv_notes_detail($pdo,$userA,$note['id'])['pages'])===1,'page created in fifth-level folder');
rejects(fn()=>cssv_notes_detail($pdo,$userB,$note['id']),OutOfBoundsException::class,'other student note denied');
rejects(fn()=>cssv_notes_own_page($pdo,$userB,$pageId),OutOfBoundsException::class,'other student page denied');
$firstSave=cssv_notes_mutate($pdo,$userA,['action'=>'page_save','id'=>$pageId,'version'=>1,'request_id'=>cssv_uuid_v4(),'html'=>'<p><strong>Important content</strong></p>']);
check($firstSave['version']===2,'page saved');
$request=cssv_uuid_v4();
$bigHtml='<p>'.str_repeat('Extensive constitutional analysis and examples. ',6000).'</p>';
$large=cssv_notes_mutate($pdo,$userA,['action'=>'page_save','id'=>$pageId,'version'=>2,'request_id'=>$request,'html'=>$bigHtml]);
check($large['version']===3,'large page saved');
$replay=cssv_notes_mutate($pdo,$userA,['action'=>'page_save','id'=>$pageId,'version'=>2,'request_id'=>$request,'html'=>$bigHtml]);
check(($replay['replayed']??false)===true && $replay['version']===3,'network retry idempotency');
rejects(fn()=>cssv_notes_mutate($pdo,$userA,['action'=>'page_save','id'=>$pageId,'version'=>2,'request_id'=>cssv_uuid_v4(),'html'=>'overwrite']),DomainException::class,'cross-device overwrite rejected');
rejects(fn()=>cssv_notes_mutate($pdo,$userB,['action'=>'page_save','id'=>$pageId,'version'=>3,'request_id'=>cssv_uuid_v4(),'html'=>'steal']),OutOfBoundsException::class,'other student write denied');
check(count(cssv_notes_page_history($pdo,$userA,$pageId)['revisions'])===2,'revisions retained');
$restored=cssv_notes_mutate($pdo,$userA,['action'=>'page_restore_revision','id'=>$pageId,'version'=>3,'revision'=>2,'request_id'=>cssv_uuid_v4()]);
check($restored['version']===4,'history restores to newer version');
check(cssv_notes_own_page($pdo,$userA,$pageId)['content_html']==='<p><strong>Important content</strong></p>','restored content matches');
check(count(cssv_notes_page_history($pdo,$userA,$pageId)['revisions'])===3,'explicit restoration snapshots overwritten current version');
$undone=cssv_notes_mutate($pdo,$userA,['action'=>'page_restore_revision','id'=>$pageId,'version'=>4,'revision'=>3,'request_id'=>cssv_uuid_v4()]);
check($undone['version']===5,'restoration can be undone');
check(cssv_notes_own_page($pdo,$userA,$pageId)['content_html']===$bigHtml,'current content recovered after undo');
$page2=cssv_notes_mutate($pdo,$userA,['action'=>'page_create','note_id'=>$note['id']]);
check($page2['position']===2,'second page creation');
cssv_notes_mutate($pdo,$userA,['action'=>'page_trash','id'=>$page2['id']]);
check(cssv_notes_own_page($pdo,$userA,$page2['id'])['deleted_at']!==null,'page soft deletion');
rejects(fn()=>cssv_notes_mutate($pdo,$userA,['action'=>'page_trash','id'=>$pageId]),InvalidArgumentException::class,'last remaining page protected');
cssv_notes_mutate($pdo,$userA,['action'=>'note_trash','id'=>$note['id']]);
check(cssv_notes_own_note($pdo,$userA,$note['id'])['deleted_at']!==null,'note soft deletion');
cssv_notes_mutate($pdo,$userA,['action'=>'note_restore','id'=>$note['id']]);
check(cssv_notes_own_note($pdo,$userA,$note['id'])['deleted_at']===null,'note restoration');
$other=cssv_notes_mutate($pdo,$userB,['action'=>'note_create','title'=>'Private student B']);
check(count(cssv_notes_list($pdo,$userB,[])['notes'])===1,'list contains only own notes');
check(count(cssv_notes_list($pdo,$userA,[])['notes'])===1,'A cannot see B note');
check(count(cssv_notes_list($pdo,$userA,['folder'=>$folder5])['notes'])===1,'folder-specific paging contains its own note');
check(count(cssv_notes_list($pdo,$userA,['folder'=>'root'])['notes'])===0,'root browsing excludes nested notes');
check(count(cssv_notes_list($pdo,$userA,['search'=>'Constitutional'])['notes'])===1,'search sees subject notes across folders');
echo "Notes MySQL integration passed: ownership, deep folders, large pages, conflict, revisions, trash and recovery.\n";
