import { readFile, writeFile } from 'node:fs/promises'
import { productionRoutes } from './lib/production-routes.mjs'
const rows = await productionRoutes('dist')
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const rules = []
for (const row of rows) {
  const path = row.path.slice(1)
  if (path) {
    rules.push(`  RewriteRule ^${escape(path)}/+$ https://www.css-vista.com${row.path} [R=301,L,NE]`)
    rules.push(`  RewriteRule ^${escape(path)}$ ${row.file} [END]`)
  }
  rules.push(`  RewriteCond %{THE_REQUEST} "\\s/+${escape(row.file)}(?:[?\\s])" [NC]`)
  rules.push(`  RewriteRule ^${escape(row.file)}$ https://www.css-vista.com${row.path} [R=301,L,NE]`)
}
let htaccess = await readFile('dist/.htaccess', 'utf8')
htaccess = htaccess.replace(/  # CSSV_GENERATED_ROUTE_RULES_START[\s\S]*?  # Keep real files and directories intact\./,
  `  # CSSV_GENERATED_ROUTE_RULES_START\n${rules.join('\n')}\n  # Private story IDs are resolved by the authenticated API, never public search.\n  RewriteRule ^account/current-affairs/[A-Za-z0-9_-]+$ seo/routes/protected.html [END]\n  # CSSV_GENERATED_ROUTE_RULES_END\n\n  # Keep real files and directories intact.`)
await writeFile('dist/.htaccess', htaccess)
const shell = await readFile('dist/seo/routes/protected.html', 'utf8')
await writeFile('dist/seo/routes/protected.html', shell.replace(/\s*<link rel="canonical"[^>]*>/, ''))
console.log(`Hostinger exact-route rules generated for ${rows.length} concrete destinations.`)
