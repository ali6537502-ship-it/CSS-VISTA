<?php
declare(strict_types=1);

function cssv_resource_keypair(): array
{
    $dir = cssv_private_storage_dir('resources');
    $path = $dir . '/book-private-key.pem';
    $lock = fopen($dir . '/book-key.lock', 'c');
    if (!$lock || !flock($lock, LOCK_EX)) cssv_fail('Resource storage is temporarily unavailable.', 503, 'resource_storage_unavailable');
    try {
        if (!is_file($path)) {
            $key = openssl_pkey_new(['private_key_bits'=>3072, 'private_key_type'=>OPENSSL_KEYTYPE_RSA]);
            if (!$key || !openssl_pkey_export($key, $pem)) cssv_fail('Resource storage is temporarily unavailable.', 503, 'resource_storage_unavailable');
            $temp = tempnam($dir, 'book-key-');
            if ($temp === false) cssv_fail('Resource storage is temporarily unavailable.', 503, 'resource_storage_unavailable');
            chmod($temp, 0600);
            if (file_put_contents($temp, $pem) === false || !rename($temp, $path)) {
                @unlink($temp);
                cssv_fail('Resource storage is temporarily unavailable.', 503, 'resource_storage_unavailable');
            }
        }
        $private = openssl_pkey_get_private((string)file_get_contents($path));
        $details = $private ? openssl_pkey_get_details($private) : false;
        if (!$private || !$details) cssv_fail('Resource storage is temporarily unavailable.', 503, 'resource_storage_unavailable');
        return ['private'=>$private, 'public'=>$details['key'], 'id'=>hash('sha256', $details['key'])];
    } finally {
        flock($lock, LOCK_UN);
        fclose($lock);
    }
}

function cssv_resource_decrypt(array $payload): string
{
    $keys = cssv_resource_keypair();
    if (!hash_equals($keys['id'], (string)($payload['key_id'] ?? ''))) cssv_fail('This book is temporarily unavailable.', 503, 'resource_unavailable');
    $wrapped = base64_decode((string)($payload['wrapped_key'] ?? ''), true);
    $iv = base64_decode((string)($payload['iv'] ?? ''), true);
    $tag = base64_decode((string)($payload['tag'] ?? ''), true);
    $ciphertext = '';
    $parts = $payload['parts'] ?? null;
    if (is_array($parts) && count($parts) > 0 && count($parts) <= 16) {
        foreach ($parts as $part) {
            if (!is_string($part) || !preg_match('/^[a-z0-9-]+-part-[0-9]+\.php$/D', $part)) cssv_fail('This book is temporarily unavailable.', 503, 'resource_unavailable');
            $path = __DIR__ . '/_resource_files/' . $part;
            if (!is_file($path)) cssv_fail('This book is temporarily unavailable.', 503, 'resource_unavailable');
            $encoded = require $path;
            $decoded = is_string($encoded) ? base64_decode($encoded, true) : false;
            if ($decoded === false) cssv_fail('This book is temporarily unavailable.', 503, 'resource_unavailable');
            $ciphertext .= $decoded;
            unset($encoded, $decoded);
        }
    } else {
        $ciphertext = base64_decode((string)($payload['ciphertext'] ?? ''), true);
    }
    if ($wrapped === false || $iv === false || strlen($iv) !== 12 || $tag === false || strlen($tag) !== 16 || $ciphertext === false || !openssl_private_decrypt($wrapped, $key, $keys['private'], OPENSSL_PKCS1_OAEP_PADDING) || strlen($key) !== 32) {
        cssv_fail('This book is temporarily unavailable.', 503, 'resource_unavailable');
    }
    $pdf = openssl_decrypt($ciphertext, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag);
    if ($pdf === false || !str_starts_with($pdf, '%PDF-') || !hash_equals((string)($payload['sha256'] ?? ''), hash('sha256', $pdf))) cssv_fail('This book is temporarily unavailable.', 503, 'resource_unavailable');
    return $pdf;
}
