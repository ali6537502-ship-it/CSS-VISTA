import fs from 'node:fs'

const analysisPath = new URL('../public/css-past-paper-analysis.json', import.meta.url)
const indexPath = new URL('../public/css-past-paper-analysis-index.json', import.meta.url)
const syllabusPath = new URL('../public/fpsc-syllabus.json', import.meta.url)

const analysis = JSON.parse(fs.readFileSync(analysisPath, 'utf8'))
const compact = JSON.parse(fs.readFileSync(indexPath, 'utf8'))
const syllabus = JSON.parse(fs.readFileSync(syllabusPath, 'utf8'))

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

assert(analysis.source.sha256 === 'a85f47b718c29db3aaaf0baf01bc333ba9d87eaf42d940353bf324b8c71bb316', 'Unexpected source checksum')
assert(analysis.stats.subjects === 52, 'Expected 52 subjects')
assert(analysis.stats.topics === 1509, 'Expected 1,509 topic groups')
assert(analysis.stats.questions === 3277, 'Expected 3,277 questions')
assert(analysis.stats.sourceLimitations === 58, 'Expected 58 source limitations')
assert(analysis.subjects.length === syllabus.subjects.length, 'Analysis must cover every syllabus subject')
assert(analysis.integrity.coverage.length === 52, 'Coverage table must contain every subject')
assert(analysis.integrity.limitations.length === 58, 'Integrity limitation count mismatch')

const syllabusBySlug = new Map(syllabus.subjects.map((subject) => [subject.slug, subject]))
const ids = new Set()
let questions = 0
let topics = 0

for (const subject of analysis.subjects) {
  const syllabusSubject = syllabusBySlug.get(subject.slug)
  assert(syllabusSubject, `Unknown syllabus subject slug: ${subject.slug}`)
  let subjectQuestions = 0
  let subjectTopics = 0
  for (const section of subject.sections) {
    if (section.syllabusSectionIndex !== null) {
      assert(syllabusSubject.sections[section.syllabusSectionIndex], `Invalid section mapping in ${subject.slug}`)
    }
    for (const topic of section.topics) {
      subjectTopics += 1
      assert(topic.title.trim(), `Blank topic in ${subject.slug}`)
      assert(topic.analysis.length > 0, `Missing analysis notes for ${topic.id}`)
      if (topic.syllabusSectionIndex !== null) {
        assert(syllabusSubject.sections[topic.syllabusSectionIndex], `Invalid topic section mapping for ${topic.id}`)
      }
      for (const itemIndex of topic.syllabusItemIndexes) {
        assert(topic.syllabusSectionIndex !== null, `Item mapping without a section for ${topic.id}`)
        assert(syllabusSubject.sections[topic.syllabusSectionIndex].items[itemIndex], `Invalid item mapping for ${topic.id}`)
      }
      for (const question of topic.questions) {
        subjectQuestions += 1
        assert(!ids.has(question.id), `Duplicate question id: ${question.id}`)
        ids.add(question.id)
        assert(question.text.trim(), `Blank question: ${question.id}`)
        assert(question.year >= 2016 && question.year <= 2026 && question.year !== 2020, `Unexpected year: ${question.id}`)
        assert(/^Q\S+/.test(question.number), `Unexpected question number: ${question.id}`)
      }
    }
  }
  assert(subjectQuestions === subject.questionCount, `Question count mismatch for ${subject.slug}`)
  assert(subjectTopics === subject.topicCount, `Topic count mismatch for ${subject.slug}`)
  questions += subjectQuestions
  topics += subjectTopics
}

assert(questions === analysis.stats.questions, 'Overall question count mismatch')
assert(topics === analysis.stats.topics, 'Overall topic count mismatch')
assert(JSON.stringify(compact.stats) === JSON.stringify(analysis.stats), 'Compact/full stats mismatch')
assert(compact.subjects.length === analysis.subjects.length, 'Compact/full subject mismatch')

for (const subject of compact.subjects) {
  const fullSubject = analysis.subjects.find((candidate) => candidate.slug === subject.slug)
  assert(fullSubject, `Compact subject missing from full data: ${subject.slug}`)
  assert(subject.questionCount === fullSubject.questionCount, `Compact question count mismatch: ${subject.slug}`)
  assert(subject.topicCount === fullSubject.topicCount, `Compact topic count mismatch: ${subject.slug}`)
}

console.log(`Past-paper analysis audit passed: ${questions.toLocaleString()} questions, ${topics.toLocaleString()} topics, ${analysis.subjects.length} subjects.`)
