<?php
declare(strict_types=1);
require_once __DIR__ . '/_lucky_draw.php';
cssv_require_method('GET', 'POST');
header('X-Robots-Tag: noindex, nofollow');
$pdo = cssv_db();
cssv_draw_schema($pdo);

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $campaign = cssv_draw_current($pdo);
    if (!$campaign || !(bool)$campaign['is_public']) {
        cssv_json(['ok' => true, 'visible' => false]);
    }
    $id = (int)$campaign['id'];
    if (isset($_GET['status'])) {
        $accepting = $campaign['drawn_at'] === null && ($campaign['closes_at'] === null || strtotime((string)$campaign['closes_at'] . ' UTC') > time());
        cssv_json(['ok' => true, 'visible' => true, 'accepting' => $accepting, 'drawn' => $campaign['drawn_at'] !== null]);
    }
    $page = max(1, (int)($_GET['page'] ?? 1));
    $mine = null;
    $session = cssv_current_session($pdo);
    if ($session) {
        $stmt = $pdo->prepare('SELECT full_name,personal_number,applied_at FROM lucky_draw_entries WHERE campaign_id=? AND user_id=? LIMIT 1');
        $stmt->execute([$id, (string)$session['user_id']]);
        $own = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($own) $mine = ['name' => (string)$own['full_name'], 'number' => (string)$own['personal_number'], 'applied_at' => cssv_draw_timestamp($own['applied_at'])];
    }
    $now = time();
    $closed = $campaign['drawn_at'] !== null ||
        ($campaign['closes_at'] !== null && strtotime((string)$campaign['closes_at'] . ' UTC') <= $now);
    cssv_json(['ok' => true, 'visible' => true, 'campaign' => cssv_draw_summary($campaign),
        'accepting' => !$closed, 'mine' => $mine, 'winners' => cssv_draw_winners($pdo, $id)]
        + cssv_draw_entries($pdo, $id, $page, 50));
}

account_require_json_origin();
$session = cssv_require_user($pdo, false);
cssv_require_csrf($session);
$body = cssv_request_json(2048);
$name = $body['name'] ?? null;
$number = $body['number'] ?? '';
if (!is_string($name)) cssv_fail('Enter your name.', 422, 'invalid_name');
$name = trim(preg_replace('/\s+/u', ' ', $name) ?? $name);
if (mb_strlen($name) < 2 || mb_strlen($name) > 100 || preg_match('/[\x00-\x1F\x7F]/u', $name)) cssv_fail('Use your name (2–100 characters).', 422, 'invalid_name');
if (!is_string($number) || ($number !== '' && !preg_match('/^[0-9]{1,12}$/D', $number))) cssv_fail('The personal number must contain only 1–12 digits, or be left empty.', 422, 'invalid_number');

try {
    $pdo->beginTransaction();
    $campaign = cssv_draw_current($pdo, true);
    if (!$campaign || !(bool)$campaign['is_public']) cssv_fail('This lucky draw is not available.', 404, 'draw_hidden');
    if ($campaign['drawn_at'] !== null ||
        ($campaign['closes_at'] !== null && strtotime((string)$campaign['closes_at'] . ' UTC') <= time())) {
        cssv_fail('Entries have closed for this lucky draw.', 409, 'draw_closed');
    }
    $id = (int)$campaign['id'];
    $exists = $pdo->prepare('SELECT id FROM lucky_draw_entries WHERE campaign_id=? AND user_id=? LIMIT 1');
    $exists->execute([$id, (string)$session['user_id']]);
    if ($exists->fetch()) cssv_fail('You have already applied with this account.', 409, 'already_applied');

    if ($number === '') {
        $check = $pdo->prepare('SELECT 1 FROM lucky_draw_entries WHERE campaign_id=? AND personal_number=? LIMIT 1');
        do {
            $number = (string)random_int(100000, 999999);
            $check->execute([$id, $number]);
            $collision = (bool)$check->fetchColumn();
        } while ($collision);
    }
    $stmt = $pdo->prepare('INSERT INTO lucky_draw_entries (id,campaign_id,user_id,full_name,personal_number,applied_at) VALUES (?,?,?,?,?,UTC_TIMESTAMP(6))');
    $stmt->execute([cssv_uuid_v4(), $id, (string)$session['user_id'], $name, $number]);
    $pdo->commit();
    cssv_json(['ok' => true, 'message' => 'Your application is confirmed.', 'number' => $number]);
} catch (PDOException $error) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    if ((string)$error->getCode() === '23000') cssv_fail('That personal number is taken, or your account has already applied. Please use another number.', 409, 'duplicate_entry');
    error_log('CSSV lucky draw entry failed: ' . (string)$error->getCode());
    cssv_fail('Could not save your entry. Please try again.', 503, 'entry_unavailable');
} catch (Throwable $error) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    throw $error;
}
