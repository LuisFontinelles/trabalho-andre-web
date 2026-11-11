/**
 * Tema da interface: Sistema, Claro ou Escuro, como na tela de Configuracoes.
 * "Sistema" nao grava atributo e deixa o prefers-color-scheme decidir; os
 * outros dois forcam o data-theme que o tokens.css le.
 */
export type ThemeChoice = 'system' | 'light' | 'dark'

const THEME_KEY = 'carebridge.theme'

export function readTheme(): ThemeChoice {
  try {
    const raw = localStorage.getItem(THEME_KEY)
    return raw === 'light' || raw === 'dark' ? raw : 'system'
  } catch {
    return 'system'
  }
}

export function applyTheme(choice: ThemeChoice): void {
  const root = document.documentElement
  if (choice === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', choice)
}

export function saveTheme(choice: ThemeChoice): void {
  applyTheme(choice)
  try {
    if (choice === 'system') localStorage.removeItem(THEME_KEY)
    else localStorage.setItem(THEME_KEY, choice)
  } catch {
    // Sem armazenamento o tema vale so ate recarregar a pagina.
  }
}
