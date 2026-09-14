<?php
declare(strict_types=1);

// This checklist is the single source of truth for account-service access.
function cssv_profile_status(array $p): array {
    $text = static fn(string $key): bool => is_string($p[$key] ?? null) && trim($p[$key]) !== '';
    $subjects = $p['optional_subjects'] ?? [];
    if (is_string($subjects)) $subjects = json_decode($subjects, true);
    $subjectsValid = is_array($subjects) && count($subjects) > 0 && count($subjects) <= 20;
    if ($subjectsValid) foreach ($subjects as $s) if (!is_string($s) || trim($s) === '' || mb_strlen($s) > 120) $subjectsValid = false;
    $dob = is_string($p['date_of_birth'] ?? null) ? DateTimeImmutable::createFromFormat('!Y-m-d', $p['date_of_birth']) : false;
    $checks = [
        ['key'=>'photo','label'=>'Profile photo','complete'=>$text('profile_photo_path') && (int)($p['profile_photo_bytes'] ?? 0) > 0],
        ['key'=>'display_name','label'=>'Full name','complete'=>$text('display_name')],
        ['key'=>'contact','label'=>'Contact number','complete'=>$text('phone') || $text('whatsapp')],
        ['key'=>'date_of_birth','label'=>'Date of birth','complete'=>$dob && $dob->format('Y-m-d') === $p['date_of_birth'] && $dob <= new DateTimeImmutable('today') && $dob >= new DateTimeImmutable('-100 years')],
        ['key'=>'gender','label'=>'Gender','complete'=>$text('gender')],
        ['key'=>'city','label'=>'City','complete'=>$text('city')],
        ['key'=>'province_region','label'=>'Province / region','complete'=>$text('province_region')],
        ['key'=>'country','label'=>'Country','complete'=>$text('country')],
        ['key'=>'css_attempt_year','label'=>'Attempt year','complete'=>(int)($p['css_attempt_year'] ?? 0) >= 2020 && (int)($p['css_attempt_year'] ?? 0) <= 2040],
        ['key'=>'preparation_level','label'=>'Preparation level','complete'=>$text('preparation_level')],
        ['key'=>'optional_subjects','label'=>'Optional subjects','complete'=>$subjectsValid],
        ['key'=>'education','label'=>'Education','complete'=>$text('education')],
    ];
    $done = count(array_filter($checks, static fn($c) => $c['complete']));
    return ['checks'=>$checks,'completed'=>$done,'total'=>12,'percent'=>(int)round($done / 12 * 100),'complete'=>$done === 12];
}

function cssv_profile_for_user(PDO $pdo, string $id): array {
    $q = $pdo->prepare('SELECT * FROM student_profiles WHERE user_id=? LIMIT 1');
    $q->execute([$id]);
    return $q->fetch() ?: [];
}

function cssv_refresh_profile_completion(PDO $pdo, string $id): array {
    $status = cssv_profile_status(cssv_profile_for_user($pdo, $id));
    $pdo->prepare('UPDATE student_profiles SET profile_completed_at=CASE WHEN ? THEN COALESCE(profile_completed_at,NOW(6)) ELSE NULL END WHERE user_id=?')->execute([$status['complete'] ? 1 : 0, $id]);
    return $status;
}

function cssv_ensure_previous_student_history_schema(PDO $pdo): void
{
    static $ready = false;
    if ($ready) return;

    if ((int)$pdo->query("SELECT GET_LOCK('cssvista-previous-student-history',5)")->fetchColumn() !== 1) {
        throw new RuntimeException('previous_student_history_schema_lock_failed');
    }

    try {
        $columns = [
            'previous_css_vista_student' => "VARCHAR(64) NOT NULL DEFAULT '' AFTER previous_academy_mentor",
            'previous_css_vista_services' => 'JSON NULL AFTER previous_css_vista_student',
            'previous_css_vista_details' => "VARCHAR(500) NOT NULL DEFAULT '' AFTER previous_css_vista_services",
        ];
        $exists = $pdo->prepare(
            "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='student_profiles' AND column_name=?"
        );
        foreach ($columns as $name => $definition) {
            $exists->execute([$name]);
            if ((int)$exists->fetchColumn() === 0) {
                $pdo->exec('ALTER TABLE student_profiles ADD COLUMN `' . $name . '` ' . $definition);
            }
        }
        $ready = true;
    } finally {
        $pdo->query("SELECT RELEASE_LOCK('cssvista-previous-student-history')");
    }
}
