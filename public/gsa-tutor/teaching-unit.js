/* CSS VISTA eight-stage teaching-unit renderer. Text is escaped, never executed. */
(() => {
 'use strict';
 const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const stages=['Foundation','Conceptual teaching','Visual understanding','Real-world application','Examination application','Active understanding','Answer writing','Revision and retention'];
 const keys=['foundation','conceptualTeaching','visualUnderstanding','realWorldApplication','examinationApplication','activeUnderstanding','answerWriting','revisionAndRetention'];
 const list=xs=>'<ul>'+xs.map(x=>'<li>'+safe(x)+'</li>').join('')+'</ul>';
 function validate(u,id){
  if(u?.lessonId!==id||!u.title||!Array.isArray(u.sources)||keys.some(k=>!u.stages?.[k]))throw Error('Teaching unit is incomplete or belongs to another lesson.');
  if(!u.stages.foundation.objectives?.length||!u.stages.foundation.prerequisites?.length||!Array.isArray(u.stages.conceptualTeaching)||!u.stages.activeUnderstanding.questions?.length||!u.stages.answerWriting.rubric?.length||!u.stages.revisionAndRetention.closedBookRecall?.length)throw Error('Teaching unit stage data is incomplete.');
  for(const source of u.sources)if(!/^https:\/\//.test(source.url)||!source.title||!source.publisher)throw Error('Teaching unit has incomplete source provenance.');
  return u;
 }
 function render(u,{stage=0,answers={},response='',reveal=false}={}){
  validate(u,u.lessonId);stage=Math.max(0,Math.min(7,stage));const s=u.stages;let body='';
  if(stage===0)body='<h2>Learning objectives</h2>'+list(s.foundation.objectives)+'<h3>Before you begin</h3>'+list(s.foundation.prerequisites)+'<dl>'+Object.entries(s.foundation.terms).map(([term,definition])=>'<dt><strong>'+safe(term)+'</strong></dt><dd>'+safe(definition)+'</dd>').join('')+'</dl>';
  if(stage===1)body=s.conceptualTeaching.map(b=>'<section><h2>'+safe(b.conceptId.replaceAll('-',' '))+'</h2><p>'+safe(b.explanation)+'</p></section>').join('');
  if(stage===2)body='<h2>Follow the labelled model</h2>'+(s.visualUnderstanding.nodes?'<ol class="scientific-flow">'+s.visualUnderstanding.nodes.map(n=>'<li>'+safe(n)+'</li>').join('')+'</ol>':'')+'<p>'+safe(s.visualUnderstanding.description)+'</p><p class="notice">'+safe(s.visualUnderstanding.limitations)+'</p>';
  if(stage===3)body='<h2>Apply the mechanism</h2><p>'+safe(s.realWorldApplication.example)+'</p>';
  if(stage===4)body='<h2>Examination task</h2><p>'+safe(s.examinationApplication.prompt)+'</p><p class="tiny muted">'+safe(s.examinationApplication.origin)+'. Linked archived-paper questions, where present, are separately identified below.</p>';
  if(stage===5)body=s.activeUnderstanding.questions.map(q=>{
   const answer=answers[q.id];return '<section class="unit-question"><h2>'+safe(q.prompt)+'</h2><div class="choice-list">'+Object.entries(q.options).map(([key,value])=>'<button class="choice '+(answer?(key===q.answer?'correct':key===answer?'wrong':''):'')+'" data-unit-question="'+safe(q.id)+'" data-unit-option="'+key+'" '+(answer?'disabled':'')+'><b>'+key+'</b>'+safe(value)+'</button>').join('')+'</div>'+(answer?'<div class="feedback"><strong>'+(answer===q.answer?'Correct against the draft key.':'Review the reasoning.')+'</strong>'+Object.entries(q.optionExplanations).map(([key,why])=>'<p><b>'+key+'</b> '+safe(why)+'</p>').join('')+'</div>':'')+'</section>';
  }).join('');
  if(stage===6)body='<h2>Write and compare</h2><p>'+safe(s.examinationApplication.prompt)+'</p><label for="unit-writing">Your explanation</label><textarea id="unit-writing" class="textarea">'+safe(response)+'</textarea><p><button class="btn" data-action="unitreveal">Compare with draft model</button></p>'+(reveal?'<div class="compare"><h3>Draft model · '+s.answerWriting.marks+' marks</h3><p>'+safe(s.answerWriting.modelResponse)+'</p><table class="unit-rubric"><caption>Draft question-specific rubric — self-evaluation only</caption><thead><tr><th>Criterion</th><th>Marks</th></tr></thead><tbody>'+s.answerWriting.rubric.map(r=>'<tr><td>'+safe(r.criterion)+'</td><td>'+r.marks+'</td></tr>').join('')+'</tbody></table><h3>Common mistakes</h3>'+list(s.answerWriting.commonMistakes)+'<p class="tiny muted">'+safe(s.answerWriting.evaluation)+'</p></div>':'');
  if(stage===7)body='<h2>Revision sheet</h2>'+list(s.revisionAndRetention.definitions)+'<h3>Closed-book recall</h3>'+list(s.revisionAndRetention.closedBookRecall)+'<p>'+safe(s.revisionAndRetention.reviewPolicy)+'</p>';
  return '<section class="study-layout"><p class="notice warn" role="status">Editorial draft · Not independently approved. Preview activities do not change saved learning records.</p><h1>'+safe(u.title)+'</h1><nav class="assessment-nav" aria-label="Eight teaching stages">'+stages.map((title,i)=>'<button class="btn small" data-unit-stage="'+i+'" aria-current="'+(i===stage)+'">'+(i+1)+'. '+title+'</button>').join('')+'</nav><div class="lesson-card study-copy">'+body+'</div><div class="lesson-bottom"><button class="btn" data-unit-stage="'+(stage-1)+'" '+(!stage?'disabled':'')+'>Previous stage</button><button class="btn primary" data-unit-stage="'+(stage+1)+'" '+(stage===7?'disabled':'')+'>Next stage</button></div><details class="panel"><summary>Source and review record</summary>'+u.sources.map(r=>'<p><a href="'+safe(r.url)+'" target="_blank" rel="noopener">'+safe(r.title)+'</a> · '+safe(r.publisher)+'<br>'+safe(r.verificationStatus)+' · Retrieved '+safe(r.retrievedOn)+'</p>').join('')+'</details><p><button class="btn" data-action="fullsource">Inspect original manuscript</button> <button class="btn" data-view="editorial">All draft units</button></p></section>';
 }
 Object.assign(window,{CSSVistaGSATeaching:{render,validate,stages}});
})();
