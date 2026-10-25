<?php
declare(strict_types=1);
function dp_schema(PDO $pdo): void {
    $pdo->exec("CREATE TABLE IF NOT EXISTS daily_pdf_release_state (id TINYINT PRIMARY KEY, fingerprint CHAR(64) NOT NULL, conflicts TEXT NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $pdo->exec("CREATE TABLE IF NOT EXISTS daily_pdf_editions (
      id VARCHAR(40) PRIMARY KEY, edition_date DATE NOT NULL UNIQUE, source VARCHAR(10) NOT NULL,
      metadata MEDIUMTEXT NOT NULL, revision INT NOT NULL DEFAULT 1, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX daily_pdf_date (edition_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $pdo->exec("CREATE TABLE IF NOT EXISTS daily_pdf_overrides (id VARCHAR(40) PRIMARY KEY, metadata MEDIUMTEXT NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $pdo->exec("CREATE TABLE IF NOT EXISTS daily_pdf_audit (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, edition_id VARCHAR(40) NOT NULL, actor VARCHAR(320) NOT NULL, action VARCHAR(30) NOT NULL, metadata MEDIUMTEXT NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX daily_pdf_audit_edition (edition_id,created_at)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
}
function dp_sync(PDO $pdo): void {
    if (!is_file(__DIR__.'/_daily_release/catalog.php')) return;
    if (!defined('CSSV_DAILY_RELEASE')) define('CSSV_DAILY_RELEASE', true);
    $GLOBALS['DP_CONFLICTS']=[];
    $fingerprint=hash_file('sha256',__DIR__.'/_daily_release/catalog.php');
    $records = require __DIR__.'/_daily_release/catalog.php';
    $pdo->beginTransaction();
    try {
        $pdo->exec("INSERT IGNORE INTO daily_pdf_release_state (id,fingerprint,conflicts) VALUES (1,'','[]')");
        $state=$pdo->query('SELECT fingerprint,conflicts FROM daily_pdf_release_state WHERE id=1 FOR UPDATE')->fetch();
        if(hash_equals($state['fingerprint'],$fingerprint)) { $GLOBALS['DP_CONFLICTS']=json_decode($state['conflicts'],true); $pdo->commit(); return; }
        foreach ($records as $r) {
            $q=$pdo->prepare('SELECT source,metadata FROM daily_pdf_editions WHERE id=? OR edition_date=? FOR UPDATE'); $q->execute([$r['id'],$r['date']]); $old=$q->fetch();
            if ($old && $old['source'] !== 'github') { $GLOBALS['DP_CONFLICTS'][]=$r['id'].': GitHub record conflicts with an admin edition. Edit the existing edition to replace it explicitly.'; continue; } // Admin identity always retained; surface conflict in admin.
            if ($old) { $prior=json_decode($old['metadata'],true); if ($r['version'] < $prior['version']) continue;
                if ($r['version'] === $prior['version'] && $r['sha256'] !== $prior['sha256']) { $GLOBALS['DP_CONFLICTS'][]=$r['id'].': Changed PDF requires an increased version.'; continue; }
            }
            $encoded=json_encode($r,JSON_THROW_ON_ERROR);
            if($old && $old['metadata']===$encoded) continue;
            $q=$pdo->prepare('INSERT INTO daily_pdf_editions (id,edition_date,source,metadata) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE metadata=VALUES(metadata),revision=revision+1,updated_at=UTC_TIMESTAMP()');
            $q->execute([$r['id'],$r['date'],'github',$encoded]);
            $pdo->prepare('INSERT INTO daily_pdf_audit (edition_id,actor,action,metadata) VALUES (?,?,?,?)')->execute([$r['id'],'github-release',$old?'github_updated':'github_created',$encoded]);
        }
        $pdo->prepare('UPDATE daily_pdf_release_state SET fingerprint=?,conflicts=? WHERE id=1')->execute([$fingerprint,json_encode($GLOBALS['DP_CONFLICTS'],JSON_THROW_ON_ERROR)]);
        $pdo->commit();
    } catch(Throwable $e) { $pdo->rollBack(); throw $e; }
}
function dp_path(array $r): string {
    if (!preg_match('~^\d{4}/\d{2}/daily-\d{4}-\d{2}-\d{2}-v\d+\.pdf$~',$r['file'] ?? '')) throw new RuntimeException('Invalid stored path');
    $base=($r['storage'] ?? $r['source'])==='admin' ? cssv_private_storage_dir('daily-pdf') : __DIR__.'/_daily_release';
    return $base.'/'.$r['file'];
}
function dp_available(array $r): bool {
    return in_array($r['status'],['published','scheduled'],true) && strtotime($r['publishedAt'])<=time() && is_file(dp_path($r)) && filesize(dp_path($r))===$r['size'];
}
function dp_records(PDO $pdo, bool $admin=false): array {
    $out=[];
    foreach($pdo->query('SELECT e.*,o.metadata override_metadata FROM daily_pdf_editions e LEFT JOIN daily_pdf_overrides o ON o.id=e.id ORDER BY edition_date DESC')->fetchAll() as $row) {
        $r=json_decode($row['metadata'],true,64,JSON_THROW_ON_ERROR);
        if($row['override_metadata']) $r=array_replace($r,json_decode($row['override_metadata'],true,64,JSON_THROW_ON_ERROR));
        $r['revision']=(int)$row['revision'];
        if ($admin || dp_available($r)) $out[]=$r;
    }
    return $out;
}
function dp_public(array $r): array {
    if(!empty($r['cover'])) $r['coverUrl']='/api/daily-pdf.php?cover='.rawurlencode($r['id']).'&v='.$r['version'];
    unset($r['file'],$r['storage'],$r['cover'],$r['coverStorage']);
    $r['pdfUrl']='/api/daily-pdf.php?file='.rawurlencode($r['id']).'&v='.$r['version'];
    $r['downloadUrl']=$r['pdfUrl'].'&download=1';
    return $r;
}
function dp_validate_upload(array $file): array {
    if (($file['error'] ?? -1)!==UPLOAD_ERR_OK) throw new InvalidArgumentException('Upload failed or exceeds the server upload limit. Select the PDF again.');
    $limit=(int)(cssv_env('CSSV_DAILY_MAX_BYTES') ?: 26214400);
    $tmp=$file['tmp_name']; $size=filesize($tmp);
    if (!is_uploaded_file($tmp) || $size<20 || $size>$limit) throw new InvalidArgumentException('PDF exceeds the configured size limit or is empty.');
    $data=file_get_contents($tmp);
    if ((new finfo(FILEINFO_MIME_TYPE))->file($tmp)!=='application/pdf' || !str_starts_with($data,'%PDF-') || !str_contains(substr($data,-2048),'%%EOF')) throw new InvalidArgumentException('Select a structurally valid PDF.');
    // Fail closed: qpdf is a real parser, rather than trusting extension/signature.
    $parser=cssv_env('CSSV_QPDF_PATH') ?: '/usr/bin/qpdf';
    if (!is_executable($parser) || !is_callable('exec')) throw new RuntimeException('PDF validation is unavailable. Configure the server qpdf parser before uploading.');
    exec(escapeshellarg($parser).' --check '.escapeshellarg($tmp).' 2>&1',$lines,$code);
    if ($code!==0) throw new InvalidArgumentException('The PDF failed structural validation. Export a fresh PDF and retry.');
    exec(escapeshellarg($parser).' --json '.escapeshellarg($tmp).' 2>/dev/null',$json,$code);
    $structure=json_decode(implode("\n",$json),true);
    if($code!==0 || !is_array($structure)) throw new InvalidArgumentException('Unable to inspect PDF structure.');
    $objects=json_encode($structure);
    if(preg_match('~/JavaScript|/JS["\s]|/Launch|/EmbeddedFiles|/RichMedia|/SubmitForm~',$objects)) throw new InvalidArgumentException('Active content and embedded files are not accepted.');
    return ['size'=>$size,'sha256'=>hash_file('sha256',$tmp),'pageCount'=>count($structure['pages'] ?? []) ?: null];
}

function dp_cover_path(array $r): string {
    if(!preg_match('~^daily-[0-9-]+-[a-f0-9]{32}\.png$~',$r['cover'] ?? '')) throw new RuntimeException('Invalid cover path');
    return (($r['coverStorage'] ?? '')==='admin' ? cssv_private_storage_dir('daily-pdf/covers') : __DIR__.'/_daily_release/covers').'/'.$r['cover'];
}
