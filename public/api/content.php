<?php
declare(strict_types=1);
require_once __DIR__.'/_bootstrap.php';require_once __DIR__.'/_premium.php';cssv_require_method('GET');
try {$pdo=cssv_db();$q=$pdo->query("SELECT content,updated_at FROM site_content WHERE id='published'");$row=$q->fetch();if($row){$row['content']=json_decode($row['content'],false,64,JSON_THROW_ON_ERROR);if(is_object($row['content']))$row['content']=cssv_premium_public_content($pdo,$row['content']);}cssv_json(['data'=>$row?:null]);}
catch(Throwable){cssv_fail('Published content is temporarily unavailable.',503,'content_unavailable');}
