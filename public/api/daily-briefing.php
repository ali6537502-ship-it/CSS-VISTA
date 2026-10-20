<?php
declare(strict_types=1);

// Public, read-only access to published daily editions. Personal reading state,
// unpublished material, premium collections and editorial tools remain private.
require_once __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/_current_affairs.php';

cssv_require_method('GET');
header('Cache-Control: public, max-age=60, must-revalidate');

function ca_public_story(array $row, bool $full = false): array
{
    $content = json_decode($row['content'], true, 512, JSON_THROW_ON_ERROR);
    if (!is_array($content)) throw new RuntimeException('Invalid published story.');
    $fields = $full
        ? ['id','category','headline','summary','importance','topics','key_takeaways',
           'what_happened','explanation','background','why_it_matters','pakistan_perspective',
           'regional_implications','global_implications','what_to_watch','question_angles',
           'facts','statistics','quick_gk','sources','countries','people','organisations',
           'reports','treaties','institutions','timeline']
        : ['id','category','headline','summary','importance','topics','key_takeaways'];
    $story = array_intersect_key($content, array_flip($fields));
    $story['publication_date'] = $row['publication_date'];
    $story['reading_minutes'] = max(1, (int)ceil(str_word_count(ca_search_text($content)) / 220));
    // In particular, do not expose user IDs, bookmarks, progress, preferences or
    // arbitrary editorial metadata carried alongside a published source record.
    return $story;
}

$pdo = null;
try {
    $pdo = cssv_db();
    ca_ensure_schema($pdo);
    // The public reader must receive new releases without waiting for a Pro login.
    ca_sync_git_release($pdo);
    $view = ca_query_param('view', 20) ?: 'edition';

    if ($view === 'archive') {
        $query = $pdo->query(
            'SELECT d.publication_date,d.edition,d.published_at,COUNT(i.id) AS story_count
             FROM current_affairs_days d
             JOIN current_affairs_items i ON i.publication_date=d.publication_date
             WHERE '.ca_visible().'
             GROUP BY d.publication_date,d.edition,d.published_at
             ORDER BY d.publication_date DESC LIMIT 365'
        );
        $days = array_map(static fn(array $day): array => [
            'publication_date' => $day['publication_date'],
            'edition' => $day['edition'],
            'published_at' => str_replace(' ', 'T', $day['published_at']).'Z',
            'story_count' => (int)$day['story_count'],
        ], $query->fetchAll());
        cssv_json(['ok' => true, 'days' => $days]);
    }

    if ($view === 'story') {
        $id = ca_query_param('id', 128);
        if (!preg_match('/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/D', $id)) {
            throw new InvalidArgumentException('Invalid development identifier.');
        }
        $query = $pdo->prepare(
            'SELECT i.content,i.publication_date
             FROM current_affairs_items i
             JOIN current_affairs_days d ON d.publication_date=i.publication_date
             WHERE '.ca_visible().' AND i.id=? LIMIT 1'
        );
        $query->execute([$id]);
        $row = $query->fetch();
        if (!$row) cssv_fail('This development is not available.', 404, 'story_not_found');
        cssv_json(['ok' => true, 'story' => ca_public_story($row, true)]);
    }

    if ($view !== 'edition') throw new InvalidArgumentException('Unknown briefing view.');
    $requestedDate = ca_query_param('date', 10) ?: 'latest';
    $date = ca_resolve_date($pdo, $requestedDate);
    $query = $pdo->prepare(
        'SELECT edition,published_at,updated_at
         FROM current_affairs_days
         WHERE publication_date=? AND is_published=1 AND published_at<=UTC_TIMESTAMP(6)'
    );
    $query->execute([$date]);
    $edition = $query->fetch();
    $query = $pdo->prepare(
        'SELECT i.content,i.publication_date
         FROM current_affairs_items i
         JOIN current_affairs_days d ON d.publication_date=i.publication_date
         WHERE '.ca_visible().' AND i.publication_date=?
         ORDER BY i.id LIMIT 100'
    );
    $query->execute([$date]);
    $stories = array_map(static fn(array $row): array => ca_public_story($row), $query->fetchAll());
    cssv_json([
        'ok' => true,
        'edition' => [
            'date' => $date,
            'latest_date' => ca_latest_date($pdo),
            'published' => (bool)$edition,
            'title' => $edition['edition'] ?? 'Daily Current Affairs',
            'published_at' => $edition ? str_replace(' ', 'T', $edition['published_at']).'Z' : null,
            'updated_at' => $edition ? str_replace(' ', 'T', $edition['updated_at']).'Z' : null,
            'story_count' => count($stories),
        ],
        'stories' => $stories,
    ]);
} catch (Throwable $error) {
    ca_problem($error, $pdo);
}
