import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'

/**
 * O GitHub Pages serve arquivos estaticos e nao sabe devolver o index.html
 * para uma rota como /solicitacoes. Duplicar o index como 404.html resolve:
 * o Pages serve esse arquivo quando nao encontra o caminho, o app carrega e
 * o roteador assume dali. Sem isso, abrir ou recarregar uma rota da erro.
 */
function spaFallback() {
  return {
    name: 'spa-fallback-404',
    closeBundle() {
      copyFileSync('dist/index.html', 'dist/404.html')
    },
  }
}

// Em producao o site vive em /trabalho-andre-web/; em desenvolvimento, na raiz.
const base = process.env.VITE_BASE ?? '/'

export default defineConfig({
  base,
  plugins: [react(), spaFallback()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      // Cobrimos dominio e dados. Componente de tela fica de fora por ora.
      include: ['src/domain/**', 'src/data/**'],
      exclude: ['**/__tests__/**', 'src/data/dto/**', 'src/data/professionalDto.ts'],
      reporter: ['text-summary', 'json-summary', 'lcov'],
      reportsDirectory: './coverage',
    },
  },
})
