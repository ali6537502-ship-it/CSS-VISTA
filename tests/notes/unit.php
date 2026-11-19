<?php
declare(strict_types=1);
require_once dirname(__DIR__,2).'/public/api/_student_notes.php';

function cssv_note_test(bool $condition,string $message):void {
    if(!$condition)throw new RuntimeException('Notes unit test: '.$message);
}
function cssv_note_expect(string $type,callable $fn):void {
    try{$fn();throw new RuntimeException('Expected '.$type.' was not thrown.');}
    catch(Throwable $error){if(!($error instanceof $type))throw $error;}
}
$folders = [];
$parent = null;
for($level=1;$level<=5;$level++){
    $id='folder-'.$level;
    $folders[]=['id'=>$id,'parent_id'=>$parent,'deleted_at'=>null,'depth'=>$level,'name'=>'Level '.$level];
    $result=cssv_notes_move_depths($folders,null,$level<5?$id:'folder-4');
    cssv_note_test($result['new_depth']===min(5,$level+1),'folder depth computation');
    $parent=$id;
}
cssv_note_expect(InvalidArgumentException::class,fn()=>cssv_notes_move_depths($folders,null,'folder-5'));
cssv_note_expect(InvalidArgumentException::class,fn()=>cssv_notes_move_depths($folders,'folder-1','folder-3'));
cssv_note_expect(InvalidArgumentException::class,fn()=>cssv_notes_move_depths($folders,'folder-4','folder-5'));
$move=cssv_notes_move_depths($folders,'folder-4','folder-2');
cssv_note_test($move['updates']['folder-4']===3 && $move['updates']['folder-5']===4,'move preserves subtree depth');
$folders[1]['deleted_at']='2026-11-19';
cssv_note_expect(InvalidArgumentException::class,fn()=>cssv_notes_move_depths($folders,null,'folder-3'));
cssv_note_expect(InvalidArgumentException::class,fn()=>cssv_notes_id('../other-user'));
cssv_note_test(cssv_notes_id('00000000-0000-4000-8000-000000000001')==='00000000-0000-4000-8000-000000000001','UUID validation');
cssv_note_test(cssv_notes_title(" Note\n title ")==='Note title','title normalization');
cssv_note_expect(InvalidArgumentException::class,fn()=>cssv_notes_title(str_repeat('A',260)));
echo "Notes unit checks passed\n";
