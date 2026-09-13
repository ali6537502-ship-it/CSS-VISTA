<?php
declare(strict_types=1);
require_once __DIR__.'/_bootstrap.php';cssv_require_method('GET');
try {$q=cssv_db()->query("SELECT content,updated_at FROM site_content WHERE id='published'");$row=$q->fetch();if($row)$row['content']=json_decode($row['content'],false,64,JSON_THROW_ON_ERROR);cssv_json(['data'=>$row?:null]);}
catch(Throwable){cssv_fail('Published content is temporarily unavailable.',503,'content_unavailable');}
