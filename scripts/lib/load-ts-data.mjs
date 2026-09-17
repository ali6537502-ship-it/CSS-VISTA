/**
 * Loads a dependency-free TypeScript data module from Node.
 *
 * Build-time audits need the same data the application uses. Reading it with a
 * regex would drift silently, so the module is transpiled with esbuild (already
 * a Vite dependency) and imported for real. Only pure data modules — no imports,
 * no JSX, no browser APIs — are meant to go through this.
 */
import { build } from 'esbuild'
import { pathToFileURL } from 'node:url'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export async function loadTsData(absolutePath) {
  const dir = await mkdtemp(join(tmpdir(), 'cssv-ts-data-'))
  try {
    const result = await build({
      entryPoints: [absolutePath],
      bundle: false,
      write: false,
      format: 'esm',
      platform: 'node',
      loader: { '.ts': 'ts' },
    })
    const output = join(dir, 'module.mjs')
    await writeFile(output, result.outputFiles[0].text)
    return await import(pathToFileURL(output).href)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}
