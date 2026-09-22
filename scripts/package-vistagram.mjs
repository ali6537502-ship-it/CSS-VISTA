import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  titleSimilarity,
  validateVistagramBatch,
  wordCountFromPost,
} from './lib/vistagram-schema.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const contentDir = join(root, 'content', 'vistagram')
const outputDir = join(root, 'public', 'vistagram-content')
const postsDir = join(outputDir, 'posts')
const checkOnly = process.argv.includes('--check')

async function walk(dir, prefix = '') {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch (error) {
    if (error.code === 'ENOENT') return []
    throw error
  }

  const files = []
  for (const entry of entries) {
    if (entry.isSymbolicLink()) throw new Error('Vistagram content symlinks are not supported.')
    const relative = prefix + entry.name
    if (entry.isDirectory()) files.push(...await walk(join(dir, entry.name), relative + '/'))
    else if (entry.name.endsWith('.json')) files.push(relative)
  }
  return files.sort()
}

function expectedPath(date) {
  return date.slice(0, 4) + '/' + date.slice(5, 7) + '/' + date + '.json'
}

function runtimePost(item, batch) {
  const readingMinutes = Math.max(1, Math.ceil(wordCountFromPost(item) / 220))
  return {
    id: item.id,
    slug: item.slug,
    title: item.title,
    excerpt: item.excerpt,
    type: item.type,
    category: item.category,
    topic: item.topic,
    tags: item.tags,
    publishedAt: batch.published_at,
    updatedAt: item.updatedAt || undefined,
    readingMinutes,
    featured: item.featured === true || undefined,
    evergreen: item.evergreen === true,
    contentPath: '/vistagram-content/posts/' + item.slug + '.json',
    scope: item.scope,
    dedupeKey: item.dedupeKey,
    subtitle: item.subtitle || undefined,
    keyPoints: item.keyPoints || [],
    sections: item.sections,
    examRelevance: item.examRelevance || [],
    sources: item.sources,
    relatedSlugs: item.relatedSlugs || [],
  }
}

const batches = []
const seenIds = new Map()
const seenSlugs = new Map()
const seenDedupeKeys = new Map()
const priorTitles = []

for (const path of await walk(contentDir)) {
  if (!/^\d{4}\/\d{2}\/\d{4}-\d{2}-\d{2}\.json$/.test(path)) {
    throw new Error('Invalid Vistagram batch path: ' + path)
  }

  const raw = await readFile(join(contentDir, path))
  if (raw.byteLength > 3145728) throw new Error('Vistagram batch exceeds 3 MiB: ' + path)

  let batch
  try {
    batch = validateVistagramBatch(JSON.parse(raw.toString('utf8')))
  } catch (error) {
    throw new Error('Invalid Vistagram batch ' + path + ': ' + error.message)
  }

  if (path !== expectedPath(batch.date)) throw new Error('Vistagram batch date does not match its path: ' + path)

  for (const item of batch.posts) {
    const checks = [
      [seenIds, item.id, 'ID'],
      [seenSlugs, item.slug, 'slug'],
      [seenDedupeKeys, item.dedupeKey, 'dedupe key'],
    ]
    for (const [map, value, label] of checks) {
      if (map.has(value)) throw new Error('Repeated Vistagram ' + label + ' "' + value + '" in ' + batch.date + '; first used ' + map.get(value))
      map.set(value, batch.date)
    }

    for (const previous of priorTitles) {
      const similarity = titleSimilarity(item.title, previous.title)
      if (similarity >= 0.72) {
        throw new Error(
          'Vistagram title appears repetitive: "' + item.title + '" (' + batch.date + ') is too similar to "' + previous.title + '" (' + previous.date + ')',
        )
      }
    }
    priorTitles.push({ title: item.title, date: batch.date })
  }

  batches.push(batch)
}

batches.sort((a, b) => a.published_at.localeCompare(b.published_at))

const runtimePosts = []
for (const batch of batches) {
  for (const item of batch.posts) runtimePosts.push(runtimePost(item, batch))
}
runtimePosts.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))

if (!checkOnly) {
  await rm(postsDir, { recursive: true, force: true })
  await mkdir(postsDir, { recursive: true })

  for (const post of runtimePosts) {
    await writeFile(join(postsDir, post.slug + '.json'), JSON.stringify(post, null, 2) + '\n')
  }

  const index = {
    version: 1,
    generatedAt: new Date().toISOString(),
    posts: runtimePosts.map((post) => ({
      id: post.id,
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      type: post.type,
      category: post.category,
      topic: post.topic,
      tags: post.tags,
      publishedAt: post.publishedAt,
      updatedAt: post.updatedAt,
      readingMinutes: post.readingMinutes,
      featured: post.featured,
      evergreen: post.evergreen,
      contentPath: post.contentPath,
      scope: post.scope,
      dedupeKey: post.dedupeKey,
    })),
  }
  await mkdir(outputDir, { recursive: true })
  await writeFile(join(outputDir, 'index.json'), JSON.stringify(index, null, 2) + '\n')
}

console.log(
  'Vistagram: ' + batches.length + ' validated batches; ' + runtimePosts.length + ' unique posts; '
  + (checkOnly ? 'no files written.' : 'public feed packaged.'),
)
