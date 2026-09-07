<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/_bootstrap.php';
cssv_require_method('GET', 'POST');
$pdo = cssv_db();
$session = cssv_require_user($pdo);
$userId = (string)$session['user_id'];

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET') {
    $stmt = $pdo->prepare('SELECT u.email,p.* FROM users u LEFT JOIN student_profiles p ON p.user_id=u.id WHERE u.id=? LIMIT 1');
    $stmt->execute([$userId]);
    $profile = $stmt->fetch();
    if (!$profile) {
        cssv_fail('Profile not found.', 404, 'profile_not_found');
    }
    unset($profile['profile_photo_path'], $profile['profile_photo_sha256']);
    $profile['has_photo'] = !empty($profile['profile_photo_bytes']);
    $profile['age'] = $profile['date_of_birth'] ? (int)(new DateTimeImmutable((string)$profile['date_of_birth']))->diff(new DateTimeImmutable('today'))->y : null;
    cssv_json(['ok' => true, 'profile' => $profile]);
}

cssv_require_csrf($session);
$body = cssv_request_json(32768);
$displayName = trim((string)($body['display_name'] ?? ''));
$phone = trim((string)($body['phone'] ?? ''));
$whatsapp = trim((string)($body['whatsapp'] ?? ''));
$gender = trim((string)($body['gender'] ?? ''));
$city = trim((string)($body['city'] ?? ''));
$province = trim((string)($body['province_region'] ?? ''));
$country = trim((string)($body['country'] ?? 'Pakistan')) ?: 'Pakistan';
$preparation = trim((string)($body['preparation_level'] ?? ''));
$education = trim((string)($body['education'] ?? ''));
$academy = trim((string)($body['previous_academy_mentor'] ?? ''));
$dob = trim((string)($body['date_of_birth'] ?? ''));
$attemptYear = $body['css_attempt_year'] ?? null;
$subjects = $body['optional_subjects'] ?? [];

if ($displayName === '' || mb_strlen($displayName) > 180) cssv_fail('Enter your full name.', 422, 'invalid_name');
if (strlen($phone) > 40 || strlen($whatsapp) > 40) cssv_fail('Phone number is too long.', 422, 'invalid_phone');
if (mb_strlen($gender) > 32 || mb_strlen($city) > 120 || mb_strlen($province) > 120 || mb_strlen($country) > 120) cssv_fail('Profile information is too long.', 422, 'invalid_profile');
if ($dob !== '') {
    $date = DateTimeImmutable::createFromFormat('!Y-m-d', $dob);
    if (!$date || $date->format('Y-m-d') !== $dob || $date > new DateTimeImmutable('today') || $date < new DateTimeImmutable('-100 years')) {
        cssv_fail('Enter a valid date of birth.', 422, 'invalid_birth_date');
    }
} else {
    $dob = null;
}
if ($attemptYear !== null && $attemptYear !== '') {
    $attemptYear = (int)$attemptYear;
    if ($attemptYear < 2020 || $attemptYear > 2040) cssv_fail('Enter a valid CSS attempt year.', 422, 'invalid_attempt_year');
} else {
    $attemptYear = null;
}
if (!is_array($subjects) || count($subjects) > 20) cssv_fail('Optional subjects are invalid.', 422, 'invalid_subjects');
$subjects = array_values(array_unique(array_filter(array_map(static fn($v) => trim((string)$v), $subjects), static fn($v) => $v !== '' && mb_strlen($v) <= 120)));

$stmt = $pdo->prepare(
    'UPDATE student_profiles SET display_name=?,phone=?,whatsapp=?,date_of_birth=?,gender=?,city=?,province_region=?,country=?,css_attempt_year=?,preparation_level=?,optional_subjects=?,education=?,previous_academy_mentor=?,profile_completed_at=CASE WHEN profile_photo_path IS NOT NULL THEN COALESCE(profile_completed_at,NOW(6)) ELSE profile_completed_at END WHERE user_id=?'
);
$stmt->execute([$displayName,$phone,$whatsapp,$dob,$gender,$city,$province,$country,$attemptYear,$preparation,json_encode($subjects, JSON_UNESCAPED_UNICODE),$education,$academy,$userId]);
cssv_json(['ok' => true, 'message' => 'Profile updated.']);
