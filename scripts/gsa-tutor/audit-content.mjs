import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve, dirname } from 'node:path'

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..')
const readJson=path=>JSON.parse(readFileSync(resolve(root,path),'utf8'))
const catalog=readJson('public/gsa-tutor/content/catalog.json')
const failures=[],issues=[],ids=new Set(),prompts=new Set()
let questions=0,analytical=0,lessons=0,shortExplanations=0,absoluteOptions=0,possibleRawMath=0
const rows=[]
function fail(message){failures.push(message)}
for(const meta of catalog.chapters){
 const id=meta.id,ch=readJson('public/gsa-tutor/content/chapter-'+String(id).padStart(2,'0')+'.json')
 if(ch.id!==id||ch.sections.length!==meta.sections.length)fail('Chapter '+id+' differs from catalog inventory')
 let thin=0,absolutes=0,mathSections=0
 for(const sec of ch.sections){
   if(!sec.id||!sec.title||!sec.text||typeof sec.html!=='string')fail('Incomplete lesson in chapter '+id)
   if(/<script\b|on(?:error|load|click)\s*=|javascript\s*:/i.test(sec.html))fail('Unsafe HTML in lesson '+sec.id)
   if(/\$[^\n$]{1,150}\$/.test(sec.html))mathSections++
 }
 for(const q of ch.questions){
   if(!q.id||!q.prompt||!q.explanation||!q.options||Object.keys(q.options).sort().join('')!=='ABCD'||!q.options[q.answer])fail('Invalid MCQ '+(q.id||'(unknown)'))
   const stem=String(q.prompt||'').trim().toLowerCase()
   if(ids.has(q.id)||prompts.has(stem))fail('Repeated question ID or stem: '+q.id)
   ids.add(q.id);prompts.add(stem)
   if(String(q.explanation||'').trim().split(/\s+/).length<15)thin++
   if(Object.values(q.options||{}).some(o=>/\b(exclusively|only|never|always|every)\b/i.test(o)))absolutes++
 }
 if(ch.questions.length!==meta.questionCount||ch.analytical.length!==meta.analyticalCount)fail('Practice count mismatch in chapter '+id)
 for(const answer of ch.analytical)if(!answer.prompt||!answer.answer_html)fail('Incomplete analytical answer '+(answer.id||'(unknown)'))
 questions+=ch.questions.length;analytical+=ch.analytical.length;lessons+=ch.sections.length
 shortExplanations+=thin;absoluteOptions+=absolutes;possibleRawMath+=mathSections
 if(ch.questions.length<4)issues.push('Chapter '+id+': fewer than 4 source MCQs')
 if(ch.analytical.length===0)issues.push('Chapter '+id+': no analytical model answers')
 rows.push({chapter:id,lessons:ch.sections.length,mcqs:ch.questions.length,analytical:ch.analytical.length,shortExplanation:thin,absoluteOption:absolutes,possibleRawMath:mathSections})
}
if(catalog.chapters.length!==28||lessons!==141||questions!==250||analytical!==31)fail('Unexpected manuscript inventory totals')
const report={structuralStatus:failures.length?'FAILED':'PASSED',scientificVerification:'NOT PERFORMED',sourceReviewStatus:'NOT APPROVED',totals:{chapters:catalog.chapters.length,lessons,mcqs:questions,analytical,shortExplanations,absoluteOptions,possibleRawMath},rows,reviewWarnings:issues,failures}
console.log(JSON.stringify(report,null,2))
if(failures.length)process.exitCode=1
