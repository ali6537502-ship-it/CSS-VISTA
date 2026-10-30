<?php
declare(strict_types=1);

// Owner authorises the Précis Guide release on 30 October 2026.
// All other Pro capabilities, external evaluation and payment collection remain paused.
// The sole preview exception is the existing isolated CI database, never a cookie,
// request header, student role or publicly writable configuration.
function cssv_pro_release_paused(): bool {
    if (getenv('CI') === 'true' && getenv('CSSV_DB_NAME') === 'cssvista_briefing_test') {
        return function_exists('cssv_env') ? cssv_env('CSSV_PRO_RELEASE_TEST_PAUSED','0') === '1' : getenv('CSSV_PRO_RELEASE_TEST_PAUSED') === '1';
    }
    return true;
}

function cssv_pro_release_require_open(): void {
    if (cssv_pro_release_paused()) cssv_fail('CSS Vista Pro is temporarily unavailable while it is being finalised. Your saved records are retained.', 503, 'pro_release_paused');
}

function cssv_pro_release_student_endpoint(string $script): bool {
    return in_array(basename($script), ['precis-feedback.php','expression.php','skills.php','handwriting.php','handwriting-image.php','tutor.php','topics.php','ability.php','mentor.php','ai-usage.php'], true)
        && basename(dirname($script)) === 'student';
}
