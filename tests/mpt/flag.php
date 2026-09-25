<?php
declare(strict_types=1);
// Feature-flag rules (D-10). No database needed: `php tests/mpt/flag.php`.
require __DIR__ . '/../../public/api/_mpt.php';
$failures = 0;
$check = static function (bool $ok, string $label) use (&$failures): void { if (!$ok) { $failures++; fwrite(STDERR, "FAIL: $label\n"); } };
$pilot = ['email' => 'Pilot@Example.invalid'];
$other = ['email' => 'someone@example.invalid'];
putenv('CSSV_MPT_APPLICATION_FLOW');
$check(mpt_flag_mode() === 'off', 'defaults to off');
$check(!mpt_enabled_for($pilot) && !mpt_enabled_for(null), 'off admits nobody');
putenv('CSSV_MPT_APPLICATION_FLOW=pilot');
putenv('CSSV_MPT_PILOT_EMAILS=pilot@example.invalid, owner@example.invalid');
$check(mpt_enabled_for($pilot), 'pilot admits allowlisted accounts (case-insensitive)');
$check(!mpt_enabled_for($other) && !mpt_enabled_for(null), 'pilot excludes everyone else');
putenv('CSSV_MPT_APPLICATION_FLOW=on');
$check(mpt_enabled_for($other) && mpt_enabled_for(null), 'on admits everyone');
putenv('CSSV_MPT_APPLICATION_FLOW=yes');
$check(mpt_flag_mode() === 'off', 'unknown values fail closed');
echo "MPT flag: " . ($failures === 0 ? 'passed' : "$failures failed") . PHP_EOL;
exit($failures === 0 ? 0 : 1);
