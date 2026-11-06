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
        'sohanjana'=>['name'=>'Sohanjana','scientific'=>'Moringa concanensis','category'=>'dryland'],
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
        public_photo TINYINT(1) NOT NULL DEFAULT 0,
        status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
        reviewer_id CHAR(36) NULL,
        reviewed_at DATETIME(6) NULL,
        review_note VARCHAR(400) NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        UNIQUE KEY uq_tree_proof (proof_hash),
        INDEX idx_tree_member_status (member_id,status),
        INDEX idx_tree_public_summary (status,method,city),
        INDEX idx_tree_review_queue (status,created_at)
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
    $ready = true;
}
function tree_origin(): void {
    $origin = rtrim((string)($_SERVER['HTTP_ORIGIN']??''),'/');
    $allowed = rtrim((string)cssv_env('CSSV_SITE_ORIGIN','https://www.css-vista.com'),'/');
    if ($origin !== '' && !hash_equals($origin,$allowed)) cssv_fail('Invalid request origin.',403,'invalid_origin');
}
function tree_rate(PDO $db, string $action, string $subject, int $limit, int $seconds): void {
    $ip=cssv_hash_secret(cssv_ip_prefix());
    $target=cssv_hash_secret($subject);
    $since=gmdate('Y-m-d H:i:s',time()-$seconds);
    $q=$db->prepare('SELECT COUNT(*) FROM tree_campaign_rate_events WHERE action=? AND created_at>=? AND (ip_hash=? OR subject_hash=?)');
    $q->execute([$action,$since,$ip,$target]);
    if ((int)$q->fetchColumn()>=$limit) cssv_fail('Too many attempts. Please try again later.',429,'rate_limited');
    $db->prepare('INSERT INTO tree_campaign_rate_events(ip_hash,subject_hash,action) VALUES(?,?,?)')->execute([$ip,$target,$action]);
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
    if (!is_string($raw) || strlen($raw)<10 || strlen($raw)>72) cssv_fail('Choose a password of 10–72 characters.',422,'invalid_password');
    return $raw;
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
function tree_store_image(array $file,string $category,int $limit): array {
    if (($file['error']??UPLOAD_ERR_NO_FILE)!==UPLOAD_ERR_OK || !is_uploaded_file((string)($file['tmp_name']??''))) cssv_fail('Attach a valid image.',422,'photo_required');
    $size=(int)($file['size']??0);
    if ($size<600 || $size>$limit) cssv_fail('The compressed photo is larger than the limit.',422,'photo_size_invalid');
    $tmp=(string)$file['tmp_name'];
    $mime=(string)(new finfo(FILEINFO_MIME_TYPE))->file($tmp);
    if ($mime!=='image/jpeg' && $mime!=='image/webp') cssv_fail('Use a compressed JPG or WebP photo.',422,'photo_type_invalid');
    $dimensions=@getimagesize($tmp);
    if (!$dimensions || ($dimensions[0]??0)<180 || ($dimensions[1]??0)<180 || ($dimensions[0]*$dimensions[1])>16000000) cssv_fail('Photo dimensions are invalid.',422,'photo_dimensions_invalid');
    $hash=hash_file('sha256',$tmp);
    if (!is_string($hash)) cssv_fail('Could not check photo integrity.',422,'photo_invalid');
    $folder='tree-campaign/'.$category;
    $name=bin2hex(random_bytes(24)).($mime==='image/webp'?'.webp':'.jpg');
    $path=cssv_private_storage_dir($folder).DIRECTORY_SEPARATOR.$name;
    if (!move_uploaded_file($tmp,$path)) cssv_fail('Photo storage is unavailable.',503,'storage_failed');
    @chmod($path,0600);
    return ['path'=>$folder.'/'.$name,'mime'=>$mime,'hash'=>$hash];
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
        $tot=$db->query("SELECT COALESCE(SUM(IF(method='sapling',quantity,0)),0) AS trees, COALESCE(SUM(IF(method='seed',quantity,0)),0) AS seeds, COUNT(DISTINCT member_id) AS contributors,COUNT(DISTINCT city) AS cities FROM tree_campaign_plantings WHERE status='approved'")->fetch();
        $pending=(int)$db->query("SELECT COUNT(*) FROM tree_campaign_plantings WHERE status='pending'")->fetchColumn();
        $locations=$db->query("SELECT city, SUM(IF(method='sapling',quantity,0)) AS trees, SUM(IF(method='seed',quantity,0)) AS seeds FROM tree_campaign_plantings WHERE status='approved' GROUP BY city ORDER BY trees DESC LIMIT 80")->fetchAll();
        $gallery=$db->query("SELECT id,city,species,method,quantity,planted_on FROM tree_campaign_plantings WHERE status='approved' AND public_photo=1 ORDER BY reviewed_at DESC LIMIT 12")->fetchAll();
        $leaders=$db->query("SELECT m.id,m.full_name,m.city,m.public_name, SUM(p.quantity) AS trees FROM tree_campaign_plantings p JOIN tree_campaign_members m ON m.id=p.member_id WHERE p.status='approved' AND p.method='sapling' GROUP BY m.id,m.full_name,m.city,m.public_name ORDER BY trees DESC,m.id ASC LIMIT 15")->fetchAll();
        $leaderboard=[];
        foreach ($leaders as $i=>$leader) {
            $name=(string)$leader['full_name'];
            $display=(bool)$leader['public_name']?$name:'Anonymous planter';
            $leaderboard[]=['rank'=>$i+1,'name'=>$display,'city'=>(string)$leader['city'],'trees'=>(int)$leader['trees']];
        }
        cssv_json(['ok'=>true,'target'=>TREE_TARGET,'trees'=>(int)$tot['trees'],'seeds'=>(int)$tot['seeds'],'contributors'=>(int)$tot['contributors'],'cities'=>(int)$tot['cities'],'pending_reports'=>$pending,'city_totals'=>$locations,'leaderboard'=>$leaderboard,'public_gallery'=>$gallery]);
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
    if ($action==='queue') {
        tree_admin($db);
        $rows=$db->query("SELECT p.id,p.member_id,p.species,p.method,p.quantity,p.planted_on,p.city,p.locality,p.created_at,m.full_name,m.mobile,m.cnic_last4,m.avatar_path FROM tree_campaign_plantings p JOIN tree_campaign_members m ON m.id=p.member_id WHERE p.status='pending' ORDER BY p.created_at ASC LIMIT 100")->fetchAll();
        cssv_json(['ok'=>true,'reports'=>$rows]);
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
    $body=cssv_request_json(12000);
    $name=tree_string($body['name']??null,'full name',3,100);
    $city=tree_string($body['city']??null,'Punjab city',2,70);
    if (!in_array($city,tree_allowed_cities(),true)) cssv_fail('Choose a listed city in Punjab.',422,'invalid_city');
    $phone=tree_mobile($body['mobile']??null);
    $cnic=tree_cnic($body['cnic']??null);
    $password=tree_password($body['password']??null);
    if (($body['consent']??false)!==true) cssv_fail('Consent is required to register.',422,'consent_required');
    tree_rate($db,'register',$phone,5,3600);
    try {
        $id=cssv_uuid_v4();
        $db->prepare('INSERT INTO tree_campaign_members (id,full_name,mobile,cnic_hash,cnic_last4,city,password_hash,public_name) VALUES(?,?,?,?,?,?,?,?)')
            ->execute([$id,$name,$phone,cssv_hash_secret('tree-cnic:'.$cnic),substr($cnic,-4),$city,password_hash($password,PASSWORD_DEFAULT),!empty($body['public_name'])?1:0]);
    } catch (PDOException $e) {
        if ((string)$e->getCode()==='23000') cssv_fail('A tree campaign account already exists for this mobile number or CNIC. Please sign in.',409,'account_exists');
        throw $e;
    }
    $csrf=tree_issue($db,$id);
    $q=$db->prepare('SELECT * FROM tree_campaign_members WHERE id=?');$q->execute([$id]);
    cssv_json(['ok'=>true,'member'=>tree_public_member($q->fetch()),'csrf_token'=>$csrf],201);
}
if ($action==='login') {
    $body=cssv_request_json(4000);
    $phone=tree_mobile($body['mobile']??null);
    tree_rate($db,'login',$phone,12,3600);
    $q=$db->prepare('SELECT * FROM tree_campaign_members WHERE mobile=? LIMIT 1');$q->execute([$phone]);$row=$q->fetch();
    if (!$row || !password_verify((string)($body['password']??''),(string)$row['password_hash'])) cssv_fail('Incorrect number or password.',401,'invalid_login');
    $csrf=tree_issue($db,(string)$row['id']);
    cssv_json(['ok'=>true,'member'=>tree_public_member($row),'csrf_token'=>$csrf]);
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
        $id=cssv_uuid_v4();
        $db->prepare("INSERT INTO tree_campaign_plantings(id,member_id,species,method,quantity,planted_on,city,locality,proof_path,proof_mime,proof_hash,public_photo) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)")
            ->execute([$id,$member['id'],$species,$method,$quantity,$day,$member['city'],$locality,$photo['path'],$photo['mime'],$photo['hash'],($_POST['public_photo']??'')==='yes'?1:0]);
    } catch (Throwable $e) {
        cssv_remove_private_file($photo['path']);
        if ($e instanceof PDOException && (string)$e->getCode()==='23000') cssv_fail('This exact evidence photo has already been submitted.',409,'duplicate_photo');
        throw $e;
    }
    cssv_json(['ok'=>true,'id'=>$id,'status'=>'pending','message'=>'Evidence received. Counts and rankings update only after review.'],201);
}
if ($action==='review') {
    $admin=tree_admin($db,true);
    $body=cssv_request_json(4000);
    $id=(string)($body['id']??'');
    $decision=(string)($body['decision']??'');
    if (!preg_match('/^[a-f0-9-]{36}$/D',$id) || !in_array($decision,['approved','rejected'],true)) cssv_fail('Invalid review request.',422,'invalid_review');
    $note=tree_string((string)($body['note']??'No review note'),'review note',2,400);
    $q=$db->prepare("UPDATE tree_campaign_plantings SET status=?,reviewer_id=?,reviewed_at=NOW(6),review_note=? WHERE id=? AND status='pending'");
    $q->execute([$decision,$admin['admin_id'],$note,$id]);
    if ($q->rowCount()!==1) cssv_fail('This report was already reviewed or cannot be found.',409,'already_reviewed');
    cssv_json(['ok'=>true,'status'=>$decision]);
}
cssv_fail('Unknown campaign request.',404,'unknown_action');
