<?php
declare(strict_types=1);

// TEMPLATE ONLY. Never commit a real copy with credentials.
// On Hostinger shared hosting, place the real file OUTSIDE public_html at:
//   ../cssv-private/config.php
// or point CSSV_CONFIG_FILE to another private absolute path.
return [
    'CSSV_DB_HOST' => 'localhost',
    'CSSV_DB_PORT' => '3306',
    'CSSV_DB_NAME' => 'replace_me',
    'CSSV_DB_USER' => 'replace_me',
    'CSSV_DB_PASSWORD' => 'replace_me',
    'CSSV_APP_SECRET' => 'replace_with_at_least_64_random_characters',
    'CSSV_PRIVATE_STORAGE_DIR' => '/home/replace_me/cssv-private/uploads',

    // Temporary only while existing accounts are being bridged.
    'CSSV_SUPABASE_URL' => 'https://your-project.supabase.co',
    'CSSV_SUPABASE_PUBLISHABLE_KEY' => 'sb_publishable_replace_me',

    // Private migration runner only. Never expose this in browser code.
    'CSSV_SUPABASE_SECRET_KEY' => 'sb_secret_replace_me',

    // Optional one-time schema bootstrap endpoint token. Store the same value
    // as a GitHub Actions repository secret, never in a committed workflow.
    'CSSV_BOOTSTRAP_TOKEN' => 'replace_with_a_unique_random_value',

    // Hostinger mailbox / SMTP settings.
    'CSSV_SMTP_HOST' => 'smtp.hostinger.com',
    'CSSV_SMTP_PORT' => '465',
    'CSSV_SMTP_ENCRYPTION' => 'ssl',
    'CSSV_SMTP_USER' => 'noreply@css-vista.com',
    'CSSV_SMTP_PASSWORD' => 'replace_me',
    'CSSV_MAIL_FROM' => 'noreply@css-vista.com',
    'CSSV_MAIL_FROM_NAME' => 'CSS Vista',
    'CSSV_PASSWORD_RESET_URL' => 'https://www.css-vista.com/account/reset-password',
];
