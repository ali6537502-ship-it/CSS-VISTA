
(() => {
'use strict';
const KEY='cssvista:tool:gsa-tutor:v1';
const root=document.getElementById('app');
const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const now=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Karachi',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const dateAdd=(date,n)=>{const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
const dateLabel=s=>new Date(s+'T12:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
const defaults=()=>({completed:{},revisit:{},bookmarks:{},bookmarkRemoved:{},drafts:{},quizHistory:{},last:null,plan:null});
function read(){try{const o=JSON.parse(localStorage.getItem(KEY)||'null');return o&&typeof o==='object'&&!Array.isArray(o)?{...defaults(),...o}:defaults()}catch{return defaults()}}
let saved=read(),catalog=null,lessons=[],byId=new Map(),chapterCache=new Map();
let ui={view:'course',id:saved.last,stage:'learn',beat:0,selected:'',draft:'',reveal:false,grade:'',chapter:1,qindex:0,phase:0,month:0,setupDays:20,setupDate:now(),search:'',opening:'',busy:false,error:''};
let hasCourse=false;
function notify(){
 try{localStorage.setItem(KEY,JSON.stringify(saved));window.dispatchEvent(new Event('cssvista:progress-changed'));if(window.parent!==window)window.parent.postMessage({type:'cssvista:gsa:changed'},location.origin)}catch{ui.error='Browser storage is unavailable. Course records cannot be saved.';draw()}
}
const isDone=id=>!!saved.completed?.[id];
const countDone=()=>lessons.filter(x=>isDone(x.id)).length;
const countReview=()=>Object.keys(saved.revisit||{}).filter(id=>byId.has(id)).length;
const nwords=s=>String(s||'').trim().split(/\s+/).filter(Boolean).length;
function weights(s){return Math.max(100,s.words||100)}
function validPlan(p){return p&&Number.isInteger(p.days)&&p.days>=5&&p.days<=120&&/^\d{4}-\d{2}-\d{2}$/.test(p.startDate||'')}
function schedule(plan){
 const res=Array.from({length:plan.days},()=>[]);const sum=lessons.reduce((n,s)=>n+weights(s),0);
 let cursor=0,used=0;
 for(let d=0;d<plan.days;d++){
   const remaining=plan.days-d, target=(sum-used)/remaining, cap=lessons.length-(remaining-1);
   let load=0;
   while(cursor<cap&&(res[d].length===0||d===plan.days-1||load+weights(lessons[cursor])/2<=target)){res[d].push(lessons[cursor].id);load+=weights(lessons[cursor]);cursor++}
   used+=load;
 }
 return res.map((ids,i)=>({date:dateAdd(plan.startDate,i),day:i+1,ids,words:ids.reduce((n,id)=>n+weights(byId.get(id)),0),done:ids.filter(isDone).length}));
}
function savedPlan(){return validPlan(saved.plan)?saved.plan:null}
function todayDay(days){return days.find(d=>d.done<d.ids.length&&d.date<=now())||days.find(d=>d.done<d.ids.length)||days[days.length-1]}
function chapterName(ch){return catalog.chapters.find(c=>c.id===ch)?.title||''}
function heading(){return '<header class="top"><div class="brand"><i>◈</i><div>CSS VISTA<small>GENERAL SCIENCE TUTOR</small></div></div><nav class="nav" aria-label="GSA Tutor"><button data-view="course" class="'+(ui.view==='course'?'active':'')+'">My course</button><button data-view="library" class="'+(ui.view==='library'?'active':'')+'">Chapters</button><button data-view="practice" class="'+(ui.view==='practice'?'active':'')+'">Practice</button><button data-view="review" class="'+(ui.view==='review'?'active':'')+'">Revision</button></nav></header>'}
function pillProgress(){return '<div class="stat-row"><div><strong>'+countDone()+' / '+lessons.length+'</strong><span>Lessons completed</span></div><div><strong>'+countReview()+'</strong><span>Lessons to revisit</span></div><div><strong>'+(savedPlan()?saved.plan.days:'—')+'</strong><span>Course days</span></div></div><div class="track"><div class="fill" style="width:'+(countDone()/lessons.length*100)+'%"></div></div>'}
function setup(){
 let days=ui.setupDays,date=ui.setupDate;
 return '<section class="page"><div class="hero"><div><p class="eyebrow">Your preparation, your timetable</p><h1>Choose how much time you have.</h1><p class="subtitle">All 28 chapters and 141 lessons remain in the course. Shorter plans assign more study per day; longer plans allow more time for practice and revision.</p></div></div><div class="panel"><p class="eyebrow">Course duration</p><div class="duration-grid">'+[8,14,20,30,45,60].map(n=>'<button class="duration '+(n===days?'active':'')+'" data-days="'+n+'"><strong>'+n+'</strong><span>days</span></button>').join('')+'</div><div class="fields"><label>Other duration (5–120 days)<input type="number" id="custom-days" min="5" max="120" value="'+days+'"></label><label>Start date<input type="date" id="start-date" value="'+safe(date)+'"></label></div><p class="notice">'+(Math.floor(lessons.length/days))+'–'+Math.ceil(lessons.length/days+2)+' lessons on most days. '+Math.round(lessons.reduce((n,s)=>n+weights(s),0)/days).toLocaleString()+' source words per day on average, before practice. This is an approximate workload, not a guaranteed study duration.</p><button class="btn primary" data-action="saveplan">Create my course</button></div></section>';
}
function course(){
 if(!savedPlan())return setup();
 const days=schedule(saved.plan),target=todayDay(days),first=target?.ids.find(id=>!isDone(id))||lessons.find(s=>!isDone(s.id))?.id||lessons[0].id;
 return '<section class="page"><div class="hero"><div><p class="eyebrow">General Science · Part I · 60 marks</p><h1>Your '+saved.plan.days+'-day programme</h1><p class="subtitle">One complete syllabus. Work through explanations, apply the ideas, practise source questions and return to concepts that need attention.</p></div><button class="btn" data-action="editplan">Change duration</button></div><div class="panel accent">'+pillProgress()+'</div><div class="panel"><div class="spread"><div><p class="eyebrow">'+(target?.date===now()?'Today’s session':'Continue from here')+'</p><h2>Day '+target.day+' · '+dateLabel(target.date)+'</h2><p class="muted">'+target.done+' of '+target.ids.length+' lessons done · '+target.words.toLocaleString()+' source words assigned</p></div><button class="btn primary" data-lesson="'+safe(first)+'">Continue learning</button></div></div><div class="spread"><h2 style="margin:10px 0">Daily timetable</h2><small class="muted">Expand any day to see its lessons</small></div><div class="plan-grid">'+days.map(d=>'<details class="day" '+(d.day===target.day?'open':'')+'><summary><b>Day '+d.day+'</b><span><strong>'+dateLabel(d.date)+(d.done===d.ids.length?' · Completed':d.date<now()?' · Catch up':d.date===now()?' · Today':'')+'</strong><em>'+d.done+'/'+d.ids.length+' complete · '+d.words.toLocaleString()+' source words</em></span></summary><div class="day-lessons">'+d.ids.map(id=>{let s=byId.get(id);return '<button class="day-lesson '+(isDone(id)?'done':'')+'" data-lesson="'+safe(id)+'"><span>'+(isDone(id)?'✓':'○')+' '+safe(s.number)+' · '+safe(s.title)+'</span><small>'+s.words+' words</small></button>'}).join('')+'</div></details>').join('')+'</div><p class="tiny muted">A schedule changes the amount of work per day, never the scientific content. Changing it does not erase completed lessons or revision records.</p></section>';
}
function library(){
 const items=catalog.chapters.filter(c=>!ui.search||[c.title,c.part,...c.sections.map(s=>s.title)].join(' ').toLowerCase().includes(ui.search.toLowerCase()));
 return '<section class="page"><div class="hero"><div><p class="eyebrow">The complete manuscript</p><h1>Choose a chapter.</h1><p class="subtitle">28 chapters, 141 substantial lessons, all five General Science syllabus areas. Practice and detailed source passages are inside each chapter.</p></div></div><input class="search-input" type="search" id="search" placeholder="Find a topic, chapter or concept" value="'+safe(ui.search)+'" aria-label="Search subjects"><div class="panel">'+items.map(c=>'<div class="list-row"><div><p class="eyebrow">'+safe(c.part)+' · Chapter '+c.id+'</p><h3>'+safe(c.title)+'</h3><p>'+c.sections.length+' lessons · '+c.questionCount+' original MCQs · '+c.analyticalCount+' analytical model answers</p></div><button class="btn small" data-chapter="'+c.id+'">Open</button></div>').join('')+'</div></section>';
}
function review(){
 const ids=Object.keys(saved.revisit||{}).filter(id=>byId.has(id));
 return '<section class="page"><div class="hero"><div><p class="eyebrow">Learn · Test · Return</p><h1>Revision notebook</h1><p class="subtitle">Lessons you marked as uncertain, or missed during practice, are available here. Repeating a lesson never deletes your earlier record.</p></div></div><div class="panel"><h2>'+ids.length+' lessons to revisit</h2>'+(ids.length?ids.map(id=>{let s=byId.get(id);return '<div class="list-row"><div><strong>'+safe(s.title)+'</strong><p>Chapter '+s.chapter+' · Lesson '+s.number+'</p></div><button class="btn small" data-lesson="'+safe(id)+'">Repeat</button></div>'}).join(''):'<p class="muted">Your revision list is clear. Return here whenever a concept needs another attempt.</p>')+'</div></section>';
}
function practice(){
 return '<section class="page"><div class="hero"><div><p class="eyebrow">Examination preparation</p><h1>Practice by chapter.</h1><p class="subtitle">Use the 250 original textbook MCQs and 31 available analytical model answers. Answers are shown with their explanations. No questions are invented to fill gaps.</p></div></div><div class="panel">'+catalog.chapters.map(c=>'<div class="list-row"><div><strong>'+safe(c.title)+'</strong><p>Chapter '+c.id+' · '+c.questionCount+' MCQs · '+c.analyticalCount+' model answers</p></div><button class="btn small" data-practice="'+c.id+'">Practise</button></div>').join('')+'</div></section>';
}
async function loadChapter(id){
 id=Number(id);if(chapterCache.has(id))return chapterCache.get(id);
 const response=await fetch('/gsa-tutor/content/chapter-'+String(id).padStart(2,'0')+'.json',{cache:'force-cache'});
 if(!response.ok)throw Error('Chapter could not be loaded (HTTP '+response.status+').');
 const item=await response.json();if(!Array.isArray(item.sections)||item.id!==id)throw Error('Invalid chapter source');
 if(chapterCache.size>=3)chapterCache.delete(chapterCache.keys().next().value);
 chapterCache.set(id,item);return item;
}
function blocks(html){
 const div=document.createElement('div');div.innerHTML=html||'';
 let result=[];
 for(const el of [...div.children]){
   let text=(el.textContent||'').trim();if(!text)continue;
   if(el.tagName==='P'&&nwords(text)>205&&!el.querySelector('code,math,span.math,pre')){
      const sentences=text.match(/[^.!?]+(?:[.!?]+|$)/g)||[text];let run='';
      for(const s of sentences){if(nwords(run+' '+s)>120&&run.trim()){result.push('<p>'+safe(run.trim())+'</p>');run=''}run+=' '+s}
      if(run.trim())result.push('<p>'+safe(run.trim())+'</p>');
   }else result.push(el.outerHTML);
 }
 return result.length?result:['<p>No study text was found for this lesson.</p>'];
}
function questionFor(s,c){
 if(!c.questions.length)return null;
 const words=t=>new Set((String(t).toLowerCase().match(/[a-z]{4,}/g)||[]).filter(w=>!/^(their|there|these|those|which|where|would|should|about|because|under|between|during|after|other|while|could|from|have|that|this|with|what|when|into)$/.test(w)));
 const title=words(s.title),body=words(s.text);
 let ranked=c.questions.map(q=>{const qw=words(q.prompt);let score=0;for(const w of qw){if(title.has(w))score+=5;else if(body.has(w))score+=1}return {q,score}}).sort((a,b)=>b.score-a.score);
 return ranked[0]?.score>=3?ranked[0].q:null;
}
function visual(s){
 if(s.id!=='c3-s3-3'&&s.id!=='c3-s3-4')return '';
 if(s.id==='c3-s3-3')return '<div class="model"><p class="eyebrow">Explore the seasons</p><div class="tabs"><button data-month="0" class="'+(!ui.month?'active':'')+'">June</button><button data-month="1" class="'+(ui.month?'active':'')+'">December</button></div><div id="science-model">'+seasonSvg(!ui.month)+'</div><p class="tiny muted">Diagram is schematic. The direction of Earth’s axial tilt explains the opposite seasons.</p></div>';
 return '<div class="model"><p class="eyebrow">Explore lunar phases</p><div class="tabs">'+['New','First quarter','Full','Last quarter'].map((x,i)=>'<button data-phase="'+i+'" class="'+(ui.phase===i?'active':'')+'">'+x+'</button>').join('')+'</div><div id="science-model">'+moonSvg(ui.phase)+'</div><p class="tiny muted">Orbit viewed schematically from above; not to scale.</p></div>';
}
function lesson(s,c){
 const pieces=blocks(s.html),beat=Math.max(0,Math.min(ui.beat,pieces.length-1)),q=questionFor(s,c);
 let content='';
 let total=pieces.length+(q?1:0)+1;
 let current=ui.stage==='learn'?beat+1:ui.stage==='question'?pieces.length+1:total;
 if(ui.stage==='learn'){
  content='<div class="lesson-card"><p class="segment-note">Understand · Section '+(beat+1)+' of '+pieces.length+'</p><h2>'+safe(s.title)+'</h2><div class="study-copy">'+pieces[beat]+'</div>'+(beat===0?visual(s):'')+'<div class="lesson-bottom"><button class="btn" data-action="prevbeat" '+(!beat?'disabled':'')+'>Previous</button><span class="tiny muted">Read · Think · Understand</span><button class="btn primary" data-action="nextbeat">'+(beat===pieces.length-1?(q?'Check understanding':'Write your explanation'):'Next explanation')+' →</button></div></div>';
 }else if(ui.stage==='question'&&q){
  const selected=ui.selected, answered=!!selected;
  content='<div class="lesson-card"><p class="segment-note">Apply · Source question '+safe(q.id)+'</p><h2>'+safe(q.prompt)+'</h2><p class="muted">A chapter-level question from the original textbook. It may connect ideas covered in more than one lesson.</p><div class="choice-list">'+Object.entries(q.options).map(([k,v])=>'<button class="choice '+(answered?(k===q.answer?'correct':k===selected?'wrong':''):k===selected?'chosen':'')+'" data-choice="'+k+'" '+(answered?'disabled':'')+'><b>'+k+'</b><span>'+safe(v)+'</span></button>').join('')+'</div>'+(answered?'<div class="feedback '+(selected===q.answer?'':'error')+'"><strong>'+(selected===q.answer?'Correct.':'Review the explanation.')+'</strong><p>'+safe(q.explanation)+'</p></div>':'')+'<div class="lesson-bottom"><button class="btn" data-action="tolearn">Review the explanation</button><button class="btn primary" data-action="torecall" '+(!answered?'disabled':'')+'>Explain it yourself →</button></div></div>';
 }else{
  const draft=ui.draft||saved.drafts?.[s.id]||'',sample=pieces.slice(0,Math.min(pieces.length,3)).join(''),revealed=ui.reveal;
  content='<div class="lesson-card"><p class="segment-note">Recall · Closed-book explanation</p><h2>Can you explain '+safe(s.title.toLowerCase())+'?</h2><p class="muted">Write the mechanism, evidence, distinction or application in your own words. Include an example where the original lesson provides one. Your response is for self-review; it is not automatically graded.</p><textarea class="textarea" id="recall" placeholder="Explain the idea here, using your own words...">'+safe(draft)+'</textarea>'+(revealed?'<div class="compare"><h3>Compare with the source</h3><div class="study-copy">'+sample+'</div><button class="btn small" data-action="fullsource">Read the complete section</button><p class="muted tiny">Decide what you explained correctly and what needs another reading.</p><div class="score-group"><button class="btn" data-grade="gotit">I understood</button><button class="btn" data-grade="partial">Partly clear</button><button class="btn" data-grade="again">Repeat</button></div></div>':'')+'<div class="lesson-bottom"><button class="btn" data-action="tolearn">Read again</button>'+(revealed?'<button class="btn primary" data-action="finish" '+(!ui.grade?'disabled':'')+'>Save & finish →</button>':'<button class="btn primary" data-action="reveal" '+(nwords(draft)<8?'disabled':'')+'>Compare with the book →</button>')+'</div></div>';
 }
 return '<section class="study-layout"><div class="breadcrumb"><button data-view="course">← My course</button><span class="muted tiny"> / '+safe(c.part)+' / Chapter '+c.id+' / Lesson '+safe(s.number)+'</span></div><p class="eyebrow">Original source · '+s.words+' words · General Science Part I</p><h1 class="lesson-title">'+safe(s.title)+'</h1><div class="progress-meta"><span>'+current+' of '+total+' learning steps</span><span>'+Math.round(current/total*100)+'%</span></div><div class="track"><div class="fill" style="width:'+(current/total*100)+'%"></div></div>'+content+'<div class="flex"><button class="btn small" data-action="fullsource">Complete reference</button><button class="btn small" data-action="bookmark">'+(saved.bookmarks?.[s.id]?'Remove bookmark':'Bookmark')+'</button><button class="btn small" data-action="markreview">Add to revision</button></div><p class="tiny muted">Content is drawn from the CSS VISTA General Science manuscript. Questions and source statements remain subject to editorial review.</p></section>';
}
function chapterPractice(c){
 const q=c.questions[ui.qindex % Math.max(1,c.questions.length)],selected=ui.selected;
 const problem=q?'<p class="eyebrow">Question '+(ui.qindex+1)+' of '+c.questions.length+' · '+safe(q.id)+'</p><h2>'+safe(q.prompt)+'</h2><div class="choice-list">'+Object.entries(q.options).map(([k,v])=>'<button class="choice '+(selected?(k===q.answer?'correct':k===selected?'wrong':''):'')+'" data-quiz-choice="'+k+'" '+(selected?'disabled':'')+'><b>'+k+'</b>'+safe(v)+'</button>').join('')+'</div>'+(selected?'<div class="feedback '+(selected===q.answer?'':'error')+'"><strong>'+(selected===q.answer?'Correct':'Check the reasoning')+'</strong><p>'+safe(q.explanation)+'</p></div>':'')+'<div class="lesson-bottom"><span class="muted tiny">'+(Object.keys(saved.quizHistory||{}).filter(id=>id.startsWith('D'+String(c.id).padStart(2,'0')+'-')).length)+' answers recorded in this chapter</span><button class="btn primary" data-action="nextquestion" '+(!selected?'disabled':'')+'>Next question →</button></div>':'<p>There are no source MCQs for this chapter.</p>';
 const a=c.analytical||[];
 return '<section class="page"><div class="breadcrumb"><button data-view="practice">← All chapters</button></div><p class="eyebrow">Chapter '+c.id+' · '+safe(c.part)+'</p><h1>'+safe(c.title)+'</h1><div class="panel">'+problem+'</div><div class="panel"><h2>Analytical writing</h2>'+(a.length?a.map(q=>'<div class="list-row"><div><strong>'+safe(q.prompt)+'</strong><p>Original model answer available</p></div><button class="btn small" data-analytical="'+safe(q.id)+'">Write answer</button></div>').join(''):'<p class="muted">This chapter does not have a published model analytical answer in the supplied manuscript. The section material remains available for study.</p>')+'</div></section>';
}
function written(c,a){
 const draft=saved.drafts?.[a.id]||'';
 return '<section class="page"><div class="breadcrumb"><button data-practice="'+c.id+'">← Chapter practice</button></div><p class="eyebrow">Analytical answer writing · '+safe(a.id)+'</p><h1>'+safe(a.prompt)+'</h1><div class="panel"><p class="muted">Develop a structured explanation using scientific concepts, mechanisms and examples from the chapter. The manuscript model appears only when you choose to compare.</p><textarea class="textarea" id="write" placeholder="Introduction, explanation, evidence, application and conclusion...">'+safe(draft)+'</textarea><div class="flex" style="margin-top:15px"><button class="btn" data-action="savewriting">Save draft</button><button class="btn primary" data-action="revealwriting">Compare with model answer</button></div>'+(ui.reveal?'<div class="compare study-copy">'+a.answer_html+'</div>':'')+'</div></section>';
}
async function openLesson(id){
 if(!byId.has(id))return;
 const item=byId.get(id);ui.busy=true;ui.error='';draw();
 try{await loadChapter(item.chapter)}catch(e){ui.error=e.message;ui.busy=false;draw();return}
 ui.id=id;ui.view='lesson';ui.stage='learn';ui.beat=0;ui.selected='';ui.grade='';ui.reveal=false;ui.draft=saved.drafts?.[id]||'';
 saved.last=id;notify();ui.busy=false;draw();scrollTo({top:0,behavior:'instant'});
}
async function openChapter(id){
 ui.busy=true;ui.error='';draw();
 try{await loadChapter(id)}catch(e){ui.error=e.message;ui.busy=false;draw();return}
 ui.view='chapter';ui.chapter=Number(id);ui.qindex=0;ui.selected='';ui.reveal=false;ui.busy=false;draw();scrollTo({top:0,behavior:'instant'});
}
function chooseGrade(g){
 if(!['gotit','partial','again'].includes(g))return;
 const id=ui.id;const at=new Date().toISOString();
 saved.completed[id]={at,selfRating:g};
 if(g==='gotit')delete saved.revisit[id];else saved.revisit[id]={at,kind:'lesson'};
 ui.grade=g;notify();ui.view='course';draw();
}
function saveQuizAnswer(value){const c=chapterCache.get(ui.chapter);const q=c?.questions?.[ui.qindex];if(!q||ui.selected)return;ui.selected=value;saved.quizHistory??={};saved.quizHistory[q.id]={at:new Date().toISOString(),selected:value,correct:value===q.answer};if(value!==q.answer){const id=c.sections[0]?.id;if(id)saved.revisit[id]={at:new Date().toISOString(),kind:'question',questionId:q.id}}notify();draw()}
function saveBookmark(){const id=ui.id;saved.bookmarks??={};saved.bookmarkRemoved??={};if(saved.bookmarks[id]){delete saved.bookmarks[id];saved.bookmarkRemoved[id]={at:new Date().toISOString()}}else{saved.bookmarks[id]={at:new Date().toISOString()};delete saved.bookmarkRemoved[id]}notify();draw()}
function saveDraft(id,value){saved.drafts??={};saved.drafts[id]=value;notify()}
function fullSource(){
 let s=chapterCache.get(byId.get(ui.id).chapter)?.sections.find(s=>s.id===ui.id);
 if(!s)return;const dialog=document.getElementById('reference');dialog.querySelector('h2').textContent=s.number+' · '+s.title;dialog.querySelector('.ref-source').innerHTML=s.html;dialog.showModal();
}
function draw(){
 if(!catalog){root.innerHTML='<div class="spinner">Loading your course…</div>';return}
 let content='';
 if(ui.error)content='<p class="notice warn" role="alert">'+safe(ui.error)+'</p>';
 if(ui.busy){root.innerHTML=heading()+content+'<div class="spinner">Opening the original source…</div>';return}
 if(ui.view==='course')content+=course();
 if(ui.view==='library')content+=library();
 if(ui.view==='review')content+=review();
 if(ui.view==='practice')content+=practice();
 if(ui.view==='lesson'){
  const item=byId.get(ui.id),ch=item&&chapterCache.get(item.chapter),s=ch?.sections.find(x=>x.id===ui.id);
  content+=s?lesson({...s,words:item.words},ch):'<div class="spinner">Select a lesson from your course.</div>';
 }
 if(ui.view==='chapter')content+=chapterPractice(chapterCache.get(ui.chapter));
 if(ui.view==='written'){const c=chapterCache.get(ui.chapter);content+=written(c,c.analytical.find(x=>x.id===ui.opening))}
 root.innerHTML=heading()+content;
}
root.addEventListener('click',async e=>{
 const t=e.target.closest('button');if(!t||ui.busy)return;
 if(t.dataset.view){ui.view=t.dataset.view;ui.error='';draw();scrollTo({top:0,behavior:'instant'});return}
 if(t.dataset.lesson){await openLesson(t.dataset.lesson);return}
 if(t.dataset.chapter){await openChapter(t.dataset.chapter);return}
 if(t.dataset.practice){await openChapter(t.dataset.practice);return}
 if(t.dataset.analytical){ui.opening=t.dataset.analytical;ui.view='written';ui.reveal=false;draw();return}
 if(t.dataset.days){ui.setupDays=Number(t.dataset.days);draw();return}
 if(t.dataset.month!==undefined){ui.month=Number(t.dataset.month);draw();return}
 if(t.dataset.phase!==undefined){ui.phase=Number(t.dataset.phase);draw();return}
 if(t.dataset.choice){ui.selected=t.dataset.choice;const item=byId.get(ui.id),c=chapterCache.get(item.chapter),q=questionFor(c.sections.find(x=>x.id===ui.id),c);if(q&&ui.selected!==q.answer){saved.revisit[ui.id]={at:new Date().toISOString(),kind:'question',questionId:q.id};notify()}draw();return}
 if(t.dataset.quizChoice){saveQuizAnswer(t.dataset.quizChoice);return}
 if(t.dataset.grade){chooseGrade(t.dataset.grade);return}
 switch(t.dataset.action){
  case 'editplan':ui.setupDays=saved.plan.days;ui.setupDate=saved.plan.startDate;saved.plan=null;ui.view='course';draw();break;
  case 'saveplan':{
   const dd=document.getElementById('custom-days'),sd=document.getElementById('start-date'),days=dd?Number(dd.value):ui.setupDays,date=sd?sd.value:ui.setupDate;
   if(!Number.isInteger(days)||days<5||days>120||!/^\d{4}-\d{2}-\d{2}$/.test(date)){ui.error='Choose a duration between 5 and 120 days and a valid start date.';draw();return}
   saved.plan={days,startDate:date,changedAt:new Date().toISOString()};ui.setupDays=days;ui.setupDate=date;notify();draw();break;
  }
  case 'prevbeat':ui.beat=Math.max(0,ui.beat-1);draw();break;
  case 'nextbeat':{
   const s=chapterCache.get(byId.get(ui.id).chapter).sections.find(s=>s.id===ui.id),ps=blocks(s.html);
   if(ui.beat<ps.length-1)ui.beat++;else{ui.stage=questionFor(s,chapterCache.get(byId.get(ui.id).chapter))?'question':'recall';ui.selected=''}
   draw();break;
  }
  case 'tolearn':ui.stage='learn';ui.beat=0;ui.selected='';draw();break;
  case 'torecall':ui.stage='recall';ui.selected='';draw();break;
  case 'reveal':{
   const text=document.getElementById('recall')?.value||ui.draft;if(nwords(text)<8)return;ui.draft=text;saveDraft(ui.id,text);ui.reveal=true;draw();break;
  }
  case 'finish':if(ui.grade)chooseGrade(ui.grade);break;
  case 'bookmark':saveBookmark();break;
  case 'markreview':saved.revisit[ui.id]={at:new Date().toISOString(),kind:'manual'};notify();draw();break;
  case 'fullsource':fullSource();break;
  case 'nextquestion':ui.qindex=(ui.qindex+1)%chapterCache.get(ui.chapter).questions.length;ui.selected='';draw();break;
  case 'savewriting':saveDraft(ui.opening,document.getElementById('write')?.value||'');break;
  case 'revealwriting':saveDraft(ui.opening,document.getElementById('write')?.value||'');ui.reveal=true;draw();break;
 }
});
root.addEventListener('change',e=>{
 if(e.target.id==='custom-days'){const n=Number(e.target.value);if(n>=5&&n<=120)ui.setupDays=n}
 if(e.target.id==='start-date')ui.setupDate=e.target.value;
 if(e.target.id==='recall'){ui.draft=e.target.value;saveDraft(ui.id,ui.draft)}
 if(e.target.id==='write')saveDraft(ui.opening,e.target.value);
});
root.addEventListener('input',e=>{
 if(e.target.id==='search'){ui.search=e.target.value;const selectionStart=e.target.selectionStart;draw();let input=document.getElementById('search');if(input){input.focus();input.setSelectionRange(selectionStart,selectionStart)}}
 if(e.target.id==='recall'){ui.draft=e.target.value;const b=root.querySelector('[data-action="reveal"]');if(b)b.disabled=nwords(ui.draft)<8}
});
window.addEventListener('message',e=>{
 if(e.origin!==location.origin||e.source!==window.parent||e.data?.type!=='cssvista:gsa:hydrate')return;
 const incoming=e.data.snapshot;if(!incoming||typeof incoming!=='object')return;
 saved={...defaults(),...incoming};ui.id=byId.has(saved.last)?saved.last:lessons[0]?.id;ui.view='course';ui.setupDays=savedPlan()?.days||20;ui.setupDate=savedPlan()?.startDate||now();draw();
});
document.getElementById('close-reference').addEventListener('click',()=>document.getElementById('reference').close());
(async()=>{
 try{
  const response=await fetch('/gsa-tutor/content/catalog.json',{cache:'force-cache'});if(!response.ok)throw Error('Course catalogue could not be loaded');
  catalog=await response.json();lessons=catalog.chapters.flatMap(c=>c.sections.map(s=>({...s,chapter:c.id,chapterTitle:c.title,part:c.part})));byId=new Map(lessons.map(s=>[s.id,s]));
  if(lessons.length!==141||catalog.chapters.length!==28)throw Error('The course catalogue is incomplete');
  ui.id=byId.has(saved.last)?saved.last:lessons[0].id;ui.setupDays=savedPlan()?.days||20;ui.setupDate=savedPlan()?.startDate||now();draw();
 }catch(e){root.innerHTML='<div class="panel" role="alert"><h2>Course temporarily unavailable</h2><p>'+safe(e.message)+'</p><button class="btn" onclick="location.reload()">Reload course</button></div>'}
})();
})();
