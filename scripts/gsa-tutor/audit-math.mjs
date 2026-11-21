import {readFileSync,writeFileSync} from 'node:fs'
import {JSDOM} from 'jsdom'
const catalog=JSON.parse(readFileSync('public/gsa-tutor/content/catalog.json','utf8'))
const dom=new JSDOM('<!doctype html><main></main>',{runScripts:'outside-only'})
dom.window.eval(readFileSync('public/gsa-tutor/vendor/katex.min.js','utf8'))
dom.window.eval(readFileSync('public/gsa-tutor/math-renderer.js','utf8'))
const rows=[];let rendered=0,repairs=0
for(const meta of catalog.chapters){
 const chapter=JSON.parse(readFileSync('public/gsa-tutor/content/chapter-'+String(meta.id).padStart(2,'0')+'.json','utf8'))
 for(const section of chapter.sections){
  const root=dom.window.document.querySelector('main');root.innerHTML=section.html
  const result=dom.window.CSSVistaGSAMath.render(root,{sourceText:section.text});rendered+=result.rendered;repairs+=result.repairs
  if(result.rendered||result.issues.length)rows.push({lessonId:section.id,rendered:result.rendered,sourceIssues:result.issues,sourceProvenRepairs:result.repairs})
 }
}
const report={renderer:'KaTeX 0.19.1, native MathML output; local pinned bundle',status:'formatting-check-only',scientificVerification:'NOT ESTABLISHED',renderedExpressions:rendered,sourceProvenRepairs:repairs,lessonsWithSourceIssues:rows.filter(r=>r.sourceIssues.length).map(r=>r.lessonId),notes:['Original content is unchanged. Literal percent characters are rendered as percent signs rather than TeX comments.','The binary subscript formatting defect in lesson 25.4 is restored only when the original manuscript text confirms the exact formula. This is a formatting repair, not a scientific content revision.','Fragmented or unsupported formulas remain visible with an editorial-repair warning; no scientific replacement is inferred.','Browser checks and scientific review are separate release requirements.'],rows}
const text=JSON.stringify(report,null,2)+'\n',path='docs/gsa-tutor/math-rendering-review.json'
if(process.argv.includes('--check')){if(readFileSync(path,'utf8')!==text)throw Error('Math rendering inventory changed; regenerate and review the report')}else writeFileSync(path,text)
console.log(JSON.stringify({renderedExpressions:rendered,sourceIssueLessons:report.lessonsWithSourceIssues,scientificVerification:report.scientificVerification}))
dom.window.close()
