<?php
declare(strict_types=1);

function cssv_topic_slug(mixed $value): string {
    if (!is_string($value) || !preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/D',$value) || strlen($value)>96) throw new InvalidArgumentException('Choose a valid topic.');
    return $value;
}
function cssv_topic_text(mixed $value,int $maximum,string $label): string {
    if (!is_string($value) || !mb_check_encoding($value,'UTF-8') || trim($value)==='' || mb_strlen($value)>$maximum || preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F]/',$value)) throw new InvalidArgumentException('Check '.$label.'.');
    return trim($value);
}
function cssv_topic_date(mixed $value): string {
    if (!is_string($value) || !preg_match('/^\d{4}-\d{2}-\d{2}$/D',$value)) throw new InvalidArgumentException('Use a valid source date.');
    $date=DateTimeImmutable::createFromFormat('!Y-m-d',$value,new DateTimeZone('Asia/Karachi'));
    if (!$date || $date->format('Y-m-d')!==$value) throw new InvalidArgumentException('Use a real calendar date.');
    return $value;
}
function cssv_topic_today(): string { return (new DateTimeImmutable('now',new DateTimeZone('Asia/Karachi')))->format('Y-m-d'); }
function cssv_topic_add_days(string $date,int $days): string { return (new DateTimeImmutable($date,new DateTimeZone('Asia/Karachi')))->modify('+'.$days.' days')->format('Y-m-d'); }
function cssv_topic_list(mixed $value,int $minimum,int $maximum,string $label): array {
    if (!is_array($value) || !array_is_list($value) || count($value)<$minimum || count($value)>$maximum) throw new InvalidArgumentException('Check '.$label.'.');
    return $value;
}
function cssv_topic_definition(mixed $input): array {
    if (!is_array($input) || array_is_list($input)) throw new InvalidArgumentException('Provide a native topic object.');
    cssv_pro_fields($input,['id','title','summary','category','author','as_of','sources','subjects','sections','references','questions','practice','learning_format']);
    if(array_key_exists('learning_format',$input) && $input['learning_format']!=='guided-course')throw new InvalidArgumentException('Choose a supported learning format.');
    $id=cssv_topic_slug($input['id']??null);
    $title=cssv_topic_text($input['title']??null,200,'topic title');
    $summary=cssv_topic_text($input['summary']??null,600,'topic summary');
    $category=$input['category']??null;
    if (!in_array($category,['history','governance','society','economy','security','international','environment'],true)) throw new InvalidArgumentException('Choose a topic category.');
    $author=cssv_topic_text($input['author']??null,120,'source attribution');
    $asOf=cssv_topic_date($input['as_of']??null);
    if ($asOf>cssv_topic_today()) throw new InvalidArgumentException('Do not publish future source claims as current.');
    $subjects=cssv_topic_list($input['subjects']??null,1,6,'subject mappings');
    foreach($subjects as $subject) if(!in_array($subject,['pakistan-affairs','current-affairs','international-relations','political-science','environmental-science','english-essay'],true)) throw new InvalidArgumentException('Unsupported study-subject mapping.');
    if(count(array_unique($subjects))!==count($subjects)) throw new InvalidArgumentException('Repeated subject mapping.');
    $sources=[];
    foreach(cssv_topic_list($input['sources']??null,1,8,'owner sources') as $source) {
        if(!is_array($source)) throw new InvalidArgumentException('Check owner-source attribution.');
        cssv_pro_fields($source,['title','sha256','pages']);
        $hash=$source['sha256']??null;
        if(!is_string($hash)||!preg_match('/^[a-f0-9]{64}$/D',$hash))throw new InvalidArgumentException('Provide the actual owner-source checksum.');
        $pages=cssv_topic_list($source['pages']??[],0,500,'source pages');
        foreach($pages as $page)if(!is_int($page)||$page<1||$page>5000)throw new InvalidArgumentException('Check source page references.');
        $sources[]=['title'=>cssv_topic_text($source['title']??null,240,'source title'),'sha256'=>$hash,'pages'=>array_values(array_unique($pages))];
    }
    $references=[];$referenceIds=[];
    foreach(cssv_topic_list($input['references']??null,1,24,'verification references') as $reference) {
        if(!is_array($reference))throw new InvalidArgumentException('Check a verification reference.');
        cssv_pro_fields($reference,['id','label','url','accessed_on','document_date']);
        $key=cssv_topic_slug($reference['id']??null);if(isset($referenceIds[$key]))throw new InvalidArgumentException('Repeated reference identity.');
        $url=cssv_topic_text($reference['url']??null,1200,'reference URL');$parts=parse_url($url);$host=$parts['host']??'';
        if(($parts['scheme']??'')!=='https'||$host===''||isset($parts['user'])||isset($parts['pass'])||isset($parts['port'])||filter_var($host,FILTER_VALIDATE_IP)||$host==='localhost'||!str_contains($host,'.'))throw new InvalidArgumentException('Use an HTTPS verification reference.');
        $accessed=cssv_topic_date($reference['accessed_on']??null);if($accessed>cssv_topic_today())throw new InvalidArgumentException('A reference cannot have been checked in the future.');
        $documentDate=isset($reference['document_date'])?cssv_topic_date($reference['document_date']):null;if($documentDate!==null&&$documentDate>$accessed)throw new InvalidArgumentException('A reference document cannot postdate its verification.');
        $references[]=['id'=>$key,'label'=>cssv_topic_text($reference['label']??null,260,'reference label'),'url'=>$url,'accessed_on'=>$accessed,'document_date'=>$documentDate];$referenceIds[$key]=true;
    }
    $refList=function(mixed $value) use($referenceIds):array{
        $ids=cssv_topic_list($value,1,8,'section references');foreach($ids as $key)if(!is_string($key)||!isset($referenceIds[$key]))throw new InvalidArgumentException('Use a reference from this topic.');return array_values(array_unique($ids));
    };
    $sections=[];$sectionIds=[];
    foreach(cssv_topic_list($input['sections']??null,3,24,'learning sections') as $section) {
        if(!is_array($section))throw new InvalidArgumentException('Check a learning section.');
        cssv_pro_fields($section,['id','title','kind','blocks','reference_ids']);
        $key=cssv_topic_slug($section['id']??null);if(isset($sectionIds[$key]))throw new InvalidArgumentException('Repeated section identity.');
        $kind=$section['kind']??null;
        if(!in_array($kind,['overview','concept-builder','background','current-situation','causes','dimensions','pakistan-perspective','arguments','counterarguments','facts-data','examples','critical-analysis','way-forward','exam-application','revision'],true))throw new InvalidArgumentException('Choose a supported section type.');
        $blocks=cssv_topic_list($section['blocks']??null,1,24,'section text');foreach($blocks as &$block)$block=cssv_topic_text($block,5000,'learning text');unset($block);
        $sections[]=['id'=>$key,'title'=>cssv_topic_text($section['title']??null,160,'section title'),'kind'=>$kind,'blocks'=>$blocks,'reference_ids'=>$refList($section['reference_ids']??null)];$sectionIds[$key]=true;
    }
    $questions=[];$questionIds=[];$questionPrompts=[];$modes=['learn'=>0,'revision'=>0];
    foreach(cssv_topic_list($input['questions']??null,6,96,'fixed practice questions') as $question) {
        if(!is_array($question))throw new InvalidArgumentException('Check a fixed question.');
        cssv_pro_fields($question,['id','mode','prompt','options','answer','explanation','section_id','reference_ids']);
        $key=cssv_topic_slug($question['id']??null);if(isset($questionIds[$key]))throw new InvalidArgumentException('Repeated question identity.');
        $mode=$question['mode']??null;if(!is_string($mode)||!array_key_exists($mode,$modes))throw new InvalidArgumentException('Choose learning or revision practice.');
        $options=cssv_topic_list($question['options']??null,4,4,'answer options');foreach($options as &$option)$option=cssv_topic_text($option,350,'an answer option');unset($option);
        if(count(array_unique(array_map(fn($o)=>mb_strtolower($o),$options)))!==4)throw new InvalidArgumentException('Each distractor must be distinct.');
        $answer=$question['answer']??null;if(!is_int($answer)||$answer<0||$answer>3)throw new InvalidArgumentException('Provide one fixed correct answer.');
        $section=$question['section_id']??null;if(!is_string($section)||!isset($sectionIds[$section]))throw new InvalidArgumentException('Link practice to its actual lesson section.');
        $prompt=cssv_topic_text($question['prompt']??null,1000,'question wording');$normalized=mb_strtolower(preg_replace('/\s+/u',' ',$prompt));if(isset($questionPrompts[$normalized]))throw new InvalidArgumentException('Use distinct learning and revision questions.');$questionPrompts[$normalized]=true;
        $questions[]=['id'=>$key,'mode'=>$mode,'prompt'=>$prompt,'options'=>$options,'answer'=>$answer,'explanation'=>cssv_topic_text($question['explanation']??null,2000,'answer explanation'),'section_id'=>$section,'reference_ids'=>$refList($question['reference_ids']??null)];$questionIds[$key]=true;$modes[$mode]++;
    }
    if(min($modes)<3)throw new InvalidArgumentException('Include at least three learning and three separate revision questions.');
    if(array_key_exists('learning_format',$input)){
        $covered=array_column(array_filter($questions,fn($q)=>$q['mode']==='learn'),'section_id');
        foreach(array_keys($sectionIds) as $section)if(!in_array($section,$covered,true))throw new InvalidArgumentException('Each guided section needs its own reviewed learning question.');
    }
    $practice=$input['practice']??null;if(!is_array($practice))throw new InvalidArgumentException('Provide an independent writing task.');
    cssv_pro_fields($practice,['prompt','focus','min_words','max_words']);
    $minimum=$practice['min_words']??null;$maximum=$practice['max_words']??null;
    if(!is_int($minimum)||$minimum<50||$minimum>200||!is_int($maximum)||$maximum<$minimum||$maximum>600)throw new InvalidArgumentException('Check independent-practice lengths.');
    $practice=['prompt'=>cssv_topic_text($practice['prompt']??null,1200,'writing task'),'focus'=>cssv_topic_text($practice['focus']??null,800,'writing focus'),'min_words'=>$minimum,'max_words'=>$maximum];
    $result=['id'=>$id,'title'=>$title,'summary'=>$summary,'category'=>$category,'author'=>$author,'as_of'=>$asOf,'sources'=>$sources,'subjects'=>$subjects,'sections'=>$sections,'references'=>$references,'questions'=>$questions,'practice'=>$practice];
    // Keep existing definitions byte-canonical: the optional format changes only new editions.
    if(array_key_exists('learning_format',$input))$result['learning_format']='guided-course';
    if(strlen(json_encode($result,JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE))>524288)throw new InvalidArgumentException('Keep each native module within 512 KiB.');
    return $result;
}
function cssv_topic_hash(array $definition): string { return hash('sha256',json_encode($definition,JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE)); }
function cssv_topic_client_content(array $definition): array {
    foreach($definition['questions'] as &$question)unset($question['answer'],$question['explanation']);unset($question);
    foreach($definition['sources'] as &$source)unset($source['sha256']);unset($source);
    return $definition;
}
function cssv_topic_grade(array $definition,string $mode,mixed $choices): array {
    if(!is_array($choices)||array_is_list($choices))throw new InvalidArgumentException('Answer every question in this check.');
    $questions=array_values(array_filter($definition['questions'],fn($q)=>$q['mode']===$mode));
    $expected=array_column($questions,'id');$keys=array_keys($choices);sort($expected);sort($keys);
    if($expected!==$keys)throw new InvalidArgumentException('Answer the exact questions for this check.');
    $results=[];$correct=0;
    foreach($questions as $question){$choice=$choices[$question['id']];if(!is_int($choice)||$choice<0||$choice>3)throw new InvalidArgumentException('Choose one available answer for each question.');$right=$choice===$question['answer'];if($right)$correct++;
        $results[]=['id'=>$question['id'],'prompt'=>$question['prompt'],'options'=>$question['options'],'choice'=>$choice,'correct'=>$right,'answer'=>$question['answer'],'explanation'=>$question['explanation'],'section_id'=>$question['section_id'],'reference_ids'=>$question['reference_ids']];
    }
    return ['mode'=>$mode,'correct'=>$correct,'total'=>count($questions),'score'=>(int)round(100*$correct/count($questions)),'passed'=>$correct/count($questions)>=0.8,'results'=>$results];
}
function cssv_topic_guided_grade(array $definition,mixed $questionId,mixed $choice): array {
    if(!is_string($questionId))throw new InvalidArgumentException('Choose an actual learning question.');
    $questions=array_values(array_filter($definition['questions'],fn($q)=>$q['id']===$questionId && $q['mode']==='learn'));
    if(count($questions)!==1)throw new InvalidArgumentException('Guided practice uses a learning question, not a scheduled revision answer.');
    $graded=cssv_topic_grade([...$definition,'questions'=>$questions],'learn',[$questionId=>$choice]);
    $graded['mode']='guided';return $graded;
}
function cssv_topic_state(array $progress,array $definition,string $today): string {
    if(!$progress || empty($progress['started_at']))return 'not_started';
    $complete=count(array_intersect($progress['completed'],array_column($definition['sections'],'id')))===count($definition['sections']);
    if(!$complete || ($progress['learn_score']??0)<80)return 'learning';
    if(($progress['draft_words']??0)<$definition['practice']['min_words'])return 'understood';
    if(!empty($progress['next_revision']) && $progress['next_revision']<=$today)return 'revision_due';
    if(($progress['revision_score']??0)>=80 && ($progress['review_count']??0)>0)return 'mastered';
    return 'practised';
}
