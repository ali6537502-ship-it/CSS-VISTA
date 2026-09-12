import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
const root = fileURLToPath(new URL('../..', import.meta.url))
export default defineConfig({
  root,
  plugins: [react(), { name: 'isolated-briefing-review', enforce: 'pre', resolveId(id, importer) {
    if (id === './api' && importer?.includes('/src/features/current-affairs/')) return fileURLToPath(new URL('./ui-api.ts', import.meta.url))
  } }],
  resolve: { alias: { '@': root + '/src' } },
  server: { host: '0.0.0.0', port: 4173, strictPort: true, allowedHosts: ['terminal.local'] },
})
