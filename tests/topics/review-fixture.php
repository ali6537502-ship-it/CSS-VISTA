<?php
declare(strict_types=1);
if(getenv('CI')!=='true'||getenv('CSSV_DB_NAME')!=='cssvista_briefing_test')throw new RuntimeException('Disposable database required.');
require_once __DIR__.'/../../public/api/_bootstrap_core.php';
$pdo=cssv_db();$q=$pdo->prepare('SELECT id,content_hash FROM pro_topic_versions WHERE id=?');$q->execute([$argv[1]??'']);$row=$q->fetch();if(!$row)exit;
$manifest=['version_id'=>$row['id'],'content_hash'=>$row['content_hash'],'status'=>'approved','author_ref'=>'TEST ONLY synthetic fixture author','reviewer_ref'=>'TEST ONLY separate synthetic reviewer','independent_approval_ref'=>'TEST ONLY — not real academic approval','approval_evidence_sha256'=>hash('sha256','TEST ONLY synthetic review evidence'),'source_review_ref'=>'TEST ONLY sources','assessment_review_ref'=>'TEST ONLY assessment','coverage_ref'=>'TEST ONLY bounded coverage','owner_authorization_ref'=>'TEST ONLY disposable publication','valid_until'=>'2099-01-01'];
$raw=json_encode($manifest,JSON_THROW_ON_ERROR);$id=hash('sha256',$raw);$root=rtrim(cssv_env('CSSV_PRIVATE_STORAGE_DIR'),'/').'/topic-reviews';if(!is_dir($root))mkdir($root,0700,true);file_put_contents($root.'/'.$id.'.json',$raw);chmod($root.'/'.$id.'.json',0600);echo $id;
