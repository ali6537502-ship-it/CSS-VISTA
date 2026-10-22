/** Assemble traceable audit locations without claiming the retained legacy files were repaired. */
import {readFile,writeFile} from 'node:fs/promises'
import {createHash} from 'node:crypto'
const read=async p=>JSON.parse(await readFile(p,'utf8'))
const map={1:[1,2,11],2:[1,5,14],3:[13,14,15],4:[14],5:[10],6:[24],7:[6,7],8:[8],9:[9],10:[17,18],11:[19],12:[21],13:[3],14:[4],15:[11,22],16:[12,25],17:[20],18:[11],19:[16],20:[22],21:[24],22:[26,27],23:[26],24:[26],25:[25],26:[28],27:[27],28:[28],29:[29],30:[30]}
const catalog=await read('public/grammar/v5/index.json'),matrix=[]
for(const file of ['audit-days-1-10.json','audit-days-11-20.json','audit-days-21-30.json']){
 const doc=await read('docs/grammar-reconstruction/'+file)
 for(const issue of doc.issues){
  const mapped=map[issue.day] ?? []
  matrix.push({id:issue.id,originalDay:issue.day,location:issue.location,severity:issue.severity,category:issue.category,originalText:issue.quote,finding:issue.explanation,supportingReferences:issue.supporting_references??issue.supporting_sources??issue.supportingReferences??[],proposedCorrection:issue.proposed_correction??issue.proposedCorrection,originalVerification:issue.verification_status??issue.verificationStatus,implementationStatus:'Original source retained for historical records; superseded by the versioned course. This is replacement, not a change to legacy answers.',replacementDays:mapped,replacementEntries:catalog.concepts.filter(c=>mapped.includes(c.day)).map(c=>c.id),auditSource:file})
 }
}
const summary={contentHash:catalog.contentHash,originalFindings:matrix.length,severity:Object.fromEntries([...new Set(matrix.map(r=>r.severity))].map(k=>[k,matrix.filter(r=>r.severity===k).length])),rows:matrix}
await writeFile('docs/grammar-reconstruction/audit-matrix.json',JSON.stringify(summary,null,2)+'\n')
const inventory=await read('docs/grammar-reconstruction/question-inventory.json')
const byDay=catalog.days.map(d=>({day:d.day,concepts:d.modules.length,objective:catalog.items.filter(q=>q.day===d.day&&q.type==='objective').length,response:catalog.items.filter(q=>q.day===d.day&&q.type==='response').length,sourceHash:undefined}))
const keys=[]
for(const file of [...Array.from({length:30},(_,i)=>`day-${String(i+1).padStart(2,'0')}`),...catalog.assessments.map(a=>a.id)]){
 const doc=await read(`public/grammar/v5/${file}.json`)
 const items=doc.items??[...doc.questions,...doc.corrections,...doc.transformations,doc.writing,...doc.recall]
 for(const q of items)if(q.type==='objective')keys.push({id:q.id,key:q.answer,correctText:q.options[q.answer],explanationHash:createHash('sha256').update(q.why).digest('hex'),conceptId:q.conceptId,sourceIds:q.sourceIds})
}
await writeFile('docs/grammar-reconstruction/verified-key-register.json',JSON.stringify({contentHash:catalog.contentHash,method:'Editorial assessment of the stated context, selected answer, distractors and reasoning. Options were rearranged before first publication, retaining correct answer text. Automated structure checks supplement editorial review and do not establish linguistic correctness.',keys,byDay,counts:inventory.counts},null,2)+'\n')
console.log(`Recorded ${matrix.length} legacy findings and ${keys.length} explanatory keys for the current edition.`)
