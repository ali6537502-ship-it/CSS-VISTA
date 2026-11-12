import {readFileSync,writeFileSync,mkdirSync} from 'node:fs'
import {createRequire} from 'node:module'
import {dirname,resolve} from 'node:path'
const require=createRequire(import.meta.url),root=resolve(dirname(new URL(import.meta.url).pathname),'../..')
const source=dirname(require.resolve('katex/package.json'))
const files=[['dist/katex.min.js','katex.min.js'],['LICENSE','katex-LICENSE.txt']]
mkdirSync(resolve(root,'public/gsa-tutor/vendor'),{recursive:true})
for(const [from,to]of files){
 const content=readFileSync(resolve(source,from)),target=resolve(root,'public/gsa-tutor/vendor',to)
 if(process.argv.includes('--check')){if(!readFileSync(target).equals(content))throw Error('Pinned KaTeX asset differs: '+to)}else writeFileSync(target,content)
}
console.log('Pinned KaTeX '+JSON.parse(readFileSync(resolve(source,'package.json'))).version+' local assets verified.')
