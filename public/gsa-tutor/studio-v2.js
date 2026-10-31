
(() => {
'use strict';
const KEY='cssvista:tool:gsa-tutor:v1';
let storageKey=KEY,binding=null,accountChanged=false;const embedded=window.parent!==window;
if(!embedded){try{const owner=localStorage.getItem('cssvista:progress-owner')||null,generation=owner?localStorage.getItem('cssvista:sync-generation:v1:'+owner):null;binding={owner,generation};if(owner&&generation)storageKey=`cssvista:reset-data:v1:${encodeURIComponent(owner)}:${generation}:${encodeURIComponent(KEY)}`}catch{/* Saving reports unavailable storage. */}}
const root=document.getElementById('app');
const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const now=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Karachi',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const dateAdd=(date,n)=>{const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
const dateLabel=s=>new Date(s+'T12:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
const defaults=()=>({completed:{},revisit:{},bookmarks:{},bookmarkRemoved:{},drafts:{},quizHistory:{},last:null,plan:null});
function read(){try{const o=JSON.parse(localStorage.getItem(storageKey)||'null');return o&&typeof o==='object'&&!Array.isArray(o)?{...defaults(),...o}:defaults()}catch{return defaults()}}
let saved=embedded?defaults():read(),catalog=null,lessons=[],byId=new Map(),chapterCache=new Map();
let ui={view:'course',id:saved.last,stage:'learn',beat:0,selected:'',draft:'',reveal:false,grade:'',chapter:1,qindex:0,phase:0,month:0,setupDays:20,setupDate:now(),search:'',opening:'',showAllDays:false,busy:false,error:''};
let hasCourse=false;
function canSave(){
 if(!binding)return false;
 if((localStorage.getItem('cssvista:progress-owner')||null)!==binding.owner){if(!embedded)accountChanged=true;return false}
 if(!binding.owner)return !localStorage.getItem('cssvista:progress-owner');
 const lease=JSON.parse(localStorage.getItem('cssvista:reset-write:v1:'+binding.owner)||'null');
 return !(lease?.at&&Math.abs(Date.now()-lease.at)<30000)&&localStorage.getItem('cssvista:progress-owner')===binding.owner&&localStorage.getItem('cssvista:sync-generation:v1:'+binding.owner)===binding.generation;
}
function notify(){
 try{if(!canSave())throw Error('Study account changed');localStorage.setItem(storageKey,JSON.stringify(saved));window.dispatchEvent(new Event('cssvista:progress-changed'));if(embedded)window.parent.postMessage({type:'cssvista:gsa:changed'},location.origin)}catch{ui.error='Course records could not be saved. Check account synchronization and retry your change.';draw()}
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
function heading(){return '<header class="top"><div class="brand"><img src="/images/logo.webp" alt="" width="32" height="32"><div>CSS VISTA<small>GENERAL SCIENCE TUTOR</small></div></div><nav class="nav" aria-label="GSA Tutor"><button data-view="course" class="'+(ui.view==='course'?'active':'')+'">My course</button><button data-view="library" class="'+(ui.view==='library'?'active':'')+'">Chapters</button><button data-view="practice" class="'+(ui.view==='practice'?'active':'')+'">Practice</button><button data-view="review" class="'+(ui.view==='review'?'active':'')+'">Revision</button></nav></header>'}
function pillProgress(){return '<div class="stat-row"><div><strong>'+countDone()+' / '+lessons.length+'</strong><span>Lessons completed</span></div><div><strong>'+countReview()+'</strong><span>Lessons to revisit</span></div><div><strong>'+(savedPlan()?saved.plan.days:'—')+'</strong><span>Course days</span></div></div><div class="track"><div class="fill" style="width:'+(countDone()/lessons.length*100)+'%"></div></div>'}
function setup(){
 let days=ui.setupDays,date=ui.setupDate;
 return '<section class="page"><div class="hero"><div><p class="eyebrow">Your preparation, your timetable</p><h1>Choose how much time you have.</h1><p class="subtitle">All 28 chapters and 141 lessons remain in the course. Shorter plans assign more study per day; longer plans allow more time for practice and revision.</p></div></div><div class="panel"><p class="eyebrow">Course duration</p><div class="duration-grid">'+[8,14,20,30,45,60].map(n=>'<button class="duration '+(n===days?'active':'')+'" data-days="'+n+'"><strong>'+n+'</strong><span>days</span></button>').join('')+'</div><div class="fields"><label>Other duration (5–120 days)<input type="number" id="custom-days" min="5" max="120" value="'+days+'"></label><label>Start date<input type="date" id="start-date" value="'+safe(date)+'"></label></div><p class="notice">'+(Math.floor(lessons.length/days))+'–'+Math.ceil(lessons.length/days+2)+' lessons on most days. '+Math.round(lessons.reduce((n,s)=>n+weights(s),0)/days).toLocaleString()+' source words per day on average, before practice. This is an approximate workload, not a guaranteed study duration.</p><button class="btn primary" data-action="saveplan">Create my course</button></div></section>';
}
function course(){
 if(!savedPlan())return setup();
 const days=schedule(saved.plan),target=todayDay(days),visibleDays=ui.showAllDays?days:days.filter(d=>d.day>=Math.max(1,target.day-1)&&d.day<=Math.min(days.length,target.day+5)),first=target?.ids.find(id=>!isDone(id))||lessons.find(s=>!isDone(s.id))?.id||lessons[0].id;
 return '<section class="page"><div class="hero"><div><p class="eyebrow">General Science · Part I · 60 marks</p><h1>Your '+saved.plan.days+'-day programme</h1><p class="subtitle">One complete syllabus. Work through explanations, apply the ideas, practise source questions and return to concepts that need attention.</p></div><button class="btn" data-action="editplan">Change duration</button></div><div class="panel accent">'+pillProgress()+'</div><div class="panel"><div class="spread"><div><p class="eyebrow">'+(target?.date===now()?'Today’s session':'Continue from here')+'</p><h2>Day '+target.day+' · '+dateLabel(target.date)+'</h2><p class="muted">'+target.done+' of '+target.ids.length+' lessons done · '+target.words.toLocaleString()+' source words assigned</p></div><button class="btn primary" data-lesson="'+safe(first)+'">Continue learning</button></div></div><div class="spread"><h2 style="margin:10px 0">Daily timetable</h2><small class="muted">Expand any day to see its lessons</small></div><div class="plan-grid">'+visibleDays.map(d=>'<details class="day" '+(d.day===target.day?'open':'')+'><summary><b>Day '+d.day+'</b><span><strong>'+dateLabel(d.date)+(d.done===d.ids.length?' · Completed':d.date<now()?' · Catch up':d.date===now()?' · Today':'')+'</strong><em>'+d.done+'/'+d.ids.length+' complete · '+d.words.toLocaleString()+' source words</em></span></summary><div class="day-lessons">'+d.ids.map(id=>{let s=byId.get(id);return '<button class="day-lesson '+(isDone(id)?'done':'')+'" data-lesson="'+safe(id)+'"><span>'+(isDone(id)?'✓':'○')+' '+safe(s.number)+' · '+safe(s.title)+'</span><small>'+s.words+' words</small></button>'}).join('')+'</div></details>').join('')+'</div>'+(ui.showAllDays?'<button class="btn" data-action="expandplan">Show current week</button>':days.length>visibleDays.length?'<button class="btn" data-action="expandplan">Show all '+days.length+' days</button>':'')+'<p class="tiny muted">A schedule changes the amount of work per day, never the scientific content. Changing it does not erase completed lessons or revision records.</p></section>';
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
 // Match each published question to only one suitable lesson in its chapter.
 // Never repeat the same chapter-wide MCQ across several successive lessons.
 if(!c._lessonQuestions){
   const excluded=new Set('their there these those which where would should about because under between during after other while could from have that this with what when into them were they more such known both used always different occur depends process produces often each most than also however using through'.split(' '));
   const words=t=>new Set((String(t).toLowerCase().match(/[a-z]{4,}/g)||[]).filter(w=>!excluded.has(w)));
   const ranked=[];
   for(const q of c.questions){
     const question=words(q.prompt+' '+q.options[q.answer]);
     for(const sec of c.sections){
       const title=words(sec.title),body=words(sec.text);
       let score=0;
       for(const w of question){if(title.has(w))score+=6;else if(body.has(w))score+=1}
       if(score>=4)ranked.push({q,sec,score});
     }
   }
   ranked.sort((a,b)=>b.score-a.score);
   const assigned={},used=new Set();
   for(const row of ranked){
     if(assigned[row.sec.id]||used.has(row.q.id))continue;
     assigned[row.sec.id]=row.q;used.add(row.q.id);
   }
   c._lessonQuestions=assigned;
 }
 return c._lessonQuestions[s.id]||null;
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
function finishedView(){
 const index=lessons.findIndex(s=>s.id===ui.id),next=lessons.slice(index+1).find(s=>!isDone(s.id))||lessons.slice(0,index+1).find(s=>!isDone(s.id));
 const rating=saved.completed?.[ui.id]?.selfRating||'';
 const status=rating==='gotit'?'Lesson completed':'Lesson recorded for revision';
 return '<section class="study-layout"><div class="breadcrumb"><button data-view="course">← My course</button></div><div class="panel accent" style="margin-top:30px"><p class="eyebrow">Session saved</p><h1>'+status+'</h1><p class="subtitle">'+safe(byId.get(ui.id)?.title||'')+'</p><p class="muted">'+(rating==='gotit'?'You marked this concept as understood. Test your recall again later.':'It remains in your revision notebook, ready for another attempt.')+'</p><div class="stat-row" style="margin:25px 0">'+pillProgress()+'</div><div class="flex">'+(next?'<button class="btn primary" data-lesson="'+safe(next.id)+'">Continue: '+safe(next.title)+' →</button>':'<button class="btn primary" data-view="review">Review completed lessons</button>')+'<button class="btn" data-view="course">My timetable</button></div></div></section>';
}
function chapterOverview(c){
 const completed=c.sections.filter(s=>isDone(s.id)).length;
 return '<section class="page"><div class="breadcrumb"><button data-view="library">← All chapters</button></div><p class="eyebrow">'+safe(c.part)+' · Chapter '+c.id+'</p><h1>'+safe(c.title)+'</h1><p class="subtitle">Study the complete explanations in order, or return to a specific topic. Each lesson includes source reading, an understanding check where questions are available, and a written recall activity.</p><div class="panel accent"><div class="spread"><div><strong>'+completed+' of '+c.sections.length+' lessons completed</strong><div class="track" style="width:220px"><div class="fill" style="width:'+(completed/c.sections.length*100)+'%"></div></div></div><button class="btn primary" data-practice="'+c.id+'">Chapter practice · '+c.questions.length+' MCQs</button></div></div><div class="panel"><h2>Lessons in this chapter</h2>'+c.sections.map(sec=>'<div class="list-row"><div><p class="eyebrow">Lesson '+safe(sec.number)+'</p><h3>'+safe(sec.title)+'</h3><p>'+nwords(sec.text)+' source words · '+(isDone(sec.id)?'Completed':'Not yet completed')+'</p></div><button class="btn small" data-lesson="'+safe(sec.id)+'">'+(isDone(sec.id)?'Repeat':'Study')+'</button></div>').join('')+'</div></section>';
}
function chapterPractice(c){
 const q=c.questions[ui.qindex],selected=ui.selected;
 const problem=q?'<p class="eyebrow">Question '+(ui.qindex+1)+' of '+c.questions.length+' · '+safe(q.id)+'</p><h2>'+safe(q.prompt)+'</h2><div class="choice-list">'+Object.entries(q.options).map(([k,v])=>'<button class="choice '+(selected?(k===q.answer?'correct':k===selected?'wrong':''):'')+'" data-quiz-choice="'+k+'" '+(selected?'disabled':'')+'><b>'+k+'</b>'+safe(v)+'</button>').join('')+'</div>'+(selected?'<div class="feedback '+(selected===q.answer?'':'error')+'"><strong>'+(selected===q.answer?'Correct':'Check the reasoning')+'</strong><p>'+safe(q.explanation)+'</p></div>':'')+'<div class="lesson-bottom"><span class="muted tiny">'+(Object.keys(saved.quizHistory||{}).filter(id=>id.startsWith('D'+String(c.id).padStart(2,'0')+'-')).length)+' answers recorded in this chapter</span><button class="btn primary" data-action="nextquestion" '+(!selected?'disabled':'')+'>'+(ui.qindex===c.questions.length-1?'View results':'Next question')+' →</button></div>':c.questions.length?'<div class="panel accent"><h2>Chapter practice complete</h2><p class="muted">'+c.questions.filter(q=>saved.quizHistory?.[q.id]?.correct).length+' correct answers in the saved chapter question records out of '+c.questions.length+' questions.</p><button class="btn primary" data-action="restartquestions">Repeat chapter practice</button></div>':'<p>There are no source MCQs for this chapter.</p>';
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
async function openChapter(id,view='chapterIndex'){
 ui.busy=true;ui.error='';draw();
 try{await loadChapter(id)}catch(e){ui.error=e.message;ui.busy=false;draw();return}
 ui.view=view;ui.chapter=Number(id);ui.qindex=0;ui.selected='';ui.reveal=false;ui.busy=false;draw();scrollTo({top:0,behavior:'instant'});
}
function chooseGrade(g){
 if(!['gotit','partial','again'].includes(g))return;
 const id=ui.id;const at=new Date().toISOString();
 saved.completed[id]={at,selfRating:g};
 if(g==='gotit')delete saved.revisit[id];else saved.revisit[id]={at,kind:'lesson'};
 ui.grade=g;notify();ui.view='finished';draw();
}
function saveQuizAnswer(value){const c=chapterCache.get(ui.chapter);const q=c?.questions?.[ui.qindex];if(!q||ui.selected)return;ui.selected=value;saved.quizHistory??={};saved.quizHistory[q.id]={at:new Date().toISOString(),selected:value,correct:value===q.answer};if(value!==q.answer){const id=c.sections[0]?.id;if(id)saved.revisit[id]={at:new Date().toISOString(),kind:'question',questionId:q.id}}notify();draw()}
function saveBookmark(){const id=ui.id;saved.bookmarks??={};saved.bookmarkRemoved??={};if(saved.bookmarks[id]){delete saved.bookmarks[id];saved.bookmarkRemoved[id]={at:new Date().toISOString()}}else{saved.bookmarks[id]={at:new Date().toISOString()};delete saved.bookmarkRemoved[id]}notify();draw()}
function saveDraft(id,value){saved.drafts??={};saved.drafts[id]=value;notify()}
function fullSource(){
 let s=chapterCache.get(byId.get(ui.id).chapter)?.sections.find(s=>s.id===ui.id);
 if(!s)return;const dialog=document.getElementById('reference');dialog.querySelector('h2').textContent=s.number+' · '+s.title;dialog.querySelector('.ref-source').innerHTML=s.html;dialog.showModal();
}
function draw(){
 if(accountChanged){root.innerHTML='<section class="panel" role="alert"><h2>Study account changed</h2><p>Reload this course to open the current account’s records.</p><button type="button" class="btn" data-action="reloadaccount">Reload course</button></section>';return}
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
 if(ui.view==='finished')content+=finishedView();
 if(ui.view==='chapterIndex')content+=chapterOverview(chapterCache.get(ui.chapter));
 if(ui.view==='chapter')content+=chapterPractice(chapterCache.get(ui.chapter));
 if(ui.view==='written'){const c=chapterCache.get(ui.chapter);content+=written(c,c.analytical.find(x=>x.id===ui.opening))}
 root.innerHTML=heading()+content;
 // Keep one natural page scrollbar when embedded in My CSS VISTA.
 if(window.parent!==window)window.requestAnimationFrame(()=>window.parent.postMessage({type:'cssvista:gsa:height',height:Math.ceil(document.documentElement.scrollHeight)+24},location.origin));
}
root.addEventListener('click',async e=>{
 const t=e.target.closest('button');if(!t)return;if(accountChanged){if(t.dataset.action==='reloadaccount')location.reload();return}if(ui.busy)return;
 if(t.dataset.view){ui.view=t.dataset.view;ui.error='';draw();scrollTo({top:0,behavior:'instant'});return}
 if(t.dataset.lesson){await openLesson(t.dataset.lesson);return}
 if(t.dataset.chapter){await openChapter(t.dataset.chapter);return}
 if(t.dataset.practice){await openChapter(t.dataset.practice,'chapter');return}
 if(t.dataset.analytical){ui.opening=t.dataset.analytical;ui.view='written';ui.reveal=false;draw();return}
 if(t.dataset.days){ui.setupDays=Number(t.dataset.days);draw();return}
 if(t.dataset.month!==undefined){ui.month=Number(t.dataset.month);draw();return}
 if(t.dataset.phase!==undefined){ui.phase=Number(t.dataset.phase);draw();return}
 if(t.dataset.choice){ui.selected=t.dataset.choice;const item=byId.get(ui.id),c=chapterCache.get(item.chapter),q=questionFor(c.sections.find(x=>x.id===ui.id),c);if(q&&ui.selected!==q.answer){saved.revisit[ui.id]={at:new Date().toISOString(),kind:'question',questionId:q.id};notify()}draw();return}
 if(t.dataset.quizChoice){saveQuizAnswer(t.dataset.quizChoice);return}
 if(t.dataset.grade){ui.grade=t.dataset.grade;draw();return}
 switch(t.dataset.action){
  case 'expandplan':ui.showAllDays=!ui.showAllDays;draw();break;
  case 'editplan':ui.setupDays=saved.plan.days;ui.setupDate=saved.plan.startDate;saved.plan=null;ui.view='course';draw();break;
  case 'saveplan':{
   const dd=document.getElementById('custom-days'),sd=document.getElementById('start-date'),days=dd?Number(dd.value):ui.setupDays,date=sd?sd.value:ui.setupDate;
   if(!Number.isInteger(days)||days<5||days>120||!/^\d{4}-\d{2}-\d{2}$/.test(date)){ui.error='Choose a duration between 5 and 120 days and a valid start date.';draw();return}
   saved.plan={days,startDate:date,changedAt:new Date().toISOString()};ui.showAllDays=false;ui.setupDays=days;ui.setupDate=date;notify();draw();break;
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
  case 'nextquestion':ui.qindex+=1;ui.selected='';draw();break;
  case 'restartquestions':ui.qindex=0;ui.selected='';draw();break;
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
window.addEventListener('storage',e=>{
 if(embedded||e.key!==null&&e.key!=='cssvista:progress-owner')return;
 try{if((localStorage.getItem('cssvista:progress-owner')||null)===(binding?.owner||null))return}catch{/* Hide the previous account when ownership cannot be read. */}
 accountChanged=true;draw();
});
window.addEventListener('message',e=>{
 if(e.origin!==location.origin||e.source!==window.parent||e.data?.type!=='cssvista:gsa:hydrate')return;
 const incoming=e.data.snapshot;if(!incoming||typeof incoming!=='object')return;
 const previousOwner=binding?.owner;const previouslyBound=binding!==null;
 const metadata=e.data.storage;if(metadata&&typeof metadata.key==='string'&&(metadata.key===KEY||metadata.key.startsWith('cssvista:reset-data:v1:')&&metadata.key.endsWith(encodeURIComponent(KEY)))){storageKey=metadata.key;binding={owner:metadata.owner||null,generation:metadata.generation||null}}else{storageKey=KEY;binding={owner:localStorage.getItem('cssvista:progress-owner'),generation:null}}
 if(e.data.preserveView&&previouslyBound&&previousOwner===binding.owner){saved={...defaults(),...incoming};draw();return}
 saved={...defaults(),...incoming};ui.id=byId.has(saved.last)?saved.last:lessons[0]?.id;ui.view='course';ui.setupDays=savedPlan()?.days||20;ui.setupDate=savedPlan()?.startDate||now();draw();
});
document.getElementById('close-reference').addEventListener('click',()=>document.getElementById('reference').close());
function seasonSvg(june){let axis=june?-18:18;let northX=june?237:307;let southX=june?307:237;return `<svg role="img" aria-label="Simplified sunlight and Earth-axis diagram, not to scale" viewBox="0 0 570 246" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="sunGrad"><stop stop-color="#f6d48f"/><stop offset="1" stop-color="#e9ad67"/></radialGradient><linearGradient id="earthGrad" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#a9d2c4"/><stop offset="1" stop-color="#608d84"/></linearGradient></defs><circle cx="82" cy="113" r="43" fill="url(#sunGrad)"/><circle cx="82" cy="113" r="48" fill="none" stroke="#e4c69a" stroke-width="1.5" stroke-dasharray="4 6"/><text x="82" y="180" text-anchor="middle" fill="#7e8d74" font-size="12" font-family="Arial">SUN</text><g stroke="#d9b879" stroke-width="1.5" stroke-dasharray="6 7"><path d="M133 62 H230"/><path d="M133 94 H225"/><path d="M133 124 H225"/><path d="M133 156 H230"/></g><path d="M219 56h14m-6-6 6 6-6 6" fill="none" stroke="#c8a262" stroke-width="1.5"/><circle cx="272" cy="113" r="67" fill="url(#earthGrad)" stroke="#6a9287" stroke-width="1.5"/><path d="M272 46a67 67 0 0 1 0 134" fill="#1e504b" opacity=".50" transform="translate(0 0)"/><path d="M225 69c12-17 23 1 36 10 12 8 18-5 30 7 4 8-2 12-14 14-14 1-9 23-25 20-20-3-17-13-27-26z" fill="#b3ce9c" opacity=".9"/><path d="M287 124c26-14 36 3 28 18-10 9-1 15-23 25-8-3-12-23-5-43z" fill="#b3ce9c" opacity=".88"/><g transform="rotate(${axis} 272 113)"><path d="M272 17V209" stroke="#214c3a" stroke-width="2" stroke-dasharray="5 5"/><path d="M267 23l5-11 5 11" fill="none" stroke="#214c3a" stroke-width="2"/><circle cx="272" cy="113" r="2.5" fill="#214c3a"/></g><text x="${northX}" y="30" text-anchor="middle" fill="#315844" font-size="11" font-weight="700" font-family="Arial">N</text><text x="${southX}" y="209" text-anchor="middle" fill="#315844" font-size="11" font-weight="700" font-family="Arial">S</text><text x="435" y="75" fill="#60776b" font-size="12" font-family="Arial">Northern</text><text x="435" y="93" fill="#315a42" font-size="14" font-weight="700" font-family="Arial">${june?'Summer':'Winter'}</text><path d="M347 87h70" stroke="#c4d6c4" stroke-width="1.5"/><text x="435" y="142" fill="#60776b" font-size="12" font-family="Arial">Southern</text><text x="435" y="160" fill="#315a42" font-size="14" font-weight="700" font-family="Arial">${june?'Winter':'Summer'}</text><path d="M346 149h70" stroke="#c4d6c4" stroke-width="1.5"/><text x="272" y="235" text-anchor="middle" fill="#819b87" font-size="10" font-family="Arial">Schematic: axis orientation relative to the Sun</text></svg>`}
function moonSvg(phase){
 const coords=[[171,111],[271,31],[371,111],[271,191]];let [mx,my]=coords[phase];const labels=['New Moon','First quarter','Full Moon','Last quarter'];
 let face=phase===0?'<circle cx="477" cy="105" r="35" fill="#435e5b"/>':phase===2?'<circle cx="477" cy="105" r="35" fill="#ecf1d8" stroke="#cdd9cb"/>':`<circle cx="477" cy="105" r="35" fill="#425c57"/>${phase===1?'<path d="M477 70 A35 35 0 0 1 477 140 Z" fill="#ecf1d8"/>':'<path d="M477 70 A35 35 0 0 0 477 140 Z" fill="#ecf1d8"/>'}`;
 return `<svg role="img" aria-label="Moon orbit diagram with sunlight coming from the left" viewBox="0 0 570 230" xmlns="http://www.w3.org/2000/svg"><circle cx="76" cy="111" r="31" fill="#e9b977"/><text x="76" y="161" font-size="11" text-anchor="middle" fill="#7c987e" font-family="Arial">Sun</text><g stroke="#dfc69b" stroke-width="2" stroke-dasharray="5 7"><path d="M110 80 H205"/><path d="M110 111 H205"/><path d="M110 140 H205"/></g><ellipse cx="271" cy="111" rx="101" ry="81" fill="none" stroke="#b3cbb6" stroke-dasharray="4 6" stroke-width="1.8"/><circle cx="271" cy="111" r="35" fill="#7eb0a1"/><path d="M271 76A35 35 0 0 1 271 146" fill="#325b55" opacity=".55"/><path d="M252 90c12-7 19 0 20 9 16 5 14 15-2 19-10 8-9 15-22 12-15-9-19-30 4-40" fill="#d1d4a0" opacity=".75"/><text x="271" y="159" font-size="11" text-anchor="middle" fill="#6d8877" font-family="Arial">Earth</text><circle cx="${mx}" cy="${my}" r="15" fill="#a9bbad" stroke="#7f9589"/><path d="M${mx} ${my-15}a15 15 0 0 1 0 30" fill="#526b60" opacity=".42"/><path d="M405 50v120" stroke="#dce8dc" stroke-width="1"/><text x="477" y="51" font-size="11" fill="#708d7b" text-anchor="middle" font-family="Arial">As seen from Earth</text>${face}<text x="477" y="169" font-size="13" fill="#416a4b" text-anchor="middle" font-weight="700" font-family="Arial">${labels[phase]}</text><text x="274" y="216" text-anchor="middle" fill="#8ca494" font-size="10" font-family="Arial">Orbit shown schematically, not to scale</text></svg>`
}

(async()=>{
 try{
  const response=await fetch('/gsa-tutor/content/catalog.json',{cache:'force-cache'});if(!response.ok)throw Error('Course catalogue could not be loaded');
  catalog=await response.json();lessons=catalog.chapters.flatMap(c=>c.sections.map(s=>({...s,chapter:c.id,chapterTitle:c.title,part:c.part})));byId=new Map(lessons.map(s=>[s.id,s]));
  if(lessons.length!==141||catalog.chapters.length!==28)throw Error('The course catalogue is incomplete');
  ui.id=byId.has(saved.last)?saved.last:lessons[0].id;ui.setupDays=savedPlan()?.days||20;ui.setupDate=savedPlan()?.startDate||now();draw();
 }catch(e){root.innerHTML='<div class="panel" role="alert"><h2>Course temporarily unavailable</h2><p>'+safe(e.message)+'</p><button class="btn" onclick="location.reload()">Reload course</button></div>'}
})();
})();
