<?php
declare(strict_types=1);
require_once __DIR__.'/_pro_core.php';
function cssv_learning_string(mixed $v, int $max, string $label, bool $empty=false): string {
    if (!is_string($v) || !mb_check_encoding($v,'UTF-8') || preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F]/u',$v)) throw new InvalidArgumentException("Enter valid $label.");
    $v=trim(str_replace(["\r\n","\r"],"\n",$v));
    if ((!$empty && $v==='') || mb_strlen($v)>$max) throw new InvalidArgumentException("Enter $label within $max characters.");
    return $v;
}
function cssv_learning_words(string $text): int { return preg_match_all('/[\p{L}\p{N}]+(?:[’\x27-][\p{L}\p{N}]+)*/u',$text); }
function cssv_learning_catalog(): array {
    $data=json_decode((string)file_get_contents(dirname(__DIR__).'/fpsc-syllabus.json'),true,64,JSON_THROW_ON_ERROR);
    return array_values(array_map(fn($s)=>array_intersect_key($s,array_flip(['slug','name','marks','group'])),array_filter($data['subjects'],fn($s)=>$s['designation']==='optional')));
}
function cssv_learning_attempt_input(array $body): array {
    $year=$body['target_year'] ?? null; $minutes=$body['daily_minutes'] ?? null; $stage=$body['stage'] ?? null; $date=$body['target_date'] ?? null;
    if (!is_int($year) || $year<2000 || $year>2100 || !is_int($minutes) || $minutes<15 || $minutes>1440 || !in_array($stage,['starting','in_progress','revision'],true)) throw new InvalidArgumentException('Check the target year, study time and preparation stage.');
    if ($date!==null) {
        if (!is_string($date) || !preg_match('/^\d{4}-\d{2}-\d{2}$/D',$date) || substr($date,0,4)!==(string)$year) throw new InvalidArgumentException('Choose a target date in the selected year.');
        $d=DateTimeImmutable::createFromFormat('!Y-m-d',$date); if (!$d || $d->format('Y-m-d')!==$date) throw new InvalidArgumentException('Choose a valid target date.');
    }
    $ids=$body['optional_subject_ids'] ?? null;
    if (!is_array($ids) || !array_is_list($ids) || count($ids)>6 || count(array_unique($ids,SORT_REGULAR))!==count($ids)) throw new InvalidArgumentException('Choose distinct optional subjects from the catalogue.');
    $catalog=array_column(cssv_learning_catalog(),null,'slug'); $total=0;
    foreach ($ids as $id) { if (!is_string($id) || !isset($catalog[$id])) throw new InvalidArgumentException('Choose an available optional subject.'); $total+=(int)$catalog[$id]['marks']; }
    // This is a preparation shortlist, not certification of an examination selection.
    if ($total>600) throw new InvalidArgumentException('Keep your preparation shortlist within 600 optional marks.');
    sort($ids); return ['target_year'=>$year,'target_date'=>$date,'optional_subject_ids'=>$ids,'daily_minutes'=>$minutes,'stage'=>$stage];
}
function cssv_ai_bucket(DateTimeImmutable $now): string { return $now->setTimezone(new DateTimeZone('Asia/Karachi'))->format('Y-m-d'); }
function cssv_ai_features(): array { return ['precis'=>2,'paragraph'=>5,'sentence'=>15,'tutor'=>20,'current_affairs'=>10,'maths'=>10]; }
function cssv_writing_codes(): array { return ['article_usage','subject_verb_agreement','run_on_sentence','sentence_fragment','tense_consistency','punctuation','weak_transition','vocabulary_repetition','vague_expression','weak_topic_sentence','coherence','awkward_word_choice','redundancy','informal_expression','preposition_error','pronoun_reference']; }
function cssv_writing_result(array $result,string $text): array {
    cssv_pro_fields($result,['summary','findings']);
    $summary=cssv_learning_string($result['summary'] ?? null,2000,'feedback summary'); $findings=$result['findings'] ?? null;
    if (!is_array($findings) || !array_is_list($findings) || count($findings)>30) throw new InvalidArgumentException('Invalid findings.');
    foreach ($findings as &$f) {
        if (!is_array($f)) throw new InvalidArgumentException('Invalid finding.'); cssv_pro_fields($f,['code','severity','excerpt','explanation','hint']);
        if (!in_array($f['code'] ?? null,cssv_writing_codes(),true) || !in_array($f['severity'] ?? null,['minor','moderate','major'],true)) throw new InvalidArgumentException('Unknown finding category.');
        foreach (['excerpt','explanation','hint'] as $key) $f[$key]=cssv_learning_string($f[$key] ?? null,2000,$key);
        if (!str_contains($text,$f['excerpt'])) throw new InvalidArgumentException('Finding is not anchored in submitted wording.');
    } unset($f);
    return ['summary'=>$summary,'findings'=>$findings];
}
