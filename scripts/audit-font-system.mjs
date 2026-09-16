import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const primaryStack = '"Google Sans", "Product Sans", "Inter", Arial, sans-serif'
const sourceExtensions = new Set(['.css', '.html', '.js', '.mjs', '.ts', '.tsx'])
const ignoredDirectories = new Set(['.git', 'dist', 'node_modules', 'public', 'src/data'])

async function collectFiles(directory, relative = '') {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const relativePath = path.posix.join(relative, entry.name)
    const normalized = relativePath.replaceAll('\\', '/')
    if (entry.isDirectory()) {
      if ([...ignoredDirectories].some((ignored) => normalized === ignored || normalized.startsWith(`${ignored}/`))) continue
      files.push(...await collectFiles(path.join(directory, entry.name), normalized))
      continue
    }
    if (sourceExtensions.has(path.extname(entry.name))) files.push(normalized)
  }

  return files
}

const [globalCss, indexHtml, tailwindConfig, files] = await Promise.all([
  readFile(path.join(root, 'src/index.css'), 'utf8'),
  readFile(path.join(root, 'index.html'), 'utf8'),
  readFile(path.join(root, 'tailwind.config.js'), 'utf8'),
  collectFiles(root),
])

const failures = []
const requireText = (source, expected, description) => {
  if (!source.includes(expected)) failures.push(`Missing ${description}`)
}

requireText(globalCss, `--font-primary: ${primaryStack};`, 'global Google Sans hierarchy')
requireText(globalCss, `font-family: ${primaryStack} !important;`, 'print Google Sans hierarchy')
requireText(globalCss, 'input::placeholder,', 'placeholder inheritance rule')
requireText(globalCss, '*::before,', 'pseudo-element global font rule')
requireText(indexHtml, 'href="/fonts/inter-latin-variable.woff2"', 'self-hosted Inter fallback preload')
requireText(globalCss, 'url("/fonts/inter-latin-variable.woff2")', 'self-hosted Inter font face')
requireText(globalCss, 'url("/fonts/noto-nastaliq-urdu-arabic-variable.woff2")', 'self-hosted Urdu font face')
requireText(tailwindConfig, 'sans: googleSansStack', 'Tailwind sans mapping')
requireText(tailwindConfig, 'serif: googleSansStack', 'Tailwind serif mapping')
requireText(tailwindConfig, 'mono: googleSansStack', 'Tailwind mono mapping')
requireText(tailwindConfig, 'display: googleSansStack', 'Tailwind display mapping')

for (const relativePath of files) {
  const source = await readFile(path.join(root, relativePath), 'utf8')
  if (relativePath === 'scripts/audit-font-system.mjs' || relativePath === 'tailwind.config.js') continue
  const sourceWithoutFontFaces = source.replace(/@font-face\s*{[\s\S]*?}/gi, '')
  if (/Playfair Display|\bGeorgia\b|font-family:\s*['"]Inter['"]|font-family:\s*[^;]*system-ui/i.test(sourceWithoutFontFaces)) {
    failures.push(`Legacy font declaration remains in ${relativePath}`)
  }
  if (/fontFamily\s*[:=]/.test(source)) failures.push(`Inline or component fontFamily override remains in ${relativePath}`)
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'))
  process.exit(1)
}

console.log(`Font-system audit passed: ${files.length} source files inherit ${primaryStack}.`)
