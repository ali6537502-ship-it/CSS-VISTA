<?php
declare(strict_types=1);

/**
 * Punjab 100 Million Trees — separately authenticated, moderated campaign.
 * All personally identifying data and photographic evidence remains private.
 * Counters and rankings include ONLY human-approved records.
 */
require_once dirname(__DIR__) . '/_bootstrap.php';

const TREE_SESSION = 'cssv_tree_session';
const TREE_CSRF = 'cssv_tree_csrf';
const TREE_TARGET = 100000000;
const TREE_MAX_PROOF = 71680;
const TREE_MAX_AVATAR = 40960;

function tree_species(): array {
    // Sources: Punjab Urban and Peri-Urban Forest Policy, Punjab Forest Department.
    return [
        'neem'=>['name'=>'Neem','scientific'=>'Azadirachta indica','category'=>'shade'],
        'shisham'=>['name'=>'Shisham / Tahli','scientific'=>'Dalbergia sissoo','category'=>'shade'],
        'kikar'=>['name'=>'Kikar / Babul','scientific'=>'Acacia nilotica','category'=>'dryland'],
        'amaltas'=>['name'=>'Amaltas','scientific'=>'Cassia fistula','category'=>'flowering'],
        'peepal'=>['name'=>'Peepal','scientific'=>'Ficus religiosa','category'=>'shade'],
        'siris'=>['name'=>'Siris','scientific'=>'Albizia lebbeck','category'=>'shade'],
        'jamun'=>['name'=>'Jamun','scientific'=>'Syzygium cumini','category'=>'fruit'],
        'ber'=>['name'=>'Ber','scientific'=>'Ziziphus mauritiana','category'=>'fruit'],
        'mango'=>['name'=>'Mango','scientific'=>'Mangifera indica','category'=>'fruit'],
        'mulberry'=>['name'=>'Mulberry / Shahtoot','scientific'=>'Morus alba','category'=>'fruit'],
        'kachnar'=>['name'=>'Kachnar','scientific'=>'Bauhinia variegata','category'=>'flowering'],
        'arjun'=>['name'=>'Arjun','scientific'=>'Terminalia arjuna','category'=>'shade'],
        'lasura'=>['name'=>'Lasura','scientific'=>'Cordia myxa','category'=>'fruit'],
        'sohanjana'=>['name'=>'Sohanjana','scientific'=>'Moringa oleifera','category'=>'dryland'],
        'dhak'=>['name'=>'Dhak / Palash','scientific'=>'Butea monosperma','category'=>'flowering'],
        'pilkhan'=>['name'=>'Pilkhan','scientific'=>'Ficus virens','category'=>'shade'],
        'semal'=>['name'=>'Semal / Simbal','scientific'=>'Bombax ceiba','category'=>'flowering'],
        'amla'=>['name'=>'Amla','scientific'=>'Phyllanthus emblica','category'=>'fruit'],
        'karanj'=>['name'=>'Karanj','scientific'=>'Pongamia pinnata','category'=>'shade'],
        'banyan'=>['name'=>'Banyan / Bohar','scientific'=>'Ficus benghalensis','category'=>'shade'],
    ];
}

