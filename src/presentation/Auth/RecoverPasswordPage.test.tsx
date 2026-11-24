import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { createDependencies } from '@/app/dependencies'
import { DependenciesProvider } from '@/app/session'
import { createMockFetch, DEBUG_RESET_CODE } from '@/data/network/mockBackend'
import { RecoverPasswordPage } from '@/presentation/Auth/RecoverPasswordPage'

function mount() {
  render(
    <DependenciesProvider value={createDependencies(createMockFetch({ latency: false }), '')}>
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

  it('mostra as novas senhas somente depois do token completo e conclui a troca', async () => {
    const user = userEvent.setup()
    mount()

    await user.type(screen.getByLabelText('E-mail'), 'profissional@teste.com')
    await user.click(screen.getByRole('button', { name: 'Enviar código' }))

    expect(await screen.findByLabelText('Código de 6 dígitos')).toBeInTheDocument()
    expect(screen.queryByLabelText('Nova senha')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Confirmar nova senha')).not.toBeInTheDocument()

    for (const [index, digit] of [...DEBUG_RESET_CODE].entries()) {
      await user.type(screen.getByLabelText(String(index + 1)), digit)
    }

    await user.type(await screen.findByLabelText('Nova senha'), 'Nova@2026')
    await user.type(screen.getByLabelText('Confirmar nova senha'), 'Nova@2026')
    await user.click(screen.getByRole('button', { name: 'Salvar nova senha' }))

    expect(await screen.findByText('Tela de login')).toBeInTheDocument()
  })
})