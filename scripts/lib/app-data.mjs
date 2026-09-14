import { register } from 'node:module'
import { pathToFileURL } from 'node:url'
import { fileURLToPath } from 'node:url'

/**
 * Loads the application's TypeScript data modules inside a build script.
 *
 * Node strips the types itself; the only missing piece is the Vite "@/" path
 * alias, which the registered resolver supplies. Importing the real modules
 * keeps a prerendered page and the running application on one source of data
 * instead of a copy that can quietly go stale.
 */

const root = fileURLToPath(new URL('../..', import.meta.url))

let registered = false
function ensureResolver() {
  if (registered) return
  register('./app-alias-resolver.mjs', import.meta.url, { data: { root } })
  registered = true
}

/**
 * Imports `src/data/<name>.ts`. Returns null rather than throwing when a
 * module is missing or fails to evaluate, so a data problem degrades a single
 * page section instead of failing the whole build.
 */
export async function loadAppData(name) {
  ensureResolver()
  try {
    return await import(pathToFileURL(`${root}src/data/${name}.ts`).href)
  } catch (error) {
    console.warn(`App data module "${name}" could not be loaded: ${error instanceof Error ? error.message.split('\n')[0] : error}`)
    return null
  }
}
