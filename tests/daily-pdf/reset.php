<?php
declare(strict_types=1);
if(getenv('CI')!=='true' || getenv('CSSV_DB_NAME')!=='cssvista_briefing_test') throw new RuntimeException('Isolated CI database required');
require dirname(__DIR__,2).'/public/api/_bootstrap_core.php';
require dirname(__DIR__,2).'/public/api/_daily_pdf.php';
$pdo=cssv_db(); dp_schema($pdo);
foreach(['daily_pdf_release_state','daily_pdf_overrides','daily_pdf_audit','daily_pdf_editions'] as $table) $pdo->exec('DELETE FROM '.$table);
$path=cssv_private_storage_dir('daily-pdf');
foreach(new RecursiveIteratorIterator(new RecursiveDirectoryIterator($path,FilesystemIterator::SKIP_DOTS),RecursiveIteratorIterator::CHILD_FIRST) as $entry) {
    if($entry->isDir()) rmdir($entry->getPathname()); else unlink($entry->getPathname());
}
echo "Reset isolated daily PDF fixtures only.\n";
