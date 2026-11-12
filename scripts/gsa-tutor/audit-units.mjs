import { readFileSync, readdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
const read=p=>JSON.parse(readFileSync(p,'utf8'))
const catalog=read('public/gsa-tutor/content/catalog.json')
const lessons=new Set(catalog.chapters.flatMap(c=>c.sections.map(s=>s.id)))
const required=['foundation','conceptualTeaching','visualUnderstanding','realWorldApplication','examinationApplication','activeUnderstanding','answerWriting','revisionAndRetention']
const ids=new Set(),failures=[],pending=[]
let questions=0,models=0
for(const file of readdirSync('content/gsa-tutor/draft-units').filter(f=>f.endsWith('.json'))){
 const u=read('content/gsa-tutor/draft-units/'+file),label=u.lessonId;
 const fail=msg=>failures.push(label+': '+msg)
 if(!lessons.has(label))fail('Unknown stable lesson ID')
 if(required.some(s=>!u.stages?.[s]))fail('Missing instructional stage')
 const sourceIds=new Set(u.sources?.map(s=>s.id)||[])
 for(const s of u.sources||[])if(!s.title||!s.publisher||!/^https:\/\//.test(s.url)||!s.retrievedOn||!s.retrievedSha256||!s.verificationStatus)fail('Incomplete provenance record')
 for(const block of u.stages?.conceptualTeaching||[])if(!block.conceptId||!block.explanation||!block.sourceIds?.length||block.sourceIds.some(s=>!sourceIds.has(s)))fail('Teaching block lacks concept/source support')
 for(const q of u.stages?.activeUnderstanding?.questions||[]){
  questions++
  if(ids.has(q.id))fail('Duplicate question ID');ids.add(q.id)
  if(q.lessonId!==label||!q.conceptId||!q.syllabusRefs?.length||!q.difficulty||!q.type)fail('Question missing explicit mapping metadata')
  if(q.origin!=='original-examination-style-practice')fail('Draft questions must not claim authentic-paper provenance')
  if(Object.keys(q.options||{}).sort().join('')!=='ABCD'||!q.options[q.answer]||Object.keys(q.optionExplanations||{}).sort().join('')!=='ABCD'||Object.values(q.optionExplanations).some(x=>!x.trim()))fail('Question needs four explained options and one existing key')
  if(q.sources?.some(s=>!sourceIds.has(s)))fail('Unknown question source')
 }
 const model=u.stages?.answerWriting
 if(!model?.modelResponse||model.rubric?.reduce((n,r)=>n+r.marks,0)!==model.marks||model.marks!==5||!model.commonMistakes?.length)fail('Incomplete five-mark model and rubric')
 else models++
 if(u.status!=='approved')pending.push(label)
 else{
  const hash=createHash('sha256').update(JSON.stringify({stages:u.stages,sources:u.sources,version:u.version})).digest('hex')
  if(!u.independentReviewer||u.independentReviewer===u.author||u.approvedContentHash!==hash||!u.approvedOn)fail('Approval lacks independent reviewer, date or exact-version hash')
 }
}
console.log(JSON.stringify({formatStatus:failures.length?'FAILED':'PASSED',scientificApproval:'NOT ESTABLISHED BY THIS CHECK',draftUnits:pending.length,originalPracticeQuestions:questions,fiveMarkModels:models,pendingIndependentReview:pending,failures},null,2))
if(failures.length||process.argv.includes('--release')&&pending.length)process.exitCode=1
