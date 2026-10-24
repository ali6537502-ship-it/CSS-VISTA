<?php
declare(strict_types=1);
require_once __DIR__.'/../../public/api/_pro_core.php';require_once __DIR__.'/../../public/api/_topics_review.php';
$m=['version_id'=>'test-edition','content_hash'=>str_repeat('a',64),'status'=>'approved','author_ref'=>'author','reviewer_ref'=>'independent reviewer','independent_approval_ref'=>'private review reference','approval_evidence_sha256'=>str_repeat('b',64),'source_review_ref'=>'source review','assessment_review_ref'=>'assessment review','coverage_ref'=>'coverage','owner_authorization_ref'=>'exact owner scope','valid_until'=>'2026-12-31'];
if(cssv_topic_review_check($m,'test-edition',str_repeat('a',64),'2026-10-23')!==$m)throw new RuntimeException('Valid dossier rejected.');
foreach([['content_hash'=>str_repeat('c',64)],['version_id'=>'other'],['reviewer_ref'=>'author'],['status'=>'draft'],['valid_until'=>'2026-10-22'],['independent_approval_ref'=>'']] as $change){$failed=false;try{cssv_topic_review_check(array_replace($m,$change),'test-edition',str_repeat('a',64),'2026-10-23');}catch(InvalidArgumentException|DomainException){$failed=true;}if(!$failed)throw new RuntimeException('Invalid review accepted.');}
echo "PASS: exact hash/edition, independent approval, freshness and required owner/review evidence gates.\n";
