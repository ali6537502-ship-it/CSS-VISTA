<?php
declare(strict_types=1);
require __DIR__.'/../../public/api/_bootstrap_core.php';
require __DIR__.'/../../public/api/_pro.php';
require __DIR__.'/../../public/api/_ai.php';
require __DIR__.'/../../public/api/_skills_ai.php';
require __DIR__.'/../../public/api/_expression.php';
require __DIR__.'/../../public/api/_precis_feedback.php';
require __DIR__.'/../../public/api/_tutor.php';
function check(bool $ok,string $message): void { if(!$ok)throw new RuntimeException($message); }
foreach(['CSSV_PRO_COLLECTION_ENABLED','CSSV_PRO_COLLECTION_APPROVED','CSSV_AI_ENABLED','CSSV_AI_APPROVED','CSSV_AI_MODEL_VERIFIED','CSSV_EXPRESSION_ENABLED','CSSV_SKILLS_AI_ENABLED','CSSV_TUTOR_ENABLED','CSSV_PRECISE_ENABLED'] as $flag)putenv($flag.'=1');
putenv('CSSV_OPENAI_API_KEY=TEST_ONLY_NO_PROVIDER_TOKEN_1234567890');
check(cssv_pro_release_paused()===false,'Retired launch gate hides free learning');
check(cssv_pro_product()['collection_enabled']===false&&cssv_pro_product()['retired']===true,'Payment flags can reopen checkout');
check(cssv_pro_product()['receiver_number']===null&&cssv_pro_product()['amount_minor']===0,'Retired product exposes a collection target');
check(cssv_ai_configuration()['configured']===false,'Old flags can reopen external processing');
foreach(array_keys(cssv_ai_features()) as $feature)check(cssv_ai_limit($feature)===0,'New paid/provider allowance is available');
check(cssv_skills_ai_configuration('sentence')['enabled']===false,'Sentence provider enabled');
check(cssv_expression_configuration()['enabled']===false,'Expression provider enabled');
check(cssv_precis_feedback_configuration()['enabled']===false,'Précis provider enabled');
check(cssv_tutor_configuration()['enabled']===false,'Tutor provider enabled');
check(cssv_handwriting_configuration()['enabled']===false,'Image provider enabled');
echo "PASS: free learning has no Pro launch dependency; code-level retirement overrides payment/provider configuration and all external allowances remain zero.\n";
