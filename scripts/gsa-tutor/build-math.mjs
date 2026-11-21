import { build } from 'esbuild'
import { readFileSync, writeFileSync } from 'node:fs'
const result=await build({entryPoints:['src/features/gsa-tutor/math-entry.ts'],bundle:true,minify:true,format:'iife',target:'es2020',write:false,legalComments:'inline'})
const output=result.outputFiles[0].text
const path='public/gsa-tutor/math-renderer.js'
const license=readFileSync('node_modules/katex/LICENSE','utf8'),licensePath='public/gsa-tutor/math-LICENSE.txt'
if(process.argv.includes('--check')){
 if(readFileSync(licensePath,'utf8')!==license)throw Error('Stale KaTeX license')
 if(readFileSync(path,'utf8')!==output)throw Error('Stale GSA math renderer; run npm run build:gsa-math')
}else{writeFileSync(path,output);writeFileSync(licensePath,license)}
console.log('GSA MathML renderer verified; scientific content review is separate.')
