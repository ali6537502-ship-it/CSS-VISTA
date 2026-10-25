import {readFile,writeFile} from 'node:fs/promises'
import {resolve,join} from 'node:path'
const dist=resolve(import.meta.dirname,'../../dist')
const library=await readFile(join(dist,'seo/routes/current-affairs-daily.html'),'utf8')
// Dynamic admin editions cannot require a rebuild. Use a noindex reader shell;
// the same-origin API resolves actual availability, and React sets its canonical.
const shell=library.replace(/<link\s+rel="canonical"[^>]*>/g,'').replace(/<meta\s+property="og:url"[^>]*>/g,'').replace(/<script[^>]*type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/g,'').replace(/<title>[^<]*<\/title>/,'<title>Current Affairs Daily Edition | CSS VISTA</title>')
await writeFile(join(dist,'seo/routes/current-affairs-daily-reader.html'),shell)
const path=join(dist,'.htaccess'),text=await readFile(path,'utf8')
const marker='  # Keep real files and directories intact.'
if(!text.includes(marker))throw Error('Hostinger route insertion point missing')
const rule='  RewriteRule ^current-affairs-daily/[0-9]{4}-[0-9]{2}-[0-9]{2}/?$ seo/routes/current-affairs-daily-reader.html [L,NC]\n\n'
await writeFile(path,text.includes(rule)?text:text.replace(marker,rule+marker))