function tree_schema(PDO $db): void {
    static $ready = false;
    if ($ready) return;
    $db->exec("CREATE TABLE IF NOT EXISTS tree_campaign_members (
        id CHAR(36) PRIMARY KEY,
        full_name VARCHAR(100) NOT NULL,
        mobile VARCHAR(16) NOT NULL,
        cnic_hash CHAR(64) NOT NULL,
        cnic_last4 CHAR(4) NOT NULL,
        city VARCHAR(70) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        recovery_hash CHAR(64) NULL,
        avatar_path VARCHAR(240) NULL,
        avatar_mime VARCHAR(20) NULL,
        public_name TINYINT(1) NOT NULL DEFAULT 0,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        UNIQUE KEY uq_tree_mobile (mobile),
        UNIQUE KEY uq_tree_cnic (cnic_hash)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    $db->exec("CREATE TABLE IF NOT EXISTS tree_campaign_sessions (
        id CHAR(36) PRIMARY KEY,
        member_id CHAR(36) NOT NULL,
        token_hash CHAR(64) NOT NULL,
        csrf_hash CHAR(64) NOT NULL,
        expires_at DATETIME(6) NOT NULL,
        revoked_at DATETIME(6) NULL,
        UNIQUE KEY uq_tree_session_token (token_hash),
        INDEX idx_tree_session_member (member_id),
        INDEX idx_tree_session_expiry (expires_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    $db->exec("CREATE TABLE IF NOT EXISTS tree_campaign_plantings (
        id CHAR(36) PRIMARY KEY,
        member_id CHAR(36) NOT NULL,
        species VARCHAR(40) NOT NULL,
        method ENUM('sapling','seed') NOT NULL,
        quantity SMALLINT UNSIGNED NOT NULL,
        planted_on DATE NOT NULL,
        city VARCHAR(70) NOT NULL,
        locality VARCHAR(120) NOT NULL,
        proof_path VARCHAR(240) NOT NULL,
        proof_mime VARCHAR(20) NOT NULL,
        proof_hash CHAR(64) NOT NULL,
        proof_phash CHAR(16) NULL,
        duplicate_risk TINYINT(1) NOT NULL DEFAULT 0,
        field_checked TINYINT(1) NOT NULL DEFAULT 0,
        field_visit_date DATE NULL,
        public_photo TINYINT(1) NOT NULL DEFAULT 0,
        status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
        reviewer_id CHAR(36) NULL,
        reviewed_at DATETIME(6) NULL,
        review_note VARCHAR(400) NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        UNIQUE KEY uq_tree_proof (proof_hash),
        INDEX idx_tree_perceptual (proof_phash),
        INDEX idx_tree_member_status (member_id,status),
        INDEX idx_tree_public_summary (status,method,city),
        INDEX idx_tree_review_queue (status,created_at),
        INDEX idx_tree_gallery (status,public_photo,reviewed_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    $db->exec("CREATE TABLE IF NOT EXISTS tree_campaign_member_rollup (
        member_id CHAR(36) NOT NULL PRIMARY KEY,
        trees BIGINT UNSIGNED NOT NULL DEFAULT 0,
        seeds BIGINT UNSIGNED NOT NULL DEFAULT 0,
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        INDEX idx_tree_rank (trees)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    $db->exec("CREATE TABLE IF NOT EXISTS tree_campaign_city_rollup (
        city VARCHAR(70) NOT NULL PRIMARY KEY,
        trees BIGINT UNSIGNED NOT NULL DEFAULT 0,
        seeds BIGINT UNSIGNED NOT NULL DEFAULT 0,
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    $db->exec("CREATE TABLE IF NOT EXISTS tree_campaign_reviews (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        planting_id CHAR(36) NOT NULL,
        admin_id CHAR(36) NOT NULL,
        decision ENUM('approved','rejected','revoked') NOT NULL,
        review_note VARCHAR(400) NOT NULL,
        field_checked TINYINT(1) NOT NULL DEFAULT 0,
        field_visit_date DATE NULL,
        reviewed_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        INDEX idx_tree_review_audit (planting_id,reviewed_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    $db->exec("CREATE TABLE IF NOT EXISTS tree_campaign_rate_events (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        ip_hash CHAR(64) NOT NULL,
        subject_hash CHAR(64) NULL,
        action VARCHAR(28) NOT NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        INDEX idx_tree_rate_ip (action,ip_hash,created_at),
        INDEX idx_tree_rate_subject (action,subject_hash,created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    // Backward-compatible schema changes: this PR has not been deployed,
    // but staging databases from earlier revisions must also be safe.
    $changes = [
        'tree_campaign_members' => [
            'recovery_hash' => 'ADD COLUMN recovery_hash CHAR(64) NULL',
        ],
        'tree_campaign_plantings' => [
            'proof_phash' => 'ADD COLUMN proof_phash CHAR(16) NULL',
            'duplicate_risk' => 'ADD COLUMN duplicate_risk TINYINT(1) NOT NULL DEFAULT 0',
            'field_checked' => 'ADD COLUMN field_checked TINYINT(1) NOT NULL DEFAULT 0',
            'field_visit_date' => 'ADD COLUMN field_visit_date DATE NULL',
        ],
    ];
    foreach ($changes as $table => $columns) {
        foreach ($columns as $column => $ddl) {
            $check=$db->prepare("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?");
            $check->execute([$table,$column]);
            if ((int)$check->fetchColumn() === 0) $db->exec('ALTER TABLE '.$table.' '.$ddl);
        }
    }
    $ready = true;
}
function tree_origin(): void {
    $origin = rtrim((string)($_SERVER['HTTP_ORIGIN']??''),'/');
    $allowed = rtrim((string)cssv_env('CSSV_SITE_ORIGIN','https://www.css-vista.com'),'/');
    if ($origin !== '' && !hash_equals($origin,$allowed)) cssv_fail('Invalid request origin.',403,'invalid_origin');
    $fetchSite = strtolower((string)($_SERVER['HTTP_SEC_FETCH_SITE']??''));
    if ($fetchSite === 'cross-site') cssv_fail('Cross-site requests are not permitted.',403,'invalid_origin');
    if ($origin === '' && $fetchSite === '') {
        $referer=(string)($_SERVER['HTTP_REFERER']??'');
        if ($referer !== '' && !str_starts_with($referer,$allowed.'/')) cssv_fail('Invalid request referrer.',403,'invalid_origin');
    }
}
function tree_rate(PDO $db, string $action, string $subject, int $limit, int $seconds): void {
    $ip=cssv_hash_secret(cssv_ip_prefix());
    $target=cssv_hash_secret($subject);
    $since=gmdate('Y-m-d H:i:s',time()-$seconds);
    $q=$db->prepare('SELECT COUNT(*) FROM tree_campaign_rate_events WHERE action=? AND created_at>=? AND (ip_hash=? OR subject_hash=?)');
    $q->execute([$action,$since,$ip,$target]);
    if ((int)$q->fetchColumn()>=$limit) cssv_fail('Too many attempts. Please try again later.',429,'rate_limited');
    $db->prepare('INSERT INTO tree_campaign_rate_events(ip_hash,subject_hash,action) VALUES(?,?,?)')->execute([$ip,$target,$action]);
    // Opportunistic bounded cleanup of expired security records keeps the table small.
    if (random_int(1,128)===1) {
        $db->exec('DELETE FROM tree_campaign_rate_events WHERE created_at<DATE_SUB(NOW(6),INTERVAL 14 DAY) LIMIT 500');
        $db->exec('DELETE FROM tree_campaign_sessions WHERE expires_at<DATE_SUB(NOW(6),INTERVAL 30 DAY) LIMIT 250');
    }
}
function tree_string(mixed $raw, string $label, int $min, int $max): string {
    if (!is_string($raw)) cssv_fail('Please enter '.$label.'.',422,'invalid_field');
    $value=trim(preg_replace('/\s+/u',' ',$raw)??'');
    $len=mb_strlen($value,'UTF-8');
    if ($len<$min || $len>$max || preg_match('/[<>{}\x00-\x1f]/u',$value)) cssv_fail('Please enter a valid '.$label.'.',422,'invalid_field');
    return $value;
}
function tree_allowed_cities(): array {
    return [
        'Lahore','Faisalabad','Rawalpindi','Multan','Gujranwala','Sialkot',
        'Sargodha','Bahawalpur','Rahim Yar Khan','Dera Ghazi Khan','Sahiwal',
        'Okara','Jhelum','Kasur','Sheikhupura','Mianwali','Bhakkar','Chakwal',
        'Jhang','Khanewal','Lodhran','Vehari','Muzaffargarh','Attock','Narowal',
        'Gujrat','Hafizabad','Toba Tek Singh','Chiniot','Bahawalnagar','Rajanpur',
        'Layyah','Pakpattan','Nankana Sahib','Khushab','Mandi Bahauddin',
        'Jampur','Murree','Wah Cantt','Kot Addu','Shakargarh'
    ];
}
function tree_mobile(mixed $raw): string {
    $value=preg_replace('/[\s-]/','',(string)$raw);
    if (preg_match('/^03[0-9]{9}$/D',$value)) return '+92'.substr($value,1);
    if (preg_match('/^\+923[0-9]{9}$/D',$value)) return $value;
    cssv_fail('Enter a valid Pakistani mobile number.',422,'invalid_mobile');
}
function tree_cnic(mixed $raw): string {
    $value=preg_replace('/[\s-]/','',(string)$raw);
    if (!preg_match('/^[0-9]{13}$/D',$value)) cssv_fail('Enter a 13-digit CNIC.',422,'invalid_cnic');
    return $value;
}
function tree_password(mixed $raw): string {
    if (!is_string($raw) || strlen($raw)<12 || strlen($raw)>72 || str_contains($raw,"\0")) cssv_fail('Choose a password containing 12–72 characters.',422,'invalid_password');
    return $raw;
}
function tree_recovery_new(): string {
    // Static offline recovery key; not an OTP or an SMS verification service.
    return 'TREE-' . strtoupper(bin2hex(random_bytes(24)));
}
function tree_recovery_hash(string $key): string {
    return cssv_hash_secret('tree-recovery:' . strtoupper($key));
}
function tree_login_json(): array {
    if (!preg_match('~^application/json(?:\s*;|$)~i',(string)($_SERVER['CONTENT_TYPE']??''))) cssv_fail('Use a JSON request.',415,'invalid_type');
    return cssv_request_json(12000);
}
function tree_issue(PDO $db, string $id): string {
    $token=rtrim(strtr(base64_encode(random_bytes(48)),'+/','-_'),'=');
    $csrf=rtrim(strtr(base64_encode(random_bytes(32)),'+/','-_'),'=');
    $expiry=time()+14*86400;
    $db->prepare('INSERT INTO tree_campaign_sessions (id,member_id,token_hash,csrf_hash,expires_at) VALUES(?,?,?,?,?)')
        ->execute([cssv_uuid_v4(),$id,cssv_hash_secret($token),cssv_hash_secret($csrf),gmdate('Y-m-d H:i:s',$expiry)]);
    cssv_set_cookie(TREE_SESSION,$token,$expiry,true);
    cssv_set_cookie(TREE_CSRF,$csrf,$expiry,false);
    return $csrf;
}
function tree_member(PDO $db): ?array {
    $token=(string)($_COOKIE[TREE_SESSION]??'');
    if ($token==='' || strlen($token)>256) return null;
    $q=$db->prepare('SELECT s.id AS session_id,s.csrf_hash,m.id,m.full_name,m.mobile,m.city,m.public_name,m.avatar_path,m.created_at FROM tree_campaign_sessions s JOIN tree_campaign_members m ON m.id=s.member_id WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at>NOW(6) LIMIT 1');
    $q->execute([cssv_hash_secret($token)]);
    return $q->fetch() ?: null;
}
function tree_auth(PDO $db, bool $csrf=false): array {
    $member=tree_member($db);
    if (!$member) cssv_fail('Please sign in to your tree campaign account.',401,'tree_login_required');
    if ($csrf) {
        $cookie=(string)($_COOKIE[TREE_CSRF]??'');
        $header=(string)($_SERVER['HTTP_X_CSRF_TOKEN']??'');
        if ($cookie==='' || $header==='' || !hash_equals($cookie,$header) || !hash_equals((string)$member['csrf_hash'],cssv_hash_secret($header))) cssv_fail('Your security token expired. Refresh and try again.',403,'invalid_csrf');
    }
    return $member;
}
function tree_public_member(array $row): array {
    return [
        'id'=>(string)$row['id'],
        'name'=>(string)$row['full_name'],
        'city'=>(string)$row['city'],
        'mobile_masked'=>'****'.substr((string)$row['mobile'],-4),
        'has_photo'=>!empty($row['avatar_path']),
        'public_name'=>(bool)$row['public_name'],
        'joined_at'=>(string)$row['created_at'],
    ];
}
function tree_admin(PDO $db, bool $csrf=false): array {
    require_once dirname(__DIR__) . '/_admin_auth.php';
    $admin=cssv_require_separate_admin($db);
    if ($csrf) {
        $cookie=(string)($_COOKIE[CSSV_ADMIN_CSRF_COOKIE]??'');
        $token=(string)($_SERVER['HTTP_X_CSRF_TOKEN']??'');
        if ($cookie==='' || $token==='' || !hash_equals($cookie,$token) || !hash_equals((string)$admin['csrf_hash'],cssv_hash_secret($token))) cssv_fail('Admin session token is invalid.',403,'invalid_csrf');
    }
    return $admin;
}
function tree_rollup_adjust(PDO $db,string $memberId,string $city,string $method,int $quantity,int $direction): void {
    if (!in_array($direction,[1,-1],true) || !in_array($method,['sapling','seed'],true) || $quantity<1 || $quantity>TREE_TARGET) throw new RuntimeException('invalid_rollup_adjustment');
    $trees=$method==='sapling'?$quantity:0;
    $seeds=$method==='seed'?$quantity:0;
    if ($direction===1) {
        $db->prepare('INSERT INTO tree_campaign_member_rollup(member_id,trees,seeds) VALUES(?,?,?) ON DUPLICATE KEY UPDATE trees=trees+VALUES(trees),seeds=seeds+VALUES(seeds),updated_at=NOW(6)')
            ->execute([$memberId,$trees,$seeds]);
        $db->prepare('INSERT INTO tree_campaign_city_rollup(city,trees,seeds) VALUES(?,?,?) ON DUPLICATE KEY UPDATE trees=trees+VALUES(trees),seeds=seeds+VALUES(seeds),updated_at=NOW(6)')
            ->execute([$city,$trees,$seeds]);
    } else {
        $stmt=$db->prepare('UPDATE tree_campaign_member_rollup SET trees=trees-?,seeds=seeds-?,updated_at=NOW(6) WHERE member_id=? AND trees>=? AND seeds>=?');
        $stmt->execute([$trees,$seeds,$memberId,$trees,$seeds]);
        if ($stmt->rowCount()!==1) throw new RuntimeException('missing_member_rollup');
        $stmt=$db->prepare('UPDATE tree_campaign_city_rollup SET trees=trees-?,seeds=seeds-?,updated_at=NOW(6) WHERE city=? AND trees>=? AND seeds>=?');
        $stmt->execute([$trees,$seeds,$city,$trees,$seeds]);
        if ($stmt->rowCount()!==1) throw new RuntimeException('missing_city_rollup');
    }
}
function tree_image_phash(string $path): string {
    // 64-bit difference hash for detecting visually similar uploads.
    $source=@imagecreatefromjpeg($path);
    if (!$source) cssv_fail('Evidence image cannot be inspected.',422,'image_decode_failed');
    $thumbnail=imagecreatetruecolor(9,8);
    imagecopyresampled($thumbnail,$source,0,0,0,0,9,8,imagesx($source),imagesy($source));
    imagedestroy($source);
    $bits='';
    for($y=0;$y<8;$y++) {
        $values=[];
        for($x=0;$x<9;$x++) {
            $rgb=imagecolorat($thumbnail,$x,$y);
            $r=($rgb>>16)&255; $g=($rgb>>8)&255; $b=$rgb&255;
            $values[]=($r*299+$g*587+$b*114)/1000;
        }
        for($x=0;$x<8;$x++) $bits.=$values[$x]>$values[$x+1]?'1':'0';
    }
    imagedestroy($thumbnail);
    $hex='';
    for($i=0;$i<64;$i+=4) $hex.=dechex(bindec(substr($bits,$i,4)));
    return $hex;
}
function tree_phash_distance(string $a,string $b): int {
    if (!preg_match('/^[a-f0-9]{16}$/',$a) || !preg_match('/^[a-f0-9]{16}$/',$b)) return 64;
    $distance=0;
    for($i=0;$i<16;$i++) $distance+=substr_count(decbin(hexdec($a[$i]) ^ hexdec($b[$i])),'1');
    return $distance;
}
function tree_store_image(array $file,string $category,int $limit): array {
    if (($file['error']??UPLOAD_ERR_NO_FILE)!==UPLOAD_ERR_OK || !is_uploaded_file((string)($file['tmp_name']??''))) cssv_fail('Attach a valid image.',422,'photo_required');
    $size=(int)($file['size']??0);
    if ($size<600 || $size>$limit) cssv_fail('The compressed image must not exceed the upload limit.',422,'photo_size_invalid');
    $tmp=(string)$file['tmp_name'];
    $mime=(string)(new finfo(FILEINFO_MIME_TYPE))->file($tmp);
    if (!in_array($mime,['image/jpeg','image/webp'],true)) cssv_fail('Use a JPG or WebP image.',422,'photo_type_invalid');
    $dimensions=@getimagesize($tmp);
    $width=(int)($dimensions[0]??0);$height=(int)($dimensions[1]??0);
    if (!$dimensions || ($dimensions['mime']??'')!==$mime || $width<180 || $height<180 || $width>2400 || $height>2400 || ($width*$height)>4000000) cssv_fail('Photo dimensions are invalid.',422,'photo_dimensions_invalid');
    if (!function_exists('imagecreatefromstring') || !function_exists('imagejpeg')) cssv_fail('Secure photo processing is temporarily unavailable.',503,'image_processor_unavailable');
    $bytes=@file_get_contents($tmp);
    $source=is_string($bytes)?@imagecreatefromstring($bytes):false;
    unset($bytes);
    if (!$source) cssv_fail('The image could not be decoded safely.',422,'photo_decode_failed');
    $folder='tree-campaign/'.$category;
    $name=bin2hex(random_bytes(24)).'.jpg';
    $path=cssv_private_storage_dir($folder).DIRECTORY_SEPARATOR.$name;
    $scale=min(1.0,1200.0/max($width,$height));
    $encoded=false;
    // Server-side re-encoding strips all client-supplied EXIF/GPS metadata and
    // blocks polyglot file content; client-side compression alone is not trusted.
    for($attempt=0;$attempt<9;$attempt++) {
        $w=max(180,(int)round($width*$scale));
        $h=max(180,(int)round($height*$scale));
        $canvas=imagecreatetruecolor($w,$h);
        $white=imagecolorallocate($canvas,255,255,255);
        imagefill($canvas,0,0,$white);
        imagecopyresampled($canvas,$source,0,0,0,0,$w,$h,$width,$height);
        foreach([80,73,66,58,50] as $quality) {
            if (@imagejpeg($canvas,$path,$quality) && is_file($path)) {
                clearstatcache(true,$path);
                $outputSize=(int)filesize($path);
                if ($outputSize>=600 && $outputSize<=$limit) {$encoded=true;break;}
            }
        }
        imagedestroy($canvas);
        if ($encoded || ($w<=180 && $h<=180)) break;
        $scale*=.78;
    }
    imagedestroy($source);
    if (!$encoded) {
        if(is_file($path))@unlink($path);
        cssv_fail('This photo cannot be safely reduced to the required size.',422,'photo_uncompressible');
    }
    @chmod($path,0600);
    $hash=hash_file('sha256',$path);
    if (!is_string($hash)) {
        @unlink($path);
        cssv_fail('Photo integrity check failed.',422,'photo_hash_failed');
    }
    return ['path'=>$folder.'/'.$name,'mime'=>'image/jpeg','hash'=>$hash,'phash'=>tree_image_phash($path)];
}

function tree_photo_serve(string $relative,string $mime): never {
    if ($relative==='' || str_contains($relative,'..') || !str_starts_with($relative,'tree-campaign/')) cssv_fail('Photo unavailable.',404,'photo_not_found');
    $root=cssv_env('CSSV_PRIVATE_STORAGE_DIR','');
    $path=rtrim((string)$root,'/\\').DIRECTORY_SEPARATOR.str_replace('/',DIRECTORY_SEPARATOR,$relative);
    if (!$root || !is_file($path)) cssv_fail('Photo unavailable.',404,'photo_not_found');
    header_remove('Content-Type');
    header('Content-Type: '.($mime==='image/webp'?'image/webp':'image/jpeg'));
    header('Content-Length: '.(string)filesize($path));
    header('Cache-Control: private, no-store');
    header('X-Content-Type-Options: nosniff');
    readfile($path);
    exit;
}

cssv_require_method('GET','POST');
$action=(string)($_GET['action']??'summary');
$db=cssv_db();
tree_schema($db);

if ($_SERVER['REQUEST_METHOD']==='GET') {
    if ($action==='catalog') cssv_json(['ok'=>true,'species'=>tree_species()]);
    if ($action==='summary') {
        $tot=$db->query("SELECT COALESCE(SUM(trees),0) AS trees,COALESCE(SUM(seeds),0) AS seeds FROM tree_campaign_city_rollup")->fetch();
        $contributors=(int)$db->query('SELECT COUNT(*) FROM tree_campaign_member_rollup WHERE trees>0 OR seeds>0')->fetchColumn();
        $cities=(int)$db->query('SELECT COUNT(*) FROM tree_campaign_city_rollup WHERE trees>0 OR seeds>0')->fetchColumn();
        $pending=(int)$db->query("SELECT COUNT(*) FROM tree_campaign_plantings WHERE status='pending'")->fetchColumn();
        $locations=$db->query("SELECT city,trees,seeds FROM tree_campaign_city_rollup WHERE trees>0 OR seeds>0 ORDER BY trees DESC LIMIT 80")->fetchAll();
        $gallery=$db->query("SELECT id,city,species,method,quantity,planted_on FROM tree_campaign_plantings WHERE status='approved' AND public_photo=1 ORDER BY reviewed_at DESC LIMIT 12")->fetchAll();
        $leaders=$db->query("SELECT m.id,m.full_name,m.city,m.public_name,r.trees FROM tree_campaign_member_rollup r JOIN tree_campaign_members m ON m.id=r.member_id WHERE r.trees>0 ORDER BY r.trees DESC,m.id ASC LIMIT 15")->fetchAll();
        $leaderboard=[];
        foreach ($leaders as $i=>$leader) {
            $name=(string)$leader['full_name'];
            $display=(bool)$leader['public_name']?$name:'Anonymous planter';
            $leaderboard[]=['rank'=>$i+1,'name'=>$display,'city'=>(string)$leader['city'],'trees'=>(int)$leader['trees']];
        }
        cssv_json(['ok'=>true,'target'=>TREE_TARGET,'trees'=>(int)$tot['trees'],'seeds'=>(int)$tot['seeds'],'contributors'=>$contributors,'cities'=>$cities,'pending_reports'=>$pending,'city_totals'=>$locations,'leaderboard'=>$leaderboard,'public_gallery'=>$gallery]);
    }
    if ($action==='session') {
        $member=tree_member($db);
        cssv_json(['ok'=>true,'member'=>$member?tree_public_member($member):null,'csrf_token'=>$member?(string)($_COOKIE[TREE_CSRF]??''):null]);
    }
    if ($action==='mine') {
        $member=tree_auth($db);
        $q=$db->prepare('SELECT id,species,method,quantity,planted_on,city,locality,status,review_note,created_at FROM tree_campaign_plantings WHERE member_id=? ORDER BY created_at DESC LIMIT 120');
        $q->execute([$member['id']]);
        cssv_json(['ok'=>true,'member'=>tree_public_member($member),'reports'=>$q->fetchAll()]);
    }
    if ($action==='queue' || $action==='approved-reports') {
        tree_admin($db);
        $status=$action==='queue'?'pending':'approved';
        $q=$db->prepare("SELECT p.id,p.member_id,p.species,p.method,p.quantity,p.planted_on,p.city,p.locality,p.created_at,p.duplicate_risk,p.field_checked,p.field_visit_date,m.full_name FROM tree_campaign_plantings p JOIN tree_campaign_members m ON m.id=p.member_id WHERE p.status=? ORDER BY p.duplicate_risk DESC,p.created_at DESC LIMIT 100");
        $q->execute([$status]);
        cssv_json(['ok'=>true,'reports'=>$q->fetchAll()]);
    }
    if ($action==='photo') {
        $kind=(string)($_GET['kind']??'proof');
        $id=(string)($_GET['id']??'');
        if (!preg_match('/^[a-f0-9-]{36}$/D',$id)) cssv_fail('Photo unavailable.',404,'photo_not_found');
        if ($kind==='avatar') {
            $q=$db->prepare('SELECT avatar_path,avatar_mime FROM tree_campaign_members WHERE id=?');
            $q->execute([$id]);
            $photo=$q->fetch();
            $member=tree_member($db);
            if (!$member || $member['id']!==$id) tree_admin($db);
            if (!$photo || !$photo['avatar_path']) cssv_fail('Photo unavailable.',404,'photo_not_found');
            tree_photo_serve($photo['avatar_path'],$photo['avatar_mime']);
        }
        $q=$db->prepare('SELECT member_id,proof_path,proof_mime,status,public_photo FROM tree_campaign_plantings WHERE id=?');
        $q->execute([$id]); $photo=$q->fetch();
        if (!$photo) cssv_fail('Photo unavailable.',404,'photo_not_found');
        $member=tree_member($db);
        if ((!$member || $member['id']!==$photo['member_id']) && !($photo['status']==='approved' && (int)$photo['public_photo']===1)) tree_admin($db);
        tree_photo_serve($photo['proof_path'],$photo['proof_mime']);
    }
    cssv_fail('Unknown campaign request.',404,'unknown_action');
}

tree_origin();
if ($action==='register') {
    if (!preg_match('~^application/json(?:\s*;|$)~i',(string)($_SERVER['CONTENT_TYPE']??''))) cssv_fail('Use a JSON request.',415,'invalid_type');
    $body=tree_login_json();
    $name=tree_string($body['name']??null,'full name',3,100);
    $city=tree_string($body['city']??null,'Punjab city',2,70);
    if (!preg_match('/^[A-Za-z .-]{2,70}$/D',$city)) cssv_fail('Enter a valid Punjab town or city.',422,'invalid_city');
    $phone=tree_mobile($body['mobile']??null);
    $cnic=tree_cnic($body['cnic']??null);
    $password=tree_password($body['password']??null);
    if (($body['consent']??false)!==true) cssv_fail('Consent is required to register.',422,'consent_required');
    tree_rate($db,'register',$phone,5,3600);
    $recovery=tree_recovery_new();
    try {
        $id=cssv_uuid_v4();
        $db->prepare('INSERT INTO tree_campaign_members (id,full_name,mobile,cnic_hash,cnic_last4,city,password_hash,recovery_hash,public_name) VALUES(?,?,?,?,?,?,?,?,?)')
            ->execute([$id,$name,$phone,cssv_hash_secret('tree-cnic:'.$cnic),substr($cnic,-4),$city,password_hash($password,PASSWORD_DEFAULT),tree_recovery_hash($recovery),!empty($body['public_name'])?1:0]);
    } catch (PDOException $e) {
        if ((string)$e->getCode()==='23000') cssv_fail('A tree campaign account already exists for this mobile number or CNIC. Please sign in.',409,'account_exists');
        throw $e;
    }
    $csrf=tree_issue($db,$id);
    $q=$db->prepare('SELECT * FROM tree_campaign_members WHERE id=?');$q->execute([$id]);
    cssv_json(['ok'=>true,'member'=>tree_public_member($q->fetch()),'csrf_token'=>$csrf,'recovery_key'=>$recovery],201);
}
if ($action==='login') {
    $body=tree_login_json();
    $phone=tree_mobile($body['mobile']??null);
    tree_rate($db,'login',$phone,12,3600);
    $q=$db->prepare('SELECT * FROM tree_campaign_members WHERE mobile=? LIMIT 1');$q->execute([$phone]);$row=$q->fetch();
    if (!$row || !password_verify((string)($body['password']??''),(string)$row['password_hash'])) cssv_fail('Incorrect number or password.',401,'invalid_login');
    $csrf=tree_issue($db,(string)$row['id']);
    cssv_json(['ok'=>true,'member'=>tree_public_member($row),'csrf_token'=>$csrf]);
}
if ($action==='recover') {
    // Offline recovery, not an OTP system: the key is shown once at registration
    // and is never sent via text message or stored in plain text.
    $body=tree_login_json();
    $phone=tree_mobile($body['mobile']??null);
    $key=strtoupper(trim((string)($body['recovery_key']??'')));
    if (!preg_match('/^TREE-[A-F0-9]{48}$/D',$key)) cssv_fail('Invalid recovery credentials.',401,'recovery_failed');
    $newPassword=tree_password($body['new_password']??null);
    tree_rate($db,'recover',$phone,5,3600);
    $db->beginTransaction();
    try {
        $q=$db->prepare('SELECT id,recovery_hash FROM tree_campaign_members WHERE mobile=? FOR UPDATE');
        $q->execute([$phone]);$row=$q->fetch();
        $candidate=tree_recovery_hash($key);
        $expected=(string)($row['recovery_hash']??str_repeat('0',64));
        if (!$row || !hash_equals($expected,$candidate)) {
            $db->rollBack();
            cssv_fail('Invalid recovery credentials.',401,'recovery_failed');
        }
        $replacement=tree_recovery_new();
        $db->prepare('UPDATE tree_campaign_members SET password_hash=?,recovery_hash=? WHERE id=?')
            ->execute([password_hash($newPassword,PASSWORD_DEFAULT),tree_recovery_hash($replacement),$row['id']]);
        $db->prepare('UPDATE tree_campaign_sessions SET revoked_at=NOW(6) WHERE member_id=? AND revoked_at IS NULL')->execute([$row['id']]);
        $db->commit();
        cssv_set_cookie(TREE_SESSION,'',time()-3600,true);
        cssv_set_cookie(TREE_CSRF,'',time()-3600,false);
        cssv_json(['ok'=>true,'recovery_key'=>$replacement,'message'=>'Password changed. Sign in again and save your new offline recovery key.']);
    } catch (Throwable $e) {
        if ($db->inTransaction()) $db->rollBack();
        throw $e;
    }
}
if ($action==='change-password') {
    $member=tree_auth($db,true);
    $body=tree_login_json();
    $q=$db->prepare('SELECT password_hash FROM tree_campaign_members WHERE id=?');
    $q->execute([$member['id']]);$row=$q->fetch();
    if (!$row || !password_verify((string)($body['current_password']??''),(string)$row['password_hash'])) cssv_fail('Current password is incorrect.',401,'password_incorrect');
    $replacement=tree_recovery_new();
    $db->beginTransaction();
    try {
        $db->prepare('UPDATE tree_campaign_members SET password_hash=?,recovery_hash=? WHERE id=?')
            ->execute([password_hash(tree_password($body['new_password']??null),PASSWORD_DEFAULT),tree_recovery_hash($replacement),$member['id']]);
        $db->prepare('UPDATE tree_campaign_sessions SET revoked_at=NOW(6) WHERE member_id=?')->execute([$member['id']]);
        $db->commit();
    } catch (Throwable $e) {if($db->inTransaction())$db->rollBack();throw $e;}
    cssv_set_cookie(TREE_SESSION,'',time()-3600,true);cssv_set_cookie(TREE_CSRF,'',time()-3600,false);
    cssv_json(['ok'=>true,'recovery_key'=>$replacement,'message'=>'Password updated. All sessions were signed out.']);
}
if ($action==='delete-account') {
    $member=tree_auth($db,true);
    $body=tree_login_json();
    if (($body['confirm']??'') !== 'DELETE') cssv_fail('Type DELETE to confirm.',422,'confirmation_required');
    $q=$db->prepare('SELECT password_hash,avatar_path FROM tree_campaign_members WHERE id=?');
    $q->execute([$member['id']]);$row=$q->fetch();
    if (!$row || !password_verify((string)($body['password']??''),(string)$row['password_hash'])) cssv_fail('Current password is incorrect.',401,'password_incorrect');
    $q=$db->prepare('SELECT proof_path FROM tree_campaign_plantings WHERE member_id=?');
    $q->execute([$member['id']]);$paths=$q->fetchAll(PDO::FETCH_COLUMN);
    $q=$db->prepare("SELECT city,method,SUM(quantity) AS total FROM tree_campaign_plantings WHERE member_id=? AND status='approved' GROUP BY city,method");
    $q->execute([$member['id']]);$approvedGroups=$q->fetchAll();
    $db->beginTransaction();
    try {
        foreach($approvedGroups as $group) tree_rollup_adjust($db,(string)$member['id'],(string)$group['city'],(string)$group['method'],(int)$group['total'],-1);
        $db->prepare('DELETE FROM tree_campaign_member_rollup WHERE member_id=?')->execute([$member['id']]);
        $db->prepare('DELETE FROM tree_campaign_plantings WHERE member_id=?')->execute([$member['id']]);
        $db->prepare('DELETE FROM tree_campaign_sessions WHERE member_id=?')->execute([$member['id']]);
        $db->prepare('DELETE FROM tree_campaign_members WHERE id=?')->execute([$member['id']]);
        $db->commit();
    } catch (Throwable $e) {if($db->inTransaction())$db->rollBack();throw $e;}
    foreach($paths as $path) cssv_remove_private_file((string)$path);
    cssv_remove_private_file((string)($row['avatar_path']??''));
    cssv_set_cookie(TREE_SESSION,'',time()-3600,true);cssv_set_cookie(TREE_CSRF,'',time()-3600,false);
    cssv_json(['ok'=>true,'message'=>'Campaign account and all its planting records deleted. Public totals update accordingly.']);
}
if ($action==='logout') {
    $member=tree_auth($db,true);
    $db->prepare('UPDATE tree_campaign_sessions SET revoked_at=NOW(6) WHERE id=?')->execute([$member['session_id']]);
    cssv_set_cookie(TREE_SESSION,'',time()-3600,true);
    cssv_set_cookie(TREE_CSRF,'',time()-3600,false);
    cssv_json(['ok'=>true]);
}
if ($action==='avatar') {
    $member=tree_auth($db,true);
    $photo=tree_store_image($_FILES['photo']??[],'avatars',TREE_MAX_AVATAR);
    try {
        $db->prepare('UPDATE tree_campaign_members SET avatar_path=?,avatar_mime=? WHERE id=?')->execute([$photo['path'],$photo['mime'],$member['id']]);
    } catch (Throwable $e) {cssv_remove_private_file($photo['path']); throw $e;}
    if (!empty($member['avatar_path'])) cssv_remove_private_file($member['avatar_path']);
    cssv_json(['ok'=>true,'message'=>'Profile photo saved privately.']);
}
if ($action==='plant') {
    $member=tree_auth($db,true);
    if (!$member['avatar_path']) cssv_fail('Add your profile photograph before submitting planting evidence.',422,'avatar_required');
    $species=(string)($_POST['species']??'');
    if (!array_key_exists($species,tree_species())) cssv_fail('Choose a listed tree species.',422,'invalid_species');
    $method=(string)($_POST['method']??'');
    if (!in_array($method,['sapling','seed'],true)) cssv_fail('Choose a planting method.',422,'invalid_method');
    $quantity=filter_var($_POST['quantity']??null,FILTER_VALIDATE_INT);
    if (!is_int($quantity) || $quantity<1 || $quantity>20) cssv_fail('You may submit between 1 and 20 per report.',422,'invalid_quantity');
    $day=(string)($_POST['planted_on']??'');
    $date=DateTimeImmutable::createFromFormat('!Y-m-d',$day,new DateTimeZone('UTC'));
    if (!$date || $date->format('Y-m-d')!==$day || $date->getTimestamp()>time()+86400 || $date->getTimestamp()<time()-365*86400) cssv_fail('Choose a date within the past year.',422,'invalid_date');
    $locality=tree_string($_POST['locality']??null,'neighbourhood or planting site',3,120);
    $q=$db->prepare("SELECT COUNT(*) FROM tree_campaign_plantings WHERE member_id=? AND created_at>DATE_SUB(NOW(6),INTERVAL 1 DAY)");
    $q->execute([$member['id']]);
    if ((int)$q->fetchColumn()>=10) cssv_fail('Daily report limit reached. Please submit again tomorrow.',429,'report_limit');
    tree_rate($db,'plant',(string)$member['id'],16,86400);
    $photo=tree_store_image($_FILES['photo']??[],'evidence',TREE_MAX_PROOF);
    try {
        // Flag a perceptual match for a human reviewer; do not automatically
        // accuse legitimate contributors who photographed similar plants.
        $q=$db->prepare("SELECT proof_phash FROM tree_campaign_plantings WHERE member_id=? ORDER BY created_at DESC LIMIT 100");
        $q->execute([$member['id']]);
        $risk=false;
        foreach($q->fetchAll(PDO::FETCH_COLUMN) as $previous) {
            if (is_string($previous) && tree_phash_distance($photo['phash'],$previous)<=5) {$risk=true;break;}
        }
        $q=$db->prepare('SELECT id FROM tree_campaign_plantings WHERE proof_phash=? LIMIT 1');
        $q->execute([$photo['phash']]);
        if($q->fetchColumn())$risk=true;
        $id=cssv_uuid_v4();
        $db->prepare("INSERT INTO tree_campaign_plantings(id,member_id,species,method,quantity,planted_on,city,locality,proof_path,proof_mime,proof_hash,proof_phash,duplicate_risk,public_photo) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
            ->execute([$id,$member['id'],$species,$method,$quantity,$day,$member['city'],$locality,$photo['path'],$photo['mime'],$photo['hash'],$photo['phash'],$risk?1:0,($_POST['public_photo']??'')==='yes'?1:0]);
    } catch (Throwable $e) {
        cssv_remove_private_file($photo['path']);
        if ($e instanceof PDOException && (string)$e->getCode()==='23000') cssv_fail('This exact evidence photo has already been submitted.',409,'duplicate_photo');
        throw $e;
    }
    cssv_json(['ok'=>true,'id'=>$id,'status'=>'pending','message'=>'Evidence received. Counts and rankings update only after review.'],201);
}
if ($action==='review') {
    $admin=tree_admin($db,true);
    $body=tree_login_json();
    $id=(string)($body['id']??'');
    $decision=(string)($body['decision']??'');
    if (!preg_match('/^[a-f0-9-]{36}$/D',$id) || !in_array($decision,['approved','rejected','revoked'],true)) cssv_fail('Invalid review request.',422,'invalid_review');
    $note=tree_string((string)($body['note']??''),'review note',10,400);
    $siteDate=(string)($body['field_visit_date']??'');
    $fieldChecked=($body['field_checked']??false)===true;
    $db->beginTransaction();
    try {
        $q=$db->prepare('SELECT member_id,city,method,quantity,duplicate_risk,status,planted_on FROM tree_campaign_plantings WHERE id=? FOR UPDATE');
        $q->execute([$id]);$row=$q->fetch();
        if (!$row || ($decision==='revoked' && $row['status']!=='approved') || ($decision!=='revoked' && $row['status']!=='pending')) {
            $db->rollBack();
            cssv_fail('The report status changed or it cannot be found.',409,'already_reviewed');
        }
        if($decision==='approved' && ((int)$row['quantity']>5 || (int)$row['duplicate_risk']===1)) {
            if (!$fieldChecked) {
                $db->rollBack();
                cssv_fail('High-volume or repeated-image reports require documented on-site confirmation before approval.',422,'field_check_required');
            }
            $date=DateTimeImmutable::createFromFormat('!Y-m-d',$siteDate,new DateTimeZone('UTC'));
            if (!$date || $date->format('Y-m-d')!==$siteDate || $siteDate<(string)$row['planted_on'] || $date->getTimestamp()>time()+86400) {
                $db->rollBack();
                cssv_fail('Enter a valid date of physical verification.',422,'invalid_field_check_date');
            }
        } else {
            $fieldChecked=false;
            $siteDate='';
        }
        $nextStatus=$decision==='revoked'?'rejected':$decision;
        $expectedStatus=$decision==='revoked'?'approved':'pending';
        $db->prepare("UPDATE tree_campaign_plantings SET status=?,reviewer_id=?,reviewed_at=NOW(6),review_note=?,field_checked=?,field_visit_date=? WHERE id=? AND status=?")
            ->execute([$nextStatus,$admin['admin_id'],$note,$fieldChecked?1:0,$fieldChecked?$siteDate:null,$id,$expectedStatus]);
        if($decision==='approved' || $decision==='revoked') tree_rollup_adjust($db,(string)$row['member_id'],(string)$row['city'],(string)$row['method'],(int)$row['quantity'],$decision==='approved'?1:-1);
        $db->prepare("INSERT INTO tree_campaign_reviews(planting_id,admin_id,decision,review_note,field_checked,field_visit_date) VALUES(?,?,?,?,?,?)")
            ->execute([$id,$admin['admin_id'],$decision,$note,$fieldChecked?1:0,$fieldChecked?$siteDate:null]);
        $db->commit();
    } catch(Throwable $e) {if($db->inTransaction())$db->rollBack();throw $e;}
    cssv_json(['ok'=>true,'status'=>$decision==='revoked'?'rejected':$decision]);
}

cssv_fail('Unknown campaign request.',404,'unknown_action');
