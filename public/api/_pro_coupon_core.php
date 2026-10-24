<?php
declare(strict_types=1);

function cssv_coupon_code(mixed $value): string {
    if (!is_string($value)) throw new InvalidArgumentException('Enter your coupon code.');
    $code = strtoupper(trim($value));
    if (!preg_match('/^[A-Z0-9-]{16,64}$/D', $code)) throw new InvalidArgumentException('Enter a valid coupon code.');
    return $code;
}
function cssv_coupon_amount(string $kind, int $value, int $base): int {
    if ($base < 1) throw new LogicException('Pro pricing is unavailable.');
    if ($kind === 'complimentary' && $value === 0) return 0;
    if ($kind === 'percent' && $value >= 1 && $value <= 99) return $base - intdiv($base * $value, 100);
    if ($kind === 'fixed' && $value >= 1 && $value < $base) return $base - $value;
    throw new InvalidArgumentException('Choose a valid discount. Use complimentary access for a fully free period.');
}
