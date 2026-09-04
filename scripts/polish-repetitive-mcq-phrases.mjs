import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const dir = path.join(root, 'public', 'css-subject-mcqs')
const index = JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf8'))

function hash(value) {
  let h = 2166136261
  for (const ch of String(value)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619) }
  return h >>> 0
}
function choose(id, values) { return values[hash(id) % values.length] }
function qText(q) { return q.question ?? q.q ?? q.text ?? '' }
function setText(q, value) {
  if ('question' in q || !('q' in q)) q.question = value
  else q.q = value
}
function idOf(q, i, slug) { return q.id ?? `${slug}#${i+1}` }

function prefixVariant(text, id, pattern, variants) {
  const match = text.match(pattern)
  if (!match) return text
  const tail = match.groups?.tail ?? match[1] ?? ''
  return choose(id, variants).replace('{tail}', tail)
}

function polish(slug, raw, id) {
  let q = String(raw ?? '').replace(/\s+/g, ' ').trim()

  // Sindhi: remove non-examinable comparison wrappers and production labels while preserving assertions.
  if (slug === 'sindhi') {
    q = q.replace(/^.*?تقابلي تياري[^،]{0,40}،\s*(بيان\s*I\s*:)/u, '$1')
    q = q.replace(/\s*تقابلي سوال\s*/gu, ' ')
    q = q.replace(/\s+/g, ' ').trim()
  }

  // Law: diversify repeated production-style lead-ins without changing the proposition being tested.
  if (slug === 'law') {
    q = prefixVariant(q,id,/^Which of the following best states the controlling proposition on (?<tail>.+)$/i,[
      'What is the controlling proposition on {tail}',
      'Which statement gives the controlling rule on {tail}',
      'How is the controlling proposition on {tail} best stated',
      'Which formulation correctly states the controlling proposition on {tail}',
      'What rule controls {tail}',
      'Which statement accurately expresses the rule governing {tail}',
      'What is the governing proposition on {tail}',
      'Which formulation best expresses the controlling rule on {tail}',
      'How should the controlling rule on {tail} be stated',
      'Which proposition governs {tail}',
      'What is the correct controlling rule on {tail}',
      'Which statement most accurately states the governing rule on {tail}',
    ])
    q = prefixVariant(q,id,/^In practical procedure,? which consequence is (?<tail>.+)$/i,[
      'Practically, which consequence is {tail}',
      'Procedurally, which consequence is {tail}',
      'Which practical consequence is {tail}',
      'In application, which consequence is {tail}',
      'Which procedural consequence is {tail}',
      'In practice, which result is {tail}',
      'Which consequence is {tail} in practice',
      'From a procedural standpoint, which consequence is {tail}',
      'In procedural terms, which result is {tail}',
      'Which practical result is {tail}',
      'Operationally, which consequence is {tail}',
      'Which result is {tail} when applied procedurally',
    ])
    q = prefixVariant(q,id,/^Which limitation should be kept in view(?<tail>.+)$/i,[
      'What limitation applies{tail}',
      'Which limitation qualifies{tail}',
      'What constraint must be considered{tail}',
      'Which restriction is relevant{tail}',
      'What limiting condition applies{tail}',
      'Which qualification must be considered{tail}',
      'What constraint governs{tail}',
      'Which limiting factor applies{tail}',
      'What restriction should be considered{tail}',
      'Which qualification applies{tail}',
      'What legal limitation bears on{tail}',
      'Which constraint is material{tail}',
    ])
    q = prefixVariant(q,id,/^Which proposition most accurately states the rule concerning (?<tail>.+)$/i,[
      'What is the rule concerning {tail}',
      'Which proposition states the rule on {tail}',
      'How is the rule concerning {tail} correctly stated',
      'Which statement accurately gives the rule on {tail}',
      'What proposition governs {tail}',
      'Which formulation best states the rule concerning {tail}',
      'What is the governing rule concerning {tail}',
      'Which proposition correctly expresses the rule on {tail}',
      'How should the rule on {tail} be stated',
      'Which rule applies to {tail}',
      'What legal proposition applies to {tail}',
      'Which statement gives the applicable rule on {tail}',
    ])
    q = prefixVariant(q,id,/^Which condition or limitation most accurately (?<tail>.+)$/i,[
      'Which condition most accurately {tail}',
      'Which limitation correctly {tail}',
      'What qualifying condition best {tail}',
      'Which constraint most accurately {tail}',
      'What limitation correctly {tail}',
      'Which qualifying rule best {tail}',
      'Which condition correctly {tail}',
      'What constraint best {tail}',
    ])
    q = prefixVariant(q,id,/^Which result is most consistent with (?<tail>.+)$/i,[
      'What result is most consistent with {tail}',
      'Which outcome best accords with {tail}',
      'What outcome follows consistently from {tail}',
      'Which result best fits {tail}',
      'What result accords with {tail}',
      'Which outcome is most compatible with {tail}',
      'What consequence best matches {tail}',
      'Which result is compatible with {tail}',
    ])
    q = prefixVariant(q,id,/^Which proposition is legally accurate regarding (?<tail>.+)$/i,[
      'Which legal proposition is accurate regarding {tail}',
      'What is the legally accurate proposition regarding {tail}',
      'Which statement is legally correct regarding {tail}',
      'What proposition correctly states the law regarding {tail}',
      'Which legal statement is correct on {tail}',
      'What is the correct legal position regarding {tail}',
      'Which proposition correctly describes the law on {tail}',
      'What legal proposition applies regarding {tail}',
    ])
    q = prefixVariant(q,id,/^Which statement best captures the legal (?<tail>.+)$/i,[
      'Which statement most accurately captures the legal {tail}',
      'What statement best expresses the legal {tail}',
      'Which formulation best describes the legal {tail}',
      'What is the correct statement of the legal {tail}',
      'Which statement accurately expresses the legal {tail}',
      'How is the legal {tail} best described',
      'Which formulation correctly captures the legal {tail}',
      'What statement correctly describes the legal {tail}',
    ])
    q = prefixVariant(q,id,/^What is the most accurate legal (?<tail>.+)$/i,[
      'Which is the most accurate legal {tail}',
      'What is the correct legal {tail}',
      'Which legal {tail} is most accurate',
      'What best states the legal {tail}',
      'Which formulation gives the correct legal {tail}',
      'What is the legally correct {tail}',
      'Which statement best gives the legal {tail}',
      'What formulation accurately states the legal {tail}',
    ])
    q = prefixVariant(q,id,/^Which qualification is legally significant(?<tail>.+)$/i,[
      'What qualification is legally significant{tail}',
      'Which legal qualification matters{tail}',
      'What qualifying condition is legally relevant{tail}',
      'Which qualification has legal significance{tail}',
      'What legal qualification applies{tail}',
      'Which qualifying factor is material{tail}',
      'What qualification must be considered legally{tail}',
      'Which qualification is material in law{tail}',
    ])
  }

  if (slug === 'geography') {
    q = prefixVariant(q,id,/^A field geomorphologist records the following (?<tail>.+)$/i,[
      'A geomorphologist observes the following {tail}',
      'Field evidence shows the following {tail}',
      'A geomorphological survey records the following {tail}',
      'The following {tail} is observed in the field',
      'A field study identifies the following {tail}',
      'Geomorphological observation reveals the following {tail}',
      'The field record contains the following {tail}',
      'A geomorphologist notes the following {tail}',
    ])
    q = prefixVariant(q,id,/^Which proposition follows most directly from (?<tail>.+)$/i,[
      'What proposition follows from {tail}',
      'Which conclusion follows directly from {tail}',
      'What follows most directly from {tail}',
      'Which proposition is supported by {tail}',
      'What conclusion is supported by {tail}',
      'Which inference follows from {tail}',
    ])
    q = prefixVariant(q,id,/^Identify the only correctly matched concept(?<tail>.+)$/i,[
      'Which concept is correctly matched{tail}',
      'Identify the correct concept match{tail}',
      'Which concept pairing is correct{tail}',
      'Select the correctly matched concept{tail}',
      'Which match is correct{tail}',
      'Identify the valid concept pairing{tail}',
    ])
  }

  if (slug === 'zoology') {
    q = q.replace(/^One of the following concept\/feature\s+/i, 'Which concept or feature ')
    q = prefixVariant(q,id,/^A zoologist records the following feature(?<tail>.+)$/i,[
      'A zoologist observes the following feature{tail}',
      'The following zoological feature is recorded{tail}',
      'A zoological observation shows the following feature{tail}',
      'Which concept fits this recorded feature{tail}',
      'A zoologist notes this feature{tail}',
      'The observed feature is as follows{tail}',
      'Consider the following zoological feature{tail}',
      'This zoological feature is observed{tail}',
    ])
    q = q.replace(/^In a comparative anatomy problem,\s*/i, 'In comparative anatomy, ')
    q = prefixVariant(q,id,/^Which pairing would remain correct in (?<tail>.+)$/i,[
      'Which pairing remains correct in {tail}',
      'What pairing is correct in {tail}',
      'Which pair is correctly matched in {tail}',
      'Identify the correct pairing in {tail}',
      'Which association remains valid in {tail}',
      'What is the valid pairing in {tail}',
    ])
    q = prefixVariant(q,id,/^Select the statement that correctly explains (?<tail>.+)$/i,[
      'Which statement correctly explains {tail}',
      'What statement correctly explains {tail}',
      'Which explanation is correct for {tail}',
      'Identify the statement that explains {tail}',
      'Which statement accurately explains {tail}',
      'What correctly explains {tail}',
    ])
  }

  if (slug === 'sociology') {
    q = prefixVariant(q,id,/^Which concept most precisely refers to (?<tail>.+)$/i,[
      'What concept refers to {tail}',
      'Which concept best describes {tail}',
      'What term most precisely describes {tail}',
      'Which sociological concept denotes {tail}',
      'What concept captures {tail}',
      'Which term refers most precisely to {tail}',
    ])
  }

  if (slug === 'muslim-law-and-jurisprudence') {
    q = prefixVariant(q,id,/^In Islamic legal terminology,? what is (?<tail>.+)$/i,[
      'In Islamic law, what is {tail}',
      'What does Islamic legal terminology call {tail}',
      'Which Islamic legal term denotes {tail}',
      'What is {tail} called in Islamic jurisprudence',
      'Which term in Islamic law refers to {tail}',
      'In fiqh terminology, what is {tail}',
    ])
    q = prefixVariant(q,id,/^Identify the doctrine or institution described(?<tail>.+)$/i,[
      'Which doctrine or institution is described{tail}',
      'What doctrine or institution matches this description{tail}',
      'Identify the legal concept described{tail}',
      'Which institution or doctrine fits the description{tail}',
      'What legal doctrine is being described{tail}',
      'Which concept corresponds to this description{tail}',
    ])
  }

  // General production-marker cleanup only; no facts, options, answers, or explanations are changed.
  q = q.replace(/\s+/g, ' ').trim()
  return q
}

let changedFiles = 0
let changedQuestions = 0
for (const meta of index.subjects) {
  const filePath = path.join(dir, meta.file)
  if (!fs.existsSync(filePath)) continue
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  if (!Array.isArray(data)) continue
  let touched = false
  data.forEach((q, i) => {
    const before = qText(q)
    const after = polish(meta.slug, before, idOf(q,i,meta.slug))
    if (after !== before) {
      setText(q, after)
      changedQuestions += 1
      touched = true
    }
  })
  if (touched) {
    fs.writeFileSync(filePath, JSON.stringify(data) + '\n')
    changedFiles += 1
  }
}
console.log(JSON.stringify({changedFiles, changedQuestions}, null, 2))
