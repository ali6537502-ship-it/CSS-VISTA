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

    // Pro launch stays closed until commercial terms/account use are approved.
    // These flags are an operational release gate, not a client entitlement.
    'CSSV_PRO_COLLECTION_ENABLED' => '0',
    'CSSV_PRO_COLLECTION_APPROVED' => '0',
    'CSSV_PRO_PRICE_MINOR' => '195000', // PKR 1,950, integer paisa
    'CSSV_PRO_RECEIVER_NUMBER' => '03055199994', // preserve leading zero
    'CSSV_PRO_RECEIVER_TITLE' => 'Ali Hassan',
    'CSSV_PRO_TERMS_VERSION' => '',
    'CSSV_PRO_TERMS_TEXT' => '', // supply owner-approved terms before opening

    // AI foundation: private server-only configuration; no live action endpoint
    // is published in Phase 1B. Verify model access/terms before future enabling.
    'CSSV_AI_ENABLED' => '0',
    'CSSV_AI_APPROVED' => '0',
    'CSSV_AI_MODEL_VERIFIED' => '0',
    'CSSV_OPENAI_API_KEY' => '',
    'CSSV_AI_MODEL' => 'gpt-6-luna',
    'CSSV_AI_LIMIT_PRECIS' => '2',
    'CSSV_AI_LIMIT_PARAGRAPH' => '5',
    'CSSV_AI_LIMIT_SENTENCE' => '15',
    'CSSV_AI_LIMIT_TUTOR' => '20',
    'CSSV_AI_LIMIT_CURRENT_AFFAIRS' => '10',
    'CSSV_AI_LIMIT_MATHS' => '10',
    // Handwriting/OCR remain unavailable until their separate policy is defined.

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
