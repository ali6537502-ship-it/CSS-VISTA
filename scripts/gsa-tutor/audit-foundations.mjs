import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
const json=p=>JSON.parse(readFileSync(p,'utf8'))
const catalog=json('public/gsa-tutor/content/catalog.json')
const matrix=json('docs/gsa-tutor/syllabus-coverage.json')
const register=json('docs/gsa-tutor/content-review-register.json')
const syllabusIds=new Set(matrix.rows.map(r=>r.id))
const ids=new Set(catalog.chapters.flatMap(c=>c.sections.map(s=>s.id)))
const failures=[],supplements=[],models=[]
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex')
const originalFields=c=>({id:c.id,sections:c.sections.map(({id,number,title,text,html})=>({id,number,title,text,html})),questions:c.questions.map(({id,chapter,prompt,options,answer,explanation})=>({id,chapter,prompt,options,answer,explanation})),analytical:c.analytical})
const unsafe=html=>/<script\b|on(?:error|load|click)\s*=|javascript\s*:/i.test(html||'')
for(const row of matrix.rows){
 if(!row.prescribedTopic||!row.prescribedSubtopic||!row.sources.length||!row.editorialStatus)failures.push('Incomplete syllabus row '+row.id)
 for(const id of row.lessonIds)if(!ids.has(id))failures.push('Unknown mapped lesson '+id)
}
for(const meta of catalog.chapters){
 const c=json('public/gsa-tutor/content/chapter-'+String(meta.id).padStart(2,'0')+'.json')
 if(hash(originalFields(c))!==register.originalChapters.find(r=>r.chapter===meta.id)?.sha256)failures.push('Original manuscript or keys changed: chapter '+meta.id)
 for(const s of c.sections){
  if(s.teaching&&(!s.teaching.objective||!s.teaching.prerequisites||!s.teaching.revision?.length||!s.teaching.verification?.sourceUrl||unsafe(s.teaching.explanationHtml)))failures.push('Invalid teaching extension '+s.id)
 }
 for(const q of c.supplementalQuestions||[]){
  supplements.push(q)
  if(!ids.has(q.lessonId)||!q.conceptId||(!q.syllabusRefs?.length||q.syllabusRefs.some(ref=>!syllabusIds.has(ref)))||Object.keys(q.options||{}).sort().join('')!=='ABCD'||!q.options[q.answer]||!q.explanation||q.origin!=='original-practice'||!q.verification?.sourceUrl||!q.type||!q.difficulty)failures.push('Invalid supplement '+q.id)
 }
 for(const a of c.supplementalAnalytical||[]){
  models.push(a)
  if(!ids.has(a.lessonId)||!a.rubric?.length||a.rubric.reduce((n,r)=>n+r.marks,0)!==5||!a.commonMistakes?.length||!a.verification?.sourceUrl||unsafe(a.answer_html))failures.push('Invalid model '+a.id)
 }
}
if(new Set(supplements.map(q=>q.id)).size!==supplements.length)failures.push('Duplicate supplemental question IDs')
const mapped=new Set(matrix.rows.flatMap(r=>r.lessonIds))
const report={structuralStatus:failures.length?'FAILED':'PASSED',academicApproval:'NOT APPROVED',officialSourceAccess:matrix.sourceAccess.status,syllabusRows:matrix.rows.length,mappedLessons:mapped.size,unmappedLessonsRequiringReview:[...ids].filter(id=>!mapped.has(id)),supplementalMCQs:supplements.length,supplementalWrittenModels:models.length,scientificCertification:'NOT ESTABLISHED by automated checks',failures}
console.log(JSON.stringify(report,null,2))
if(process.argv.includes('--release')){
 console.error('GSA educational release BLOCKED: exact official PDF comparison, full independent academic review, protected-account trials and owner release approval remain outstanding.')
 process.exitCode=1
}else if(failures.length)process.exitCode=1
