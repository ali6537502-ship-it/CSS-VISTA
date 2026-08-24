import path from "path"
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

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react(), stripEmDash()],
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
  },
});
