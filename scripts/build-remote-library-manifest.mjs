import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const sourcePublic = path.resolve(process.argv[2] || 'public')
const output = path.resolve(process.argv[3] || 'public/remote-library-manifest.json')
const roots = ['past-papers', 'samples']

function collect(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name)
    return entry.isDirectory() ? collect(file) : [file]
  })
}

const files = roots.flatMap((root) => collect(path.join(sourcePublic, root))).map((file) => {
  const bytes = readFileSync(file)
  return {
    path: `/${path.relative(sourcePublic, file).split(path.sep).join('/')}`,
    size: statSync(file).size,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  }
}).sort((left, right) => left.path.localeCompare(right.path))

writeFileSync(output, `${JSON.stringify({
  repository: 'ali6537502-ship-it/CSS-VISTA',
  branch: 'main',
  publicBase: 'https://raw.githubusercontent.com/ali6537502-ship-it/CSS-VISTA/main/public/',
  generatedAt: new Date().toISOString(),
  fileCount: files.length,
  totalBytes: files.reduce((sum, file) => sum + file.size, 0),
  files,
}, null, 2)}\n`)

console.log(`Remote library manifest written: ${files.length} files.`)
