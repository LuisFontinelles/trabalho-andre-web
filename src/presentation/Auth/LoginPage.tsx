import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { rememberedRegistration, useDependencies, useSession } from '@/app/session'
import { Banner, Button, PasswordField, TextField } from '@/designSystem/components'
import { NetworkError } from '@/data/network/httpClient'
import { ValidationError } from '@/domain/useCases'
import { AuthCard } from '@/presentation/Auth/AuthCard'
import { strings } from '@/resources/strings'

/** Aviso que outra tela deixa ao voltar para o login (e-mail confirmado, senha trocada). */
export interface LoginHandoff {
  notice: string
  email: string
}

export function LoginPage() {
  const dependencies = useDependencies()
  const session = useSession()
  const navigate = useNavigate()
  const handoff = useLocation().state as LoginHandoff | null

  const [email, setEmail] = useState(handoff?.email ?? '')
  const [password, setPassword] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setSubmitting] = useState(false)

  function messageFor(error: unknown): string {
    if (error instanceof NetworkError) {
      // O contrato v2 responde 401 para senha errada; a API de hoje ainda
      // responde 403 nessa rota publica, que so pode querer dizer o mesmo.
      if (error.kind === 'unauthorized' || error.kind === 'forbidden' || error.kind === 'notFound') {
        return strings.login.invalidCredentials
      }
      if (error.kind === 'tooManyAttempts') return strings.login.tooManyAttempts
      if (error.kind === 'transport' || error.kind === 'offline') return strings.login.connectionFailed
      if (error.kind === 'decoding') return strings.login.sessionStartFailed
      return strings.common.failed
    }
    return strings.login.invalidCredentials
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setEmailError(null)
    setPasswordError(null)
    setFormError(null)
    setSubmitting(true)
    try {
      const result = await dependencies.login(email, password)
      session.signIn(result, {
        // O /user/me traz o registro; o guardado no cadastro cobre a API que ainda nao traz.
        registration: result.registration ?? rememberedRegistration(result.user.email),
        isVerified: result.isVerified,
      })
      if (result.authProfile === 'PROFISSIONAL_SAUDE') {
        navigate('/oportunidades', { replace: true })
      } else if (result.authProfile === 'ADMIN') {
        navigate('/admin/profissionais', { replace: true })
      } else {
        setFormError(strings.login.notProfessional)
      }
    } catch (error) {
      if (error instanceof ValidationError) {
        if (error.code === 'emailRequired' || error.code === 'emailInvalid') {
          setEmailError(error.message)
        } else if (error.code === 'passwordRequired' || error.code === 'passwordWeak') {
          setPasswordError(error.message)
        } else {
          setFormError(error.message)
        }
      } else {
        setFormError(messageFor(error))
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthCard title={strings.login.title} subtitle={strings.login.subtitle}>
      <form className="cb-auth__form" onSubmit={submit} noValidate>
        {handoff?.notice && formError === null && <Banner message={handoff.notice} tone="success" />}
        <TextField
          label={strings.login.emailLabel}
          placeholder={strings.login.emailPlaceholder}
          type="email"
          autoComplete="username"
          value={email}
          onChange={setEmail}
          errorMessage={emailError}
        />
        <PasswordField
          label={strings.login.passwordLabel}
          placeholder={strings.login.passwordPlaceholder}
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
          errorMessage={passwordError}
        />
        {formError && <Banner message={formError} tone="danger" />}
        <Button title={strings.login.submit} type="submit" fillsWidth isLoading={isSubmitting} />
      </form>
      <Button
        title={strings.login.forgotPassword}
        kind="ghost"
        fillsWidth
        onClick={() => navigate('/recuperar-senha')}
      />
      <Button
        title={strings.login.createAccount}
        kind="outline"
        fillsWidth
        onClick={() => navigate('/cadastro')}
      />
    </AuthCard>
  )
}
