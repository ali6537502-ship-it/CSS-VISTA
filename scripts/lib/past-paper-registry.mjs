import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

function parseGeneratedArray(source, exportName, filePath) {
  const marker = `export const ${exportName}`
  const markerIndex = source.indexOf(marker)
  if (markerIndex < 0) throw new Error(`Missing ${exportName} in ${filePath}`)
  const assignment = source.indexOf('=', markerIndex)
  const arrayStart = source.indexOf('[', assignment)
  const arrayEnd = source.lastIndexOf(']')
  if (arrayStart < 0 || arrayEnd < arrayStart) throw new Error(`Invalid generated array in ${filePath}`)
  return JSON.parse(source.slice(arrayStart, arrayEnd + 1).replace(/,\s*([}\]])/g, '$1'))
}

export async function loadGeneratedPastPapers(root) {
  const sources = [
    ['src/data/pastPapers.generated.ts', 'importedPastPapers'],
    ['src/data/pmsPastPapers.generated.ts', 'importedPmsPastPapers'],
    ['src/data/supplementalPastPapers.generated.ts', 'importedSupplementalPastPapers'],
  ]
  const groups = await Promise.all(sources.map(async ([relativePath, exportName]) => {
    const filePath = join(root, relativePath)
    return parseGeneratedArray(await readFile(filePath, 'utf8'), exportName, filePath)
  }))
  return groups.flat()
}
