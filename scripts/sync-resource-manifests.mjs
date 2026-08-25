import { createHash } from 'node:crypto'
import { readFile, readdir, stat, writeFile } from 'node:fs/promises'
import { basename, extname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadGeneratedPastPapers } from './lib/past-paper-registry.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const publicDir = join(root, 'public')
const contentDirectories = [
  'book-summaries', 'books', 'checked-mocks', 'css-subject-mcqs',
  'fpsc-syllabus-scans', 'language-grammar', 'magazines', 'mcq',
  'note-previews', 'one-liner-gk', 'opinions', 'past-papers',
  'recent-affairs', 'samples', 'videos',
]

const categoryNames = {
  'book-summaries': 'Book Summaries',
  books: 'Books',
  'checked-mocks': 'Checked Mocks',
  'css-subject-mcqs': 'CSS Subject MCQs',
  'fpsc-syllabus-scans': 'FPSC Syllabus',
  'language-grammar': 'Language and Grammar',
  magazines: 'Weekly Publications',
  mcq: 'MCQ Data',
  'note-previews': 'Notes Samples',
  'one-liner-gk': 'One-Liner GK',
  opinions: 'Opinions',
  'past-papers': 'Past Papers',
  'recent-affairs': 'Current Affairs',
  samples: 'Notes Samples',
  videos: 'Videos',
}

const mimeTypes = {
  '.pdf': 'application/pdf', '.json': 'application/json', '.webp': 'image/webp',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.txt': 'text/plain',
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  return (await Promise.all(entries.map((entry) => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? walk(path) : [path]
  }))).flat()
}

function publicUrl(path) {
  return `/${relative(publicDir, path).split(sep).join('/')}`
}

function humanTitle(path) {
  return basename(path, extname(path))
    .replace(/^\d+[_-]+/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .replace(/\s+/g, ' ')
    .trim()
}

function stableId(url) {
  const prefix = url.split('/').filter(Boolean)[0] || 'resource'
  return `${prefix}-${createHash('sha1').update(url).digest('hex').slice(0, 16)}`
}

async function sha256(path) {
  return createHash('sha256').update(await readFile(path)).digest('hex')
}

const pageCounts = JSON.parse(await readFile(join(publicDir, 'pdf-page-counts.json'), 'utf8'))
const pastPaperMap = new Map((await loadGeneratedPastPapers(root)).map((paper) => [paper.fileUrl, paper]))
const paths = (await Promise.all(contentDirectories.map((directory) => walk(join(publicDir, directory))))).flat()

const resources = []
for (const path of paths.sort((a, b) => publicUrl(a).localeCompare(publicUrl(b), undefined, { numeric: true }))) {
  const url = publicUrl(path)
  const rootDirectory = url.split('/').filter(Boolean)[0]
  const extension = extname(path).toLowerCase()
  const details = await stat(path)
  const paper = pastPaperMap.get(url)
  const pdf = pageCounts[url]
  const year = paper?.year ?? (Number(url.match(/\/(20\d{2})\//)?.[1]) || undefined)
  resources.push({
    id: paper?.id ?? stableId(url),
    title: paper?.title ?? humanTitle(path),
    category: categoryNames[rootDirectory] ?? rootDirectory,
    ...(paper ? {
      examination: paper.examination,
      subject: paper.subject,
      subjectType: paper.subjectType,
      year: paper.year,
      paper: paper.paper,
      mode: paper.mode,
    } : year ? { year } : {}),
    source: paper ? 'CSS Vista archive' : (rootDirectory === 'samples' || rootDirectory === 'note-previews' ? 'Owner-authorised sample' : 'Bundled resource'),
    path: url,
    mimeType: mimeTypes[extension] ?? 'application/octet-stream',
    sizeBytes: details.size,
    sha256: await sha256(path),
    ...(pdf ? { pageCount: pdf.pages } : {}),
    access: 'public',
    availability: 'available',
    viewUrl: url,
    ...(extension === '.pdf' ? { downloadUrl: url } : {}),
  })
}

const manifest = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  sourceOfTruth: 'public filesystem and generated past-paper registry',
  resourceCount: resources.length,
  totalBytes: resources.reduce((sum, item) => sum + item.sizeBytes, 0),
  resources,
}
await writeFile(join(publicDir, 'resource-manifest.json'), JSON.stringify(manifest, null, 2) + '\n')

const remoteFiles = resources
  .filter((item) => item.mimeType === 'application/pdf' && (item.path.startsWith('/past-papers/') || item.path.startsWith('/samples/')))
  .map((item) => ({ path: item.path, size: item.sizeBytes, sha256: item.sha256 }))
const remoteManifest = {
  repository: 'ali6537502-ship-it/CSS-VISTA',
  branch: 'main',
  publicBase: 'https://raw.githubusercontent.com/ali6537502-ship-it/CSS-VISTA/main/public/',
  generatedAt: manifest.generatedAt,
  fileCount: remoteFiles.length,
  totalBytes: remoteFiles.reduce((sum, item) => sum + item.size, 0),
  files: remoteFiles,
}
await writeFile(join(publicDir, 'remote-library-manifest.json'), JSON.stringify(remoteManifest, null, 2) + '\n')
console.log(`Synced ${resources.length} public resources and ${remoteFiles.length} remote PDF records.`)
