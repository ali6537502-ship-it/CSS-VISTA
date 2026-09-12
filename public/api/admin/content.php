<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/_native_admin.php';cssv_require_method('POST');$pdo=cssv_db();native_owner($pdo);$body=cssv_request_json(4194304);$content=$body['content']??null;
if(!is_array($content)||array_is_list($content))cssv_fail('Provide the complete content object.',422,'invalid_content');
$allowed=['caTopics','css2027Dates','notifications2027','announcements','pastPapers','mcqs','countdown','homeCards','updates','mcqOverrides','categoryOverrides','mentorOverrides','priceOverrides'];
foreach($content as $key=>$value)if(!in_array($key,$allowed,true))cssv_fail('The content format is not supported.',422,'invalid_content');
try {$json=json_encode($content,JSON_THROW_ON_ERROR);$pdo->beginTransaction();$pdo->prepare('INSERT INTO site_content_versions(content) VALUES(?)')->execute([$json]);$pdo->prepare("INSERT INTO site_content(id,content) VALUES('published',?) ON DUPLICATE KEY UPDATE content=VALUES(content),updated_at=NOW(6)")->execute([$json]);$pdo->commit();cssv_json(['ok'=>true,'updated_at'=>gmdate('c')]);}
catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();error_log('CSSV content publishing failed: '.get_class($e));cssv_fail('Content could not be published. Your browser copy is retained.',503,'publish_failed');}
