(function(scope){
 'use strict';
 scope.CSSVistaGSAAssessmentUI=function(api){
  const engine=scope.CSSVistaGSAAssessment,safe=api.safe;
  const names={diagnostic:'Diagnostic practice',cumulative:'Cumulative practice',timed:'Timed MCQ practice',chapter:'Chapter test',incorrect:'Incorrect-question practice'};
  let active=null,index=0,submitting=false;
  const uid=prefix=>prefix+'-'+(scope.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2));
  const hydrate=a=>engine.hydrateAttempt(a,api.saved().assessmentQuestionSnapshots);
  const attempt=()=>{const a=hydrate(api.saved().assessmentAttempts?.[active]);return engine.validAttempt(a)?a:null};
  const result=a=>engine.state(a,api.saved().assessmentEvents);
  function home(){
   const attempts=Object.values(api.saved().assessmentAttempts||{}).map(hydrate).filter(engine.validAttempt).sort((a,b)=>b.at.localeCompare(a.at));
   return '<div class="panel"><h2>Assessment centre</h2><p class="notice">Development practice using the existing question bank. These scores are not validated mastery or examination-readiness measures. Timed MCQ practice is not a complete official FPSC mock paper.</p><div class="fields"><label>Practice mode<select id="assessment-mode">'+Object.entries(names).map(([k,v])=>'<option value="'+k+'">'+v+'</option>').join('')+'</select></label><label>Chapter scope<select id="assessment-chapter"><option value="0">All General Science chapters</option>'+api.catalog().chapters.map(c=>'<option value="'+c.id+'">'+c.id+'. '+safe(c.title)+'</option>').join('')+'</select></label><label>Questions requested<input id="assessment-count" type="number" min="1" max="100" value="15"></label><label>Time limit for timed mode (minutes)<input id="assessment-minutes" type="number" min="1" max="180" value="30"></label></div><p class="tiny muted">Cumulative practice includes only questions explicitly linked to lessons you have studied; untagged chapter questions are excluded. If fewer questions are available, the actual set size is shown. Diagnostic sampling alternates domains and chapters; it is not a validated diagnostic instrument.</p><button class="btn primary" data-assessment-start="1">Start selected practice</button></div><div class="panel"><h2>Saved assessments</h2>'+(attempts.length?attempts.map(a=>{const r=result(a);return '<div class="list-row"><div><strong>'+safe(names[a.mode]||a.mode)+'</strong><p>'+safe(a.at.slice(0,10))+' · '+r.total+' questions · '+(r.finished?r.correct+'/'+r.total+' correct · '+safe(r.reason):r.answered+' answered · In progress')+'</p></div><button class="btn small" data-assessment-open="'+safe(a.id)+'">'+(r.finished?'Review results':'Resume')+'</button></div>'}).join(''):'<p class="muted">No saved assessments yet.</p>')+'</div>';
  }
  function render(){
   const a=attempt();if(!a)return '<section class="page"><h1>Assessment unavailable</h1><p>Open a saved assessment from Practice.</p><button class="btn" data-view="practice">Practice</button></section>';
   const r=result(a);
   if(r.finished)return results(a,r);
   index=Math.min(index,a.questions.length-1);const q=a.questions[index],selected=r.responses[q.id]?.selected;
   const timer=r.remainingSeconds===null?'Untimed':'Time remaining: '+Math.floor(r.remainingSeconds/60)+':'+String(r.remainingSeconds%60).padStart(2,'0');
   return '<section class="page"><div class="breadcrumb"><button data-view="practice">← Practice</button></div><h1>'+safe(names[a.mode])+'</h1>'+(a.questions.length<a.requestedCount?'<p class="notice">Only '+a.questions.length+' matching questions are available for your requested '+a.requestedCount+'. No unrelated substitutes were added.</p>':'')+'<p class="notice">Draft question bank · no official FPSC alignment or independent academic approval claimed. Answers and explanations appear after submission.</p><p class="assessment-clock" id="assessment-clock" role="timer" aria-label="Time remaining">'+timer+'</p><div class="panel"><p class="eyebrow">Question '+(index+1)+' of '+a.questions.length+' · '+safe(q.domain)+' · Chapter '+q.chapter+'</p><p class="tiny">'+(q.origin==='original-practice'?'Original practice question':'Original manuscript question')+' · academic approval pending</p><h2>'+safe(q.prompt)+'</h2><div class="choice-list">'+Object.entries(q.options).map(([k,v])=>'<button class="choice '+(selected===k?'chosen':'')+'" aria-pressed="'+(selected===k)+'" data-assessment-choice="'+k+'"><b>'+k+'</b><span>'+safe(v)+'</span></button>').join('')+'</div><div class="lesson-bottom"><button class="btn" data-assessment-move="-1" '+(!index?'disabled':'')+'>Previous</button><span>'+r.answered+'/'+r.total+' answered</span><button class="btn" data-assessment-move="1" '+(index===a.questions.length-1?'disabled':'')+'>Next</button></div><div class="assessment-numbers" aria-label="Jump to a question">'+a.questions.map((q,i)=>'<button class="btn small" data-assessment-index="'+i+'" aria-current="'+(i===index?'step':'false')+'">'+(i+1)+(r.responses[q.id]?' ✓':'')+'</button>').join('')+'</div></div><button class="btn primary" data-assessment-submit="1">Submit assessment</button><p class="tiny muted">Unanswered questions score zero. Your saved deadline continues while the page is closed. You can leave and resume from Practice. Device save errors appear above; account synchronization uses the existing account controls.</p></section>';
  }
  function results(a,r){
   const chapterRows=Object.entries(r.chapters).map(([id,c])=>'<div class="list-row"><div><strong>'+safe(api.catalog().chapters.find(x=>x.id===Number(id))?.title||'Chapter '+id)+'</strong><p>'+c.correct+'/'+c.total+' correct · '+c.answered+' answered</p></div></div>').join('');
   return '<section class="page"><div class="breadcrumb"><button data-view="practice">← Practice</button></div><h1>Assessment results</h1><div class="panel accent"><h2>'+r.correct+' / '+r.total+' correct ('+r.percent+'%)</h2><p>'+r.answered+' answered · '+r.unanswered+' unanswered · '+safe(r.reason)+'</p><p class="notice">Practice accuracy only. This is not verified mastery, a human evaluation or a prediction of FPSC marks. The source questions remain subject to academic review.</p><p>'+safe(a.scoring)+'</p></div><div class="panel"><h2>Chapter breakdown</h2>'+chapterRows+(api.saved().plan?'<button class="btn" data-assessment-plan="1">Use missed chapters as planning difficulties</button><p class="tiny muted">This adds difficulty estimates to your existing plan without deleting history or changing the course start date.</p>':'')+'</div><div class="panel"><h2>Review questions and explanations</h2>'+a.questions.map((q,i)=>{const response=r.responses[q.id];return '<details class="assessment-explanation"><summary>'+(i+1)+'. '+safe(q.prompt)+' · '+(!response?'Unanswered':response.correct?'Correct':'Incorrect')+'</summary><p>Your response: '+(response?safe(response.selected+' — '+q.options[response.selected]):'Not answered')+'</p><p><strong>Source key: '+safe(q.answer+' — '+q.options[q.answer])+'</strong></p><p>'+safe(q.explanation)+'</p><p class="tiny">Question '+safe(q.id)+' · version '+safe(q.contentVersion||'original manuscript')+' · '+safe(q.verification?.status||'unreviewed')+'</p></details>'}).join('')+'</div></section>';
  }
  async function start(){
   const config={mode:document.getElementById('assessment-mode').value,count:Number(document.getElementById('assessment-count').value),minutes:Number(document.getElementById('assessment-minutes').value),chapters:[],completedLessons:Object.keys(api.saved().completed||{}),missedIds:Object.entries(api.saved().questionReview||{}).filter(([,v])=>v.unresolved).map(([id])=>id)};
   const chapter=Number(document.getElementById('assessment-chapter').value);if(chapter)config.chapters=[chapter];
   if(config.mode==='chapter'&&!chapter){api.error('Choose one chapter for a chapter test.');return}
   const identity=api.identity();api.busy(true);
   try{
    const chapters=await Promise.all(api.catalog().chapters.filter(c=>!chapter||c.id===chapter).map(c=>api.loadChapter(c.id)));
    if(identity!==api.identity())throw Error('The study account or reset generation changed. Start again in the current account.');
    const bank=chapters.flatMap(c=>c.questions.map(q=>({...q,domain:c.part,contentVersion:q.contentVersion||c.contentVersion||api.catalog().edition||'original manuscript'})));
    const a=engine.createAttempt(bank,config,new Date().toISOString(),uid('assessment'));
    const packed=await engine.packAttempt(a,async text=>{const bytes=await scope.crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return [...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('')});
    if(identity!==api.identity())throw Error('The study account or reset generation changed. Start again in the current account.');
    api.saved().assessmentQuestionSnapshots={...(api.saved().assessmentQuestionSnapshots||{}),...packed.snapshots};
    api.saved().assessmentAttempts??={};api.saved().assessmentAttempts[a.id]=packed.definition;
    if(api.persist()){active=a.id;index=0;api.view('assessment')}
   }catch(e){api.error(e.message)}finally{api.busy(false);api.draw()}
  }
  function submit(){
   const a=attempt();if(!a||submitting||result(a).finished)return;
   submitting=true;
   try{addEvent({type:'submit'});updateReview(a,result(a));api.persist()}finally{submitting=false;api.draw()}
  }
  function addEvent(data){
   api.saved().assessmentEvents??={};api.saved().assessmentEvents[uid('assessment-event')]={at:new Date().toISOString(),attemptId:active,...data};return api.persist();
  }
  function updateReview(a,r){
   if(!r.finished)return false;
   const before=JSON.stringify([api.saved().questionReview,api.saved().revisit,api.saved().reviewDue]);
   api.saved().questionReview??={};
   // The effective close time, rather than a later page visit, orders review decisions.
   const close=r.closedAt;
   if(!close)return;
   for(const q of a.questions){
    const response=r.responses[q.id];if(!response)continue;
    if(api.saved().questionReview[q.id]?.at>close)continue;
    api.saved().questionReview[q.id]={at:close,chapter:q.chapter,unresolved:!response.correct};
    if(response.correct&&q.lessonId&&api.saved().revisit[q.lessonId]?.questionId===q.id&&api.saved().revisit[q.lessonId].at<=close)delete api.saved().revisit[q.lessonId];
    if(!response.correct&&q.lessonId&&(!api.saved().revisit[q.lessonId]?.at||api.saved().revisit[q.lessonId].at<=close)){api.saved().revisit[q.lessonId]={at:close,kind:'question',questionId:q.id};api.saved().reviewDue[q.lessonId]={at:close,date:api.dateAdd(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Karachi',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(close)),1),stage:0}}
   }
   return before!==JSON.stringify([api.saved().questionReview,api.saved().revisit,api.saved().reviewDue]);
  }
  function reconcile(){let changed=false;for(const raw of Object.values(api.saved().assessmentAttempts||{})){const a=hydrate(raw);if(engine.validAttempt(a)&&updateReview(a,result(a)))changed=true}if(changed)api.persist()}
  function handle(button){
   if(button.dataset.assessmentStart){start();return true}
   if(button.dataset.assessmentOpen){active=button.dataset.assessmentOpen;const a=attempt();if(a){const r=result(a);index=Math.max(0,a.questions.findIndex(q=>!r.responses[q.id]));if(r.finished){updateReview(a,r);api.persist()}api.view('assessment');api.draw()}return true}
   if(button.dataset.assessmentChoice){const a=attempt();if(a&&!result(a).finished){addEvent({type:'answer',questionId:a.questions[index].id,selected:button.dataset.assessmentChoice});api.draw()}return true}
   if(button.dataset.assessmentMove){index=Math.max(0,Math.min(attempt().questions.length-1,index+Number(button.dataset.assessmentMove)));api.draw();return true}
   if(button.dataset.assessmentIndex!==undefined){index=Number(button.dataset.assessmentIndex);api.draw();return true}
   if(button.dataset.assessmentSubmit){submit();return true}
   if(button.dataset.assessmentPlan){const a=attempt(),r=result(a),plan=api.saved().plan;if(plan){const weak=Object.entries(r.chapters).filter(([,c])=>c.correct<c.total).map(([id])=>Number(id));plan.difficultChapters=[...new Set([...(plan.difficultChapters||[]),...weak])];plan.plannerVersion=2;plan.changedAt=new Date().toISOString();api.persist();api.error('The missed chapters were added to your plan’s difficulty estimates. Practice accuracy is not a mastery classification.')}return true}
   return false;
  }
  function tick(){
   const a=attempt();if(!a||!api.visible())return;const r=result(a),clock=document.getElementById('assessment-clock');
   if(r.finished&&clock){updateReview(a,r);api.persist();api.draw()}
   else if(clock&&r.remainingSeconds!==null)clock.textContent='Time remaining: '+Math.floor(r.remainingSeconds/60)+':'+String(r.remainingSeconds%60).padStart(2,'0');
  }
  return {home,render,handle,tick,reconcile};
 };
})(window);
