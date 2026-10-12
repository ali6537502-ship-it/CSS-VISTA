<?php
declare(strict_types=1);
require_once __DIR__.'/../../public/api/_pro_release.php';
$initialCI=getenv('CI');$initialDB=getenv('CSSV_DB_NAME');$initialPause=getenv('CSSV_PRO_RELEASE_TEST_PAUSED');
try {
    foreach ([[null,null,true],['true','production',true],['false','cssvista_briefing_test',true],['true','cssvista_briefing_test',false]] as [$ci,$db,$expected]) {
        putenv($ci===null?'CI':'CI='.$ci);putenv($db===null?'CSSV_DB_NAME':'CSSV_DB_NAME='.$db);putenv('CSSV_PRO_RELEASE_TEST_PAUSED=0');
        if (cssv_pro_release_paused()!==$expected) throw new RuntimeException('Incorrect production/isolated preview posture.');
    }
    putenv('CSSV_PRO_RELEASE_TEST_PAUSED=1');if (!cssv_pro_release_paused()) throw new RuntimeException('Test hold ignored.');
    foreach (['skills','topics','handwriting-image','mentor','precis-feedback'] as $name) {
        if (!cssv_pro_release_student_endpoint('/api/student/'.$name.'.php') || cssv_pro_release_student_endpoint('/api/admin/'.$name.'.php')) throw new RuntimeException('Incorrect endpoint scope.');
    }
    foreach (['grammar','profile','learning','planner','membership','resources'] as $name) if (cssv_pro_release_student_endpoint('/api/student/'.$name.'.php')) throw new RuntimeException('Free/history endpoint suspended.');
    echo "PASS: production cannot use preview flags; only isolated CI authoring opens; forced pause and free/admin endpoint exclusions verified.\n";
} finally {
    foreach (['CI'=>$initialCI,'CSSV_DB_NAME'=>$initialDB,'CSSV_PRO_RELEASE_TEST_PAUSED'=>$initialPause] as $key=>$value) putenv($value===false?$key:$key.'='.$value);
}
