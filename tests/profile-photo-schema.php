<?php
declare(strict_types=1);

// Run only against the disposable database created by profile-photo-regression.yml.
$db = getenv('CSSV_PHOTO_TEST_DB');
if ($db !== 'cssvista_photo_test') throw new RuntimeException('Disposable photo test database required');
$pdo = new PDO('mysql:host=127.0.0.1;port=3306;dbname=' . $db, 'root', 'photo_ci_only', [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
$scenario = $argv[1] ?? '';
$limits = ['old25'=>25600, 'old15'=>15360, 'both'=>25600, 'current_and_legacy'=>61440, 'current'=>61440, 'missing'=>null];
if (!array_key_exists($scenario, $limits)) throw new RuntimeException('Unknown scenario');
$pdo->exec('DROP TABLE IF EXISTS student_profiles');
$pdo->exec('CREATE TABLE student_profiles (id INT PRIMARY KEY, profile_photo_bytes INT NULL)');
if ($limits[$scenario] !== null) {
    $pdo->exec('ALTER TABLE student_profiles ADD CONSTRAINT student_profiles_photo_size_chk CHECK (profile_photo_bytes IS NULL OR profile_photo_bytes <= ' . $limits[$scenario] . ')');
}
if (in_array($scenario, ['both','current_and_legacy'], true)) {
    $pdo->exec('ALTER TABLE student_profiles ADD CONSTRAINT student_profiles_photo_size_15k_chk CHECK (profile_photo_bytes IS NULL OR profile_photo_bytes <= 15360)');
}
$pdo->exec('INSERT INTO student_profiles VALUES (1,1024)');
if (in_array($scenario, ['old25','old15','both','current_and_legacy'], true)) {
    $rejected = false;
    try { $pdo->exec('UPDATE student_profiles SET profile_photo_bytes=46080 WHERE id=1'); }
    catch (PDOException $error) { $rejected = true; }
    if (!$rejected) throw new RuntimeException('Failed to reproduce legacy rejection');
}

// Exercise the actual endpoint helper without executing its HTTP/auth entry point.
$source = file_get_contents(dirname(__DIR__) . '/public/api/student/photo.php');
$start = strpos($source, 'function cssv_ensure_student_photo_60kb_schema(');
$end = strpos($source, '$photoUpload =', $start);
if ($start === false || $end === false) throw new RuntimeException('Photo schema helper not found');
eval(substr($source, $start, $end - $start));
cssv_ensure_student_photo_60kb_schema($pdo);
cssv_ensure_student_photo_60kb_schema($pdo);
foreach ([1024,15360,25600,46080,61439,61440] as $bytes) {
    $pdo->exec('UPDATE student_profiles SET profile_photo_bytes=' . $bytes . ' WHERE id=1');
    if ((int)$pdo->query('SELECT profile_photo_bytes FROM student_profiles WHERE id=1')->fetchColumn() !== $bytes) {
        throw new RuntimeException('Photo size was not saved: ' . $bytes);
    }
}
$rejected = false;
try { $pdo->exec('UPDATE student_profiles SET profile_photo_bytes=61441 WHERE id=1'); }
catch (PDOException $error) { $rejected = true; }
if (!$rejected) throw new RuntimeException('Maximum was not enforced');
$pdo->exec('UPDATE student_profiles SET profile_photo_bytes=NULL WHERE id=1');
$legacy = $pdo->query("SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='student_profiles' AND CONSTRAINT_NAME='student_profiles_photo_size_15k_chk'")->fetchColumn();
if ((int)$legacy !== 0) throw new RuntimeException('Legacy check remains');
echo "PASS $scenario: smaller photos and exactly 60 KiB accepted; 60 KiB + 1 rejected.\n";
