
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
const defaults=()=>({completed:{},revisit:{},bookmarks:{},bookmarkRemoved:{},drafts:{},quizHistory:{},quizAttempts:{},questionReview:{},recallAttempts:{},reviewDue:{},last:null,plan:null});
function read(){try{const o=JSON.parse(localStorage.getItem(storageKey)||'null');return o&&typeof o==='object'&&!Array.isArray(o)?{...defaults(),...o}:defaults()}catch{return defaults()}}
let saved=embedded?defaults():read(),catalog=null,lessons=[],byId=new Map(),chapterCache=new Map();
let ui={view:'course',id:saved.last,stage:'learn',beat:0,selected:'',draft:'',reveal:false,grade:'',chapter:1,qindex:0,phase:0,month:0,eclipse:'solar',seismic:'P',osm:'iso',water:0,setupDays:20,setupDate:now(),setupRestDays:[],setupDailyMinutes:90,search:'',opening:'',showAllDays:false,busy:false,error:'',attemptId:null,reviewSingle:false};
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
const isConfident=id=>saved.completed?.[id]?.selfRating==='gotit'&&!saved.revisit?.[id];
const countConfident=()=>lessons.filter(x=>isConfident(x.id)).length;
const countMissedQuestions=()=>Object.values(saved.questionReview||{}).filter(v=>v?.unresolved).length;
const countReview=()=>Object.keys(saved.revisit||{}).filter(id=>byId.has(id)).length;
const nwords=s=>String(s||'').trim().split(/\s+/).filter(Boolean).length;
function weights(s){return Math.max(100,s.words||100)}
function validPlan(p){
 const date=typeof p?.startDate==='string'?new Date(p.startDate+'T12:00:00Z'):new Date(NaN);
 return !!(p&&Number.isInteger(p.days)&&p.days>=5&&p.days<=120&&Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===p.startDate&&
 (!p.restDays||Array.isArray(p.restDays)&&p.restDays.length<7&&p.restDays.every(n=>Number.isInteger(n)&&n>=0&&n<=6))&&
 (p.dailyMinutes===undefined||Number.isInteger(p.dailyMinutes)&&p.dailyMinutes>=15&&p.dailyMinutes<=600));
}
function studyDate(plan,index){
 const rests=new Set(plan.restDays||[]);let date=plan.startDate,passed=0;
 for(let tries=0;tries<1000;tries++){
   const weekday=new Date(date+'T12:00:00Z').getUTCDay();
   if(!rests.has(weekday)){if(passed===index)return date;passed++;}
   date=dateAdd(date,1);
 }
 throw Error('No available study days in the selected course');
}
function dueReviews(){
 return Object.entries(saved.reviewDue||{}).filter(([id,record])=>byId.has(id)&&record?.date&&/^\d{4}-\d{2}-\d{2}$/.test(record.date)).map(([id,record])=>({id,date:record.date,stage:record.stage||1})).sort((a,b)=>a.date.localeCompare(b.date));
}
function countDueReviews(){return dueReviews().filter(r=>r.date<=now()).length}
function schedule(plan){
 const res=Array.from({length:plan.days},()=>[]);const sum=lessons.reduce((n,s)=>n+weights(s),0);
 let cursor=0,used=0;
 for(let d=0;d<plan.days;d++){
   const remaining=plan.days-d, target=(sum-used)/remaining, cap=lessons.length-(remaining-1);
   let load=0;
   while(cursor<cap&&(res[d].length===0||d===plan.days-1||load+weights(lessons[cursor])/2<=target)){res[d].push(lessons[cursor].id);load+=weights(lessons[cursor]);cursor++}
   used+=load;
 }
 const studyDays=res.map((ids,i)=>({date:studyDate(plan,i),day:i+1,ids,words:ids.reduce((n,id)=>n+weights(byId.get(id)),0),done:ids.filter(isDone).length,reviews:[]}));
 for(const item of dueReviews()){
   const slot=studyDays.find(d=>d.date>=item.date);
   if(slot)slot.reviews.push(item.id);
 }
 return studyDays;
}
function savedPlan(){return validPlan(saved.plan)?saved.plan:null}
function todayDay(days){return days.find(d=>d.done<d.ids.length&&d.date<=now())||days.find(d=>d.done<d.ids.length)||days[days.length-1]}
function chapterName(ch){return catalog.chapters.find(c=>c.id===ch)?.title||''}
function heading(){return '<header class="top"><div class="brand"><img src="/images/logo.webp" alt="" width="32" height="32"><div>CSS VISTA<small>GENERAL SCIENCE TUTOR</small></div></div><nav class="nav" aria-label="GSA Tutor"><button data-view="course" class="'+(ui.view==='course'?'active':'')+'">My course</button><button data-view="library" class="'+(ui.view==='library'?'active':'')+'">Chapters</button><button data-view="practice" class="'+(ui.view==='practice'?'active':'')+'">Practice</button><button data-view="review" class="'+(ui.view==='review'?'active':'')+'">Revision</button></nav></header>'}
function pillProgress(){
 return '<div class="stat-row"><div><strong>'+countDone()+' / '+lessons.length+'</strong><span>Lessons studied</span></div><div><strong>'+countConfident()+' / '+lessons.length+'</strong><span>Self-rated clear</span></div><div><strong>'+countReview()+'</strong><span>Lessons to revisit</span></div><div><strong>'+countMissedQuestions()+'</strong><span>Missed questions</span></div><div><strong>'+countDueReviews()+'</strong><span>Reviews due</span></div><div><strong>'+(savedPlan()?saved.plan.days:'—')+'</strong><span>Course days</span></div></div><div class="track" role="progressbar" aria-label="Lessons self-rated clear" aria-valuemin="0" aria-valuemax="'+lessons.length+'" aria-valuenow="'+countConfident()+'"><div class="fill" style="width:'+(countConfident()/lessons.length*100)+'%"></div></div>';
}
function setup(){
 const days=ui.setupDays,date=ui.setupDate,rest=new Set(ui.setupRestDays||[]);
 const dayNames=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
 const restControls=dayNames.map((name,i)=>'<label class="rest-toggle"><input type="checkbox" data-rest-day="'+i+'" '+(rest.has(i)?'checked':'')+'><span>'+name+'</span></label>').join('');
 const totalWords=lessons.reduce((n,s)=>n+weights(s),0);
 return '<section class="page"><div class="hero"><div><p class="eyebrow">Your preparation, your timetable</p><h1>Choose how much time you have.</h1><p class="subtitle">All 28 chapters and 141 lessons remain in every plan. Choose active study days and days off; revisions are scheduled separately from new reading.</p></div></div><div class="panel"><p class="eyebrow">Active study sessions</p><div class="duration-grid">'+[8,14,20,30,45,60].map(n=>'<button class="duration '+(n===days?'active':'')+'" data-days="'+n+'"><strong>'+n+'</strong><span>days</span></button>').join('')+'</div><div class="fields"><label>Other duration (5–120 study days)<input type="number" id="custom-days" min="5" max="120" value="'+days+'"></label><label>Start date<input type="date" id="start-date" value="'+safe(date)+'"></label><label>Daily time available (minutes)<input type="number" id="daily-minutes" min="15" max="600" step="15" value="'+ui.setupDailyMinutes+'"></label></div><fieldset class="rest-field"><legend>Weekly rest days</legend><div class="rest-options">'+restControls+'</div></fieldset><p class="notice">'+Math.floor(lessons.length/days)+'–'+Math.ceil(lessons.length/days+2)+' lessons on most active days. '+Math.round(totalWords/days).toLocaleString()+' manuscript words per study day on average, excluding tests and recall. Your time budget is a planning preference; course completion time is not scientifically measured.</p><button class="btn primary" data-action="saveplan">Create my course</button></div></section>';
}
function course(){
 if(!savedPlan())return setup();
 const days=schedule(saved.plan),target=todayDay(days);
 const visibleDays=ui.showAllDays?days:days.filter(d=>d.day>=Math.max(1,target.day-1)&&d.day<=Math.min(days.length,target.day+5));
 const first=target?.ids.find(id=>!isDone(id))||lessons.find(s=>!isDone(s.id))?.id||lessons[0].id;
 const due=dueReviews().filter(x=>x.date<=now());
 const reviewBanner=due.length?'<div class="panel"><div class="spread"><div><p class="eyebrow">Spaced recall</p><h2>'+due.length+' review'+(due.length===1?'':'s')+' due</h2><p class="muted">Review these topics before proceeding; your earlier work is saved.</p></div><button class="btn primary" data-view="review">Open revision</button></div></div>':'';
 const rest=(saved.plan.restDays||[]).length?['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].filter((_,i)=>saved.plan.restDays.includes(i)).join(', '):'none';
 const paceNote='<p class="tiny muted">Time available: '+(saved.plan.dailyMinutes||90)+' minutes per active study day · Weekly rest: '+rest+'. The time budget is a preference, not a measured promise of completion.</p>';
 const dayRows=visibleDays.map(d=>{
   const entries=d.ids.map(id=>{const sec=byId.get(id);return '<button class="day-lesson '+(isDone(id)?'done':'')+'" data-lesson="'+safe(id)+'"><span>'+(isDone(id)?'✓':'○')+' '+safe(sec.number)+' · '+safe(sec.title)+'</span><small>'+sec.words+' words</small></button>'}).join('');
   const revisions=d.reviews.length?'<div class="scheduled-review"><strong>Spaced recall</strong>'+d.reviews.map(id=>'<button class="day-lesson" data-lesson="'+safe(id)+'">↻ '+safe(byId.get(id)?.title||'Lesson')+'</button>').join('')+'</div>':'';
   return '<details class="day" '+(d.day===target.day?'open':'')+'><summary><b>Day '+d.day+'</b><span><strong>'+dateLabel(d.date)+(d.done===d.ids.length?' · Studied':d.date<now()?' · Catch up':d.date===now()?' · Today':'')+'</strong><em>'+d.done+'/'+d.ids.length+' studied · '+d.words.toLocaleString()+' source words · '+d.reviews.length+' recall</em></span></summary><div class="day-lessons">'+entries+revisions+'</div></details>';
 }).join('');
 return '<section class="page"><div class="hero"><div><p class="eyebrow">General Science · Part I · 60 marks</p><h1>Your '+saved.plan.days+'-study-day programme</h1><p class="subtitle">Work through the explanations, practise source questions, and return to concepts when scheduled. Off-days are excluded from the calendar.</p></div><button class="btn" data-action="editplan">Change plan</button></div><div class="panel accent">'+pillProgress()+'</div>'+reviewBanner+'<div class="panel"><div class="spread"><div><p class="eyebrow">'+(target?.date===now()?'Today’s session':'Continue from here')+'</p><h2>Day '+target.day+' · '+dateLabel(target.date)+'</h2><p class="muted">'+target.done+' of '+target.ids.length+' lessons studied · '+target.words.toLocaleString()+' source words assigned</p></div><button class="btn primary" data-lesson="'+safe(first)+'">Continue learning</button></div></div><div class="spread"><h2 style="margin:10px 0">Daily timetable</h2><small class="muted">Expand a day to see lessons and spaced recall</small></div><div class="plan-grid">'+dayRows+'</div>'+(ui.showAllDays?'<button class="btn" data-action="expandplan">Show current week</button>':days.length>visibleDays.length?'<button class="btn" data-action="expandplan">Show all '+days.length+' study days</button>':'')+paceNote+'<p class="tiny muted">Rescheduling preserves studied lessons and earlier recall records. The manuscript content does not change when the number of days changes.</p></section>';
}
function library(){
 const items=catalog.chapters.filter(c=>!ui.search||[c.title,c.part,...c.sections.map(s=>s.title)].join(' ').toLowerCase().includes(ui.search.toLowerCase()));
 return '<section class="page"><div class="hero"><div><p class="eyebrow">The complete manuscript</p><h1>Choose a chapter.</h1><p class="subtitle">28 chapters, 141 substantial lessons, all five General Science syllabus areas. Practice and detailed source passages are inside each chapter.</p></div></div><input class="search-input" type="search" id="search" placeholder="Find a topic, chapter or concept" value="'+safe(ui.search)+'" aria-label="Search subjects"><div class="panel">'+items.map(c=>'<div class="list-row"><div><p class="eyebrow">'+safe(c.part)+' · Chapter '+c.id+'</p><h3>'+safe(c.title)+'</h3><p>'+c.sections.length+' lessons · '+c.questionCount+' original MCQs · '+c.analyticalCount+' analytical model answers</p></div><button class="btn small" data-chapter="'+c.id+'">Open</button></div>').join('')+'</div></section>';
}
function review(){
 const ids=Object.keys(saved.revisit||{}).filter(id=>byId.has(id));
 const missed=Object.entries(saved.questionReview||{}).filter(([,entry])=>entry?.unresolved&&Number.isInteger(entry.chapter)&&catalog.chapters.some(c=>c.id===entry.chapter));
 const due=dueReviews().filter(r=>r.date<=now()),upcoming=dueReviews().filter(r=>r.date>now());
 function recallRows(items,label){
   return items.length?items.map(item=>{const sec=byId.get(item.id);return '<div class="list-row"><div><strong>'+safe(sec.title)+'</strong><p>Chapter '+sec.chapter+' · '+label+' '+dateLabel(item.date)+'</p></div><button class="btn small" data-lesson="'+safe(item.id)+'">Review</button></div>'}).join(''):'<p class="muted">No '+label.toLowerCase()+' reviews.</p>';
 }
 const lessonRows=ids.length?ids.map(id=>{const sec=byId.get(id);return '<div class="list-row"><div><strong>'+safe(sec.title)+'</strong><p>Chapter '+sec.chapter+' · Lesson '+sec.number+'</p></div><button class="btn small" data-lesson="'+safe(id)+'">Repeat</button></div>'}).join(''):'<p class="muted">No lessons currently flagged for revision.</p>';
 const questionRows=missed.length?missed.map(([id,entry])=>'<div class="list-row"><div><strong>Question '+safe(id)+'</strong><p>'+safe(chapterName(entry.chapter))+'</p></div><button class="btn small" data-review-question="'+safe(id)+'" data-review-chapter="'+entry.chapter+'">Review question</button></div>').join(''):'<p class="muted">No missed questions awaiting a new attempt.</p>';
 return '<section class="page"><div class="hero"><div><p class="eyebrow">Learn · Test · Return</p><h1>Revision notebook</h1><p class="subtitle">Dated recall sessions, difficult concepts and wrong source questions are tracked independently. Previous attempts remain saved.</p></div></div><div class="panel"><h2>Recall due · '+due.length+'</h2>'+recallRows(due,'Due')+'</div><div class="panel"><h2>Upcoming recall · '+upcoming.length+'</h2>'+recallRows(upcoming,'Scheduled')+'</div><div class="panel"><h2>'+ids.length+' lessons to revisit</h2>'+lessonRows+'</div><div class="panel"><h2>'+missed.length+' missed questions</h2>'+questionRows+'</div><p class="tiny muted">The 3, 7, 14, 30 and 60-day sequence is a fixed revision aid, not a scientifically verified measure of mastery.</p></section>';
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
function modelFrame(title,controls,graphic,note,reference,label){
 return '<div class="model" aria-label="'+safe(label||title)+'"><p class="eyebrow">'+safe(title)+'</p><div class="tabs">'+controls+'</div><div class="science-graphic">'+graphic+'</div><p class="tiny muted">'+safe(note)+'</p><p class="tiny"><a href="'+reference+'" target="_blank" rel="noopener noreferrer">Scientific reference ↗</a></p></div>';
}
function visual(s){
 if(s.id==='c3-s3-3')return '<div class="model"><p class="eyebrow">Explore the seasons</p><div class="tabs"><button data-month="0" class="'+(!ui.month?'active':'')+'">June</button><button data-month="1" class="'+(ui.month?'active':'')+'">December</button></div><div id="science-model">'+seasonSvg(!ui.month)+'</div><p class="tiny muted">Diagram is schematic. The direction of Earth’s axial tilt explains the opposite seasons.</p></div>';
 if(s.id==='c3-s3-4'){
  const moons='<div class="model"><p class="eyebrow">Explore lunar phases</p><div class="tabs">'+['New','First quarter','Full','Last quarter'].map((x,i)=>'<button data-phase="'+i+'" aria-pressed="'+(ui.phase===i)+'" class="'+(ui.phase===i?'active':'')+'">'+x+'</button>').join('')+'</div><div id="science-model">'+moonSvg(ui.phase)+'</div><p class="tiny muted">Moon orbit viewed schematically from above; not to scale.</p></div>';
  const eclipse=modelFrame('Compare eclipse geometry',['solar','lunar'].map(x=>'<button data-eclipse="'+x+'" aria-pressed="'+(ui.eclipse===x)+'" class="'+(ui.eclipse===x?'active':'')+'">'+(x==='solar'?'Solar eclipse':'Lunar eclipse')+'</button>').join(''),eclipseSvg(ui.eclipse),'Solar: Moon between Sun and Earth. Lunar: Earth between Sun and Moon. Alignment diagram only; distances and sizes not to scale.','https://science.nasa.gov/moon/eclipses/','Solar and lunar eclipse comparison');
  return moons+eclipse;
 }
 if(s.id==='c5-s5-2')return modelFrame('Explore seismic wave motion',['P','S'].map(x=>'<button data-seismic="'+x+'" aria-pressed="'+(ui.seismic===x)+'" class="'+(ui.seismic===x?'active':'')+'">'+x+' wave</button>').join(''),seismicSvg(ui.seismic),'P waves compress material in the direction of travel. S waves cause transverse shear motion; they do not propagate through liquid interiors. Schematic particle paths.','https://www.usgs.gov/programs/earthquake-hazards/seismographs-keeping-track-earthquakes');
 if(s.id==='c9-s9-3')return modelFrame('Explore osmosis',['hypo','iso','hyper'].map(x=>'<button data-osm="'+x+'" aria-pressed="'+(ui.osm===x)+'" class="'+(ui.osm===x?'active':'')+'">'+({hypo:'Hypotonic',iso:'Isotonic',hyper:'Hypertonic'}[x])+'</button>').join(''),osmosisSvg(ui.osm),'Tonicity describes the solution outside the cell relative to the cell interior. Water can move both ways; the arrows show only the net tendency. Schematic only.','https://openstax.org/books/biology-2e/pages/5-2-passive-transport');
 if(s.id==='c18-s18-1')return modelFrame('Follow common drinking-water treatment steps',['Coagulation','Flocculation','Sedimentation','Filtration','Disinfection'].map((x,i)=>'<button data-water="'+i+'" aria-pressed="'+(ui.water===i)+'" class="'+(ui.water===i?'active':'')+'">'+(i+1)+'. '+x+'</button>').join(''),waterSvg(ui.water),'Treatment sequences vary with source-water quality. Each illustrated step is one barrier, not a guarantee of safety in isolation.','https://www.cdc.gov/drinking-water/about/how-water-treatment-works.html');
 return '';
}
function sourceChecklist(section){
 const container=document.createElement('div');container.innerHTML=section.html||'';
 const found=[...container.querySelectorAll('strong,h3,h4')].map(el=>(el.textContent||'').trim().replace(/[.:]+$/,'')).filter(t=>t.length>=5&&t.length<=80);
 const headings=[...new Set(found)].slice(0,6);
 return headings.length?'<div class="recall-checklist"><h3>Check against the manuscript headings</h3><ul>'+headings.map(t=>'<li>'+safe(t)+'</li>').join('')+'</ul><p class="tiny muted">These are source headings for self-review, not automated marks or an independently validated rubric.</p></div>':'';
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
  const draft=ui.draft||saved.drafts?.[s.id]||'',sample=pieces.slice(0,Math.min(pieces.length,3)).join(''),revealed=ui.reveal,checklist=sourceChecklist(s);
  content='<div class="lesson-card"><p class="segment-note">Recall · Closed-book explanation</p><h2>Can you explain '+safe(s.title.toLowerCase())+'?</h2><p class="muted">Write the mechanism, evidence, distinction or application in your own words. Include an example where the original lesson provides one. Your response is for self-review; it is not automatically graded.</p><textarea class="textarea" id="recall" placeholder="Explain the idea here, using your own words...">'+safe(draft)+'</textarea>'+(revealed?'<div class="compare"><h3>Compare with the source</h3><div class="study-copy">'+sample+'</div>'+checklist+'<button class="btn small" data-action="fullsource">Read the complete section</button><p class="muted tiny">Decide what you explained correctly and what needs another reading.</p><div class="score-group"><button class="btn" data-grade="gotit">I understood</button><button class="btn" data-grade="partial">Partly clear</button><button class="btn" data-grade="again">Repeat</button></div></div>':'')+'<div class="lesson-bottom"><button class="btn" data-action="tolearn">Read again</button>'+(revealed?'<button class="btn primary" data-action="finish" '+(!ui.grade?'disabled':'')+'>Save & finish →</button>':'<button class="btn primary" data-action="reveal" '+(nwords(draft)<16?'disabled':'')+'>Compare with the book →</button>')+'</div></div>';
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
 return '<section class="page"><div class="breadcrumb"><button data-view="library">← All chapters</button></div><p class="eyebrow">'+safe(c.part)+' · Chapter '+c.id+'</p><h1>'+safe(c.title)+'</h1><p class="subtitle">Study the complete explanations in order, or return to a specific topic. Each lesson includes source reading, an understanding check where questions are available, and a written recall activity.</p><div class="panel accent"><div class="spread"><div><strong>'+completed+' of '+c.sections.length+' lessons studied</strong><div class="track" style="width:220px"><div class="fill" style="width:'+(completed/c.sections.length*100)+'%"></div></div></div><button class="btn primary" data-practice="'+c.id+'">Chapter practice · '+c.questions.length+' MCQs</button></div></div><div class="panel"><h2>Lessons in this chapter</h2>'+c.sections.map(sec=>'<div class="list-row"><div><p class="eyebrow">Lesson '+safe(sec.number)+'</p><h3>'+safe(sec.title)+'</h3><p>'+nwords(sec.text)+' source words · '+(isDone(sec.id)?'Studied':'Not yet studied')+'</p></div><button class="btn small" data-lesson="'+safe(sec.id)+'">'+(isDone(sec.id)?'Repeat':'Study')+'</button></div>').join('')+'</div></section>';
}
function chapterPractice(c){
 const q=c.questions[ui.qindex],selected=ui.selected;
 const attempt=saved.quizAttempts?.[ui.attemptId]||{responses:{}};
 const responses=Object.values(attempt.responses||{});
 const correct=responses.filter(answer=>answer.correct).length;
 const count=responses.length;
 const question=q?'<p class="eyebrow">'+(ui.reviewSingle?'Targeted revision':'Question '+(ui.qindex+1)+' of '+c.questions.length)+' · '+safe(q.id)+'</p><h2>'+safe(q.prompt)+'</h2><div class="choice-list">'+Object.entries(q.options).map(([k,v])=>'<button class="choice '+(selected?(k===q.answer?'correct':k===selected?'wrong':''):'')+'" data-quiz-choice="'+k+'" '+(selected?'disabled':'')+'><b>'+k+'</b>'+safe(v)+'</button>').join('')+'</div>'+(selected?'<div class="feedback '+(selected===q.answer?'':'error')+'"><strong>'+(selected===q.answer?'Correct':'Check the reasoning')+'</strong><p>'+safe(q.explanation)+'</p></div>':'')+'<div class="lesson-bottom"><span class="muted tiny">'+count+' answered · '+correct+' correct in this attempt</span>'+(ui.reviewSingle?'<button class="btn primary" data-action="returnreview">Return to revision →</button>':'<button class="btn primary" data-action="nextquestion" '+(!selected?'disabled':'')+'>'+(ui.qindex===c.questions.length-1?'View results':'Next question')+' →</button>')+'</div>':c.questions.length?'<div class="panel accent"><h2>Attempt finished</h2><p class="muted">'+correct+' correct out of '+count+' questions answered in this attempt. Earlier attempts remain saved separately.</p><button class="btn primary" data-action="restartquestions">Start a new attempt</button></div>':'<p>There are no source MCQs for this chapter.</p>';
 const attempts=Object.entries(saved.quizAttempts||{}).filter(([id,entry])=>id!==ui.attemptId&&entry?.chapter===c.id&&Object.keys(entry.responses||{}).length>0).sort((a,b)=>Date.parse(b[1].at||0)-Date.parse(a[1].at||0)).slice(0,5);
 const history=attempts.length?'<div class="panel"><h2>Previous practice attempts</h2>'+attempts.map(([,attempt])=>{const answers=Object.values(attempt.responses||{});const score=answers.filter(a=>a.correct).length;return '<div class="list-row"><div><strong>'+score+' / '+answers.length+' correct</strong><p>'+safe((attempt.at||'').slice(0,10))+(attempt.finishedAt?' · Finished':' · Partial attempt')+'</p></div></div>'}).join('')+'</div>':'';
 const a=c.analytical||[];
 return '<section class="page"><div class="breadcrumb"><button data-view="practice">← All chapters</button></div><p class="eyebrow">Chapter '+c.id+' · '+safe(c.part)+'</p><h1>'+safe(c.title)+'</h1><div class="panel">'+question+'</div>'+history+'<div class="panel"><h2>Analytical writing</h2>'+(a.length?a.map(q=>'<div class="list-row"><div><strong>'+safe(q.prompt)+'</strong><p>Original model answer available</p></div><button class="btn small" data-analytical="'+safe(q.id)+'">Write answer</button></div>').join(''):'<p class="muted">This chapter does not have a published model analytical answer in the supplied manuscript. The section material remains available for study.</p>')+'</div></section>';
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
 ui.view=view;ui.chapter=Number(id);ui.qindex=0;ui.selected='';ui.reveal=false;ui.reviewSingle=false;if(view==='chapter')beginQuizAttempt(ui.chapter);ui.busy=false;draw();scrollTo({top:0,behavior:'instant'});
}
function beginQuizAttempt(chapter){
 const id='gsa-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10);
 saved.quizAttempts??={};
 saved.quizAttempts[id]={at:new Date().toISOString(),chapter,responses:{},finishedAt:null};
 ui.attemptId=id;notify();return id;
}
function chooseGrade(g){
 if(!['gotit','partial','again'].includes(g))return;
 const id=ui.id;
 if(g==='gotit'&&saved.revisit?.[id]?.kind==='question'){
   ui.stage='question';ui.selected='';ui.reveal=false;ui.grade='';
   ui.error='You missed the concept check. Answer it correctly before marking this lesson clear.';
   draw();return;
 }
 const at=new Date().toISOString();
 saved.completed[id]={at,selfRating:g};
 if(g==='gotit')delete saved.revisit[id];else saved.revisit[id]={at,kind:'lesson'};
 saved.recallAttempts??={};saved.reviewDue??={};
 const attemptId='recall-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10);
 const attempts=Object.values(saved.recallAttempts).filter(x=>x?.lessonId===id).sort((a,b)=>Date.parse(a.at)-Date.parse(b.at));
 let streak=0;for(let i=attempts.length-1;i>=0&&attempts[i].selfRating==='gotit';i--)streak++;
 const stage=g==='gotit'?Math.min(5,streak+1):0,interval=stage?[0,3,7,14,30,60][stage]:1;
 saved.recallAttempts[attemptId]={at,lessonId:id,selfRating:g};
 saved.reviewDue[id]={at,date:dateAdd(now(),interval),stage};
 ui.grade=g;notify();ui.view='finished';draw();
}
function saveQuizAnswer(value){
 const c=chapterCache.get(ui.chapter),q=c?.questions?.[ui.qindex];
 if(!q||ui.selected||!Object.prototype.hasOwnProperty.call(q.options,value))return;
 const at=new Date().toISOString(),correct=value===q.answer;
 ui.selected=value;
 saved.quizHistory??={};saved.quizHistory[q.id]={at,selected:value,correct};
 saved.questionReview??={};saved.questionReview[q.id]={at,chapter:c.id,unresolved:!correct};
 if(!saved.quizAttempts?.[ui.attemptId])beginQuizAttempt(c.id);
 const attempt=saved.quizAttempts[ui.attemptId];
 attempt.responses[q.id]={at,selected:value,correct};
 attempt.at=at;
 notify();draw();
}
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
 if(t.dataset.reviewQuestion){
   await openChapter(Number(t.dataset.reviewChapter),'chapter');
   const ch=chapterCache.get(ui.chapter),index=ch?.questions.findIndex(q=>q.id===t.dataset.reviewQuestion)??-1;
   if(index>=0){ui.qindex=index;ui.reviewSingle=true;draw()}
   return;
 }
 if(t.dataset.chapter){await openChapter(t.dataset.chapter);return}
 if(t.dataset.practice){await openChapter(t.dataset.practice,'chapter');return}
 if(t.dataset.analytical){ui.opening=t.dataset.analytical;ui.view='written';ui.reveal=false;draw();return}
 if(t.dataset.days){ui.setupDays=Number(t.dataset.days);draw();return}
 if(t.dataset.month!==undefined){ui.month=Number(t.dataset.month);draw();return}
 if(t.dataset.phase!==undefined){ui.phase=Number(t.dataset.phase);draw();return}
 if(t.dataset.eclipse){ui.eclipse=t.dataset.eclipse;draw();return}
 if(t.dataset.seismic){ui.seismic=t.dataset.seismic;draw();return}
 if(t.dataset.osm){ui.osm=t.dataset.osm;draw();return}
 if(t.dataset.water!==undefined){ui.water=Number(t.dataset.water);draw();return}
 if(t.dataset.choice){
   const item=byId.get(ui.id),c=chapterCache.get(item.chapter),q=questionFor(c.sections.find(x=>x.id===ui.id),c);
   if(!q||!Object.prototype.hasOwnProperty.call(q.options,t.dataset.choice)||ui.selected)return;
   ui.selected=t.dataset.choice;const at=new Date().toISOString(),correct=ui.selected===q.answer;
   saved.questionReview??={};saved.questionReview[q.id]={at,chapter:item.chapter,unresolved:!correct};
   if(!correct)saved.revisit[ui.id]={at,kind:'question',questionId:q.id};
   else if(saved.revisit?.[ui.id]?.kind==='question')delete saved.revisit[ui.id];
   if(correct)ui.error='';
   notify();draw();return;
 }
 if(t.dataset.quizChoice){saveQuizAnswer(t.dataset.quizChoice);return}
 if(t.dataset.grade){ui.grade=t.dataset.grade;draw();return}
 switch(t.dataset.action){
  case 'expandplan':ui.showAllDays=!ui.showAllDays;draw();break;
  case 'editplan':ui.setupDays=saved.plan.days;ui.setupDate=saved.plan.startDate;ui.setupRestDays=[...(saved.plan.restDays||[])];ui.setupDailyMinutes=saved.plan.dailyMinutes||90;saved.plan=null;ui.view='course';draw();break;
  case 'saveplan':{
   const dd=document.getElementById('custom-days'),sd=document.getElementById('start-date'),dm=document.getElementById('daily-minutes'),days=dd?Number(dd.value):ui.setupDays,date=sd?sd.value:ui.setupDate,dailyMinutes=dm?Number(dm.value):ui.setupDailyMinutes,restDays=[...ui.setupRestDays].sort((a,b)=>a-b);
   if(!validPlan({days,startDate:date,dailyMinutes,restDays})){ui.error='Choose 5–120 study days, 15–600 minutes daily, a valid start date and at least one active weekday.';draw();return}
   saved.plan={days,startDate:date,restDays,dailyMinutes,changedAt:new Date().toISOString()};ui.showAllDays=false;ui.setupDays=days;ui.setupDate=date;ui.setupDailyMinutes=dailyMinutes;notify();draw();break;
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
   const text=document.getElementById('recall')?.value||ui.draft;if(nwords(text)<16)return;ui.draft=text;saveDraft(ui.id,text);ui.reveal=true;draw();break;
  }
  case 'finish':if(ui.grade)chooseGrade(ui.grade);break;
  case 'bookmark':saveBookmark();break;
  case 'markreview':saved.revisit[ui.id]={at:new Date().toISOString(),kind:'manual'};notify();draw();break;
  case 'fullsource':fullSource();break;
  case 'nextquestion':{
   ui.qindex+=1;ui.selected='';
   if(ui.qindex>=chapterCache.get(ui.chapter).questions.length&&saved.quizAttempts?.[ui.attemptId]){
     saved.quizAttempts[ui.attemptId].finishedAt=new Date().toISOString();
     saved.quizAttempts[ui.attemptId].at=new Date().toISOString();
     notify();
   }
   draw();break;
  }
  case 'restartquestions':ui.qindex=0;ui.selected='';ui.reviewSingle=false;beginQuizAttempt(ui.chapter);draw();break;
  case 'returnreview':ui.reviewSingle=false;ui.view='review';draw();break;
  case 'savewriting':saveDraft(ui.opening,document.getElementById('write')?.value||'');break;
  case 'revealwriting':saveDraft(ui.opening,document.getElementById('write')?.value||'');ui.reveal=true;draw();break;
 }
});
root.addEventListener('change',e=>{
 if(e.target.id==='custom-days'){const n=Number(e.target.value);if(n>=5&&n<=120)ui.setupDays=n}
 if(e.target.id==='start-date')ui.setupDate=e.target.value;
 if(e.target.id==='daily-minutes')ui.setupDailyMinutes=Number(e.target.value);
 if(e.target.dataset.restDay!==undefined){const d=Number(e.target.dataset.restDay);ui.setupRestDays=e.target.checked?[...new Set([...ui.setupRestDays,d])]:ui.setupRestDays.filter(x=>x!==d)}
 if(e.target.id==='recall'){ui.draft=e.target.value;saveDraft(ui.id,ui.draft)}
 if(e.target.id==='write')saveDraft(ui.opening,e.target.value);
});
root.addEventListener('input',e=>{
 if(e.target.id==='search'){ui.search=e.target.value;const selectionStart=e.target.selectionStart;draw();let input=document.getElementById('search');if(input){input.focus();input.setSelectionRange(selectionStart,selectionStart)}}
 if(e.target.id==='recall'){ui.draft=e.target.value;const b=root.querySelector('[data-action="reveal"]');if(b)b.disabled=nwords(ui.draft)<16}
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
 saved={...defaults(),...incoming};ui.id=byId.has(saved.last)?saved.last:lessons[0]?.id;ui.view='course';ui.setupDays=savedPlan()?.days||20;ui.setupDate=savedPlan()?.startDate||now();ui.setupRestDays=[...(savedPlan()?.restDays||[])];ui.setupDailyMinutes=savedPlan()?.dailyMinutes||90;draw();
});
document.getElementById('close-reference').addEventListener('click',()=>document.getElementById('reference').close());
function eclipseSvg(kind){
 const solar=kind==='solar',middle=solar?'Moon':'Earth',end=solar?'Earth':'Moon';
 return '<svg role="img" aria-label="'+(solar?'Moon between Sun and Earth during a solar eclipse':'Earth between Sun and Moon during a lunar eclipse')+'" viewBox="0 0 550 200" xmlns="http://www.w3.org/2000/svg"><rect width="550" height="200" rx="14" fill="#eff5ee"/><path d="M100 96H465" stroke="#bd955a" stroke-width="2" stroke-dasharray="8 6"/><path d="M450 89l12 7-12 7" fill="none" stroke="#bd955a" stroke-width="2"/><circle cx="85" cy="96" r="40" fill="#e2af5e"/><circle cx="275" cy="96" r="'+(solar?'19':'34')+'" fill="'+(solar?'#adbdb6':'#6f9e9b')+'"/><circle cx="456" cy="96" r="'+(solar?'34':'19')+'" fill="'+(solar?'#6f9e9b':'#adbdb6')+'"/><g font-size="15" font-family="system-ui" fill="#264837" text-anchor="middle"><text x="85" y="157">Sun</text><text x="275" y="157">'+middle+'</text><text x="456" y="157">'+end+'</text></g><text x="275" y="33" font-size="14" font-family="system-ui" text-anchor="middle" fill="#335a47">'+(solar?'New Moon alignment':'Full Moon alignment')+'</text><text x="275" y="183" font-size="11" font-family="system-ui" text-anchor="middle" fill="#61756b">Alignment only · not to scale</text></svg>';
}
function seismicSvg(kind){
 const p=kind==='P',dots=Array.from({length:14},(_,i)=>{const x=42+i*35+(p?Math.sin(i*1.7)*11:0),y=111+(p?0:Math.sin(i*.82)*32);return '<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="8" fill="#478b78" stroke="#275b4b"/>'}).join('');
 return '<svg role="img" aria-label="'+(p?'P waves compress and expand material parallel to travel':'S waves displace material perpendicular to travel')+'" viewBox="0 0 550 220" xmlns="http://www.w3.org/2000/svg"><rect width="550" height="220" rx="12" fill="#f4f8f2"/><path d="M40 111H520" stroke="#afc2b5" stroke-width="2" stroke-dasharray="4 7"/>'+dots+'<path d="M360 39H506m-8-8 8 8-8 8" fill="none" stroke="#9f7742" stroke-width="2.5"/><text x="430" y="26" text-anchor="middle" font-size="12" fill="#6e593e">Wave direction</text><text x="275" y="190" text-anchor="middle" font-size="13" fill="#335a47">'+(p?'Longitudinal: particle displacement is parallel':'Transverse: particle displacement is perpendicular')+'</text></svg>';
}
function osmosisSvg(state){
 const outer=state==='hyper'?16:state==='hypo'?4:9,inside=9,water=state==='hyper'?'Net water movement: out of cell':state==='hypo'?'Net water movement: into cell':'No net water movement',radius=state==='hyper'?47:state==='hypo'?66:55;
 const dots=Array.from({length:outer},(_,i)=>{const x=30+(i*37)%470,y=40+(i*47)%155;if(x>205&&x<340&&y>60&&y<185)return '';return '<circle cx="'+x+'" cy="'+y+'" r="4" fill="#c38a4c"/>'}).join('');
 const innerDots=Array.from({length:inside},(_,i)=>'<circle cx="'+(275+Math.cos(i*2.4)*radius*.6).toFixed(1)+'" cy="'+(114+Math.sin(i*2.4)*radius*.6).toFixed(1)+'" r="4" fill="#c38a4c"/>').join('');
 return '<svg role="img" aria-label="'+({hyper:'Net water moves out of the cell',hypo:'Net water moves into the cell',iso:'No net water movement'}[state])+'" viewBox="0 0 550 235" xmlns="http://www.w3.org/2000/svg"><rect width="550" height="235" rx="12" fill="#eef6f4"/>'+dots+'<circle cx="275" cy="114" r="'+radius+'" fill="#b3d9d0" stroke="#337460" stroke-width="3"/>'+innerDots+'<text x="275" y="120" text-anchor="middle" font-size="14" font-family="system-ui" fill="#234f42">Cell</text><text x="275" y="217" font-size="14" text-anchor="middle" fill="#315846">'+water+'</text><text x="15" y="21" font-size="12" fill="#7d5a35">Dots represent non-penetrating solute</text></svg>';
}
function waterSvg(step){
 const names=['Coagulation','Flocculation','Sedimentation','Filtration','Disinfection'];
 const explanations=['Coagulant helps destabilize suspended particles.','Gentle mixing helps particles combine into flocs.','Heavier flocs settle and can be separated.','Filters remove remaining particles and some microbes.','Disinfection inactivates disease-causing organisms.'];
 const cells=names.map((name,i)=>'<rect x="'+(6+i*108)+'" y="47" width="103" height="67" rx="10" fill="'+(i===step?'#bfdcc1':'#f1f6ee')+'" stroke="'+(i===step?'#2a7350':'#b8cbb8')+'" stroke-width="'+(i===step?'3':'1')+'"/><text x="'+(57+i*108)+'" y="84" text-anchor="middle" font-size="11" font-weight="600" fill="#315846">'+name+'</text>'+(i<4?'<text x="'+(111+i*108)+'" y="134" text-anchor="middle" font-size="14" fill="#57806c">→</text>':'')).join('');
 return '<svg role="img" aria-label="Typical treatment steps from coagulation to disinfection, step '+(step+1)+' highlighted" viewBox="0 0 550 210" xmlns="http://www.w3.org/2000/svg"><rect width="550" height="210" rx="12" fill="#f7faf5"/>'+cells+'<text x="275" y="27" text-anchor="middle" font-size="14" fill="#355b47">Common municipal water-treatment sequence</text><text x="275" y="165" text-anchor="middle" font-size="13" fill="#355b47">'+explanations[step]+'</text><text x="275" y="189" text-anchor="middle" font-size="11" fill="#61756b">Real treatment systems may use different arrangements</text></svg>';
}

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
  ui.id=byId.has(saved.last)?saved.last:lessons[0].id;ui.setupDays=savedPlan()?.days||20;ui.setupDate=savedPlan()?.startDate||now();ui.setupRestDays=[...(savedPlan()?.restDays||[])];ui.setupDailyMinutes=savedPlan()?.dailyMinutes||90;draw();
 }catch(e){root.innerHTML='<div class="panel" role="alert"><h2>Course temporarily unavailable</h2><p>'+safe(e.message)+'</p><button class="btn" onclick="location.reload()">Reload course</button></div>'}
})();
})();
