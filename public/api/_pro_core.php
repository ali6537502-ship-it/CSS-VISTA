<?php
declare(strict_types=1);

// Pure membership rules. No provider calls, account resets or learning writes.
function cssv_pro_period(DateTimeImmutable $activated, ?string $expiry): array
{
    $now = $activated->setTimezone(new DateTimeZone('UTC'));
    $previous = $expiry ? new DateTimeImmutable($expiry, new DateTimeZone('UTC')) : null;
    $start = $previous && $previous > $now ? $previous : $now;
    return ['activated_at'=>$now->format('Y-m-d H:i:s.u'), 'starts_at'=>$start->format('Y-m-d H:i:s.u'), 'expires_at'=>$start->modify('+30 days')->format('Y-m-d H:i:s.u')];
}

function cssv_pro_status(?array $membership, DateTimeImmutable $now): string
{
    if (!$membership || empty($membership['expires_at'])) return 'free';
    return new DateTimeImmutable($membership['expires_at'], new DateTimeZone('UTC')) > $now ? 'active' : 'expired';
}

function cssv_pro_destination(mixed $value): string
{
    // Only approved learning destinations. Never arbitrary URLs/query/fragment.
    $allowed = ['/account/dashboard','/account/english','/account/mpt','/account/precis','/grammar-course','/language-grammar','/current-affairs','/vistagram'];
    return is_string($value) && in_array($value, $allowed, true) ? $value : '/account/dashboard';
}

function cssv_pro_transaction(mixed $value): string
{
    if (!is_string($value)) throw new InvalidArgumentException('Enter the Easypaisa transaction ID.');
    $id = strtoupper(trim($value));
    if (!preg_match('/^[A-Z0-9-]{4,80}$/D', $id)) throw new InvalidArgumentException('Enter a valid transaction ID using letters, numbers or hyphens.');
    return $id;
}

function cssv_pro_fields(array $body, array $allowed): void
{
    if (array_diff(array_keys($body), $allowed)) throw new InvalidArgumentException('This request contains unsupported fields.');
}

function cssv_pro_id(mixed $value): string
{
    if (!is_string($value) || !preg_match('/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/Di', $value)) throw new InvalidArgumentException('Please refresh and try again.');
    return strtolower($value);
}
