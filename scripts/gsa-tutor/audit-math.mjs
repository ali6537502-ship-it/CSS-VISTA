import { readFileSync } from 'node:fs'
import { JSDOM } from 'jsdom'
const renderer=readFileSync('public/gsa-tutor/math-renderer.js','utf8')
const catalog=JSON.parse(readFileSync('public/gsa-tutor/content/catalog.json','utf8'))
const warnings=[];let equations=0
const dom=new JSDOM('<!doctype html><main></main>',{runScripts:'outside-only'});dom.window.eval(renderer)
const main=dom.window.document.querySelector('main')
for(const c of catalog.chapters){
 const chapter=JSON.parse(readFileSync(`public/gsa-tutor/content/chapter-${String(c.id).padStart(2,'0')}.json`,'utf8'))
 for(const source of [...chapter.sections.map(s=>({id:s.id,html:s.html})),...chapter.analytical.map(a=>({id:a.id,html:a.answer_html}))]){
  main.innerHTML=source.html;dom.window.CSSVistaGSAMath.render(main);equations+=main.querySelectorAll('math').length
  if(main.querySelector('[data-math-warning]'))warnings.push({id:source.id,issue:'Original notation retained because the parser could not typeset it; editorial correction required.'})
 }
}
dom.window.close()
console.log(JSON.stringify({rendering:'native MathML',renderedExpressions:equations,scientificApproval:'NOT PERFORMED',warnings},null,2))
if(process.argv.includes('--release')&&warnings.length)process.exitCode=1
