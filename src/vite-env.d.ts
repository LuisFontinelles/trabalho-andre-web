/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Raiz da API real. Sem valor, usa o backend publicado no Render. */
  readonly VITE_API_URL?: string
}
