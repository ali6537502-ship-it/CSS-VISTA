/**
 * A resolver for the generated Hostinger `.htaccess`.
 *
 * It lets the build answer the only question that matters for a static SPA
 * deployment: *what does Apache actually serve when this URL is typed into the
 * address bar or refreshed?* Without it, a route can pass every source-level
 * check and still 404 in production.
 *
 * It models the subset of mod_rewrite the site uses: RewriteBase /, RewriteRule
 * with [L], [R=301], [R=404], [F], and the `-f`/`-d` RewriteCond pair.
 */
import { existsSync, statSync } from 'node:fs'
import { join } from 'node:path'

const RULE = /^\s*RewriteRule\s+(\S+)\s+(\S+)(?:\s+\[([^\]]*)\])?\s*$/
const COND = /^\s*RewriteCond\s+(\S+)\s+(\S+)(?:\s+\[([^\]]*)\])?\s*$/

export function parseHtaccess(text) {
  const rules = []
  let pending = []
  for (const line of text.split('\n')) {
    if (/^\s*#/.test(line) || !line.trim()) continue
    const cond = COND.exec(line)
    if (cond) {
      pending.push({ test: cond[1], pattern: cond[2], flags: (cond[3] || '').split(',').filter(Boolean) })
      continue
    }
    const rule = RULE.exec(line)
    if (rule) {
      rules.push({
        pattern: rule[1],
        substitution: rule[2],
        flags: (rule[3] || '').split(',').map((flag) => flag.trim()).filter(Boolean),
        conditions: pending,
      })
      pending = []
      continue
    }
    pending = []
  }
  return rules
}

function flagValue(flags, name) {
  const found = flags.find((flag) => flag === name || flag.startsWith(`${name}=`))
  if (!found) return null
  return found.includes('=') ? found.slice(found.indexOf('=') + 1) : ''
}

function conditionsPass(conditions, docRoot, path) {
  if (!conditions.length) return true
  // Conditions chain with AND unless the preceding one carries [OR].
  let result = null
  for (let index = 0; index < conditions.length; index += 1) {
    const condition = conditions[index]
    let value = false
    if (condition.test === '%{REQUEST_FILENAME}') {
      const target = join(docRoot, path)
      const exists = existsSync(target)
      if (condition.pattern === '-f') value = exists && statSync(target).isFile()
      else if (condition.pattern === '-d') value = exists && statSync(target).isDirectory()
      else if (condition.pattern === '!-f') value = !(exists && statSync(target).isFile())
      else if (condition.pattern === '!-d') value = !(exists && statSync(target).isDirectory())
    } else if (condition.test === '%{HTTPS}' || condition.test === '%{HTTP_HOST}') {
      // The audit always resolves canonical https://www requests, which these
      // host-normalisation conditions are written to let through.
      value = false
    } else {
      // Silently treating an unknown variable as false would let a rule guarded
      // by it be skipped, and the gate would report a pass for a URL it never
      // actually resolved. Fail loudly so the resolver is extended instead.
      throw new Error(
        `htaccess-resolver does not understand RewriteCond ${condition.test} ${condition.pattern}. `
        + 'Add support for it rather than letting the route audit silently skip the rule.',
      )
    }
    const isOr = conditions[index - 1]?.flags.includes('OR')
    result = result === null ? value : (isOr ? result || value : result && value)
  }
  return Boolean(result)
}

/**
 * Resolve a request path the way Apache would.
 *
 * Returns { status, file, redirect } where `status` is the HTTP status the
 * visitor receives and `file` is the document-root-relative file served.
 */
export function resolveRequest(rules, docRoot, requestPath, depth = 0) {
  if (depth > 10) return { status: 508, file: null, redirect: null, note: 'Rewrite loop' }

  let path = requestPath.replace(/^\/+/, '').split(/[?#]/)[0]

  for (const rule of rules) {
    let regex
    try {
      regex = new RegExp(rule.pattern, rule.flags.includes('NC') ? 'i' : '')
    } catch {
      continue
    }
    const match = regex.exec(path)
    if (!match) continue
    if (!conditionsPass(rule.conditions, docRoot, path)) continue

    if (rule.flags.includes('F')) return { status: 403, file: null, redirect: null }

    const redirect = flagValue(rule.flags, 'R')
    if (redirect !== null && redirect !== '') {
      const status = Number(redirect)
      if (status === 404) return { status: 404, file: '404.html', redirect: null }
      const target = rule.substitution === '-' ? `/${path}` : expand(rule.substitution, match)
      return { status, file: null, redirect: target }
    }

    if (rule.substitution === '-') {
      if (rule.flags.includes('L')) break
      continue
    }

    path = expand(rule.substitution, match).replace(/^\/+/, '')
    if (rule.flags.includes('L')) break
  }

  const target = join(docRoot, path)
  if (existsSync(target) && statSync(target).isFile()) return { status: 200, file: path, redirect: null }
  if (existsSync(target) && statSync(target).isDirectory() && existsSync(join(target, 'index.html'))) {
    return { status: 200, file: join(path, 'index.html'), redirect: null }
  }
  return { status: 404, file: '404.html', redirect: null }
}

function expand(substitution, match) {
  return substitution.replace(/\$(\d)/g, (_, index) => match[Number(index)] ?? '')
}
