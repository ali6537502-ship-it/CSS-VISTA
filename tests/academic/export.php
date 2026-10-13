<?php
declare(strict_types=1);
// Read-only review utility. No provider calls, schema creation, fake response or quota changes.
if(PHP_SAPI!=='cli')exit;
require_once __DIR__.'/../../public/api/_bootstrap_core.php';
require_once __DIR__.'/../../public/api/_skills_ai.php';
require_once __DIR__.'/../../public/api/_precis_feedback_core.php';
require_once __DIR__.'/../../public/api/_tutor_core.php';
function cssv_academic_packet(array $case,array $op,array $input): array {
 $scope=['argument'=>'argumentation','analysis'=>'analysis','essay'=>'essay','sentence'=>'sentence','paragraph'=>'paragraph','precis'=>'precis','tutor'=>'tutor','handwriting_extract'=>'handwriting_extract'];
 if(($scope[$case['feature']]??null)!==$op['feature']||$op['state']!=='succeeded')throw new InvalidArgumentException('Use a successful operation for this exact feature.');
 if(!preg_match('/^resp_[A-Za-z0-9_-]+$/D',(string)($op['provider_response_id']??''))||preg_match('/TEST|fixture|synthetic/i',(string)($op['model']??'').(string)($op['reported_model']??'').(string)($op['provider_response_id']??'')))throw new InvalidArgumentException('Test transports cannot establish genuine provider evidence.');
 if($case['feature']==='handwriting_extract')throw new InvalidArgumentException('Complete the genuine-image/ground-truth review before exporting an OCR case.');
 if($op['prompt_version']==='skills-instruction-v1'){
  if(($input['level']??null)!==$case['level']||($input['stage']??null)!==$case['stage'])throw new InvalidArgumentException('Use the reviewed learning level and saved activity.');
  if(isset($case['context']['lesson_id'])&&($input['source']['id']??null)!==$case['context']['lesson_id'])throw new InvalidArgumentException('The reviewed lesson context differs.');
 }elseif(isset($case['context']['lesson_id']))throw new InvalidArgumentException('Use the source-bound guided feedback operation.');
 if($case['feature']==='tutor'&&($input['context']['id']??null)!==$case['context']['context_id'])throw new InvalidArgumentException('Use the reviewed tutor source identity.');
 $actual=$input['responses'][$case['stage']??'']??($case['feature']==='tutor'?($input['question']??null):($input['student_text']??null));
 if($actual!==$case['student_text'])throw new InvalidArgumentException('The saved operation does not match this reviewed student response.');
 if($case['feature']==='precis'&&(($input['original']??null)!==$case['context']['passage']||($input['title']??null)!==$case['context']['title']))throw new InvalidArgumentException('Review the exact original passage and title.');
 if($case['feature']==='essay'&&($input['source']['id']??null)!==$case['context']['theme'])throw new InvalidArgumentException('The saved theme differs from this reviewed case.');
 if($case['feature']==='tutor'&&!str_contains((string)($input['context']['authoritative_text']??$input['context']['text']??''),$case['context']['source_text']))throw new InvalidArgumentException('The bounded tutor source differs from the reviewed source.');
 $result=is_string($op['result'])?json_decode($op['result'],true,64,JSON_THROW_ON_ERROR):$op['result'];
 $validated=match($op['prompt_version']){
  'skills-instruction-v1'=>cssv_skills_ai_result(array_intersect_key($result,array_flip(['summary','findings','criteria','evidence_flags','next_question'])),$input),
  'precis-source-v1'=>cssv_precis_feedback_result(array_intersect_key($result,array_flip(['summary','findings','skills','central_idea_note'])),$input),
  default=>$case['feature']==='tutor'?cssv_tutor_result($result,$input):cssv_writing_result($result,$input['student_text'])
 };
 return ['status'=>'REQUIRES_HUMAN_ACADEMIC_REVIEW','case_id'=>$case['id'],'case_version'=>'pro-academic-cases-2026-10-v1','operation_id'=>$op['id'],'provider_response_id'=>$op['provider_response_id'],'configured_model'=>$op['model'],'reported_model'=>$op['reported_model'],
  'tokens'=>array_intersect_key($op,array_flip(['input_tokens','output_tokens','cached_tokens'])),'source_snapshot'=>$input,'validated_feedback'=>$validated,'expectations'=>$case['review_expectations'],'unacceptable_behavior'=>$case['unacceptable_behavior'],
  'human_review'=>['reviewer'=>null,'meaning_preserved'=>null,'academically_correct'=>null,'actionable_hint'=>null,'evidence_boundaries_respected'=>null,'premature_solution_avoided'=>null,'notes'=>null],
  'release_approval'=>false];
}
if(realpath((string)($_SERVER['SCRIPT_FILENAME']??''))!==__FILE__)return;
try{
 if(count($argv)!==5)throw new InvalidArgumentException('Usage: php tests/academic/export.php USER_UUID OPERATION_UUID CASE_ID PRIVATE_OUTPUT_JSON');
 $user=cssv_pro_id($argv[1]);$id=cssv_pro_id($argv[2]);$cases=json_decode((string)file_get_contents(__DIR__.'/cases.json'),true,64,JSON_THROW_ON_ERROR)['cases'];$case=null;foreach($cases as $c)if($c['id']===$argv[3]){$case=$c;break;}if(!$case)throw new InvalidArgumentException('Choose a reviewed case.');
 $pdo=cssv_db();$q=$pdo->prepare('SELECT * FROM ai_operations WHERE id=? AND user_id=?');$q->execute([$id,$user]);$op=$q->fetch();if(!$op)throw new OutOfBoundsException('Owned operation not found.');
 $table=match($op['prompt_version']){'skills-instruction-v1'=>'skills_ai_inputs','precis-source-v1'=>'precis_feedback_inputs',default=>$op['feature']==='tutor'?'tutor_requests':null};
 if($table){$q=$pdo->prepare("SELECT input FROM $table WHERE operation_id=?");$q->execute([$id]);$raw=$q->fetchColumn();if(!$raw)throw new OutOfBoundsException('Saved source context not found.');$input=json_decode($raw,true,64,JSON_THROW_ON_ERROR);}
 else{$q=$pdo->prepare('SELECT v.text FROM writing_versions v JOIN writing_records w ON w.id=v.writing_id WHERE v.id=? AND w.user_id=?');$q->execute([$op['version_id'],$user]);$text=$q->fetchColumn();if(!is_string($text))throw new OutOfBoundsException('Owned writing not found.');$input=['student_text'=>$text];}
 $packet=cssv_academic_packet($case,$op,$input);$dir=realpath(dirname($argv[4]));$private=realpath((string)cssv_env('CSSV_PRIVATE_STORAGE_DIR',''));$repo=realpath(__DIR__.'/../..');$web=realpath((string)($_SERVER['DOCUMENT_ROOT']??''));if(!$dir||!$private||!($dir===$private||str_starts_with($dir,$private.DIRECTORY_SEPARATOR))||$dir===$repo||str_starts_with($dir,$repo.DIRECTORY_SEPARATOR)||($web&&($dir===$web||str_starts_with($dir,$web.DIRECTORY_SEPARATOR)))||is_link($argv[4]))throw new InvalidArgumentException('Choose an existing directory under configured private storage, outside the repository and webroot.');
 $output=$dir.'/'.basename($argv[4]);$encoded=json_encode($packet,JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR)."\n";$handle=fopen($output,'xb');if(!$handle)throw new RuntimeException('A review packet already exists or cannot be created.');try{if(!chmod($output,0600)||fwrite($handle,$encoded)!==strlen($encoded))throw new RuntimeException('Private export failed.');}finally{fclose($handle);}
 echo "Exported private packet; human academic review and release approval remain required. No AI request was made.\n";
}catch(Throwable $e){fwrite(STDERR,"Review export unavailable: ".$e->getMessage()."\n");exit(2);}
