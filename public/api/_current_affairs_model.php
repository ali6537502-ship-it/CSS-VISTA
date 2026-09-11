<?php
declare(strict_types=1);

// Pure validation shared by the publisher and CLI integration tests.
// Text and source metadata are validated without rewriting their wording.
function ca_text(mixed $value, string $field, int $max = 20000, bool $required = true): string
{
    if (!is_string($value) || strlen($value) > $max || ($required && trim($value) === '')) {
        throw new InvalidArgumentException($field . ' must be a non-empty string of at most ' . $max . ' bytes.');
    }
    return $value;
}
function ca_date(mixed $value): string
{
    $value = ca_text($value, 'date', 10);
    $date = DateTimeImmutable::createFromFormat('!Y-m-d', $value);
    if (!$date || $date->format('Y-m-d') !== $value) throw new InvalidArgumentException('Use a real date in YYYY-MM-DD format.');
    return $value;
}
function ca_list(mixed $value, string $field, int $max = 60): array
{
    if (!is_array($value) || !array_is_list($value) || count($value) > $max) {
        throw new InvalidArgumentException($field . ' must be an array with at most ' . $max . ' entries.');
    }
    return $value;
}
function ca_url(mixed $value): string
{
    $value = ca_text($value, 'source.url', 2000);
    $parts = parse_url($value);
    if (!$parts || !in_array(strtolower($parts['scheme'] ?? ''), ['https', 'http'], true)
        || empty($parts['host']) || isset($parts['user']) || isset($parts['pass'])
        || !filter_var($value, FILTER_VALIDATE_URL)) {
        throw new InvalidArgumentException('Sources must use original HTTP(S) URLs without credentials.');
    }
    return $value;
}
function ca_validate_dataset(array $data, bool $allowTest = false): array
{
    if (($data['schema_version'] ?? 1) !== 1) throw new InvalidArgumentException('Unsupported schema_version.');
    if (($data['test'] ?? false) !== false && !$allowTest) throw new InvalidArgumentException('Test editions cannot be published on production.');
    ca_date($data['date'] ?? null);
    $published = ca_text($data['published_at'] ?? null, 'published_at', 40);
    if (!preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/D', $published)) {
        throw new InvalidArgumentException('published_at must be an ISO 8601 timestamp with an explicit timezone.');
    }
    try { $time = new DateTimeImmutable($published); }
    catch (Exception) { throw new InvalidArgumentException('Invalid published_at timestamp.'); }
    $errors = DateTimeImmutable::getLastErrors();
    if (($errors && ($errors['warning_count'] || $errors['error_count']))
        || $time->setTimezone(new DateTimeZone('Asia/Karachi'))->format('Y-m-d') !== $data['date']) {
        throw new InvalidArgumentException('published_at must fall on the edition date in Asia/Karachi.');
    }
    ca_text($data['edition'] ?? null, 'edition', 160);
    $stories = ca_list($data['stories'] ?? null, 'stories', 100);
    if (!$stories) throw new InvalidArgumentException('An edition requires at least one sourced story.');
    $ids = [];
    foreach ($stories as $story) {
        if (!is_array($story) || array_is_list($story)) throw new InvalidArgumentException('Each story must be an object.');
        $id = ca_text($story['id'] ?? null, 'story.id', 128);
        if (!preg_match('/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/D', $id) || isset($ids[$id])) {
            throw new InvalidArgumentException('Story IDs must be unique, stable letters, numbers, underscores or hyphens.');
        }
        $ids[$id] = true;
        ca_text($story['category'] ?? null, $id . '.category', 120);
        ca_text($story['headline'] ?? null, $id . '.headline', 350);
        ca_text($story['summary'] ?? null, $id . '.summary', 4000);
        foreach (['what_happened','explanation','background','why_it_matters','pakistan_perspective','regional_implications','global_implications'] as $field) {
            if (isset($story[$field])) ca_text($story[$field], $id . '.' . $field, 20000, false);
        }
        if (isset($story['importance'])) ca_text($story['importance'], 'importance', 80, false);
        foreach (['key_takeaways','what_to_watch','question_angles','topics','countries','institutions','reports','treaties','organisations','people'] as $field) {
            foreach (ca_list($story[$field] ?? [], $field, 50) as $value) ca_text($value, $id . '.' . $field, 2000);
        }
        $sources = ca_list($story['sources'] ?? null, 'sources', 30);
        if (!$sources) throw new InvalidArgumentException($id . ' requires at least one original source.');
        $attribution = [];
        foreach ($sources as $source) {
            if (!is_array($source)) throw new InvalidArgumentException('Each source must be an object.');
            $attribution[] = ca_text($source['publisher'] ?? null, 'source.publisher', 200);
            $attribution[] = ca_url($source['url'] ?? null);
            ca_text($source['title'] ?? null, 'source.title', 500);
            foreach (['published_at','source_type'] as $field) {
                if (isset($source[$field])) ca_text($source[$field], 'source.' . $field, 120, false);
            }
        }
        foreach (ca_list($story['statistics'] ?? [], 'statistics', 40) as $stat) {
            if (!is_array($stat)) throw new InvalidArgumentException('Each statistic must be an object.');
            ca_text($stat['label'] ?? null, 'statistic.label', 300);
            ca_text($stat['value'] ?? null, 'statistic.value', 300);
            $source = ca_text($stat['source'] ?? null, 'statistic.source', 2000);
            if (!in_array($source, $attribution, true)) throw new InvalidArgumentException('Each statistic source must match a listed publisher or source URL exactly.');
            if (empty($stat['year']) && empty($stat['date'])) throw new InvalidArgumentException('Each statistic requires its year or date.');
            foreach (['year','date'] as $field) {
                if (isset($stat[$field])) ca_text($stat[$field], 'statistic.' . $field, 120);
            }
        }
        foreach (['facts','quick_gk'] as $field) {
            foreach (ca_list($story[$field] ?? [], $field) as $fact) {
                if (is_string($fact)) { ca_text($fact, $field, 3000); continue; }
                if (!is_array($fact)) throw new InvalidArgumentException('Facts must be text or label/value objects.');
                ca_text($fact['label'] ?? null, $field . '.label', 300);
                ca_text($fact['value'] ?? null, $field . '.value', 3000);
                foreach (['source','year','type','topic'] as $key) {
                    if (isset($fact[$key])) ca_text($fact[$key], $field . '.' . $key, 2000, false);
                }
            }
        }
        foreach (ca_list($story['timeline'] ?? [], 'timeline', 30) as $event) {
            if (!is_array($event)) throw new InvalidArgumentException('Timeline entries must be objects.');
            ca_text($event['date'] ?? null, 'timeline.date', 120);
            ca_text($event['text'] ?? null, 'timeline.text', 3000);
        }
    }
    return $data;
}
function ca_json_encode(mixed $data): string
{
    return json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
}
function ca_search_text(mixed $data): string
{
    if (is_string($data)) return $data;
    if (!is_array($data)) return '';
    return implode(' ', array_map('ca_search_text', array_values($data)));
}
