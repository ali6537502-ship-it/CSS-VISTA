/* Assessment definitions and events are additive records in the existing GSA snapshot. */
(function(scope){
 'use strict';
 const MODES=['diagnostic','cumulative','timed','chapter','incorrect'];
 const copy=value=>JSON.parse(JSON.stringify(value));
 function selectQuestions(bank,{mode='diagnostic',count=20,chapters=[],completedLessons=[],missedIds=[],seed=null}={}){
  if(!MODES.includes(mode))throw Error('Unknown assessment mode');
  if(!Number.isInteger(count)||count<1||count>100)throw Error('Choose 1–100 questions');
  const done=new Set(completedLessons),missed=new Set(missedIds),selectedChapters=new Set(chapters);
  const pool=bank.filter(q=>q.id&&q.prompt&&q.options&&Object.keys(q.options).sort().join('')==='ABCD'&&q.options[q.answer]&&q.explanation)
   .filter(q=>!selectedChapters.size||selectedChapters.has(q.chapter))
   .filter(q=>mode!=='incorrect'||missed.has(q.id))
   // An untagged question in a partly studied chapter is not assumed to cover the studied lesson.
   .filter(q=>mode!=='cumulative'||q.lessonId&&done.has(q.lessonId));
  const unique=[...new Map(pool.map(q=>[q.id,q])).values()];
  if(seed!==null){let n=2166136261;for(const ch of String(seed))n=Math.imul(n^ch.charCodeAt(0),16777619)>>>0;for(let i=unique.length-1;i>0;i--){n=(Math.imul(n,1664525)+1013904223)>>>0;const j=n%(i+1);[unique[i],unique[j]]=[unique[j],unique[i]]}}
  // Alternate domains, then chapters, so large imported chapters cannot dominate the whole set.
  const domains=new Map();
  for(const q of unique){const domain=q.domain||'Unclassified';if(!domains.has(domain))domains.set(domain,new Map());const groups=domains.get(domain);if(!groups.has(q.chapter))groups.set(q.chapter,[]);groups.get(q.chapter).push(q)}
  const queues=[...domains.values()].map(groups=>{
   const rows=[...groups.values()],queue=[];let index=0;
   while(rows.some(r=>index<r.length)){for(const row of rows)if(row[index])queue.push(row[index]);index++}return queue;
  });
  const result=[];let index=0;
  while(result.length<Math.min(count,unique.length)){
   for(const queue of queues)if(queue[index]&&result.length<count)result.push(copy(queue[index]));index++;
  }
  return result;
 }
 function createAttempt(bank,config,at=new Date().toISOString(),id){
  if(!id||!Number.isFinite(Date.parse(at)))throw Error('Invalid attempt identity or start time');
  const questions=selectQuestions(bank,{...config,seed:config.seed??id});
  if(!questions.length)throw Error(config.mode==='cumulative'?'No explicitly linked questions are available for studied lessons. Study a linked lesson or choose diagnostic practice.':'No questions match this selection.');
  const timed=config.mode==='timed',minutes=config.minutes??30;
  if(timed&&(!Number.isInteger(minutes)||minutes<1||minutes>180))throw Error('Choose a time limit of 1–180 minutes');
  return {id,at,mode:config.mode,requestedCount:config.count,questions,deadline:timed?new Date(Date.parse(at)+minutes*60000).toISOString():null,contentStatus:'development-practice',scoring:'one point per correct MCQ; no negative marking; unanswered questions score zero'};
 }
 function state(attempt,events,now=Date.now()){
  const start=Date.parse(attempt.at),deadline=attempt.deadline?Date.parse(attempt.deadline):Infinity;
  const ordered=Object.entries(events||{}).filter(([,e])=>e.attemptId===attempt.id&&Number.isFinite(Date.parse(e.at))&&Date.parse(e.at)>=start&&Date.parse(e.at)<=now)
   .sort(([ak,a],[bk,b])=>Date.parse(a.at)-Date.parse(b.at)||ak.localeCompare(bk));
  const submitted=ordered.find(([,e])=>e.type==='submit'),closedAt=Math.min(submitted?Date.parse(submitted[1].at):Infinity,deadline);
  const finished=closedAt<=now,responses={};
  const questions=new Map(attempt.questions.map(q=>[q.id,q]));
  for(const [,e]of ordered){
   const q=questions.get(e.questionId);
   if(e.type==='answer'&&q&&Object.hasOwn(q.options,e.selected)&&Date.parse(e.at)<=closedAt)responses[q.id]={selected:e.selected,at:e.at,correct:e.selected===q.answer};
  }
  const correct=Object.values(responses).filter(r=>r.correct).length;
  const chapters={};
  for(const q of attempt.questions){chapters[q.chapter]??={total:0,answered:0,correct:0};chapters[q.chapter].total++;if(responses[q.id])chapters[q.chapter].answered++;if(responses[q.id]?.correct)chapters[q.chapter].correct++}
  return {finished,closedAt:finished?new Date(closedAt).toISOString():null,reason:finished?(deadline<=closedAt?'time-expired':'submitted'):null,responses,correct,answered:Object.keys(responses).length,total:attempt.questions.length,unanswered:attempt.questions.length-Object.keys(responses).length,percent:Math.round(correct/attempt.questions.length*100),chapters,remainingSeconds:attempt.deadline?Math.max(0,Math.ceil((deadline-now)/1000)):null};
 }
 async function packAttempt(attempt,digest){
  const snapshots={},questionRefs=[];
  for(const q of attempt.questions){const id=await digest(JSON.stringify(q));questionRefs.push(id);snapshots[id]={at:attempt.at,question:copy(q)}}
  const {questions,...definition}=attempt;
  return {definition:{...definition,questionRefs},snapshots};
 }
 function hydrateAttempt(definition,pool={}){
  if(!definition)return null;if(Array.isArray(definition.questions))return definition;
  if(!Array.isArray(definition.questionRefs))return null;
  const questions=definition.questionRefs.map(id=>pool[id]?.question);
  if(questions.some(q=>!q))return null;
  return {...definition,questions};
 }
 function validAttempt(a){return !!(a&&a.id&&MODES.includes(a.mode)&&Number.isFinite(Date.parse(a.at))&&Array.isArray(a.questions)&&a.questions.length&&a.questions.every(q=>q?.id&&q.prompt&&q.options&&q.options[q.answer])&&(!a.deadline||Number.isFinite(Date.parse(a.deadline))))}
 scope.CSSVistaGSAAssessment={selectQuestions,createAttempt,state,validAttempt,packAttempt,hydrateAttempt};
})(typeof window!=='undefined'?window:globalThis);
