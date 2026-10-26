<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/_native_admin.php';
require_once dirname(__DIR__) . '/_lucky_draw.php';
cssv_require_method('GET', 'POST');
header('X-Robots-Tag: noindex, nofollow');
$pdo = cssv_db();
native_owner($pdo);
cssv_draw_schema($pdo);

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $current = cssv_draw_current($pdo);
    $campaigns = $pdo->query('SELECT id,title,is_public,created_at,drawn_at FROM lucky_draw_campaigns ORDER BY id DESC LIMIT 50')->fetchAll(PDO::FETCH_ASSOC);
    $requested = max(0, (int)($_GET['campaign'] ?? 0));
    $selected = $current;
    if ($requested > 0) {
        $query = $pdo->prepare('SELECT * FROM lucky_draw_campaigns WHERE id=?');
        $query->execute([$requested]);
        $selected = $query->fetch(PDO::FETCH_ASSOC) ?: null;
    }
    $id = $selected ? (int)$selected['id'] : 0;
    $page = max(1, (int)($_GET['page'] ?? 1));
    if (($_GET['format'] ?? '') === 'csv') {
        if (!$selected) cssv_fail('This draw does not exist.', 404, 'not_found');
        header('Content-Type: text/csv; charset=UTF-8');
        header('Content-Disposition: attachment; filename="cssvista-draw-' . $id . '-applications.csv"');
        $stream = fopen('php://output', 'wb');
        fputcsv($stream, ['Name', 'Personal number', 'Account email', 'Applied (UTC)', 'Account ID']);
        $stmt = $pdo->prepare('SELECT e.full_name,e.personal_number,u.email,e.applied_at,e.user_id FROM lucky_draw_entries e JOIN users u ON u.id=e.user_id WHERE e.campaign_id=? ORDER BY e.applied_at,e.id');
        $stmt->execute([$id]);
        while ($r = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $values = array_values($r);
            fputcsv($stream, array_map(static function ($value) {
                $text = (string)$value;
                return preg_match('/^[\s]*[=+\-@]/u', $text) ? "'" . $text : $text;
            }, $values));
        }
        fclose($stream);
        exit;
    }
    $list = ['entries' => [], 'total' => 0, 'page' => $page, 'per_page' => 100];
    $winners = [];
    if ($selected) {
        $count = $pdo->prepare('SELECT COUNT(*) FROM lucky_draw_entries WHERE campaign_id=?');
        $count->execute([$id]);
        $list['total'] = (int)$count->fetchColumn();
        $stmt = $pdo->prepare('SELECT e.full_name,e.personal_number,e.applied_at,e.user_id,u.email FROM lucky_draw_entries e JOIN users u ON u.id=e.user_id WHERE e.campaign_id=? ORDER BY e.applied_at,e.id LIMIT 100 OFFSET ?');
        $stmt->bindValue(1, $id, PDO::PARAM_INT);
        $stmt->bindValue(2, ($page - 1) * 100, PDO::PARAM_INT);
        $stmt->execute();
        $list['entries'] = array_map(static fn($r) => [
            'name' => (string)$r['full_name'], 'number' => (string)$r['personal_number'],
            'email' => (string)$r['email'], 'user_id' => (string)$r['user_id'],
            'applied_at' => cssv_draw_timestamp($r['applied_at'])
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));
        $winners = cssv_draw_winners($pdo, $id);
    }
    cssv_json(['ok' => true, 'current_id' => $current ? (int)$current['id'] : null,
        'campaign' => $selected ? cssv_draw_summary($selected) : null,
        'campaigns' => array_map(static fn($r) => [
            'id' => (int)$r['id'], 'title' => (string)$r['title'],
            'public' => (bool)$r['is_public'], 'created_at' => cssv_draw_timestamp($r['created_at']),
            'drawn_at' => cssv_draw_timestamp($r['drawn_at'])
        ], $campaigns), 'winners' => $winners] + $list);
}

