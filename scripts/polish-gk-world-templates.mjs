import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const apply = process.argv.includes('--apply')
const publicDir = path.join(root, 'public', 'mcq')
const bundledDir = path.join(root, 'src', 'data', 'mcq-shards')
const index = JSON.parse(fs.readFileSync(path.join(publicDir, 'index.json'), 'utf8'))

const norm = (v) => String(v ?? '').normalize('NFKC').toLocaleLowerCase().replace(/[’‘]/g, "'").replace(/[^\p{L}\p{N}\p{S}]+/gu, ' ').replace(/\s+/g, ' ').trim()
const hash = (v) => { let h = 2166136261; for (const ch of String(v)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619) } return h >>> 0 }
const choose = (id, variants) => variants[hash(id) % variants.length]

const rowsByShard = []
const categoryCounts = new Map()
let total = 0
let rewrites = 0
const byCategory = new Map()
const examples = []

function record(category, q, from, to) {
  if (from === to) return q
  rewrites += 1
  byCategory.set(category, (byCategory.get(category) ?? 0) + 1)
  if (examples.length < 40) examples.push({ id: q.id, category, from, to })
  return { ...q, q: to }
}

function polish(category, q) {
  const original = String(q.q ?? '')
  const id = String(q.id ?? original)
  let m
  let next = original

  if ((m = original.match(/^Which GeoNames-listed country or territory ranks (.+?) by (.+?) in this dataset\?$/i))) {
    const rank = m[1], metric = m[2]
    next = choose(id, [
      `Which GeoNames-listed country or territory ranks ${rank} by ${metric} in this dataset?`,
      `In the GeoNames dataset, which country or territory is ranked ${rank} for ${metric}?`,
      `Select the country or territory holding rank ${rank} by ${metric} in the GeoNames dataset.`,
      `Rank ${rank} for ${metric} in the GeoNames dataset belongs to which country or territory?`,
      `Which country or territory occupies position ${rank} for ${metric} in the GeoNames data?`,
    ])
  } else if ((m = original.match(/^Which period or date is correctly associated with (.+?)\?$/i))) {
    const event = m[1]
    next = choose(id, [
      `Which period or date is correctly associated with ${event}?`,
      `When is ${event} correctly placed?`,
      `Select the correct period or date for ${event}.`,
      `${event} is associated with which period or date?`,
      `What is the correct chronological placement of ${event}?`,
    ])
  } else if ((m = original.match(/^What is the country-code top-level domain of (.+?)\?$/i))) {
    const place = m[1]
    next = choose(id, [
      `What is the country-code top-level domain of ${place}?`,
      `Which ccTLD belongs to ${place}?`,
      `${place} uses which country-code internet domain?`,
      `Select the ccTLD assigned to ${place}.`,
      `What country-code domain suffix is associated with ${place}?`,
    ])
  } else if ((m = original.match(/^Which country or territory is represented by the flag (.+?)\?$/i))) {
    const flag = m[1]
    next = choose(id, [
      `Which country or territory is represented by the flag ${flag}?`,
      `The flag ${flag} represents which country or territory?`,
      `Identify the country or territory shown by ${flag}.`,
      `Which place uses the national or territorial flag ${flag}?`,
      `Select the country or territory corresponding to ${flag}.`,
    ])
  } else if ((m = original.match(/^Which statement about the capital of (.+?) is accurate\?$/i))) {
    const place = m[1]
    next = choose(id, [
      `Which statement about the capital of ${place} is accurate?`,
      `What is correct about the capital of ${place}?`,
      `Select the accurate capital-related statement for ${place}.`,
      `Which option correctly describes ${place}'s capital?`,
      `Identify the correct statement concerning the capital of ${place}.`,
    ])
  } else if ((m = original.match(/^What is the UN M49 numeric code for (.+?)\?$/i))) {
    const place = m[1]
    next = choose(id, [
      `What is the UN M49 numeric code for ${place}?`,
      `Which UN M49 code is assigned to ${place}?`,
      `${place} has which UN M49 numeric code?`,
      `Select the UN M49 code for ${place}.`,
      `What M49 numeric identifier corresponds to ${place}?`,
    ])
  } else if ((m = original.match(/^Which country is represented by the ISO alpha-2 code (.+?)\?$/i))) {
    const code = m[1]
    next = choose(id, [
      `Which country is represented by the ISO alpha-2 code ${code}?`,
      `The ISO alpha-2 code ${code} belongs to which country?`,
      `Identify the country corresponding to ISO alpha-2 code ${code}.`,
      `Which country uses the alpha-2 code ${code}?`,
      `Select the country assigned ISO code ${code}.`,
    ])
  } else if ((m = original.match(/^Which option correctly identifies the principal place of (.+?)\?$/i))) {
    const event = m[1]
    next = choose(id, [
      `Which option correctly identifies the principal place of ${event}?`,
      `What principal place is associated with ${event}?`,
      `Select the place most directly connected with ${event}.`,
      `${event} is principally associated with which place?`,
      `Identify the principal location linked to ${event}.`,
    ])
  } else if ((m = original.match(/^Which option correctly identifies the associated person\/group of (.+?)\?$/i))) {
    const event = m[1]
    next = choose(id, [
      `Which option correctly identifies the associated person/group of ${event}?`,
      `Who is most directly associated with ${event}?`,
      `Select the person or group connected with ${event}.`,
      `${event} is associated with which person or group?`,
      `Identify the person or group linked to ${event}.`,
    ])
  } else if ((m = original.match(/^Which option correctly identifies the key significance of (.+?)\?$/i))) {
    const event = m[1]
    next = choose(id, [
      `Which option correctly identifies the key significance of ${event}?`,
      `What is the key significance of ${event}?`,
      `Select the statement that best captures the significance of ${event}.`,
      `${event} is important primarily because of which point?`,
      `Identify the main significance associated with ${event}.`,
    ])
  } else if ((m = original.match(/^(.+?) belongs primarily to which area of Islamic teaching\?$/i))) {
    const concept = m[1]
    next = choose(id, [
      `${concept} belongs primarily to which area of Islamic teaching?`,
      `Which area of Islamic teaching chiefly includes ${concept}?`,
      `Under which area of Islamic teaching is ${concept} best classified?`,
      `Select the Islamic teaching area most closely associated with ${concept}.`,
      `${concept} is principally classified under which Islamic area?`,
    ])
  } else if ((m = original.match(/^What is the approximate atomic mass listed for (.+?)\?$/i))) {
    const element = m[1]
    next = choose(id, [
      `What is the approximate atomic mass listed for ${element}?`,
      `Which approximate atomic mass belongs to ${element}?`,
      `${element} has approximately what atomic mass?`,
      `Select the listed atomic mass for ${element}.`,
      `What approximate atomic-mass value corresponds to ${element}?`,
    ])
  } else if ((m = original.match(/^Which electron configuration is listed for (.+?)\?$/i))) {
    const element = m[1]
    next = choose(id, [
      `Which electron configuration is listed for ${element}?`,
      `What electron configuration corresponds to ${element}?`,
      `${element} has which listed electron configuration?`,
      `Select the electron configuration of ${element}.`,
      `Which configuration correctly represents ${element}'s electrons?`,
    ])
  } else if ((m = original.match(/^Which set of oxidation states is listed for (.+?)\?$/i))) {
    const element = m[1]
    next = choose(id, [
      `Which set of oxidation states is listed for ${element}?`,
      `What oxidation states are associated with ${element}?`,
      `${element} commonly has which listed oxidation states?`,
      `Select the oxidation-state set for ${element}.`,
      `Which listed oxidation states belong to ${element}?`,
    ])
  } else if ((m = original.match(/^What melting point in kelvin is listed for (.+?)\?$/i))) {
    const element = m[1]
    next = choose(id, [
      `What melting point in kelvin is listed for ${element}?`,
      `Which melting-point value in kelvin belongs to ${element}?`,
      `${element} has what listed melting point in kelvin?`,
      `Select the melting point of ${element} in kelvin.`,
      `What Kelvin melting-point value corresponds to ${element}?`,
    ])
  } else if ((m = original.match(/^What boiling point in kelvin is listed for (.+?)\?$/i))) {
    const element = m[1]
    next = choose(id, [
      `What boiling point in kelvin is listed for ${element}?`,
      `Which boiling-point value in kelvin belongs to ${element}?`,
      `${element} has what listed boiling point in kelvin?`,
      `Select the boiling point of ${element} in kelvin.`,
      `What Kelvin boiling-point value corresponds to ${element}?`,
    ])
  } else if ((m = original.match(/^What electronegativity value is listed for (.+?)\?$/i))) {
    const element = m[1]
    next = choose(id, [
      `What electronegativity value is listed for ${element}?`,
      `Which electronegativity value belongs to ${element}?`,
      `${element} has what listed electronegativity?`,
      `Select the electronegativity value for ${element}.`,
      `What electronegativity is associated with ${element}?`,
    ])
  } else if ((m = original.match(/^Identify another country that has a land boundary with (.+?)\.?$/i))) {
    const place = m[1]
    next = choose(id, [
      `Identify another country that has a land boundary with ${place}.`,
      `Which country shares a land boundary with ${place}?`,
      `Select a country bordering ${place} by land.`,
      `${place} has a land border with which country?`,
      `Which neighbouring country is connected to ${place} by a land border?`,
    ])
  } else if ((m = original.match(/^Which country shares a land border with (.+?)\?$/i))) {
    const place = m[1]
    next = choose(id, [
      `Which country shares a land border with ${place}?`,
      `Which state borders ${place} by land?`,
      `Select a country with a land boundary with ${place}.`,
      `${place} shares a land frontier with which country?`,
      `Identify a land neighbour of ${place}.`,
    ])
  } else if ((m = original.match(/^Which ISO 4217 currency code is (?:used|listed|assigned) for (.+?)\?$/i))) {
    const place = m[1]
    next = choose(id, [
      `Which ISO 4217 currency code is used for ${place}?`,
      `What ISO 4217 currency code applies to ${place}?`,
      `${place} uses which ISO 4217 currency code?`,
      `Select the ISO 4217 code associated with ${place}.`,
      `Which currency code corresponds to ${place} under ISO 4217?`,
    ])
  } else if ((m = original.match(/^What is the principal official currency of (.+?)\?$/i))) {
    const place = m[1]
    next = choose(id, [
      `What is the principal official currency of ${place}?`,
      `Which currency is principally used officially in ${place}?`,
      `${place}'s principal official currency is:`,
      `Select the principal official currency for ${place}.`,
      `Which monetary unit serves as the principal official currency of ${place}?`,
    ])
  } else if ((m = original.match(/^Which scientific term matches this description\s*[:—-]\s*(.+?)\?$/i))) {
    const description = m[1]
    next = choose(id, [
      `Which scientific term matches this description: ${description}?`,
      `What scientific term is described by: ${description}?`,
      `Identify the scientific term corresponding to this description: ${description}.`,
      `Select the term that best matches: ${description}.`,
      `This description refers to which scientific term: ${description}?`,
    ])
  } else if ((m = original.match(/^In which world region is (.+?) located\?$/i))) {
    const place = m[1]
    next = choose(id, [
      `In which world region is ${place} located?`,
      `Which world region contains ${place}?`,
      `${place} belongs to which world region?`,
      `Select the world region in which ${place} lies.`,
      `Where is ${place} placed in regional world geography?`,
    ])
  } else if ((m = original.match(/^Which country or territory has (.+?) as its capital\?$/i))) {
    const capital = m[1]
    next = choose(id, [
      `Which country or territory has ${capital} as its capital?`,
      `${capital} is the capital of which country or territory?`,
      `Identify the country or territory whose capital is ${capital}.`,
      `Which state or territory is governed from the capital ${capital}?`,
      `Select the country or territory associated with capital ${capital}.`,
    ])
  }

  return record(category, q, original, next)
}

