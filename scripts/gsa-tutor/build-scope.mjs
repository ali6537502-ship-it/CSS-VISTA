import { readFileSync, writeFileSync } from 'node:fs'
const path='public/gsa-tutor/content/catalog.json',catalog=JSON.parse(readFileSync(path,'utf8'))
// Explicit editorial mappings. Broad chapters are not treated as proof of coverage.
const rows={1:[1,1,1,1,1],2:[1,1,1,1,1],3:[1,1,2,2,1],4:[2,2,2,2,2,2],5:[3,3,3,3,3,3],6:[5,5,5,5,5],7:[4,4,4,4,4],8:[6,6,6,6,6],9:[7,7,7,7,7],10:[8,8,8,8,8],11:[9,9,9,9,9],12:[10,10,10,10,10,10],13:[11,11,11,11,6,6],14:[12,12,12,12,12],15:[13,13,13,13,13,13,13],16:[14,14,14,14,14,14],17:[15,15,15,16],18:[16,15,17,17],19:[18,18,18,24],20:[null,null,null,19,null],21:[20,20,20,20],22:[20,21,20,20],23:[21,21,22,null,null],24:[22,22,22,21,22,21],25:[23,23,23,23,23],26:[23,24,24,24,24],27:[23,null,null,null],28:[23,23,23,23]}
const enrichment=new Set(['3.5','6.3','6.5','9.4','9.5','10.3','10.4','10.5','11.3','15.7','18.2','20.1','20.2','20.3','20.5','23.4','23.5','27.2','27.3','27.4','28.3','28.4'])
const mixed=new Set(['1.3','1.4','1.5','2.2','2.5','7.4','14.5','19.4','21.4','24.3','25.4','27.1','28.2'])
for(const c of catalog.chapters){
 if(rows[c.id].length!==c.sections.length)throw Error('Scope map differs from chapter '+c.id)
 for(const [i,s] of c.sections.entries()){
  s.syllabusRefs=rows[c.id][i]?[`GS-I-${String(rows[c.id][i]).padStart(2,'0')}`]:[]
  if(c.id===13&&i>=4)s.syllabusRefs.push('GS-I-11')
  s.courseScope=enrichment.has(s.number)?'enrichment':mixed.has(s.number)?'core-and-enrichment':'core'
  s.mappingStatus='assistant-mapped; independent-curriculum-review-pending'
 }
}
catalog.syllabusEvidence={source:'User-supplied FPSC General Science & Ability PDF, printed pages 7–8',onlineCurrentVersion:'unconfirmed',boundary:'General Science Part I, 60 marks; Part II excluded',scopePolicy:'All original lessons remain. Syllabus focus and enrichment are navigation aids, not academic approval.'}
const paper=JSON.parse(readFileSync('content/gsa-tutor/past-paper-links.json','utf8'))
catalog.pastPaperSources=[paper.source];catalog.pastPaperQuestions=paper.questions
const output=JSON.stringify(catalog)+'\n'
if(process.argv.includes('--check')){if(readFileSync(path,'utf8')!==output)throw Error('Stale explicit lesson scope metadata')}
else writeFileSync(path,output)
console.log('Explicit scope and syllabus references: '+catalog.chapters.flatMap(c=>c.sections).length+' lessons; no teaching text changed.')
