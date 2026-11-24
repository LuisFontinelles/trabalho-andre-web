import { cleanup, render, screen, waitFor } from '@testing-library/react'
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
  const fetchImpl: typeof fetch = vi.fn(async (input) => {
    const url = String(input)
    const body = url.endsWith('/user/me')
      ? {
          id: 'prof-1',
          email: 'ana@exemplo.com',
          tipoPerfil: 'PROFISSIONAL_SAUDE',
          nome: 'Ana Profissional',
          situacaoRegistro:
            response.validadoInstitucionalmente === true ? 'VERIFICADO' : 'EM_VERIFICACAO',
          conselho: 'CRM',
          uf: 'DF',
          numeroRegistro: '123456',
          especialidade: 'cardiologia',
          ondeAtende: 'Instituto Movida',
        }
      : response
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  })
  render(
    <DependenciesProvider value={createDependencies(fetchImpl)}>
      <SessionProvider>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route path="/oportunidades" element={<p>Área profissional</p>} />
            <Route path="/admin/profissionais" element={<p>Área administrativa</p>} />
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
      'https://carebridge-api-2.onrender.com/auth/login',
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
      await screen.findByText('Esta área está disponível somente para profissionais de saúde.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Área profissional')).not.toBeInTheDocument()
    expect(sessionStorage.getItem('tipoPerfil')).toBe('PACIENTE')
  })

  it('direciona administrador para a fila de cadastros', async () => {
    mountLogin({
      token: 'jwt-admin',
      autenticado: true,
      tipoPerfil: 'ADMIN',
      validadoInstitucionalmente: false,
    })

    await submitLogin()

    expect(await screen.findByText('Área administrativa')).toBeInTheDocument()
    expect(sessionStorage.getItem('tipoPerfil')).toBe('ADMIN')
    expect(screen.queryByText('Esta área está disponível somente para profissionais de saúde.')).not.toBeInTheDocument()
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
      await screen.findByText('Esta área está disponível somente para profissionais de saúde.'),
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

  it('atualiza uma sessão antiga quando o backend informa que o profissional foi verificado', async () => {
    sessionStorage.setItem(
      'carebridge.session',
      JSON.stringify({
        session: {
          token: 'jwt-profissional',
          tipoPerfil: 'PROFISSIONAL_SAUDE',
          validadoInstitucionalmente: false,
          user: {
            id: 'a8244d6f-e2c6-4409-9a37-75f8f9cf903a',
            name: 'Drauzio',
            email: 'cursodopiru@gmail.com',
            profile: 'PROFISSIONAL',
            city: null,
          },
        },
        profile: { registration: 'CRM DF 123456', isVerified: false },
      }),
    )
    const fetchImpl: typeof fetch = vi.fn(async (input) => {
      const url = String(input)
      if (url.endsWith('/user/me')) {
        return Response.json({
          id: 'a8244d6f-e2c6-4409-9a37-75f8f9cf903a',
          email: 'cursodopiru@gmail.com',
          tipoPerfil: 'PROFISSIONAL_SAUDE',
          nome: 'Drauzio',
          situacaoRegistro: 'VERIFICADO',
          conselho: 'CRM',
          uf: 'DF',
          numeroRegistro: '123456',
          especialidade: 'cardiologia',
          ondeAtende: 'Abbba Ulai',
        })
      }
      return Response.json([])
    })

    render(
      <DependenciesProvider value={createDependencies(fetchImpl)}>
        <SessionProvider>
          <MemoryRouter initialEntries={['/oportunidades']}>
            <App />
          </MemoryRouter>
        </SessionProvider>
      </DependenciesProvider>,
    )

    await waitFor(() => {
      const stored = JSON.parse(sessionStorage.getItem('carebridge.session') ?? '{}') as {
        profile?: { isVerified?: boolean }
      }
      expect(stored.profile?.isVerified).toBe(true)
    })
    expect(
      screen.queryByText(/Seu cadastro está em verificação/),
    ).not.toBeInTheDocument()
  })
})
