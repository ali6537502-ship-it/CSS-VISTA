import { pathToFileURL } from 'node:url'
import { join, extname } from 'node:path'
import { existsSync } from 'node:fs'

/**
 * Build scripts read the application's own data modules so a prerendered page
 * and the running application are built from the same source. Those modules
 * import each other through the Vite "@/" alias, which Node does not know
 * about, so this resolver maps "@/x" onto "<root>/src/x" for the build only.
 *
 * Registered with module.register() from scripts/lib/app-data.mjs.
 */
export async function initialize(data) {
  resolverRoot = data?.root || process.cwd()
}

let resolverRoot = process.cwd()

/* The application relies on the bundler to add a file extension and to pick an
   index file for a directory. Node resolves neither, so both are probed here
   in the order Vite itself uses. */
const EXTENSIONS = ['.ts', '.tsx', '.mts', '.mjs', '.js', '.json']

function resolveAppPath(base) {
  if (extname(base) && existsSync(base)) return base
  for (const extension of EXTENSIONS) {
    const candidate = `${base}${extension}`
    if (existsSync(candidate)) return candidate
  }
  for (const extension of EXTENSIONS) {
    const candidate = join(base, `index${extension}`)
    if (existsSync(candidate)) return candidate
  }
  return base
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    const target = resolveAppPath(join(resolverRoot, 'src', specifier.slice(2)))
    return nextResolve(pathToFileURL(target).href, context)
  }
  return nextResolve(specifier, context)
}
