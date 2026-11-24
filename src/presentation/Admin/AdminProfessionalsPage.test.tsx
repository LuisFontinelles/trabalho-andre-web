import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { App } from '@/app/App'
import { createDependencies } from '@/app/dependencies'
import { DependenciesProvider, SessionProvider } from '@/app/session'

const professional = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'mariana@clinica.com',
  tipoPerfil: 'PROFISSIONAL_SAUDE',
  nome: 'Mariana Costa',
  situacaoRegistro: 'EM_VERIFICACAO',
  conselho: 'CRM',
  uf: 'DF',
  numeroRegistro: '123456',
  especialidade: 'cardiologia',
  ondeAtende: 'Instituto Movida',
}

function storeSession(authProfile: 'ADMIN' | 'PROFISSIONAL_SAUDE') {
  sessionStorage.setItem(
    'carebridge.session',
    JSON.stringify({
      session: {
        token: authProfile === 'ADMIN' ? 'jwt-admin' : 'jwt-profissional',
        authProfile,
        isVerified: authProfile === 'PROFISSIONAL_SAUDE',
        user: {
          id: authProfile === 'ADMIN' ? 'admin@exemplo.com' : 'profissional@exemplo.com',
          name: authProfile === 'ADMIN' ? 'Administrador' : 'Profissional',
          email: authProfile === 'ADMIN' ? 'admin@exemplo.com' : 'profissional@exemplo.com',
          profile: authProfile === 'ADMIN' ? 'DESCONHECIDO' : 'PROFISSIONAL',
        },
      },
      profile: { registration: '', isVerified: authProfile === 'PROFISSIONAL_SAUDE' },
    }),
  )
}

function mountAdmin(fetchImpl: typeof fetch) {
  render(
    <DependenciesProvider value={createDependencies(fetchImpl)}>
      <SessionProvider>
        <MemoryRouter initialEntries={['/admin/profissionais']}>
          <App />
        </MemoryRouter>
      </SessionProvider>
    </DependenciesProvider>,
  )
}

describe('AdminProfessionalsPage', () => {
  beforeEach(() => {
    sessionStorage.clear()
    storeSession('ADMIN')
  })

  afterEach(() => {
    cleanup()
    sessionStorage.clear()
  })

  it('lista os profissionais pendentes usando o token administrativo', async () => {
    const fetchImpl: typeof fetch = vi.fn(async () => Response.json([professional]))
    mountAdmin(fetchImpl)

    expect(await screen.findByText('Mariana Costa')).toBeInTheDocument()
    expect(screen.getByText('CRM DF 123456')).toBeInTheDocument()
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://carebridge-api-2.onrender.com/user/profissionais/pendentes',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer jwt-admin' }),
      }),
    )
  })

  it('aprova o cadastro e o remove da fila', async () => {
    const fetchImpl: typeof fetch = vi.fn(async (input) => {
      if (String(input).endsWith('/aprovar')) {
        return Response.json({ ...professional, situacaoRegistro: 'VERIFICADO' })
      }
      return Response.json([professional])
    })
    mountAdmin(fetchImpl)
    const user = userEvent.setup()

    await screen.findByText('Mariana Costa')
    await user.click(screen.getByRole('button', { name: 'Aprovar' }))
    await user.click(screen.getByRole('button', { name: 'Aprovar cadastro' }))

    expect(await screen.findByText('Cadastro de Mariana Costa aprovado.')).toBeInTheDocument()
    expect(screen.getByText('Nenhum cadastro pendente')).toBeInTheDocument()
    expect(fetchImpl).toHaveBeenCalledWith(
      `https://carebridge-api-2.onrender.com/user/profissionais/${professional.id}/aprovar`,
      expect.objectContaining({ method: 'PATCH' }),
    )
  })

  it('recusa o cadastro depois da confirmação', async () => {
    const fetchImpl: typeof fetch = vi.fn(async (input) => {
      if (String(input).endsWith('/recusar')) {
        return Response.json({ ...professional, situacaoRegistro: 'RECUSADO' })
      }
      return Response.json([professional])
    })
    mountAdmin(fetchImpl)
    const user = userEvent.setup()

    await screen.findByText('Mariana Costa')
    await user.click(screen.getByRole('button', { name: 'Recusar' }))
    await user.click(screen.getByRole('button', { name: 'Recusar cadastro' }))

    expect(await screen.findByText('Cadastro de Mariana Costa recusado.')).toBeInTheDocument()
    expect(fetchImpl).toHaveBeenCalledWith(
      `https://carebridge-api-2.onrender.com/user/profissionais/${professional.id}/recusar`,
      expect.objectContaining({ method: 'PATCH' }),
    )
  })

  it('bloqueia a rota para uma sessão profissional', async () => {
    sessionStorage.clear()
    storeSession('PROFISSIONAL_SAUDE')
    const fetchImpl: typeof fetch = vi.fn(async () => Response.json([]))
    mountAdmin(fetchImpl)

    expect(await screen.findByRole('heading', { name: 'Minhas oportunidades' })).toBeInTheDocument()
    expect(screen.queryByText('Cadastros pendentes')).not.toBeInTheDocument()
    expect(fetchImpl).not.toHaveBeenCalledWith(
      expect.stringContaining('/user/profissionais/pendentes'),
      expect.anything(),
    )
  })
})