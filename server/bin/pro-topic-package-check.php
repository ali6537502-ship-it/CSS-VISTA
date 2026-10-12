<?php
declare(strict_types=1);
// Read-only offline package checking. It never imports, reviews or publishes records.
require_once __DIR__.'/../../public/api/_learning_core.php';require_once __DIR__.'/../../public/api/_topics_core.php';
if(PHP_SAPI!=='cli')exit(1);
try{
 $path=$argv[1]??'';if($path==='')throw new InvalidArgumentException('Provide a private JSON package path.');
 $raw=file_get_contents($path==='-'?'php://stdin':$path);if($raw===false||strlen($raw)>8*1024*1024)throw new InvalidArgumentException('Use a readable bounded package.');
 $input=json_decode($raw,true,64,JSON_THROW_ON_ERROR);cssv_pro_fields($input,['topics']);
 if(!is_array($input['topics']??null)||!array_is_list($input['topics'])||count($input['topics'])<1||count($input['topics'])>200)throw new InvalidArgumentException('Provide a bounded topic list.');
 $ids=[];$sources=[];$sections=0;$questions=0;
 foreach($input['topics'] as $topic){$definition=cssv_topic_definition($topic);if(isset($ids[$definition['id']]))throw new InvalidArgumentException('Repeated topic identity.');$ids[$definition['id']]=cssv_topic_hash($definition);$sections+=count($definition['sections']);$questions+=count($definition['questions']);foreach($definition['sources'] as $source)$sources[$source['sha256']]=true;}
 echo json_encode(['status'=>'STRUCTURE_VALID_NOT_PUBLISHED','package_sha256'=>hash('sha256',$raw),'topics'=>count($ids),'sections'=>$sections,'fixed_questions'=>$questions,'unique_source_checksums'=>count($sources),'content_versions'=>$ids,'academic_review'=>'Required separately: source fidelity, dated factual/reference verification, answer/distractor review and authenticated administrator approval. Schema validity alone is not academic approval.'],JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR)."\n";
}catch(Throwable $e){fwrite(STDERR,'Topic package check failed: '.$e->getMessage()."\n");exit(1);}
