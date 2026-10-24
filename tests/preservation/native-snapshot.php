<?php
declare(strict_types=1);
if(getenv('CI')!=='true'||getenv('CSSV_DB_NAME')!=='cssvista_briefing_test')throw new RuntimeException('Disposable synthetic database required.');
require_once __DIR__.'/../../public/api/_bootstrap_core.php';
require_once __DIR__.'/../../public/api/_workspace.php';
$pdo=cssv_db();$mode=$argv[1]??'digest';$version=$pdo->query('SELECT VERSION()')->fetchColumn();
if($mode==='digest'){
    $manifest=[];
    foreach($pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN) as $table){
        if(!preg_match('/^[a-z0-9_]+$/D',$table))throw new RuntimeException('Unexpected test table.');
        $rows=$pdo->query('SELECT * FROM `'.$table.'`')->fetchAll(PDO::FETCH_ASSOC);$encoded=[];
        foreach($rows as $row){ksort($row);$encoded[]=json_encode($row,JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE|JSON_INVALID_UTF8_SUBSTITUTE);}
        sort($encoded,SORT_STRING);$manifest[$table]=['rows'=>count($rows),'sha256'=>hash('sha256',implode("\n",$encoded))];
    }
    ksort($manifest);echo json_encode(['engine'=>$version,'tables'=>$manifest],JSON_THROW_ON_ERROR|JSON_PRETTY_PRINT)."\n";
}elseif($mode==='projections'){
    // Capture only safe plan metadata, never query parameters, source bodies or assessment keys.
    class WorkspacePlanStatement extends PDOStatement {
        public static array $plans=[];
        protected function __construct(private PDO $connection){}
        public function execute(?array $params=null): bool {
            $start=hrtime(true);$result=parent::execute($params);$ms=(hrtime(true)-$start)/1e6;
            if(str_starts_with($this->queryString,'SELECT * FROM (SELECT ')&&count(self::$plans)<12){
                $hash=hash('sha256',$this->queryString);
                $plan=$this->connection->prepare('EXPLAIN FORMAT=JSON '.$this->queryString);$plan->execute($params);
                self::$plans[$hash]=['query_sha256'=>$hash,'execute_ms'=>$ms,'plan'=>json_decode($plan->fetchColumn(),true,128,JSON_THROW_ON_ERROR)];
            }
            return $result;
        }
    }
    $pdo->setAttribute(PDO::ATTR_STATEMENT_CLASS,[WorkspacePlanStatement::class,[$pdo]]);
    $users=$pdo->query('SELECT user_id FROM grammar_learning_v5 GROUP BY user_id ORDER BY MAX(updated_at) DESC,user_id LIMIT 5')->fetchAll(PDO::FETCH_COLUMN);
    if(!$users)throw new RuntimeException('Seeded Grammar accounts required.');
    $results=[];
    foreach($users as $index=>$user){
        $cases=$index===0?[['view'=>'recent'],['view'=>'review'],['view'=>'search','q'=>'math'],['view'=>'search','state'=>'saved'],['view'=>'search','state'=>'unfinished'],['view'=>'search','from'=>'2002-03-04','to'=>'2002-03-04'],['view'=>'search','source'=>'current-affairs']]:[['view'=>'recent'],['view'=>'review']];
        foreach($cases as $input){$data=cssv_workspace_project($pdo,$user,cssv_workspace_filters($input));$results[]=['account_sha256'=>hash('sha256',$user),'filter'=>$input,'items'=>count($data['items']),'sha256'=>hash('sha256',json_encode($data,JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE))];}
    }
    echo json_encode(['engine'=>$version,'projections'=>$results,'plans'=>array_values(WorkspacePlanStatement::$plans)],JSON_THROW_ON_ERROR|JSON_PRETTY_PRINT)."\n";
}else throw new RuntimeException('Unknown snapshot mode.');
