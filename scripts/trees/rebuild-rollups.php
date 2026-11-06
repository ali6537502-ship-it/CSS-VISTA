<?php
declare(strict_types=1);

/**
 * One-time maintenance migration/rebuild for approved sapling and seed counters.
 * Requires a maintenance window: stop all planting/report/moderation writes first.
 * Run: CSSV_TREES_MAINTENANCE=1 CSSV_CONFIG_FILE=/private/config.php php scripts/trees/rebuild-rollups.php
 * Does not require or use an administrator password or session.
 */
if (PHP_SAPI!=='cli') { http_response_code(403); exit; }
if (getenv('CSSV_TREES_MAINTENANCE')!=='1') {
    fwrite(STDERR,"Set CSSV_TREES_MAINTENANCE=1 and stop online campaign writes before running.\n");
    exit(2);
}
require_once __DIR__.'/../../public/api/_bootstrap.php';
$db=cssv_db();
try {
    $db->beginTransaction();
    $db->exec('DELETE FROM tree_campaign_member_rollup');
    $db->exec('DELETE FROM tree_campaign_city_rollup');
    $db->exec("INSERT INTO tree_campaign_member_rollup(member_id,trees,seeds)
        SELECT member_id,
               COALESCE(SUM(CASE WHEN method='sapling' THEN quantity ELSE 0 END),0),
               COALESCE(SUM(CASE WHEN method='seed' THEN quantity ELSE 0 END),0)
        FROM tree_campaign_plantings
        WHERE status='approved'
        GROUP BY member_id");
    $db->exec("INSERT INTO tree_campaign_city_rollup(city,trees,seeds)
        SELECT city,
               COALESCE(SUM(CASE WHEN method='sapling' THEN quantity ELSE 0 END),0),
               COALESCE(SUM(CASE WHEN method='seed' THEN quantity ELSE 0 END),0)
        FROM tree_campaign_plantings
        WHERE status='approved'
        GROUP BY city");
    $source=$db->query("SELECT
        COALESCE(SUM(CASE WHEN method='sapling' THEN quantity ELSE 0 END),0) AS trees,
        COALESCE(SUM(CASE WHEN method='seed' THEN quantity ELSE 0 END),0) AS seeds
        FROM tree_campaign_plantings WHERE status='approved'")->fetch();
    $rollup=$db->query("SELECT COALESCE(SUM(trees),0) AS trees,COALESCE(SUM(seeds),0) AS seeds FROM tree_campaign_city_rollup")->fetch();
    if((int)$source['trees']!==(int)$rollup['trees'] || (int)$source['seeds']!==(int)$rollup['seeds']) throw new RuntimeException('Rollup totals do not match approved records. Database changes rolled back.');
    $members=(int)$db->query('SELECT COUNT(*) FROM tree_campaign_member_rollup')->fetchColumn();
    $cities=(int)$db->query('SELECT COUNT(*) FROM tree_campaign_city_rollup')->fetchColumn();
    $db->commit();
    echo "Rollups verified. Saplings: {$rollup['trees']}; seeds: {$rollup['seeds']}; contributors: {$members}; cities: {$cities}\n";
} catch(Throwable $e) {
    if($db->inTransaction())$db->rollBack();
    fwrite(STDERR,'Rollup rebuild failed: '.$e->getMessage()."\n");
    exit(1);
}
