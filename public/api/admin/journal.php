<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/_native_admin.php';
require_once dirname(__DIR__) . '/_journal.php';

cssv_require_method('GET', 'POST', 'DELETE');
$pdo = cssv_db();
native_owner($pdo);
cssv_journal_ensure_schema($pdo);
$method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));

if ($method === 'GET') {
    cssv_json(['ok' => true, 'articles' => cssv_journal_rows($pdo, true, 500)]);
}

$payload = cssv_request_json(1048576);

if ($method === 'POST') {
    $article = cssv_journal_validate_article($payload['article'] ?? $payload);
    $id = $article['id'];
    $slug = '';

    if ($id !== '') {
        $existing = $pdo->prepare('SELECT slug FROM journal_articles WHERE id=? LIMIT 1');
        $existing->execute([$id]);
        $slug = (string)($existing->fetchColumn() ?: '');
        if ($slug === '') cssv_fail('This journal article could not be found.', 404, 'journal_article_not_found');
    } else {
        $id = cssv_uuid_v4();
        $slug = cssv_journal_unique_slug($pdo, $article['title']);
    }

    try {
        $pdo->beginTransaction();
        if ($article['featured'] === 1) {
            $pdo->exec('UPDATE journal_articles SET featured=0 WHERE featured=1');
        }

        $stmt = $pdo->prepare(
            'INSERT INTO journal_articles (id,slug,title,category,author,author_role,excerpt,body,published_on,featured,published)
             VALUES (?,?,?,?,?,?,?,?,?,?,?)
             ON DUPLICATE KEY UPDATE title=VALUES(title),category=VALUES(category),author=VALUES(author),
             author_role=VALUES(author_role),excerpt=VALUES(excerpt),body=VALUES(body),published_on=VALUES(published_on),
             featured=VALUES(featured),published=VALUES(published),updated_at=NOW(6)'
        );
        $stmt->execute([
            $id, $slug, $article['title'], $article['category'], $article['author'], $article['author_role'],
            $article['excerpt'], $article['body'], $article['published_on'], $article['featured'], $article['published'],
        ]);
        $pdo->commit();
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        error_log('CSSV journal publish failed: ' . $error->getMessage());
        cssv_fail('The article could not be saved. Please try again.', 500, 'journal_save_failed');
    }

    $row = $pdo->prepare(
        'SELECT id,slug,title,category,author,author_role,excerpt,body,published_on,featured,published,created_at,updated_at
         FROM journal_articles WHERE id=? LIMIT 1'
    );
    $row->execute([$id]);
    $saved = $row->fetch();
    if (!$saved) cssv_fail('The saved article could not be reloaded.', 500, 'journal_reload_failed');
    $saved['featured'] = (bool)$saved['featured'];
    $saved['published'] = (bool)$saved['published'];
    $saved['published_on'] = substr((string)$saved['published_on'], 0, 10);
    cssv_json(['ok' => true, 'article' => $saved]);
}

$id = trim((string)($payload['id'] ?? ''));
if (!preg_match('/^[a-f0-9-]{36}$/i', $id)) cssv_fail('Journal article ID is invalid.', 422, 'invalid_journal_id');
$stmt = $pdo->prepare('DELETE FROM journal_articles WHERE id=?');
$stmt->execute([$id]);
cssv_json(['ok' => true, 'deleted' => $id]);
