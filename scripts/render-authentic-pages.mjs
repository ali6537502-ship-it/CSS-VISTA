import { createServer } from 'vite'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { CONTENT_RENDERERS } from '../src/data/contentRenderers.mjs'
import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Routes, Route } from 'react-router'

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
try {
  const { AccountContext } = await server.ssrLoadModule('/src/lib/accountContext.ts')
  const account = { configured: true, loading: false, user: null, passwordRecovery: false,
    syncStatus: 'idle', syncError: '', lastSyncedAt: null, syncBackend: null }
  const { noteProducts } = await server.ssrLoadModule('/src/data/notes.ts')
  const { mptQuestionBanks } = await server.ssrLoadModule('/src/data/mptQuestionBanks.ts')
  const extraRoutes = noteProducts.flatMap(product => product.samples.map(doc => ({ path: `/notes/view/${product.id}/${doc.id}`, file: `seo/notes/${product.id}--${doc.id}.html`, title: doc.title, module: 'NoteViewer' })))
  for (const id of Object.keys(mptQuestionBanks)) extraRoutes.push({ path: `/mpt/bank/${id}`, file: `seo/notes/mpt--${id}.html`, title: mptQuestionBanks[id].title, module: 'MPTQuestionBank' })
  await mkdir('dist/seo/notes', { recursive: true })
  await writeFile('dist/functional-routes.json', JSON.stringify(extraRoutes))
  for (const [path, [module, name]] of [...Object.entries(CONTENT_RENDERERS), ...extraRoutes.map(r => [r.path, [r.module, 'default']])]) {
    const Component = (await server.ssrLoadModule(`/src/pages/${module}.tsx`))[name]
    const pattern = module === 'SubjectDetail' ? '/subjects/compulsory/:slug' : module === 'NoteViewer' ? '/notes/view/:productId/:documentId' : module === 'MPTQuestionBank' ? '/mpt/bank/:bankId' : path
    const body = renderToStaticMarkup(React.createElement(MemoryRouter, { initialEntries: [path] },
      React.createElement(AccountContext.Provider, { value: account },
        React.createElement(Routes, null, React.createElement(Route, { path: pattern, element: React.createElement(Component) })))))
    if (!/<h1\b/.test(body)) throw new Error(`Actual component did not render a heading: ${path}`)
    const extra = extraRoutes.find(r => r.path === path)
    const filename = extra?.file || (path === '/' ? 'index.html' : `seo/routes/${path.slice(1).replaceAll('/', '--')}.html`)
    let html = await readFile(extra ? 'dist/seo/routes/protected.html' : join('dist', filename), 'utf8')
    if (extra) html = html.replace(/(<link rel="canonical" href=")[^"]+/, `$1https://www.css-vista.com${path}`)
    const output = html.replace(/<div id="root">[\s\S]*?<\/main><\/div>/, `<div id="root"><main data-cssv-authentic-content="true">${body}</main></div>`)
    if (!output.includes('data-cssv-authentic-content="true"')) throw new Error(`Root replacement failed: ${path}`)
    await writeFile(join('dist', filename), output)
    console.log(`Rendered frontend content: ${path}`)
  }
} finally { await server.close() }