$body = cssv_request_json(8192);
$action = (string)($body['action'] ?? '');
if (!in_array($action, ['new', 'save', 'visibility', 'draw'], true)) cssv_fail('Unknown draw action.', 400, 'unknown_action');
try {
    $pdo->beginTransaction();
    $current = cssv_draw_current($pdo, true);
    if ($action === 'new') {
        if ($current) $pdo->prepare('UPDATE lucky_draw_campaigns SET is_public=0 WHERE id=?')->execute([(int)$current['id']]);
        $pdo->prepare('INSERT INTO lucky_draw_campaigns(title,description,winner_count,is_public) VALUES(?,?,1,0)')
            ->execute(['CSS VISTA Lucky Draw', '',]);
        $id = (int)$pdo->lastInsertId();
        $pdo->commit();
        cssv_json(['ok' => true, 'id' => $id, 'message' => 'New private draw created. Publish it when ready.']);
    }
    if (!$current) cssv_fail('Create a draw first.', 409, 'no_draw');
    $id = (int)$current['id'];
    if ($action === 'visibility') {
        $public = ($body['public'] ?? null) === true;
        $pdo->prepare('UPDATE lucky_draw_campaigns SET is_public=?,published_at=IF(?=1,COALESCE(published_at,UTC_TIMESTAMP(6)),published_at) WHERE id=?')
            ->execute([$public ? 1 : 0, $public ? 1 : 0, $id]);
        $pdo->commit();
        cssv_json(['ok' => true, 'visible' => $public]);
    }
    if ($action === 'save') {
        $title = $body['title'] ?? '';
        $description = $body['description'] ?? '';
        $count = $body['winner_count'] ?? 1;
        if (!is_string($title) || mb_strlen(trim($title)) < 3 || mb_strlen(trim($title)) > 140) cssv_fail('Enter a draw title (3–140 characters).', 422, 'invalid_title');
        if (!is_string($description) || mb_strlen($description) > 500) cssv_fail('Description is too long.', 422, 'invalid_description');
        if (!is_int($count) || $count < 1 || $count > 100) cssv_fail('Choose between 1 and 100 winners.', 422, 'invalid_winner_count');
        if ($current['drawn_at'] !== null) cssv_fail('A completed draw cannot be edited. Create a new draw.', 409, 'draw_completed');
        $closesAt = cssv_draw_closes_at($body['closes_at'] ?? null);
        $pdo->prepare('UPDATE lucky_draw_campaigns SET title=?,description=?,closes_at=?,winner_count=? WHERE id=?')
            ->execute([trim($title), trim($description), $closesAt, $count, $id]);
        $pdo->commit();
        cssv_json(['ok' => true, 'message' => 'Draw settings saved.']);
    }
    if ($current['drawn_at'] !== null) cssv_fail('Winners have already been selected. The result cannot be redrawn.', 409, 'already_drawn');
    $stmt = $pdo->prepare('SELECT id FROM lucky_draw_entries WHERE campaign_id=? ORDER BY applied_at,id');
    $stmt->execute([$id]);
    $entries = $stmt->fetchAll(PDO::FETCH_COLUMN);
    $count = (int)$current['winner_count'];
    if (count($entries) < $count) cssv_fail('Not enough applications for the selected number of winners.', 409, 'not_enough_entries');
    for ($position = 1; $position <= $count; $position++) {
        $index = random_int(0, count($entries) - 1);
        $chosen = $entries[$index];
        array_splice($entries, $index, 1);
        $pdo->prepare('INSERT INTO lucky_draw_winners(campaign_id,position,entry_id,selected_at) VALUES(?,?,?,UTC_TIMESTAMP(6))')
            ->execute([$id, $position, $chosen]);
    }
    $pdo->prepare('UPDATE lucky_draw_campaigns SET drawn_at=UTC_TIMESTAMP(6) WHERE id=?')->execute([$id]);
    $pdo->commit();
    cssv_json(['ok' => true, 'winners' => cssv_draw_winners($pdo, $id), 'message' => 'Winners selected and saved permanently.']);
} catch (Throwable $error) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    if ($error instanceof PDOException) {
        error_log('CSSV lucky draw admin operation failed: ' . (string)$error->getCode());
        cssv_fail('The draw could not be saved. Try again.', 503, 'draw_unavailable');
    }
    throw $error;
}
