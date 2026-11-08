<?php
declare(strict_types=1);
require_once __DIR__.'/_free_learning.php';
// Compatibility for saved clients/records. There is no Pro launch or paid tier.
function cssv_pro_release_paused(): bool { return false; }
function cssv_pro_release_require_open(): void {}
function cssv_pro_release_student_endpoint(string $script): bool { return false; }
