<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/_native_admin.php';cssv_require_method('GET','PATCH');$pdo=cssv_db();native_owner($pdo);
if($_SERVER['REQUEST_METHOD']==='GET') {
    $rows=$pdo->query('SELECT * FROM custom_test_series_requests ORDER BY created_at DESC LIMIT 1000')->fetchAll();foreach($rows as &$row){$row['subjects']=json_decode($row['subjects'],true);$row['schedule']=json_decode($row['schedule'],true);foreach(['test_count','duration_days','gap_days','unit_price','total_fee'] as $key)if($row[$key]!==null)$row[$key]=(int)$row[$key];}unset($row);cssv_json(['requests'=>$rows]);
}
$body=cssv_request_json();$id=native_text($body['request_id']??null,180,true);$status=$body['status']??null;
if(!in_array($status,['submitted','contacted','approved','completed','cancelled'],true))cssv_fail('Choose a valid status.',422,'invalid_status');
$pdo->prepare('UPDATE custom_test_series_requests SET status=? WHERE request_id=?')->execute([$status,$id]);cssv_json(['ok'=>true]);
