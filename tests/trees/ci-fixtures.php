<?php
declare(strict_types=1);
// This fixture is for isolated CI databases only. Never expose via HTTP.
if (PHP_SAPI !== 'cli' || getenv('CSSV_TREES_TEST') !== 'yes') {
    fwrite(STDERR, "Test-only script blocked.\n");
    exit(2);
}
require_once __DIR__.'/../../public/api/_bootstrap.php';
require_once __DIR__.'/../../public/api/_admin_auth.php';
$db=cssv_db();
cssv_admin_ensure_schema($db);
$adminId=cssv_uuid_v4();
$token=bin2hex(random_bytes(32));
$csrf=bin2hex(random_bytes(32));
$db->prepare('INSERT INTO admin_accounts(id,email,password_hash,totp_secret_cipher,totp_enabled_at) VALUES(?,?,?,?,NOW(6))')
   ->execute([$adminId,'trees-ci@example.invalid',password_hash(bin2hex(random_bytes(16)),PASSWORD_DEFAULT),'test-only-unused']);
$db->prepare('INSERT INTO admin_sessions(id,admin_id,token_hash,csrf_hash,mfa_verified_at,expires_at) VALUES(?,?,?,?,NOW(6),DATE_ADD(NOW(6),INTERVAL 2 HOUR))')
   ->execute([cssv_uuid_v4(),$adminId,cssv_hash_secret($token),cssv_hash_secret($csrf)]);
$folder=sys_get_temp_dir().'/trees-isolated-fixtures';
if (!is_dir($folder)) mkdir($folder,0700,true);
for($n=1;$n<=6;$n++){
    $image=imagecreatetruecolor(480,360);
    $base=imagecolorallocate($image,40+$n*18,90+$n*11,110+$n*12);
    imagefilledrectangle($image,0,0,479,359,$base);
    $accent=imagecolorallocate($image,220-$n*12,170-$n*9,55+$n*13);
    imagefilledellipse($image,($n*47)%400+40,($n*32)%260+35,100+$n*8,95+$n*8,$accent);
    imageline($image,10,($n*37)%330,468,($n*53)%330,$accent);
    imagejpeg($image,$folder.'/photo'.$n.'.jpg',65);
    imagedestroy($image);
}
// Embed a synthetic EXIF APP1 segment to verify the server strips metadata.
$raw=file_get_contents($folder.'/photo6.jpg');
$exif="Exif".chr(0).chr(0)."CI_PRIVATE_LOCATION_SENTINEL";
$marker=chr(255).chr(225).pack('n',strlen($exif)+2).$exif;
file_put_contents($folder.'/metadata.jpg',substr($raw,0,2).$marker.substr($raw,2));
file_put_contents($folder.'/admin-session.json',json_encode([
    'cookie'=>CSSV_ADMIN_SESSION_COOKIE.'='.$token.'; '.CSSV_ADMIN_CSRF_COOKIE.'='.$csrf,
    'csrf'=>$csrf
],JSON_THROW_ON_ERROR));
@chmod($folder.'/admin-session.json',0600);
echo "Isolated images and administrative test session created.\n";
