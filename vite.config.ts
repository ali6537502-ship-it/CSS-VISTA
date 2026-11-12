import path from "path"
import { readFileSync, readdirSync } from 'node:fs'
import react from "@vitejs/plugin-react"
import { defineConfig, type Plugin } from "vite"

function stripEmDash(): Plugin {
  return {
    name: 'strip-em-dash',
    enforce: 'post',
    generateBundle(_options, bundle) {
      for (const output of Object.values(bundle)) {
        if (output.type === 'chunk') {
          output.code = output.code.replaceAll('\u2014', '-')
        } else if (typeof output.source === 'string') {
          output.source = output.source.replaceAll('\u2014', '-')
        }
      }
    },
  }
}

// Editorial access is a development-only capability. No draft unit is copied
// into public/ or the production build by this middleware.
function gsaEditorial(): Plugin {
  return {
    name: 'gsa-editorial-preview',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/__gsa-editorial__/')) return next()
        res.setHeader('Cache-Control', 'no-store')
        const host = (req.headers.host || '').split(':')[0]
        const peer = req.socket.remoteAddress || ''
        if (process.env.CSSV_GSA_EDITORIAL !== 'true' || !['localhost', '127.0.0.1'].includes(host) || !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(peer)) {
          res.statusCode = 404; res.end('Editorial preview is unavailable.'); return
        }
        if (req.method !== 'GET') { res.statusCode = 405; res.end(); return }
        const match = req.url.match(/^\/__gsa-editorial__\/(index|c\d+-s\d+-\d+)\.json$/)
        if (!match) { res.statusCode = 404; res.end(); return }
        try {
          const folder = path.resolve(__dirname, 'content/gsa-tutor/draft-units')
          const data = match[1] === 'index'
            ? readdirSync(folder).filter(name => /^c\d+-s\d+-\d+\.json$/.test(name)).map(name => {
              const unit = JSON.parse(readFileSync(path.join(folder, name), 'utf8'))
              return { lessonId: unit.lessonId, title: unit.title, status: unit.status }
            })
            : JSON.parse(readFileSync(path.join(folder, match[1] + '.json'), 'utf8'))
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify(data))
        } catch { res.statusCode = 404; res.end() }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react(), stripEmDash(), gsaEditorial()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: ['terminal.local'],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: process.env.CSSV_BUILD_TARGET === 'sites' ? 'dist/client' : 'dist',
    copyPublicDir: false,
    rollupOptions: {
      output: {
        // Hostinger serves raw .mjs assets as text/plain. Emit module assets as
        // .js so browsers accept PDF workers and cached broken URLs are replaced.
        assetFileNames: asset => asset.names.some(name => name.endsWith('.mjs'))
          ? 'assets/[name]-[hash].js'
          : 'assets/[name]-[hash][extname]',
      },
    },
  },
});
