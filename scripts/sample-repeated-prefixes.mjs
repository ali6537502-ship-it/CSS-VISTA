import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const dir = path.join(root, 'public', 'css-subject-mcqs')
const targets = {
  'law.json': ['which limitation should be kept in view','which proposition most accurately states the rule concerning','which qualification is legally significant'],
  'zoology.json': ['one of the following concept feature','in a comparative anatomy problem the','a specimen or process is characterized','which concept would a zoologist invoke'],
  'geography.json': ['which factor or process is most','for exam purposes which characterization of','for an fpsc style objective paper'],
  'sindhi.json': ['سان گڏ ساڳئي ادبي حصي','وارين جوڙين مان غلط نسبت','کي ويجهن ادبي صنفن سان ڀيٽيندي','واري مخصوص نسبت سان صحيح طور'],
}
const norm = v => String(v??'').normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').replace(/\s+/g,' ').trim()
for (const [file, phrases] of Object.entries(targets)) {
  const rows = JSON.parse(fs.readFileSync(path.join(dir,file),'utf8'))
  console.log(`\n## ${file}`)
  for (const phrase of phrases) {
    const p=norm(phrase); const found=[]
    for (const q of rows) {
      const text=q.question??q.q??''
      if (norm(text).includes(p)) found.push(text)
      if (found.length>=3) break
    }
    console.log(`\n### ${phrase} (${rows.filter(q=>norm(q.question??q.q??'').includes(p)).length})`)
    for (const text of found) console.log('- '+text)
  }
}
