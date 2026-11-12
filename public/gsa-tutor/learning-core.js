/* CSS VISTA General Science: deterministic assessment and planning policies. */
(() => {
 'use strict';
 const domains=['Physical Sciences','Biological Sciences','Environmental Sciences','Food Science','Information Technology'];
 const clone=value=>JSON.parse(JSON.stringify(value));
 function select(chapters,{mode='diagnostic',chapterIds=[],seed=Date.now()}={}){
  if(!['diagnostic','cumulative','timed'].includes(mode))throw Error('Unknown assessment mode');
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
  return {at:new Date(stamp).toISOString(),startedAt:new Date(stamp).toISOString(),mode,questions,responses:{},choiceEvents:{},finishedAt:null,deadline:mode==='timed'?new Date(stamp+30*60*1000).toISOString():null,policy:'gsa-source-practice-v1',scope:'General Science Part I',index:0};
 }
 function expired(attempt,at=Date.now()){return !!attempt.deadline&&at>=Date.parse(attempt.deadline)}
 function result(attempt){
  let correct=0,answered=0;const byDomain={};
  for(const q of attempt.questions||[]){
   const bucket=byDomain[q.domain]??={total:0,answered:0,correct:0};bucket.total++;
   const response=attempt.responses?.[q.id],valid=!!q.options?.[response?.selected];
   if(valid){answered++;bucket.answered++;if(response.selected===q.answer){correct++;bucket.correct++}}
  }
  return {correct,answered,total:attempt.questions?.length||0,byDomain,mastery:'not-established',reason:'Source practice is not an independently reviewed readiness assessment.'};
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
 Object.assign(window,{CSSVistaGSALearning:{domains,select,create,expired,result,estimate}});
})();
