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
    if ($ready || cssv_env('CSSV_TREES_SCHEMA_MANAGED','0')==='1') return;
    $db->exec("CREATE TABLE IF NOT EXISTS tree_campaign_members (
        id CHAR(36) PRIMARY KEY,
        full_name VARCHAR(100) NOT NULL,
        email VARCHAR(254) NULL,
        email_verified_at DATETIME(6) NULL,
        mobile VARCHAR(16) NOT NULL,
        cnic_hash CHAR(64) NOT NULL,
        cnic_last4 CHAR(4) NOT NULL,
        city VARCHAR(70) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        recovery_hash CHAR(64) NULL,
        avatar_path VARCHAR(240) NULL,
        avatar_mime VARCHAR(20) NULL,
        public_name TINYINT(1) NOT NULL DEFAULT 0,
        consent_version VARCHAR(32) NOT NULL DEFAULT 'trees-privacy-v1',
        consented_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        UNIQUE KEY uq_tree_mobile (mobile),
        UNIQUE KEY uq_tree_email (email),
        UNIQUE KEY uq_tree_cnic (cnic_hash)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    $db->exec("CREATE TABLE IF NOT EXISTS tree_campaign_email_tokens (
        id CHAR(36) NOT NULL PRIMARY KEY,
        member_id CHAR(36) NOT NULL,
        purpose ENUM('verify','reset') NOT NULL,
        token_hash CHAR(64) NOT NULL,
        email_hash CHAR(64) NULL,
        expires_at DATETIME(6) NOT NULL,
        used_at DATETIME(6) NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        UNIQUE KEY uq_tree_email_token (token_hash),
        INDEX idx_tree_email_member (member_id,purpose,used_at),
        INDEX idx_tree_email_expiry (expires_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    $db->exec("CREATE TABLE IF NOT EXISTS tree_campaign_sessions (
        id CHAR(36) PRIMARY KEY,
        member_id CHAR(36) NOT NULL,
        token_hash CHAR(64) NOT NULL,
        csrf_hash CHAR(64) NOT NULL,
        user_agent_hash CHAR(64) NULL,
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
    $db->exec("CREATE TABLE IF NOT EXISTS tree_campaign_followups (
        id CHAR(36) NOT NULL PRIMARY KEY,
        planting_id CHAR(36) NOT NULL,
        member_id CHAR(36) NOT NULL,
        phase SMALLINT UNSIGNED NOT NULL,
        surviving SMALLINT UNSIGNED NOT NULL,
        proof_path VARCHAR(240) NOT NULL,
        proof_mime VARCHAR(20) NOT NULL,
        proof_hash CHAR(64) NOT NULL,
        status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
        reviewer_id CHAR(36) NULL,
        reviewed_at DATETIME(6) NULL,
        review_note VARCHAR(400) NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        UNIQUE KEY uq_tree_survival_phase (planting_id,phase),
        UNIQUE KEY uq_tree_survival_photo (proof_hash),
        INDEX idx_tree_followup_member (member_id,created_at),
        INDEX idx_tree_followup_queue (status,created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    $db->exec("CREATE TABLE IF NOT EXISTS tree_campaign_followup_reviews (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        followup_id CHAR(36) NOT NULL,
        admin_id CHAR(36) NOT NULL,
        decision ENUM('approved','rejected') NOT NULL,
        note VARCHAR(400) NOT NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        INDEX idx_tree_followup_audit (followup_id,created_at)
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
        'tree_campaign_email_tokens' => [
            'email_hash' => 'ADD COLUMN email_hash CHAR(64) NULL',
        ],
        'tree_campaign_sessions' => [
            'user_agent_hash' => 'ADD COLUMN user_agent_hash CHAR(64) NULL',
        ],
        'tree_campaign_members' => [
            'email' => 'ADD COLUMN email VARCHAR(254) NULL',
            'email_verified_at' => 'ADD COLUMN email_verified_at DATETIME(6) NULL',
            'recovery_hash' => 'ADD COLUMN recovery_hash CHAR(64) NULL',
            'consent_version' => "ADD COLUMN consent_version VARCHAR(32) NOT NULL DEFAULT 'trees-privacy-v1'",
            'consented_at' => 'ADD COLUMN consented_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)',
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
    $emailIndex=$db->query("SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tree_campaign_members' AND INDEX_NAME='uq_tree_email'")->fetchColumn();
    if ((int)$emailIndex===0) $db->exec('ALTER TABLE tree_campaign_members ADD UNIQUE KEY uq_tree_email (email)');
    $type=$db->query("SELECT COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tree_campaign_reviews' AND COLUMN_NAME='decision'")->fetchColumn();
    if (is_string($type) && !str_contains($type,'revoked')) $db->exec("ALTER TABLE tree_campaign_reviews MODIFY decision ENUM('approved','rejected','revoked') NOT NULL");
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
function tree_email_subject(string $purpose): string {
    return $purpose==='verify'
        ? 'Confirm your Punjab Trees campaign email'
        : 'Reset your Punjab Trees campaign password';
}
function tree_email_token_hash(string $purpose,string $token): string {
    return cssv_hash_secret('tree-email-'. $purpose .':'. $token);
}
function tree_email_link(string $purpose,string $token): string {
    // Only the configured site origin may appear in recovery emails. Do not
    // construct URLs from the attacker-controlled HTTP Host header.
    $origin=rtrim((string)cssv_env('CSSV_SITE_ORIGIN','https://www.css-vista.com'),'/');
    if (!preg_match('~^https://[A-Za-z0-9.-]+(?::[0-9]+)?$~D',$origin)
        && !(cssv_env('CSSV_TREES_TEST')==='yes' && str_starts_with($origin,'http://127.0.0.1:'))) {
        cssv_fail('Email-link service is not configured.',503,'mail_config_invalid');
    }
    // Fragment tokens are not sent in HTTP GET requests, analytics or server
    // access logs. Frontend clears the fragment before exchanging the token.
    return $origin.'/100-million-trees#'.($purpose==='verify'?'verify-email=':'reset-email=').$token;
}
function tree_send_email_token(PDO $db,string $id,string $email,string $purpose): bool {
    if (!in_array($purpose,['verify','reset'],true)) throw new InvalidArgumentException('invalid_email_purpose');
    $token=bin2hex(random_bytes(32));
    $tokenId=cssv_uuid_v4();
    $expiry=gmdate('Y-m-d H:i:s',time()+($purpose==='verify'?86400:1800));
    $db->prepare("UPDATE tree_campaign_email_tokens SET used_at=NOW(6) WHERE member_id=? AND purpose=? AND used_at IS NULL")
        ->execute([$id,$purpose]);
    $db->prepare('INSERT INTO tree_campaign_email_tokens(id,member_id,purpose,token_hash,email_hash,expires_at) VALUES(?,?,?,?,?,?)')
        ->execute([$tokenId,$id,$purpose,tree_email_token_hash($purpose,$token),cssv_hash_secret('tree-email-address:'.strtolower($email)),$expiry]);
    $link=tree_email_link($purpose,$token);
    $message=$purpose==='verify'
        ? "You created a tree-planting campaign account.\n\nConfirm your email using this private link (expires in 24 hours):\n".$link."\n\nIf you did not register, ignore this email. Your address will not be enabled for account recovery without confirmation.\n\nEsar ul Ebad Welfare Foundation × CSS Vista"
        : "A password reset was requested for your Punjab Trees campaign account.\n\nOpen this single-use link within 30 minutes:\n".$link."\n\nIf you did not request this, ignore this email. We will never email your password or ask for an OTP.\n\nEsar ul Ebad Welfare Foundation × CSS Vista";
    $sent=cssv_send_mail($email,tree_email_subject($purpose),$message);
    if (!$sent) {
        $db->prepare('DELETE FROM tree_campaign_email_tokens WHERE id=?')->execute([$tokenId]);
        error_log('Punjab Trees email delivery unavailable for '.$purpose.' operation.');
    }
    return $sent;
}
function tree_consume_email_token(PDO $db,string $purpose,string $token,?string $newPassword=null): ?string {
    if (!preg_match('/^[a-f0-9]{64}$/D',$token)) cssv_fail('Invalid or expired email link.',422,'invalid_email_link');
    $hash=tree_email_token_hash($purpose,$token);
    $db->beginTransaction();
    try {
        $q=$db->prepare('SELECT id,member_id,email_hash FROM tree_campaign_email_tokens WHERE token_hash=? AND purpose=? AND used_at IS NULL AND expires_at>NOW(6) FOR UPDATE');
        $q->execute([$hash,$purpose]);
        $tokenRow=$q->fetch();
        if (!$tokenRow) {
            $db->rollBack();
            cssv_fail('This email link has expired or was already used.',410,'expired_email_link');
        }
        $memberId=(string)$tokenRow['member_id'];
        $q=$db->prepare('SELECT email,email_verified_at FROM tree_campaign_members WHERE id=? FOR UPDATE');
        $q->execute([$memberId]);$recipient=$q->fetch();
        if (!$recipient || !$recipient['email'] || !hash_equals((string)$tokenRow['email_hash'],cssv_hash_secret('tree-email-address:'.strtolower((string)$recipient['email'])))) {
            $db->rollBack();
            cssv_fail('This email link is no longer valid for the account.',410,'expired_email_link');
        }
        if ($purpose==='verify') {
            $db->prepare('UPDATE tree_campaign_members SET email_verified_at=NOW(6) WHERE id=?')->execute([$memberId]);
        } else {
            if (!$recipient['email_verified_at']) {
                $db->rollBack();
                cssv_fail('Email address is not confirmed.',403,'email_unverified');
            }
            $replacement=tree_recovery_new();
            $db->prepare('UPDATE tree_campaign_members SET password_hash=?,recovery_hash=? WHERE id=?')
                ->execute([password_hash(tree_password($newPassword),PASSWORD_DEFAULT),tree_recovery_hash($replacement),$memberId]);
            $db->prepare('UPDATE tree_campaign_sessions SET revoked_at=NOW(6) WHERE member_id=? AND revoked_at IS NULL')->execute([$memberId]);
        }
        $db->prepare('UPDATE tree_campaign_email_tokens SET used_at=NOW(6) WHERE id=?')->execute([$tokenRow['id']]);
        $db->prepare('UPDATE tree_campaign_email_tokens SET used_at=NOW(6) WHERE member_id=? AND purpose=? AND used_at IS NULL')->execute([$memberId,$purpose]);
        $db->commit();
        return $purpose==='reset'?$replacement:null;
    } catch(Throwable $e) {
        if ($db->inTransaction()) $db->rollBack();
        throw $e;
    }
}
function tree_issue(PDO $db, string $id): string {
    $token=rtrim(strtr(base64_encode(random_bytes(48)),'+/','-_'),'=');
    $csrf=rtrim(strtr(base64_encode(random_bytes(32)),'+/','-_'),'=');
    $expiry=time()+14*86400;
    $db->prepare('INSERT INTO tree_campaign_sessions (id,member_id,token_hash,csrf_hash,user_agent_hash,expires_at) VALUES(?,?,?,?,?,?)')
        ->execute([cssv_uuid_v4(),$id,cssv_hash_secret($token),cssv_hash_secret($csrf),cssv_user_agent_hash(),gmdate('Y-m-d H:i:s',$expiry)]);
    cssv_set_cookie(TREE_SESSION,$token,$expiry,true);
    cssv_set_cookie(TREE_CSRF,$csrf,$expiry,false);
    return $csrf;
}
function tree_member(PDO $db): ?array {
    $token=(string)($_COOKIE[TREE_SESSION]??'');
    if ($token==='' || strlen($token)>256) return null;
    $q=$db->prepare('SELECT s.id AS session_id,s.csrf_hash,s.user_agent_hash,m.id,m.full_name,m.email,m.email_verified_at,m.mobile,m.city,m.public_name,m.avatar_path,m.created_at FROM tree_campaign_sessions s JOIN tree_campaign_members m ON m.id=s.member_id WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at>NOW(6) LIMIT 1');
    $q->execute([cssv_hash_secret($token)]);
    $row=$q->fetch();
    if (!$row) return null;
    $currentAgent=cssv_user_agent_hash();
    if (!empty($row['user_agent_hash']) && !hash_equals((string)$row['user_agent_hash'],$currentAgent)) return null;
    return $row;
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
        'email'=>(string)($row['email']??''),
        'email_verified'=>!empty($row['email_verified_at']),
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
if ($_SERVER['REQUEST_METHOD']==='POST' && cssv_env('CSSV_TREES_MAINTENANCE','0')==='1') cssv_fail('Planting submissions and reviews are temporarily paused for maintenance.',503,'campaign_maintenance');

if ($_SERVER['REQUEST_METHOD']==='GET') {
    if ($action==='catalog') cssv_json(['ok'=>true,'species'=>tree_species()]);
    if ($action==='summary') {
        $tot=$db->query("SELECT COALESCE(SUM(trees),0) AS trees,COALESCE(SUM(seeds),0) AS seeds FROM tree_campaign_city_rollup")->fetch();
        $contributors=(int)$db->query('SELECT COUNT(*) FROM tree_campaign_member_rollup WHERE trees>0 OR seeds>0')->fetchColumn();
        $cities=(int)$db->query('SELECT COUNT(*) FROM tree_campaign_city_rollup WHERE trees>0 OR seeds>0')->fetchColumn();
        $pending=(int)$db->query("SELECT COUNT(*) FROM tree_campaign_plantings WHERE status='pending'")->fetchColumn();
        $survival=(int)$db->query("SELECT COUNT(*) FROM tree_campaign_followups f JOIN tree_campaign_plantings p ON p.id=f.planting_id WHERE f.status='approved' AND p.status='approved'")->fetchColumn();
        $locations=$db->query("SELECT city,trees,seeds FROM tree_campaign_city_rollup WHERE trees>0 OR seeds>0 ORDER BY trees DESC LIMIT 80")->fetchAll();
        $gallery=$db->query("SELECT id,city,species,method,quantity,planted_on FROM tree_campaign_plantings WHERE status='approved' AND public_photo=1 ORDER BY reviewed_at DESC LIMIT 12")->fetchAll();
        $leaders=$db->query("SELECT m.id,m.full_name,m.city,m.public_name,r.trees FROM tree_campaign_member_rollup r JOIN tree_campaign_members m ON m.id=r.member_id WHERE r.trees>0 ORDER BY r.trees DESC,m.id ASC LIMIT 15")->fetchAll();
        $leaderboard=[];
        foreach ($leaders as $i=>$leader) {
            $name=(string)$leader['full_name'];
            $display=(bool)$leader['public_name']?$name:'Anonymous planter';
            $leaderboard[]=['rank'=>$i+1,'name'=>$display,'city'=>(string)$leader['city'],'trees'=>(int)$leader['trees']];
        }
        cssv_json(['ok'=>true,'target'=>TREE_TARGET,'trees'=>(int)$tot['trees'],'seeds'=>(int)$tot['seeds'],'contributors'=>$contributors,'cities'=>$cities,'pending_reports'=>$pending,'survival_checks'=>$survival,'city_totals'=>$locations,'leaderboard'=>$leaderboard,'public_gallery'=>$gallery]);
    }
    if ($action==='session') {
        $member=tree_member($db);
        cssv_json(['ok'=>true,'member'=>$member?tree_public_member($member):null,'csrf_token'=>$member?(string)($_COOKIE[TREE_CSRF]??''):null]);
    }
    if ($action==='mine') {
        $member=tree_auth($db);
        $q=$db->prepare('SELECT id,species,method,quantity,planted_on,city,locality,status,review_note,created_at FROM tree_campaign_plantings WHERE member_id=? ORDER BY created_at DESC LIMIT 120');
        $q->execute([$member['id']]);
        $plantings=$q->fetchAll();
        $q=$db->prepare('SELECT id,planting_id,phase,surviving,status,review_note,created_at FROM tree_campaign_followups WHERE member_id=? ORDER BY created_at DESC');
        $q->execute([$member['id']]);
        cssv_json(['ok'=>true,'member'=>tree_public_member($member),'reports'=>$plantings,'followups'=>$q->fetchAll()]);
    }
    if ($action==='queue' || $action==='approved-reports') {
        tree_admin($db);
        $status=$action==='queue'?'pending':'approved';
        $q=$db->prepare("SELECT p.id,p.member_id,p.species,p.method,p.quantity,p.planted_on,p.city,p.locality,p.created_at,p.duplicate_risk,p.field_checked,p.field_visit_date,m.full_name,(m.avatar_path IS NOT NULL) AS has_photo FROM tree_campaign_plantings p JOIN tree_campaign_members m ON m.id=p.member_id WHERE p.status=? ORDER BY p.duplicate_risk DESC,p.created_at DESC LIMIT 100");
        $q->execute([$status]);
        cssv_json(['ok'=>true,'reports'=>$q->fetchAll()]);
    }
    if ($action==='followup-queue') {
        tree_admin($db);
        $list=$db->query("SELECT f.id,f.member_id,f.planting_id,f.phase,f.surviving,f.created_at,p.species,p.city,p.locality,p.quantity AS planted_quantity,m.full_name FROM tree_campaign_followups f JOIN tree_campaign_plantings p ON p.id=f.planting_id JOIN tree_campaign_members m ON m.id=f.member_id WHERE f.status='pending' AND p.status='approved' ORDER BY f.created_at ASC LIMIT 100")->fetchAll();
        cssv_json(['ok'=>true,'reports'=>$list]);
    }
    if ($action==='photo') {
        $kind=(string)($_GET['kind']??'proof');
        $id=(string)($_GET['id']??'');
        if (!preg_match('/^[a-f0-9-]{36}$/D',$id)) cssv_fail('Photo unavailable.',404,'photo_not_found');
        if ($kind==='followup') {
            $q=$db->prepare('SELECT member_id,proof_path,proof_mime FROM tree_campaign_followups WHERE id=?');
            $q->execute([$id]);$photo=$q->fetch();
            if (!$photo) cssv_fail('Photo unavailable.',404,'photo_not_found');
            $member=tree_member($db);
            if (!$member || $member['id']!==$photo['member_id']) tree_admin($db);
            tree_photo_serve($photo['proof_path'],$photo['proof_mime']);
        }
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
    $email=cssv_normalize_email($body['email']??'');
    $cnic=tree_cnic($body['cnic']??null);
    $password=tree_password($body['password']??null);
    if (($body['consent']??false)!==true) cssv_fail('Consent is required to register.',422,'consent_required');
    tree_rate($db,'register',$phone,5,3600);
    $recovery=tree_recovery_new();
    try {
        $id=cssv_uuid_v4();
        $db->prepare('INSERT INTO tree_campaign_members (id,full_name,email,mobile,cnic_hash,cnic_last4,city,password_hash,recovery_hash,public_name,consent_version,consented_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,NOW(6))')
            ->execute([$id,$name,$email,$phone,cssv_hash_secret('tree-cnic:'.$cnic),substr($cnic,-4),$city,password_hash($password,PASSWORD_DEFAULT),tree_recovery_hash($recovery),!empty($body['public_name'])?1:0,'trees-privacy-v2']);
    } catch (PDOException $e) {
        if ((string)$e->getCode()==='23000') cssv_fail('An account already exists for this mobile number, email, or CNIC. Please sign in.',409,'account_exists');
        throw $e;
    }
    $csrf=tree_issue($db,$id);
    $sent=tree_send_email_token($db,$id,$email,'verify');
    $q=$db->prepare('SELECT * FROM tree_campaign_members WHERE id=?');$q->execute([$id]);
    cssv_json(['ok'=>true,'member'=>tree_public_member($q->fetch()),'csrf_token'=>$csrf,'recovery_key'=>$recovery,'verification_sent'=>$sent],201);
}
if ($action==='request-email-reset') {
    $body=tree_login_json();
    $email=cssv_normalize_email($body['email']??'');
    tree_rate($db,'email-reset',$email,4,3600);
    $q=$db->prepare('SELECT id,email FROM tree_campaign_members WHERE email=? AND email_verified_at IS NOT NULL LIMIT 1');
    $q->execute([$email]);$row=$q->fetch();
    if ($row) tree_send_email_token($db,(string)$row['id'],(string)$row['email'],'reset');
    // Always the same public response, regardless of account existence,
    // verification status or mail delivery, to prevent address enumeration.
    cssv_json(['ok'=>true,'message'=>'If a confirmed campaign account uses this email and mail delivery is available, a reset link will arrive shortly.']);
}
if ($action==='confirm-email') {
    $body=tree_login_json();
    tree_rate($db,'email-confirm',cssv_ip_prefix(),20,3600);
    tree_consume_email_token($db,'verify',(string)($body['token']??''));
    cssv_json(['ok'=>true,'message'=>'Email address confirmed. You can now recover your password through email.']);
}
if ($action==='reset-email-password') {
    $body=tree_login_json();
    tree_rate($db,'email-token',cssv_ip_prefix(),12,3600);
    $password=tree_password($body['new_password']??null);
    $replacement=tree_consume_email_token($db,'reset',(string)($body['token']??''),$password);
    cssv_set_cookie(TREE_SESSION,'',time()-3600,true);
    cssv_set_cookie(TREE_CSRF,'',time()-3600,false);
    cssv_json(['ok'=>true,'recovery_key'=>$replacement,'message'=>'Password reset. All prior sessions were signed out. Save your new offline recovery key.']);
}
if ($action==='resend-email-verification') {
    $member=tree_auth($db,true);
    $q=$db->prepare('SELECT email,email_verified_at FROM tree_campaign_members WHERE id=?');
    $q->execute([$member['id']]);$row=$q->fetch();
    if (!$row || !$row['email'] || $row['email_verified_at']) cssv_json(['ok'=>true,'verification_sent'=>false,'message'=>'No unconfirmed email needs verification.']);
    tree_rate($db,'email-verify',(string)$member['id'],3,3600);
    $sent=tree_send_email_token($db,(string)$member['id'],(string)$row['email'],'verify');
    cssv_json(['ok'=>true,'verification_sent'=>$sent,'message'=>$sent?'Confirmation link sent to your email.':'Email service unavailable. Your offline recovery key still works.']);
}
if ($action==='change-email') {
    $member=tree_auth($db,true);
    $body=tree_login_json();
    $newEmail=cssv_normalize_email($body['email']??'');
    tree_rate($db,'change-email',(string)$member['id'],3,3600);
    $q=$db->prepare('SELECT password_hash,email FROM tree_campaign_members WHERE id=?');
    $q->execute([$member['id']]);$row=$q->fetch();
    if (!$row || !password_verify((string)($body['password']??''),(string)$row['password_hash'])) cssv_fail('Current password is incorrect.',401,'password_incorrect');
    try {
        $db->beginTransaction();
        $db->prepare('UPDATE tree_campaign_members SET email=?,email_verified_at=NULL WHERE id=?')->execute([$newEmail,$member['id']]);
        $db->prepare('DELETE FROM tree_campaign_email_tokens WHERE member_id=?')->execute([$member['id']]);
        $db->commit();
    } catch(Throwable $e) {
        if($db->inTransaction())$db->rollBack();
        if($e instanceof PDOException && (string)$e->getCode()==='23000') cssv_fail('Email address is already registered.',409,'email_in_use');
        throw $e;
    }
    if((string)$row['email']!==$newEmail && $row['email']) {
        cssv_send_mail((string)$row['email'],'Punjab Trees email address changed',
            "The contact email for your Punjab Trees campaign account was changed. If you did not request this, contact CSS Vista immediately. No password or account token is included in this notice.");
    }
    $sent=tree_send_email_token($db,(string)$member['id'],$newEmail,'verify');
    cssv_json(['ok'=>true,'verification_sent'=>$sent,'message'=>$sent?'A confirmation link was sent to your new email.':'Email changed, but the confirmation email could not be sent. Use your offline recovery key until verified.']);
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
        $db->prepare("UPDATE tree_campaign_email_tokens SET used_at=NOW(6) WHERE member_id=? AND purpose='reset' AND used_at IS NULL")->execute([$row['id']]);
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
        $db->prepare("UPDATE tree_campaign_email_tokens SET used_at=NOW(6) WHERE member_id=? AND purpose='reset' AND used_at IS NULL")->execute([$member['id']]);
        $db->commit();
    } catch (Throwable $e) {if($db->inTransaction())$db->rollBack();throw $e;}
    cssv_set_cookie(TREE_SESSION,'',time()-3600,true);cssv_set_cookie(TREE_CSRF,'',time()-3600,false);
    cssv_json(['ok'=>true,'recovery_key'=>$replacement,'message'=>'Password updated. All sessions were signed out.']);
}
if ($action==='delete-account') {
    $member=tree_auth($db,true);
    $body=tree_login_json();
    if (($body['confirm']??'') !== 'DELETE') cssv_fail('Type DELETE to confirm.',422,'confirmation_required');
    $paths=[];$avatar='';
    $db->beginTransaction();
    try {
        // Lock contributor identity before reading reports. All submission and
        // moderation writes take this same lock to prevent orphan records or
        // approving a report while its owner is being erased.
        $q=$db->prepare('SELECT password_hash,avatar_path FROM tree_campaign_members WHERE id=? FOR UPDATE');
        $q->execute([$member['id']]);$row=$q->fetch();
        if (!$row || !password_verify((string)($body['password']??''),(string)$row['password_hash'])) {
            $db->rollBack();
            cssv_fail('Current password is incorrect.',401,'password_incorrect');
        }
        $avatar=(string)($row['avatar_path']??'');
        $q=$db->prepare('SELECT proof_path FROM tree_campaign_plantings WHERE member_id=?');
        $q->execute([$member['id']]);$paths=$q->fetchAll(PDO::FETCH_COLUMN);
        $q=$db->prepare('SELECT proof_path FROM tree_campaign_followups WHERE member_id=?');
        $q->execute([$member['id']]);$paths=array_merge($paths,$q->fetchAll(PDO::FETCH_COLUMN));
        $q=$db->prepare("SELECT city,method,SUM(quantity) AS total FROM tree_campaign_plantings WHERE member_id=? AND status='approved' GROUP BY city,method");
        $q->execute([$member['id']]);$groups=$q->fetchAll();
        foreach($groups as $group) tree_rollup_adjust($db,(string)$member['id'],(string)$group['city'],(string)$group['method'],(int)$group['total'],-1);
        $db->prepare('DELETE FROM tree_campaign_member_rollup WHERE member_id=?')->execute([$member['id']]);
        $db->prepare('DELETE FROM tree_campaign_email_tokens WHERE member_id=?')->execute([$member['id']]);
        $db->prepare('DELETE FROM tree_campaign_followup_reviews WHERE followup_id IN (SELECT id FROM tree_campaign_followups WHERE member_id=?)')->execute([$member['id']]);
        $db->prepare('DELETE FROM tree_campaign_reviews WHERE planting_id IN (SELECT id FROM tree_campaign_plantings WHERE member_id=?)')->execute([$member['id']]);
        $db->prepare('DELETE FROM tree_campaign_followups WHERE member_id=?')->execute([$member['id']]);
        $db->prepare('DELETE FROM tree_campaign_plantings WHERE member_id=?')->execute([$member['id']]);
        $db->prepare('DELETE FROM tree_campaign_sessions WHERE member_id=?')->execute([$member['id']]);
        $db->prepare('DELETE FROM tree_campaign_members WHERE id=?')->execute([$member['id']]);
        $db->commit();
    } catch(Throwable $e) {if($db->inTransaction())$db->rollBack();throw $e;}
    foreach($paths as $p) cssv_remove_private_file((string)$p);
    cssv_remove_private_file($avatar);
    cssv_set_cookie(TREE_SESSION,'',time()-3600,true);
    cssv_set_cookie(TREE_CSRF,'',time()-3600,false);
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
    if (empty($member['email_verified_at'])) cssv_fail('Confirm your campaign email to submit planting evidence. A profile photograph is optional.',403,'email_verification_required');
    $species=(string)($_POST['species']??'');
    if (!array_key_exists($species,tree_species())) cssv_fail('Choose a listed tree species.',422,'invalid_species');
    $method=(string)($_POST['method']??'');
    if (!in_array($method,['sapling','seed'],true)) cssv_fail('Choose a planting method.',422,'invalid_method');
    $quantity=filter_var($_POST['quantity']??null,FILTER_VALIDATE_INT);
    if (!is_int($quantity) || $quantity<1 || $quantity>20) cssv_fail('You may submit between 1 and 20 per report.',422,'invalid_quantity');
    $day=(string)($_POST['planted_on']??'');
    $date=DateTimeImmutable::createFromFormat('!Y-m-d',$day,new DateTimeZone('UTC'));
    $todayPunjab=new DateTimeImmutable('today',new DateTimeZone('Asia/Karachi'));
    if (!$date || $date->format('Y-m-d')!==$day || $day>$todayPunjab->format('Y-m-d') || $day<$todayPunjab->modify('-365 days')->format('Y-m-d')) cssv_fail('Choose a planting date from the past year, not a future date.',422,'invalid_date');
    $locality=tree_string($_POST['locality']??null,'neighbourhood or planting site',3,120);
    $q=$db->prepare("SELECT COUNT(*) FROM tree_campaign_plantings WHERE member_id=? AND created_at>DATE_SUB(NOW(6),INTERVAL 1 DAY)");
    $q->execute([$member['id']]);
    if ((int)$q->fetchColumn()>=10) cssv_fail('Daily report limit reached. Please submit again tomorrow.',429,'report_limit');
    tree_rate($db,'plant',(string)$member['id'],16,86400);
    $photo=tree_store_image($_FILES['photo']??[],'evidence',TREE_MAX_PROOF);
    $db->beginTransaction();
    try {
        $lock=$db->prepare('SELECT id FROM tree_campaign_members WHERE id=? FOR UPDATE');
        $lock->execute([$member['id']]);
        if(!$lock->fetchColumn()) throw new RuntimeException('account_no_longer_exists');
        $valid=$db->prepare('SELECT id FROM tree_campaign_sessions WHERE id=? AND revoked_at IS NULL AND expires_at>NOW(6) FOR UPDATE');
        $valid->execute([$member['session_id']]);
        if(!$valid->fetchColumn()) throw new RuntimeException('session_expired_before_submission');
        $daily=$db->prepare("SELECT COUNT(*) FROM tree_campaign_plantings WHERE member_id=? AND created_at>DATE_SUB(NOW(6),INTERVAL 1 DAY)");
        $daily->execute([$member['id']]);
        if((int)$daily->fetchColumn()>=10) {
            $db->rollBack();
            cssv_remove_private_file($photo['path']);
            cssv_fail('Daily report limit reached.',429,'report_limit');
        }
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
        $db->commit();
    } catch (Throwable $e) {
        if($db->inTransaction())$db->rollBack();
        cssv_remove_private_file($photo['path']);
        if ($e instanceof PDOException && (string)$e->getCode()==='23000') cssv_fail('This exact evidence photo has already been submitted.',409,'duplicate_photo');
        throw $e;
    }
    cssv_json(['ok'=>true,'id'=>$id,'status'=>'pending','message'=>'Evidence received. Counts and rankings update only after review.'],201);
}
if ($action==='followup') {
    $member=tree_auth($db,true);
    if (empty($member['email_verified_at'])) cssv_fail('Confirm your campaign email to submit survival evidence.',403,'email_verification_required');
    $id=(string)($_POST['planting_id']??'');
    $phase=filter_var($_POST['phase']??null,FILTER_VALIDATE_INT);
    $surviving=filter_var($_POST['surviving']??null,FILTER_VALIDATE_INT);
    if (!preg_match('/^[a-f0-9-]{36}$/D',$id) || !is_int($phase) || !in_array($phase,[30,90,180],true)) cssv_fail('Choose a valid survival check.',422,'invalid_phase');
    $q=$db->prepare("SELECT id,planted_on,quantity,proof_hash FROM tree_campaign_plantings WHERE id=? AND member_id=? AND method='sapling' AND status='approved'");
    $q->execute([$id,$member['id']]);$plant=$q->fetch();
    if (!$plant) cssv_fail('This approved planting record is unavailable.',404,'planting_unavailable');
    $date=DateTimeImmutable::createFromFormat('!Y-m-d',(string)$plant['planted_on'],new DateTimeZone('UTC'));
    $due=$date? $date->modify('+'.$phase.' days'):null;
    if (!$due || $due>new DateTimeImmutable('today',new DateTimeZone('UTC'))) cssv_fail('This survival milestone is not yet due.',422,'check_not_due');
    if (!is_int($surviving) || $surviving<0 || $surviving>(int)$plant['quantity']) cssv_fail('Surviving trees cannot exceed the approved original quantity.',422,'invalid_survival_count');
    tree_rate($db,'followup',(string)$member['id'],8,86400);
    $photo=tree_store_image($_FILES['photo']??[],'followups',TREE_MAX_PROOF);
    if (hash_equals((string)$plant['proof_hash'],$photo['hash'])) {
        cssv_remove_private_file($photo['path']);
        cssv_fail('Upload a new photo taken for the survival check.',422,'old_photo_reused');
    }
    $db->beginTransaction();
    try {
        $lock=$db->prepare('SELECT id FROM tree_campaign_members WHERE id=? FOR UPDATE');
        $lock->execute([$member['id']]);
        if(!$lock->fetchColumn()) throw new RuntimeException('account_no_longer_exists');
        $valid=$db->prepare('SELECT id FROM tree_campaign_sessions WHERE id=? AND revoked_at IS NULL AND expires_at>NOW(6) FOR UPDATE');
        $valid->execute([$member['session_id']]);
        if(!$valid->fetchColumn()) throw new RuntimeException('session_expired_before_submission');
        $check=$db->prepare("SELECT id FROM tree_campaign_plantings WHERE id=? AND member_id=? AND status='approved' FOR UPDATE");
        $check->execute([$id,$member['id']]);
        if(!$check->fetchColumn()) throw new RuntimeException('planting_status_changed');
        $followupId=cssv_uuid_v4();
        $db->prepare('INSERT INTO tree_campaign_followups(id,planting_id,member_id,phase,surviving,proof_path,proof_mime,proof_hash) VALUES(?,?,?,?,?,?,?,?)')
            ->execute([$followupId,$id,$member['id'],$phase,$surviving,$photo['path'],$photo['mime'],$photo['hash']]);
        $db->commit();
    } catch(Throwable $e) {
        if($db->inTransaction())$db->rollBack();
        cssv_remove_private_file($photo['path']);
        if ($e instanceof PDOException && (string)$e->getCode()==='23000') cssv_fail('This milestone or photograph was already submitted.',409,'repeat_followup');
        throw $e;
    }
    cssv_json(['ok'=>true,'id'=>$followupId,'status'=>'pending','message'=>'Survival evidence received for human review.'],201);
}
if ($action==='followup-review') {
    $admin=tree_admin($db,true);
    $body=tree_login_json();
    $id=(string)($body['id']??'');
    $decision=(string)($body['decision']??'');
    if (!preg_match('/^[a-f0-9-]{36}$/D',$id) || !in_array($decision,['approved','rejected'],true)) cssv_fail('Invalid survival-review action.',422,'invalid_review');
    $note=tree_string((string)($body['note']??''),'survival review note',10,400);
    $db->beginTransaction();
    try {
        $q=$db->prepare("UPDATE tree_campaign_followups SET status=?,reviewer_id=?,reviewed_at=NOW(6),review_note=? WHERE id=? AND status='pending'");
        $q->execute([$decision,$admin['admin_id'],$note,$id]);
        if($q->rowCount()!==1) {$db->rollBack();cssv_fail('Follow-up already reviewed.',409,'already_reviewed');}
        $db->prepare('INSERT INTO tree_campaign_followup_reviews(followup_id,admin_id,decision,note) VALUES(?,?,?,?)')
            ->execute([$id,$admin['admin_id'],$decision,$note]);
        $db->commit();
    } catch(Throwable $e) {if($db->inTransaction())$db->rollBack();throw $e;}
    cssv_json(['ok'=>true,'status'=>$decision]);
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
        $memberQuery=$db->prepare('SELECT member_id FROM tree_campaign_plantings WHERE id=?');
        $memberQuery->execute([$id]);$owner=$memberQuery->fetchColumn();
        if(!$owner) {$db->rollBack();cssv_fail('Report not found.',404,'report_not_found');}
        $lock=$db->prepare('SELECT id FROM tree_campaign_members WHERE id=? FOR UPDATE');
        $lock->execute([$owner]);
        if(!$lock->fetchColumn()) {$db->rollBack();cssv_fail('Participant account no longer exists.',409,'account_deleted');}
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
            if (!$date || $date->format('Y-m-d')!==$siteDate || $siteDate<(string)$row['planted_on'] || $siteDate>(new DateTimeImmutable('today',new DateTimeZone('Asia/Karachi')))->format('Y-m-d')) {
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