for (const category of index.categories) {
  let count = 0
  for (let chunk = 0; chunk < category.chunks; chunk += 1) {
    const filename = `cat-${category.slug}-${chunk}.json`
    const publicPath = path.join(publicDir, filename)
    const bundledPath = path.join(bundledDir, filename)
    const publicBytes = fs.readFileSync(publicPath)
    const bundledBytes = fs.readFileSync(bundledPath)
    if (!publicBytes.equals(bundledBytes)) throw new Error(`${filename}: public and bundled copies differ before template polish`)
    const rows = JSON.parse(publicBytes.toString('utf8')).map((q) => polish(category.slug, q))
    count += rows.length
    total += rows.length
    rowsByShard.push({ publicPath, bundledPath, rows, category: category.slug })
  }
  categoryCounts.set(category.slug, count)
}

// Same-category exact-stem guard after wording changes.
const seenByCategory = new Map()
const conflicts = []
for (const shard of rowsByShard) {
  for (const q of shard.rows) {
    const key = `${shard.category}|${norm(q.q)}`
    if (seenByCategory.has(key)) conflicts.push([seenByCategory.get(key), q.id, q.q])
    else seenByCategory.set(key, q.id)
  }
}
if (conflicts.length) {
  console.error('Template polishing created exact stem conflicts:', conflicts.slice(0, 20))
  process.exit(2)
}

console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', total, rewrites, byCategory: Object.fromEntries([...byCategory.entries()].sort((a,b)=>b[1]-a[1])), examples }, null, 2))
if (!apply) process.exit(0)

for (const shard of rowsByShard) {
  const payload = `${JSON.stringify(shard.rows)}\n`
  fs.writeFileSync(shard.publicPath, payload)
  fs.writeFileSync(shard.bundledPath, payload)
}
