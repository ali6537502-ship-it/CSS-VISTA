<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/_bootstrap.php';
require_once dirname(__DIR__) . '/_admin_auth.php';
cssv_require_method('GET');
$pdo = cssv_db();
cssv_require_separate_admin($pdo);

$limit = max(1, min(100, (int)($_GET['limit'] ?? 50)));
$offset = max(0, (int)($_GET['offset'] ?? 0));
$conditions = ['1=1'];
$params = [];

$q = trim((string)($_GET['q'] ?? ''));
if ($q !== '') {
    $conditions[] = '(u.email LIKE ? OR p.display_name LIKE ? OR p.phone LIKE ? OR p.whatsapp LIKE ?)';
    $like = '%' . str_replace(['%', '_'], ['\\%', '\\_'], $q) . '%';
    array_push($params, $like, $like, $like, $like);
}
$gender = trim((string)($_GET['gender'] ?? ''));
if ($gender !== '') { $conditions[] = 'p.gender = ?'; $params[] = $gender; }
$city = trim((string)($_GET['city'] ?? ''));
if ($city !== '') { $conditions[] = 'p.city = ?'; $params[] = $city; }
$attempt = trim((string)($_GET['attempt'] ?? ''));
if ($attempt !== '') { $conditions[] = 'p.css_attempt_year = ?'; $params[] = (int)$attempt; }
$batchId = trim((string)($_GET['batch_id'] ?? ''));
if ($batchId !== '') { $conditions[] = 'br.batch_id = ?'; $params[] = $batchId; }
$status = trim((string)($_GET['status'] ?? ''));
if ($status !== '') { $conditions[] = 'br.status = ?'; $params[] = $status; }
$payment = trim((string)($_GET['payment_status'] ?? ''));
if ($payment !== '') { $conditions[] = 'br.payment_status = ?'; $params[] = $payment; }
$ageMin = (int)($_GET['age_min'] ?? 0);
if ($ageMin > 0) { $conditions[] = 'p.date_of_birth <= DATE_SUB(CURDATE(), INTERVAL ? YEAR)'; $params[] = $ageMin; }
$ageMax = (int)($_GET['age_max'] ?? 0);
if ($ageMax > 0) { $conditions[] = 'p.date_of_birth > DATE_SUB(CURDATE(), INTERVAL ? YEAR)'; $params[] = $ageMax + 1; }

$where = implode(' AND ', $conditions);
$join = ' FROM users u LEFT JOIN student_profiles p ON p.user_id=u.id LEFT JOIN batch_registrations br ON br.id=(SELECT br2.id FROM batch_registrations br2 WHERE br2.user_id=u.id ORDER BY br2.submitted_at DESC LIMIT 1) LEFT JOIN batches b ON b.id=br.batch_id ';
$countStmt = $pdo->prepare('SELECT COUNT(*)' . $join . ' WHERE ' . $where);
$countStmt->execute($params);
$total = (int)$countStmt->fetchColumn();

$sql = 'SELECT u.id user_id,u.email,u.auth_source,u.created_at,u.last_sign_in_at,u.last_seen_at,p.display_name,p.phone,p.whatsapp,p.date_of_birth,CASE WHEN p.date_of_birth IS NULL THEN NULL ELSE TIMESTAMPDIFF(YEAR,p.date_of_birth,CURDATE()) END age,p.gender,p.city,p.province_region,p.country,p.css_attempt_year,p.preparation_level,p.optional_subjects,p.education,p.previous_academy_mentor,p.profile_photo_bytes,p.profile_completed_at,CASE WHEN (p.profile_photo_path IS NOT NULL AND p.profile_photo_path <> "") OR (p.avatar_url IS NOT NULL AND p.avatar_url <> "") THEN 1 ELSE 0 END has_photo,br.id registration_id,br.registration_code,br.status registration_status,br.payment_status,br.submitted_at,b.id batch_id,b.title batch_title,(SELECT MAX(sp.updated_at) FROM student_progress sp WHERE sp.user_id=u.id) progress_updated_at,(SELECT COUNT(*) FROM student_activity sa WHERE sa.user_id=u.id) activity_count,(SELECT COUNT(*) FROM quiz_attempts qa WHERE qa.user_id=u.id) quiz_attempt_count' . $join . ' WHERE ' . $where . ' ORDER BY COALESCE(p.last_seen_at,u.last_seen_at,u.last_sign_in_at,u.created_at) DESC LIMIT ' . $limit . ' OFFSET ' . $offset;
$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$rows = $stmt->fetchAll();
foreach ($rows as &$row) {
    if (is_string($row['optional_subjects'] ?? null)) {
        $row['optional_subjects'] = json_decode((string)$row['optional_subjects'], true) ?: [];
    }
    $row['has_photo'] = (bool)($row['has_photo'] ?? false);
}
unset($row);
cssv_json(['ok' => true, 'total' => $total, 'limit' => $limit, 'offset' => $offset, 'students' => $rows]);
