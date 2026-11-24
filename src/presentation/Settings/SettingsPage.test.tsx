import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { createDependencies } from '@/app/dependencies'
import { DependenciesProvider, SessionProvider } from '@/app/session'
import { createMockFetch } from '@/data/network/mockBackend'
import { SettingsPage } from '@/presentation/Settings/SettingsPage'

function storeProfessionalSession() {
  sessionStorage.setItem('token', 'jwt-profissional')
  sessionStorage.setItem(
    'carebridge.session',
    JSON.stringify({
      session: {
        token: 'jwt-profissional',
        tipoPerfil: 'PROFISSIONAL_SAUDE',
        validadoInstitucionalmente: true,
        user: {
          id: 'profissional@teste.com',
          name: 'Marcos Vieira',
          email: 'profissional@teste.com',
          profile: 'PROFISSIONAL',
          city: 'Brasília',
        },
      },
      profile: { registration: 'CRM/DF 123456', isVerified: true },
    }),
  )
}

function mount() {
  render(
    <DependenciesProvider value={createDependencies(createMockFetch({ latency: false }))}>
      <SessionProvider>
        <MemoryRouter initialEntries={['/configuracoes']}>
          <Routes>
            <Route path="/configuracoes" element={<SettingsPage />} />
            <Route path="/" element={<p>Tela de login</p>} />
          </Routes>
        </MemoryRouter>
      </SessionProvider>
    </DependenciesProvider>,
  )
}

describe('SettingsPage', () => {
  beforeEach(() => {
    sessionStorage.clear()
    localStorage.clear()
    storeProfessionalSession()
  })

  afterEach(() => {
    cleanup()
    sessionStorage.clear()
    localStorage.clear()
  })

  it('exclui a conta e encerra a sessao', async () => {
    const user = userEvent.setup()
    mount()

    await user.click(screen.getByRole('button', { name: 'Excluir conta' }))
    await user.type(screen.getByLabelText('Senha atual'), 'Profissa@2026')
    await user.click(screen.getByRole('button', { name: 'Excluir minha conta' }))

    expect(await screen.findByText('Tela de login')).toBeInTheDocument()
    expect(sessionStorage.getItem('token')).toBeNull()
  })

  it('mantem a sessao e mostra a mensagem quando a senha esta errada', async () => {
    const user = userEvent.setup()
    mount()

    await user.click(screen.getByRole('button', { name: 'Excluir conta' }))
    await user.type(screen.getByLabelText('Senha atual'), 'senha-errada')
    await user.click(screen.getByRole('button', { name: 'Excluir minha conta' }))

    expect(await screen.findByText('Senha atual incorreta.')).toBeInTheDocument()
    expect(sessionStorage.getItem('token')).toBe('jwt-profissional')
  })
})