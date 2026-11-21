/* Pure planning and evidence rules. No storage, account or network side effects. */
(function (scope) {
  'use strict';
  const dayAfter=(date,n)=>{const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
  function minutes(lesson,plan={}) {
    const factor=plan.level==='beginner'?1.3:plan.level==='revision'?0.8:1;
    const difficulty=(plan.difficultChapters||[]).includes(lesson.chapter)?1.25:1;
    // Provisional reading + conceptual work + practice + written recall. Not measured learning time.
    return Math.ceil((Math.max(100,lesson.words||100)/150+10)*factor*difficulty);
  }
  function planCourse(lessons,plan,completed={},reviews=[]) {
    const available=lessons.filter(s=>!plan.remainingOnly||!completed[s.id]);
    const budget=plan.dailyMinutes||90, rest=new Set(plan.restDays||[]);
    if(rest.size>=7)throw Error('At least one active weekday is required');
    const total=available.reduce((n,s)=>n+minutes(s,plan),0)+reviews.length*5;
    const requested=Math.max(1,plan.days), target=Math.min(budget,Math.max(1,Math.ceil(total/requested)));
    const days=[];let date=plan.startDate, cursor=0;
    const pending=reviews.map(r=>({...r})).sort((a,b)=>a.date.localeCompare(b.date));
    function nextDay(){while(rest.has(new Date(date+'T12:00:00Z').getUTCDay()))date=dayAfter(date,1);const day={date,day:days.length+1,ids:[],reviews:[],words:0,estimatedMinutes:0,done:0};date=dayAfter(date,1);return day}
    // Keep requested active days, extend when necessary; never discard work to fit a deadline.
    while(cursor<available.length||pending.length||days.length<requested){
      if(days.length>=2000)throw Error('Requested plan exceeds the supported planning horizon');
      // After the reading programme, jump to later recall dates rather than inventing empty daily work.
      if(cursor>=available.length&&days.length>=requested&&pending.length&&pending[0].date>date)date=pending[0].date;
      const day=nextDay();
      for(let i=0;i<pending.length;){
        if(pending[i].date<=day.date&&day.estimatedMinutes+5<=budget){day.reviews.push(pending[i].id);day.estimatedMinutes+=5;pending.splice(i,1)}else i++;
      }
      while(cursor<available.length){
        const lesson=available[cursor],cost=minutes(lesson,plan);
        if(day.estimatedMinutes+cost>budget&&day.estimatedMinutes>0)break;
        if(day.ids.length&&day.estimatedMinutes+cost>target&&days.length<requested-1)break;
        day.ids.push(lesson.id);day.words+=lesson.words||100;day.estimatedMinutes+=cost;if(completed[lesson.id])day.done++;cursor++;
        if(day.estimatedMinutes>=target)break;
      }
      days.push(day);
    }
    return days;
  }
  function demonstrated(questions,attempts,version) {
    const eligible=questions.filter(q=>q.verification?.status==='approved'&&q.verification?.approvedVersion===version&&q.lessonId&&q.conceptId);
    const concepts=new Map();
    for(const q of eligible){if(!concepts.has(q.conceptId))concepts.set(q.conceptId,[]);concepts.get(q.conceptId).push(q)}
    const latest=new Map();
    for(const a of Object.values(attempts||{})){
      if(a.contentVersion!==version||!a.questionId||!Number.isFinite(Date.parse(a.at)))continue;
      if(!latest.has(a.questionId)||Date.parse(a.at)>Date.parse(latest.get(a.questionId).at))latest.set(a.questionId,a);
    }
    // Two distinct approved questions, including application/reasoning, both answered correctly.
    return [...concepts].filter(([,qs])=>{
      const answered=qs.filter(q=>latest.has(q.id));
      return answered.length>=2&&answered.every(q=>latest.get(q.id).correct===true)&&answered.some(q=>['application','reasoning','numerical'].includes(q.type));
    }).map(([id])=>id);
  }
  const api={minutes,planCourse,demonstrated};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  scope.CSSVistaGSALearning=api;
})(typeof window!=='undefined'?window:globalThis);
