<?php
declare(strict_types=1);
// Presentation rollout only. Authentication, profile completion and entitlements remain separate.
function cssv_workspace_enabled(): bool {
    return cssv_env('CSSV_WORKSPACE_PREVIEW_ENABLED', '1') === '1';
}
