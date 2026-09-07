<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/_bootstrap.php';
cssv_require_method('POST');
$pdo = cssv_db();
cssv_enforce_rate_limit($pdo, 'batch-register-attempt', null, 8, 3600);

$batchId = trim((string)($_POST['batch_id'] ?? ''));
$fullName = trim((string)($_POST['full_name'] ?? ''));
$email = cssv_normalize_email($_POST['email'] ?? '');
cssv_log_security_event($pdo, 'batch-register-attempt', null, $email);
$phone = trim((string)($_POST['phone'] ?? ''));
$whatsapp = trim((string)($_POST['whatsapp'] ?? ''));
$dob = trim((string)($_POST['date_of_birth'] ?? ''));
$gender = trim((string)($_POST['gender'] ?? ''));
$city = trim((string)($_POST['city'] ?? ''));
$province = trim((string)($_POST['province_region'] ?? ''));
$country = trim((string)($_POST['country'] ?? 'Pakistan')) ?: 'Pakistan';
$attempt = trim((string)($_POST['css_attempt_year'] ?? ''));
$level = trim((string)($_POST['preparation_level'] ?? ''));
$education = trim((string)($_POST['education'] ?? ''));
$academy = trim((string)($_POST['previous_academy_mentor'] ?? ''));
$message = trim((string)($_POST['student_message'] ?? ''));
$consent = (string)($_POST['consent'] ?? '') === 'true' || (string)($_POST['consent'] ?? '') === '1';
$subjects = json_decode((string)($_POST['optional_subjects'] ?? '[]'), true);

if ($batchId === '' || strlen($batchId) > 36) cssv_fail('Select a valid batch.', 422, 'invalid_batch');
if ($fullName === '' || mb_strlen($fullName) > 180) cssv_fail('Enter your full name.', 422, 'invalid_name');
if ($phone === '' || strlen($phone) > 40 || strlen($whatsapp) > 40) cssv_fail('Enter a valid phone number.', 422, 'invalid_phone');
if ($city === '' || mb_strlen($city) > 120 || mb_strlen($gender) > 32) cssv_fail('Complete your city and gender details.', 422, 'invalid_profile');
if (!$consent) cssv_fail('Consent is required to submit registration.', 422, 'consent_required');
if (!is_array($subjects) || count($subjects) > 20) cssv_fail('Optional subjects are invalid.', 422, 'invalid_subjects');
if (mb_strlen($message) > 4000 || mb_strlen($education) > 240 || mb_strlen($academy) > 240) cssv_fail('Registration information is too long.', 422, 'invalid_registration');

$date = DateTimeImmutable::createFromFormat('!Y-m-d', $dob);
if (!$date || $date->format('Y-m-d') !== $dob || $date > new DateTimeImmutable('today') || $date < new DateTimeImmutable('-100 years')) {
    cssv_fail('Enter a valid date of birth.', 422, 'invalid_birth_date');
}
$attemptYear = $attempt === '' ? null : (int)$attempt;
if ($attemptYear !== null && ($attemptYear < 2020 || $attemptYear > 2040)) cssv_fail('Enter a valid CSS attempt year.', 422, 'invalid_attempt_year');

$batchStmt = $pdo->prepare("SELECT id,fee_pkr,capacity,status,registration_opens_at,registration_closes_at,(SELECT COUNT(*) FROM batch_registrations r WHERE r.batch_id=batches.id AND r.status NOT IN ('rejected','withdrawn')) registered_count FROM batches WHERE id=? LIMIT 1");
$batchStmt->execute([$batchId]);
$batch = $batchStmt->fetch();
$now = time();
if (!$batch || $batch['status'] !== 'open' || ($batch['registration_opens_at'] && strtotime((string)$batch['registration_opens_at']) > $now) || ($batch['registration_closes_at'] && strtotime((string)$batch['registration_closes_at']) < $now)) {
    cssv_fail('Registration for this batch is not open.', 409, 'batch_closed');
}
if ($batch['capacity'] !== null && (int)$batch['registered_count'] >= (int)$batch['capacity']) {
    cssv_fail('This batch has reached its registration capacity.', 409, 'batch_full');
}
$dup = $pdo->prepare('SELECT registration_code FROM batch_registrations WHERE batch_id=? AND email=? LIMIT 1');
$dup->execute([$batchId, $email]);
if ($existing = $dup->fetchColumn()) {
    cssv_fail('This email is already registered for the selected batch.', 409, 'already_registered');
}

$photo = cssv_store_profile_photo($_FILES['photo'] ?? [], 'batch-photos');
$userStmt = $pdo->prepare('SELECT id FROM users WHERE email=? LIMIT 1');
$userStmt->execute([$email]);
$userId = $userStmt->fetchColumn() ?: null;
$id = cssv_uuid_v4();
$code = 'CV-' . gmdate('ymd') . '-' . strtoupper(substr(bin2hex(random_bytes(5)), 0, 8));
$subjects = array_values(array_unique(array_filter(array_map(static fn($v) => trim((string)$v), $subjects), static fn($v) => $v !== '' && mb_strlen($v) <= 120)));

try {
    $stmt = $pdo->prepare('INSERT INTO batch_registrations (id,registration_code,batch_id,user_id,full_name,email,phone,whatsapp,date_of_birth,gender,city,province_region,country,css_attempt_year,preparation_level,optional_subjects,education,previous_academy_mentor,student_message,photo_storage_path,photo_mime,photo_bytes,photo_width,photo_height,photo_sha256,status,payment_status,amount_due_pkr,consent_at,submitted_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,\'new\',\'unpaid\',?,NOW(6),NOW(6))');
    $stmt->execute([$id,$code,$batchId,$userId,$fullName,$email,$phone,$whatsapp,$dob,$gender,$city,$province,$country,$attemptYear,$level,json_encode($subjects, JSON_UNESCAPED_UNICODE),$education,$academy,$message,$photo['path'],$photo['mime'],$photo['bytes'],$photo['width'],$photo['height'],$photo['sha256'],$batch['fee_pkr']]);
} catch (Throwable $error) {
    @unlink((string)$photo['absolute_path']);
    error_log('CSSV batch registration failed: ' . $error->getMessage());
    cssv_fail('Could not submit registration right now.', 503, 'registration_failed');
}
cssv_json(['ok' => true, 'registration_code' => $code, 'message' => 'Registration submitted successfully.'], 201);
