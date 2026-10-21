import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from '@/app/App'
import { DependenciesProvider, SessionProvider } from '@/app/session'
import '@/designSystem/tokens/tokens.css'

const container = document.getElementById('root')
if (container === null) throw new Error('Elemento #root nao encontrado')

createRoot(container).render(
  <StrictMode>
    <DependenciesProvider>
      <SessionProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </SessionProvider>
    </DependenciesProvider>
  </StrictMode>,
)
