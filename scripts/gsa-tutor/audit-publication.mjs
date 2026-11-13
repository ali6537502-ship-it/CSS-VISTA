import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
const root=resolve(process.argv[2]||'dist')
for(const privatePath of ['content/gsa-tutor','__gsa-editorial__'])if(existsSync(resolve(root,privatePath)))throw Error('Private editorial content leaked into build: '+privatePath)
const folder=resolve(root,'gsa-tutor/content')
if(!existsSync(folder))throw Error('GSA course content missing from artifact')
for(const name of readdirSync(folder).filter(n=>n.endsWith('.json'))){
 const item=JSON.parse(readFileSync(resolve(folder,name),'utf8'))
 if(item.stages&&item.lessonId){
  if(item.status!=='approved'||!item.independentReviewer||!item.approvedContentHash)throw Error('Unapproved teaching unit in public course: '+name)
 }
}
console.log('PASS GSA publication boundary: private teaching drafts and editorial endpoints are absent from the production artifact. This does not approve the original course science.')
