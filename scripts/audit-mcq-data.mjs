import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const publicDir = path.join(root, 'public', 'mcq')
const bundledDir = path.join(root, 'src', 'data', 'mcq-shards')
const index = JSON.parse(fs.readFileSync(path.join(publicDir, 'index.json'), 'utf8'))
const normalize = (value) => String(value ?? '').trim().replace(/\s+/g, ' ').toLocaleLowerCase()

const currencyCountry = (question) => {
  const patterns = [
    /^What is the currency of (.+?)\?$/i,
    /^Which monetary unit belongs to (.+?)\?$/i,
    /^Select the principal official currency for (.+?)\.$/i,
    /^What is the principal official currency of (.+?)\?$/i,
    /^(.+?)'s principal official currency is:$/i,
    /^Which monetary unit serves as the principal official currency of (.+?)\?$/i,
    /^Which currency is principally used officially in (.+?)\?$/i,
    /^Which currency is listed for (.+?)\?$/i,
  ]
  for (const pattern of patterns) {
    const match = String(question ?? '').match(pattern)
    if (match) return match[1].trim()
  }
  return null
}

const normalizeCurrencyCountry = (country) => {
  const normalized = String(country ?? '')
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase()
    .replace(/&/g, 'and')
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/^the /, '')

  return ({
    turkiye: 'turkey',
    'cabo verde': 'cape verde',
    'democratic republic of the congo': 'dr congo',
    'ivory coast': 'cote divoire',
    'czech republic': 'czechia',
  })[normalized] ?? normalized
}
const ids = new Set()
const errors = []
const answerDistribution = [0, 0, 0, 0]
let total = 0

for (const category of index.categories) {
  let categoryCount = 0
  const seenText = new Set()
  const seenCurrencyCountries = new Set()
  for (let chunk = 0; chunk < category.chunks; chunk += 1) {
    const filename = `cat-${category.slug}-${chunk}.json`
    const publicPath = path.join(publicDir, filename)
    const bundledPath = path.join(bundledDir, filename)
    if (!fs.existsSync(publicPath) || !fs.existsSync(bundledPath)) {
      errors.push(`${category.slug}: missing shard ${chunk}`)
      continue
    }
    if (!fs.readFileSync(publicPath).equals(fs.readFileSync(bundledPath))) errors.push(`${filename}: public and bundled copies differ`)
    const questions = JSON.parse(fs.readFileSync(publicPath, 'utf8'))
    for (const question of questions) {
      categoryCount += 1
      total += 1
      if (!question || typeof question.id !== 'string' || typeof question.q !== 'string') errors.push(`${filename}: malformed question`)
      if (ids.has(question.id)) errors.push(`${question.id}: duplicate id`)
      ids.add(question.id)
      if (!Array.isArray(question.o) || question.o.length !== 4) errors.push(`${question.id}: requires exactly four options`)
      else if (new Set(question.o.map(normalize)).size !== 4) errors.push(`${question.id}: repeated option`)
      if (!Number.isInteger(question.a) || question.a < 0 || question.a > 3) errors.push(`${question.id}: invalid answer index`)
      else answerDistribution[question.a] += 1
      const textKey = normalize(question.q)
      if (seenText.has(textKey)) errors.push(`${question.id}: repeated question text in ${category.slug}`)
      seenText.add(textKey)
      if (category.slug === 'currencies') {
        const country = currencyCountry(question.q)
        if (country) {
          const countryKey = normalizeCurrencyCountry(country)
          if (seenCurrencyCountries.has(countryKey)) errors.push(`${question.id}: repeated country-currency fact for ${country}`)
          seenCurrencyCountries.add(countryKey)
        }
      }
    }
  }
  if (categoryCount !== category.count) errors.push(`${category.slug}: index says ${category.count}, shards contain ${categoryCount}`)
}

if (total !== index.total) errors.push(`index total says ${index.total}, shards contain ${total}`)
if (errors.length) {
  console.error(`MCQ audit failed with ${errors.length} error(s):`)
  console.error(errors.slice(0, 100).join('\n'))
  process.exit(1)
}

console.log(`MCQ audit passed: ${total.toLocaleString('en-US')} questions, ${ids.size.toLocaleString('en-US')} unique IDs, answer distribution ${answerDistribution.join('/')}.`)
