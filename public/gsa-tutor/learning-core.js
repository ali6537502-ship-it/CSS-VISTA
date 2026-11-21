/* CSS VISTA General Science: deterministic assessment and planning policies. */
(() => {
 'use strict';
 const domains=['Physical Sciences','Biological Sciences','Environmental Sciences','Food Science','Information Technology'];
 const clone=value=>JSON.parse(JSON.stringify(value));
 function select(chapters,{mode='diagnostic',chapterIds=[],seed=Date.now()}={}){
  if(!['diagnostic','cumulative','timed','science-mock'].includes(mode))throw Error('Unknown assessment mode');
  const eligible=chapters.filter(c=>domains.includes(c.part)&&(mode!=='cumulative'||chapterIds.includes(c.id)));
  if(!eligible.length)throw Error('Select at least one science chapter.');
  const pools=domains.map(domain=>eligible.filter(c=>c.part===domain).flatMap(c=>c.questions.map(q=>({...clone(q),chapter:c.id,domain,sourceVersion:'original-manuscript',verification:q.verification?.status||'unreviewed-source'}))));
  let state=Number(seed)>>>0;
  const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296};
  for(const pool of pools)for(let i=pool.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]]}
  const selected=[],used=new Set();
  while(selected.length<20&&pools.some(p=>p.length))for(const pool of pools){
   if(selected.length>=20)break;
   const q=pool.shift();if(q&&!used.has(q.id)){used.add(q.id);selected.push(q)}
  }
  if(!selected.length)throw Error('No questions available in these chapters.');
  for(const q of selected)if(!q.id||Object.keys(q.options||{}).sort().join('')!=='ABCD'||!q.options[q.answer])throw Error('Invalid source question; assessment not started.');
  return selected;
 }
 function create(chapters,options={}){
  const stamp=options.at??Date.now(),mode=options.mode||'diagnostic';
  const questions=select(chapters,options);
  let writtenQuestions=[],paperSources=[],duration=mode==='timed'?30:null;
  if(mode==='science-mock'){
   const groups=options.writtenGroups||[],validGroups=[...new Set(groups)];
   if(validGroups.length!==2||validGroups.some(g=>![2,3,4,5].includes(g)))throw Error('Choose exactly two science question groups.');
   writtenQuestions=(options.paperQuestions||[]).filter(q=>validGroups.includes(Number(q.questionNumber?.match(/^([2-5])\([a-d]\)$/)?.[1]))).map(clone);
   paperSources=(options.paperSources||[]).map(clone);if(writtenQuestions.some(q=>!paperSources.some(s=>s.id===q.sourceId&&/^\/past-papers\/.+\.pdf$/.test(s.path)&&/^[a-f0-9]{64}$/.test(s.sha256))))throw Error('Archived written-question source provenance is incomplete.');
   if(writtenQuestions.length!==8||writtenQuestions.some(q=>q.marks!==5)||questions.length!==20)throw Error('The 20 + 40 science practice blueprint is incomplete.');
   duration=options.durationMinutes??120;if(![60,90,120,150,180].includes(duration))throw Error('Choose a valid practice time budget.');
  }
  return {at:new Date(stamp).toISOString(),startedAt:new Date(stamp).toISOString(),mode,questions,responses:{},choiceEvents:{},finishedAt:null,deadline:duration?new Date(stamp+duration*60*1000).toISOString():null,durationMinutes:duration,writtenQuestions,paperSources,writtenResponses:{},blueprint:mode==='science-mock'?{objectiveMarks:20,writtenMarks:40,totalMarks:60,timing:'learner-selected practice budget; not an official standalone-paper duration'}:null,policy:'gsa-source-practice-v1',scope:'General Science Part I',index:0};
 }
 function expired(attempt,at=Date.now()){return !!attempt.deadline&&at>=Date.parse(attempt.deadline)}
 function result(attempt){
  let correct=0,answered=0;const byDomain={};
  for(const q of attempt.questions||[]){
   const bucket=byDomain[q.domain]??={total:0,answered:0,correct:0};bucket.total++;
   const response=attempt.responses?.[q.id],valid=!!q.options?.[response?.selected];
   if(valid){answered++;bucket.answered++;if(response.selected===q.answer){correct++;bucket.correct++}}
  }
  return {correct,answered,total:attempt.questions?.length||0,byDomain,writtenAnswered:(attempt.writtenQuestions||[]).filter(q=>attempt.writtenResponses?.[q.id]?.text?.trim()).length,writtenTotal:attempt.writtenQuestions?.length||0,writtenMarks:(attempt.writtenQuestions||[]).reduce((n,q)=>n+q.marks,0),writtenScore:null,mastery:'not-established',reason:'Source practice is not an independently reviewed readiness assessment.'};
 }
 function estimate(lesson,plan={},records={}){
  const level={beginner:1.3,intermediate:1,refresher:.85}[plan.startingLevel]||1;
  const recent={};
  for(const a of Object.values(records.assessmentAttempts||{})){
   if(!a.finishedAt)continue;
   for(const q of a.questions||[]){const r=a.responses?.[q.id];if(q.chapter===lesson.chapter&&r&&(!recent[q.id]||r.at>recent[q.id].at))recent[q.id]={at:r.at,correct:r.selected===q.answer}}
  }
  const answers=Object.values(recent),needsPractice=answers.length>=2&&answers.filter(r=>r.correct).length/answers.length<.5;
  const weak=(plan.difficultChapters||[]).includes(lesson.chapter)?1.3:needsPractice?1.2:1;
  const prior=(plan.previouslyStudied||[]).includes(lesson.chapter)?.7:1;
  const observed=Object.values(records.studySessions||{}).filter(s=>s.lessonId===lesson.id&&s.completed&&s.activeSeconds>=120).map(s=>s.activeSeconds/60).sort((a,b)=>a-b);
  const baseline=observed.length?observed[Math.floor(observed.length/2)]:Math.max(100,lesson.words||100)/150;
  // Observed time covers the whole lesson, whereas the initial estimate needs a check/recall allowance.
  return Math.ceil(Math.max(12,(baseline*level*weak*prior)+(observed.length?0:12)));
 }
 function activities(catalog,records={}){
  const queue=[];
  for(const chapter of catalog.chapters){
   for(const section of chapter.sections)queue.push({kind:'lesson',lesson:{...section,chapter:chapter.id}});
   const attempts=Object.values(records.quizAttempts||{}).filter(a=>a.chapter===chapter.id&&!['lesson-check','targeted-review'].includes(a.mode));
   const budget=Math.max(15,records.plan?.dailyMinutes||90),perChunk=Math.max(1,Math.floor((budget-3)/1.5));
   const ids=chapter.questionIds||[];
   if(ids.length){
    for(let i=0;i<ids.length;i+=perChunk){const questionIds=ids.slice(i,i+perChunk),part=Math.floor(i/perChunk);queue.push({kind:'practice',id:'chapter-practice-'+chapter.id+(part?'-part-'+part:''),type:'chapter',chapter:chapter.id,label:'Chapter MCQ practice'+(ids.length>perChunk?' · block '+(part+1):''),minutes:Math.max(3,Math.ceil(questionIds.length*1.5+(i===0?3:0))),questionIds,done:questionIds.every(id=>attempts.some(a=>a.responses?.[id]))})}
   }else if(chapter.questionCount)queue.push({kind:'practice',id:'chapter-practice-'+chapter.id,type:'chapter',chapter:chapter.id,label:'Chapter MCQ practice',minutes:Math.ceil(chapter.questionCount*1.5+3),done:attempts.some(a=>a.finishedAt&&Object.keys(a.responses||{}).length>=chapter.questionCount)});
   for(const [modelIndex,questionId] of (chapter.analyticalIds||[]).entries())queue.push({kind:'practice',id:'chapter-writing-'+chapter.id+'-'+modelIndex,type:'writing',chapter:chapter.id,modelIndex,label:'Written-answer comparison '+(modelIndex+1),minutes:15,done:Object.values(records.writtenAttempts||{}).some(a=>a.questionId===questionId&&a.response?.trim())});

  }
  const mockDone=Object.values(records.assessmentAttempts||{}).some(a=>a.mode==='science-mock'&&a.finishedAt&&result(a).answered===20&&result(a).writtenAnswered===8);
  queue.push({kind:'practice',id:'science-mock',type:'mock',label:'Science mock practice — 60-minute chosen budget',minutes:60,done:mockDone});
  return queue;
 }
 Object.assign(window,{CSSVistaGSALearning:{domains,select,create,expired,result,estimate,activities}});
})();
