<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
require_once __DIR__.'/_bootstrap_core.php';
require_once __DIR__.'/_skills_ai.php';
require_once __DIR__.'/_expression.php';
require_once __DIR__.'/_precis_feedback.php';
require_once __DIR__.'/_tutor.php';
/** Read configuration only: never creates tables, dispatches AI or activates a flag. */
function cssv_pro_readiness(): array {
 $provider=cssv_ai_configuration();$key=cssv_env('CSSV_OPENAI_API_KEY','');
 $test=is_string($key)&&str_starts_with(strtoupper($key),'TEST');
 $handwriting=cssv_handwriting_configuration();
 return ['environment'=>getenv('CI')==='true'&&getenv('CSSV_DB_NAME')==='cssvista_briefing_test'?'ISOLATED_TEST_DATABASE':'NATIVE_CONFIGURATION_ONLY','release_paused'=>cssv_pro_release_paused(),'provider_configuration_asserted'=>$provider['configured']&&!$test,'test_configuration_detected'=>$test,
  'provider_access_verified_by_this_command'=>false,'academic_accuracy_verified_by_this_command'=>false,
  'features'=>['guided_skills'=>array_combine(['sentence','argument','analysis','essay'],array_map(fn($feature)=>cssv_skills_ai_configuration($feature)['enabled']&&!$test,['sentence','argument','analysis','essay'])),'expression'=>cssv_expression_configuration()['enabled']&&!$test,'precis'=>cssv_precis_feedback_configuration()['enabled']&&!$test,'ask_vista'=>cssv_tutor_configuration()['enabled']&&!$test,'handwriting'=>$handwriting['enabled']&&!$test],
  'new_allowances'=>array_combine(['argumentation','analysis','essay','handwriting','handwriting_extract'],array_map('cssv_ai_limit',['argumentation','analysis','essay','handwriting','handwriting_extract'])),
  'handwriting_retention_seconds'=>$handwriting['limits']['retention_seconds'],'collection_enabled'=>cssv_pro_product()['collection_enabled'],
  'required_external_evidence'=>['Actual account/model access and cost check','Reviewed feature-specific genuine feedback','Genuine handwriting samples and confirmed wording','Successful private-host cleanup execution','Owner-approved launch policies and separate release instruction']];
}
if(realpath((string)($_SERVER['SCRIPT_FILENAME']??''))===__FILE__)echo json_encode(cssv_pro_readiness(),JSON_PRETTY_PRINT|JSON_THROW_ON_ERROR)."\n";
