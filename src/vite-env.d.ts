/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Raiz da API real. Vazio usa o backend de fixtures. */
  readonly VITE_API_URL?: string
}
