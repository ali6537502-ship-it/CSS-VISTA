<?php
declare(strict_types=1);
require_once __DIR__.'/_learning_core.php';

/** Stable object identity across MySQL JSON formatting and key ordering. */
function cssv_skills_hash(array $value): string {
    $sort=static function(mixed $item)use(&$sort):mixed {if(!is_array($item))return $item;if(!array_is_list($item))ksort($item);foreach($item as &$child)$child=$sort($child);unset($child);return $item;};
    return hash('sha256',json_encode($sort($value),JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE|JSON_PRESERVE_ZERO_FRACTION));
}
function cssv_skills_package(): array {
    static $package; return $package??=json_decode((string)file_get_contents(__DIR__.'/_premium_files/skills-curriculum.json'),true,64,JSON_THROW_ON_ERROR);
}
function cssv_skills_feature(mixed $value): string {
    if(!in_array($value,['sentence','argument','analysis','essay'],true))throw new InvalidArgumentException('Choose an available skills workspace.');return $value;
}
function cssv_skills_stages(string $feature): array {
    $stage=static fn($id,$title,$teach,$example,$question,$min=5)=>['id'=>$id,'title'=>$title,'teach'=>$teach,'example'=>$example,'question'=>$question,'min_words'=>$min];
    $check=$stage('check','Understand the idea','Read the explanation and different worked example above. Answer this recognition question before writing. A wrong answer receives an explanation and can be retried.','Choose the option that follows the taught distinction.','Which option is defensible?',0);
    return match($feature){
        'sentence'=>[$check,
            $stage('draft','Write independently','Apply the lesson to a sentence of your own. Keep your meaning; do not copy the worked example.','For an access issue, name the actor and the specific action rather than writing only “Things should improve”.','Write your first sentence.',3),
            $stage('reflection','Review the wording','Identify the subject, verb and intended logical relationship. Check the relevant Grammar lesson. Optional AI feedback must target the saved wording, not your unsaved rewrite.','A conditional claim should retain its if clause or an equivalent condition.','What do you want the sentence to mean, and what needs checking?',5),
            $stage('revision','Revise independently','Rewrite using the lesson and any saved feedback. A new version preserves your earlier wording. You may retain wording you can defend; shorter is not automatically better.','Compare who acts, what is claimed, the time frame and any qualification.','Write your revised sentence.',3)],
        'argument'=>[$check,
            $stage('claim','Your claim','What do you think about the practice statement, and why? State a position that could be challenged. A topic name alone is not a claim.','A limited trial may be preferable to a permanent change when demand is uncertain. This is a hypothetical claim.','What is your central claim?',5),
            $stage('reasoning','Explain your reasoning','Explain how your reason supports your claim. Identify the mechanism or inference and what you are assuming.','A timetable overlap prevents attending both classes; moving one could remove that particular barrier.','Why should the reader accept your claim?',10),
            $stage('evidence','Select and check evidence','State what evidence would support the reason. If you offer a statistic, quotation or historical claim, include its real source and date or explicitly label it unverified. A citation supplied by a student is not automatically verified.','Dated class schedules could test an overlap claim. An invented percentage cannot.','What evidence is relevant, and what is its verification status?',8),
            $stage('counterargument','Consider an alternative','Give a serious objection, not a weak caricature. Explain why a reasonable opponent might raise it.','Longer hours might require supervision that the available staffing cannot provide.','What is the strongest relevant counterargument?',8),
            $stage('rebuttal','Answer the objection','Address the actual objection. Concede what is valid, state the conditions of your reply and identify evidence still needed.','A time-limited trial within an agreed staffing budget could test feasibility; it does not make costs vanish.','How do you answer or qualify your position?',10),
            $stage('final','Your final argument','Compose a connected argument in your own words. Include the claim, reasoning, evidence status, counterargument and qualified response. Optional AI reports are instructional, never examiner marks.','Use one controlling claim and connect each support to it. Do not paste a list of unrelated reasons.','Write your argument, then save later revisions independently.',20)],
        'analysis'=>[$check,
            $stage('mechanism','Explain a mechanism','Move from what happens to how or why it might happen. Name intermediate steps rather than claiming that one event proves another.','Unclear responsibility could cause repeated referrals, which could lengthen the decision process. This is a hypothesis to test.','What mechanism could connect the issue and outcome?',10),
            $stage('conditions','Identify conditions and assumptions','Under what conditions could the mechanism operate? Name rules, resources, institutional arrangements or assumptions that matter.','Clear responsibility may not reduce waiting if the main constraint is a missing resource.','What conditions or assumptions need checking?',8),
            $stage('alternatives','Compare explanations','Offer another plausible explanation and an observation that could distinguish it from yours. Consider reverse causation or a common cause where relevant.','Compare an approval-rule explanation with a staffing explanation using records of where tasks wait.','What competing explanation would you test?',10),
            $stage('evidence','Evaluate evidence','Identify relevant sources, dates, methods and scope. Mark unsupported claims and say what observation would support or challenge the mechanism.','A self-selected survey alone cannot establish the preferences of every student.','What evidence would help, and what are its limitations?',8),
            $stage('tradeoffs','Weigh consequences and trade-offs','Compare relevant dimensions, short- and long-term effects, a counterfactual and feasible options. Explain why a dimension changes the judgement.','Faster processing may require training now; ask what would happen without the change before attributing later differences to it.','Which consequences, trade-offs or counterfactuals matter?',12),
            $stage('conclusion','Reach a qualified conclusion','Develop a connected analytical paragraph. Weigh evidence rather than pretending every explanation is equally supported. State what remains uncertain.','A limited trial may be defensible if the identified resource condition can be met.','Write your reasoned conclusion and revise it after review.',20)],
        'essay'=>[
            $stage('understanding','1 · Understand the theme','Read the actual roadmap brief. State the central issue, a boundary and a question within that boundary. The roadmap gives research directions; it does not establish that every listed claim is true.','For a broad access theme, studying a specific barrier can be within scope; a disconnected personal preference may not be.','In your own words, what does this theme ask you to examine?',12),
            $stage('brainstorm','2 · Brainstorm','Generate your own ideas. Connect each to the theme and identify at least one idea that should be excluded. Beginners: start with who is affected, how and why. Intermediate: consider institutions and alternatives. Advanced: examine conditions and trade-offs.','An access proposal could raise questions about timing, resources and unequal effects; those are questions for research, not proven findings.','What relevant ideas and research questions can you develop?',15),
            $stage('thesis','3 · Develop a thesis','A theme is a topic; a thesis is a defensible central argument about it. State your position, reasoning direction and necessary qualification. Use the actual theme, not a generic slogan.','A trial can be defended under specified conditions without claiming it will solve every problem.','What is your provisional thesis?',8),
            $stage('argument','4 · Construct arguments','Develop a claim, reason and relevant support. Mark the evidence you still need. You can send this saved work to the Argumentation Builder and explicitly bring its revision back.','Explain why the reason supports the thesis rather than adding an unrelated impressive quotation.','Develop one argument supporting your thesis.',20),
            $stage('analysis','5 · Analyse critically','Examine a mechanism, competing view, limitation and implication. Use the Analytical Builder to strengthen your own analysis without replacing your essay record.','A plausible explanation still needs an alternative explanation and a way to distinguish them.','What analysis or counterargument changes your judgement?',20),
            $stage('outline','6 · Build an outline','Organise your thesis, main headings, arguments, evidence needs and conclusion. Check relevance, sequence, overlap and balance. Each heading needs a clear job.','A useful outline separates the central claim, supporting reasoning, serious objection and qualified conclusion.','Write your own outline, with a purpose for each main heading.',30),
            $stage('practice','7 · Practise and revise','Write an independent paragraph or essay draft based on your outline. Review organisation, logic, expression and coherence. Saved revisions preserve earlier versions; optional AI feedback is formative and cannot change human mentor marks.','After drafting, check whether each paragraph advances the thesis and whether factual support is actually verified.','Write independently, then revise after reviewing your saved work.',30)],
    };
}
function cssv_skills_source(string $feature,mixed $id,string $level): array {
    if(!in_array($level,['beginner','intermediate','advanced'],true))throw new InvalidArgumentException('Choose a study level.');
    if(!is_string($id)||strlen($id)>150)throw new InvalidArgumentException('Choose a supported lesson or theme.');
    if($feature==='essay'){
        $roadmap=json_decode((string)file_get_contents(dirname(__DIR__).'/study-material/essay-themes.json'),true,64,JSON_THROW_ON_ERROR);
        foreach($roadmap['themes'] as $theme)if($theme['slug']===$id){
            $source=['id'=>$id,'feature'=>'essay','title'=>$theme['name'],'level'=>$level,'explanation'=>$theme['brief'],
                'example'=>'Use the research directions to formulate questions. They are not a supplied thesis or a verified evidence bank.',
                'task'=>'Develop your own thesis and outline within '.$theme['name'].'.',
                'roadmap'=>['slug'=>$theme['slug'],'sections'=>$theme['sections']],
                'attribution'=>'Existing CSS Vista Essay Themes 2027 research roadmap; preserve its research directions and source-verification requirements.'];break;
        }
    }else foreach(cssv_skills_package()['lessons'] as $lesson)if($lesson['id']===$id&&$lesson['feature']===$feature){
        if($level!==$lesson['level'])throw new InvalidArgumentException('Use the lesson’s stated progression level.');$source=$lesson;break;
    }
    if(!isset($source))throw new OutOfBoundsException('This lesson or theme is unavailable.');
    $source['stages']=cssv_skills_stages($feature);
    if($feature==='essay'){
        $questions=match($level){
            'beginner'=>['understanding'=>'Explain the theme in two simple sentences. Name one issue that belongs within it.','brainstorm'=>'Who is affected, what difficulty might they face, and why does it belong to this theme?','thesis'=>'What do you think about one issue within the theme, and what is your main reason?','argument'=>'Write one claim, explain your reason, and name the evidence you would need.','analysis'=>'What is one possible objection, and when might your proposed answer fail?','outline'=>'Arrange your thesis, two different reasons, an objection and a conclusion into headings.','practice'=>'Write one paragraph from your outline in your own words.'],
            'intermediate'=>['understanding'=>'Define the central issue and distinguish it from a neighbouring topic.','brainstorm'=>'Group relevant ideas by institutions, effects and alternatives; explain one exclusion.','thesis'=>'State a defensible thesis with a reasoning direction and a condition.','argument'=>'Explain a mechanism linking your reason to your thesis and assess the evidence required.','analysis'=>'Compare a serious counterargument with your explanation and identify what would change your view.','outline'=>'Sequence distinct arguments, evidence needs, a counterargument and a qualified conclusion.','practice'=>'Develop connected paragraphs and independently revise the link between them.'],
            'advanced'=>['understanding'=>'Define the contested concept, the limits of the theme and a plausible competing framing.','brainstorm'=>'Develop competing explanations, structural dimensions and trade-offs; justify the scope you exclude.','thesis'=>'Construct a qualified thesis that specifies a mechanism, limits and the rival view it challenges.','argument'=>'Develop a defensible inference, state its assumptions, and explain how authentic evidence could challenge it.','analysis'=>'Use a counterfactual and competing mechanism to evaluate your claim; weigh short- and long-term trade-offs.','outline'=>'Create an evaluative outline that distinguishes evidence, inference, rebuttal, limitations and the resulting judgement.','practice'=>'Write an independent analytical essay draft or substantial section, then examine the weakest inferential link.']};
        foreach($source['stages'] as &$stage)$stage['question']=$questions[$stage['id']];unset($stage);
    }
    $source['edition']=cssv_skills_package()['version'];return $source;
}
function cssv_skills_public_source(array $source): array {
    if(isset($source['check']))unset($source['check']['answer'],$source['check']['explanation']);
    foreach($source['stages'] as &$stage)$stage['min_words']=cssv_skills_min_words($source['feature'],$stage);unset($stage);
    return $source;
}
/** A legitimate imperative can be one word; length records participation only. */
function cssv_skills_min_words(string $feature,array $stage): int {
    return $feature==='sentence'&&in_array($stage['id'],['draft','revision'],true)?1:(int)$stage['min_words'];
}
function cssv_skills_answers(array $answers,array $source): array {
    cssv_pro_fields($answers,array_column($source['stages'],'id'));$out=[];
    foreach($answers as $id=>$value){
        if($id==='check'){
            if(!is_int($value)||$value<0||$value>3)throw new InvalidArgumentException('Choose an available fixed-check option.');$out[$id]=$value;
        }else $out[$id]=cssv_learning_string($value,$source['feature']==='essay'&&$id==='practice'?20000:6000,'your response',true);
    }
    return $out;
}
function cssv_skills_evidence(array $source,array $answers): array {
    $recorded=[];$first=0;$feedback=null;
    foreach($source['stages'] as $index=>$stage){
        $value=$answers[$stage['id']]??null;
        if($stage['id']==='check'){
            $met=$value!==null&&$value===$source['check']['answer'];
            if($value!==null)$feedback=['correct'=>$met,'chosen'=>$source['check']['options'][$value],'answer'=>$source['check']['options'][$source['check']['answer']],'explanation'=>$source['check']['explanation']];
        }else $met=is_string($value)&&cssv_learning_words($value)>=cssv_skills_min_words($source['feature'],$stage);
        if($met)$recorded[]=$stage['id'];
        if($index===$first&&$met)$first++;
    }
    return ['recorded'=>$recorded,'next'=>min($first,count($source['stages'])-1),'all_recorded'=>$first===count($source['stages']),
        'check_feedback'=>$feedback,'basis'=>'Fixed checks use stored answers. Writing stages record participation and sufficient text for practice; they do not certify correctness, mastery or examination readiness.'];
}
function cssv_skills_wording(array $source,array $answers,?string $preferred=null): string {
    if($source['feature']==='sentence'){
        if(in_array($preferred,['draft','revision'],true)&&!empty($answers[$preferred]))return $answers[$preferred];
        foreach(['revision','draft','reflection'] as $field)if(!empty($answers[$field]))return $answers[$field];
        return isset($answers['check'])?$source['check']['options'][$answers['check']]:'';
    }
    $parts=[];foreach($source['stages'] as $stage)if(isset($answers[$stage['id']])){
        if($stage['id']==='check')$parts[]='Understanding response: '.$source['check']['options'][$answers['check']];
        elseif($answers[$stage['id']]!=='')$parts[]=$stage['title']."\n".$answers[$stage['id']];
    }
    $text=implode("\n\n",$parts);if(mb_strlen($text)>($source['feature']==='essay'?40000:20000)||strlen($text)>60000)throw new InvalidArgumentException('Keep the combined saved workspace within its bounded writing limit (40,000 characters for essay work; 20,000 for other skills).');return $text;
}
