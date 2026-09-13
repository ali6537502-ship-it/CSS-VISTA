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
    'CSSV_SITE_ORIGIN' => 'https://www.css-vista.com',
];
