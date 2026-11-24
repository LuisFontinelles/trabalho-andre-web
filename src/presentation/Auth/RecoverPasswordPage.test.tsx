import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { createDependencies } from '@/app/dependencies'
import { DependenciesProvider } from '@/app/session'
import { createMockFetch, DEBUG_PASSWORD_RESET_CODE } from '@/data/network/mockBackend'
import { RecoverPasswordPage } from '@/presentation/Auth/RecoverPasswordPage'

function mount() {
  render(
    <DependenciesProvider value={createDependencies(createMockFetch({ latency: false }))}>
      <MemoryRouter initialEntries={['/recuperar-senha']}>
        <Routes>
          <Route path="/recuperar-senha" element={<RecoverPasswordPage />} />
          <Route path="/" element={<p>Tela de login</p>} />
        </Routes>
      </MemoryRouter>
    </DependenciesProvider>,
  )
}

describe('RecoverPasswordPage', () => {
  afterEach(cleanup)

  it('solicita o codigo e conclui a redefinicao da senha', async () => {
    const user = userEvent.setup()
    mount()

    await user.type(screen.getByLabelText('E-mail'), 'Profissional@Teste.com')
    await user.click(screen.getByRole('button', { name: 'Enviar código' }))

    expect(await screen.findByText('Digite o código e crie sua nova senha')).toBeInTheDocument()
    expect(await screen.findByText(/Enviamos um código de 6 dígitos/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Nova senha')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Confirmar nova senha')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Redefinir senha' })).not.toBeInTheDocument()
    for (const [index, digit] of [...DEBUG_PASSWORD_RESET_CODE].entries()) {
      await user.type(screen.getByLabelText(String(index + 1)), digit)
    }
    expect(await screen.findByLabelText('Nova senha')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirmar nova senha')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Redefinir senha' })).toBeInTheDocument()
    await user.type(screen.getByLabelText('Nova senha'), 'Nova@2026')
    await user.type(screen.getByLabelText('Confirmar nova senha'), 'Nova@2026')
    await user.click(screen.getByRole('button', { name: 'Redefinir senha' }))

    expect(await screen.findByText('Senha redefinida')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Voltar para o login' }))
    expect(await screen.findByText('Tela de login')).toBeInTheDocument()
  })

  it('mostra erro quando o codigo esta incorreto', async () => {
    const user = userEvent.setup()
    mount()

    await user.type(screen.getByLabelText('E-mail'), 'profissional@teste.com')
    await user.click(screen.getByRole('button', { name: 'Enviar código' }))
    for (const [index, digit] of [...'654321'].entries()) {
      await user.type(screen.getByLabelText(String(index + 1)), digit)
    }
    await user.type(screen.getByLabelText('Nova senha'), 'Nova@2026')
    await user.type(screen.getByLabelText('Confirmar nova senha'), 'Nova@2026')
    await user.click(screen.getByRole('button', { name: 'Redefinir senha' }))

    expect(await screen.findByText('Código inválido ou vencido.')).toBeInTheDocument()
  })
})