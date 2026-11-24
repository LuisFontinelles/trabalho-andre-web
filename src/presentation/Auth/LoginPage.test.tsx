import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { DependenciesProvider, SessionProvider } from '@/app/session'
import { createDependencies } from '@/app/dependencies'
import { App } from '@/app/App'
import { LoginPage } from '@/presentation/Auth/LoginPage'

function mountLogin(
  response: Record<string, unknown>,
  status = 200,
) {
  const fetchImpl: typeof fetch = vi.fn(async () =>
    new Response(JSON.stringify(response), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
  render(
    <DependenciesProvider value={createDependencies(fetchImpl)}>
      <SessionProvider>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route path="/oportunidades" element={<p>Área profissional</p>} />
          </Routes>
        </MemoryRouter>
      </SessionProvider>
    </DependenciesProvider>,
  )
  return fetchImpl
}

async function submitLogin() {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('E-mail'), 'ana@exemplo.com')
  await user.type(screen.getByLabelText('Senha'), 'SenhaSegura123!')
  await user.click(screen.getByRole('button', { name: 'Entrar' }))
}

describe('LoginPage', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  afterEach(() => {
    cleanup()
    sessionStorage.clear()
  })

  it('redireciona e salva sessão de profissional mesmo sem validação institucional', async () => {
    const fetchImpl = mountLogin({
      token: 'jwt-profissional',
      autenticado: true,
      tipoPerfil: 'PROFISSIONAL_SAUDE',
      validadoInstitucionalmente: false,
    })

    await submitLogin()

    expect(await screen.findByText('Área profissional')).toBeInTheDocument()
    expect(fetchImpl).toHaveBeenCalledWith(
      '/api/user/login',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          email: 'ana@exemplo.com',
          password: 'SenhaSegura123!',
        }),
      }),
    )
    expect(sessionStorage.getItem('token')).toBe('jwt-profissional')
    expect(sessionStorage.getItem('tipoPerfil')).toBe('PROFISSIONAL_SAUDE')
    expect(sessionStorage.getItem('validadoInstitucionalmente')).toBe('false')
    expect(sessionStorage.getItem('carebridge.session')).not.toContain('SenhaSegura123!')
  })

  it('não direciona pacientes para oportunidades e mostra acesso restrito', async () => {
    mountLogin({
      token: 'jwt-paciente',
      autenticado: true,
      tipoPerfil: 'PACIENTE',
      validadoInstitucionalmente: false,
    })

    await submitLogin()

    expect(
      await screen.findByText('Esta conta não é de profissional de saúde. Use o app CareBridge para pacientes.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Área profissional')).not.toBeInTheDocument()
    expect(sessionStorage.getItem('tipoPerfil')).toBe('PACIENTE')
  })

  it('exige o valor exato PROFISSIONAL_SAUDE para direcionar ao painel', async () => {
    mountLogin({
      token: 'jwt-perfil-legado',
      autenticado: true,
      tipoPerfil: 'PROFISSIONAL',
      validadoInstitucionalmente: true,
    })

    await submitLogin()

    expect(
      await screen.findByText('Esta conta não é de profissional de saúde. Use o app CareBridge para pacientes.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Área profissional')).not.toBeInTheDocument()
    expect(sessionStorage.getItem('tipoPerfil')).toBe('DESCONHECIDO')
  })

  it('não cria sessão nem redireciona se a resposta não tiver token', async () => {
    mountLogin({
      autenticado: true,
      tipoPerfil: 'PROFISSIONAL_SAUDE',
      validadoInstitucionalmente: true,
    })

    await submitLogin()

    expect(
      await screen.findByText('Não foi possível iniciar a sessão. Tente novamente.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Área profissional')).not.toBeInTheDocument()
    expect(sessionStorage.getItem('token')).toBeNull()
  })

  it.each([
    [
      'status diferente de 200',
      201,
      {
        token: 'jwt-profissional',
        autenticado: true,
        tipoPerfil: 'PROFISSIONAL_SAUDE',
        validadoInstitucionalmente: true,
      },
    ],
    [
      'autenticado falso',
      200,
      {
        token: 'jwt-profissional',
        autenticado: false,
        tipoPerfil: 'PROFISSIONAL_SAUDE',
        validadoInstitucionalmente: true,
      },
    ],
  ])('não inicia sessão com %s', async (_label, status, response) => {
    mountLogin(response, status)
    await submitLogin()

    expect(
      await screen.findByText('Não foi possível iniciar a sessão. Tente novamente.'),
    ).toBeInTheDocument()
    expect(sessionStorage.getItem('token')).toBeNull()
    expect(screen.queryByText('Área profissional')).not.toBeInTheDocument()
  })

  it('bloqueia acesso direto a oportunidades para sessão de paciente', async () => {
    sessionStorage.setItem(
      'carebridge.session',
      JSON.stringify({
        session: {
          token: 'jwt-paciente',
          tipoPerfil: 'PACIENTE',
          validadoInstitucionalmente: false,
          user: {
            id: 'ana@exemplo.com',
            name: 'Ana',
            email: 'ana@exemplo.com',
            profile: 'PACIENTE',
            city: null,
          },
        },
        profile: { registration: '', isVerified: false },
      }),
    )
    render(
      <DependenciesProvider value={createDependencies(async () => Response.json({}))}>
        <SessionProvider>
          <MemoryRouter initialEntries={['/oportunidades']}>
            <App />
          </MemoryRouter>
        </SessionProvider>
      </DependenciesProvider>,
    )

    expect(await screen.findByRole('textbox', { name: 'E-mail' })).toBeInTheDocument()
    expect(screen.queryByText('Minhas oportunidades')).not.toBeInTheDocument()
  })
})
