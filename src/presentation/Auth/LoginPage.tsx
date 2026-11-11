import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDependencies, useSession } from '@/app/session'
import { Banner, Button, TextField } from '@/designSystem/components'
import { NetworkError } from '@/data/network/httpClient'
import { ValidationError } from '@/domain/useCases'
import { AuthCard } from '@/presentation/Auth/AuthCard'
import { strings } from '@/resources/strings'

export function LoginPage() {
  const dependencies = useDependencies()
  const session = useSession()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setSubmitting] = useState(false)
  const submittingLock = useRef(false)

  useEffect(() => {
    if (session.sessionExpired) setFormError(strings.login.sessionExpired)
    else if (session.isAuthenticated && !session.canAccessOpportunities) {
      setFormError(strings.login.professionalOnly)
    }
  }, [
    session.canAccessOpportunities,
    session.isAuthenticated,
    session.sessionExpired,
  ])

  function messageFor(error: unknown): string {
    if (error instanceof NetworkError) {
      if (error.kind === 'unauthorized') return strings.login.invalidCredentials
      if (error.kind === 'transport' || error.kind === 'offline') {
        return strings.login.connectionFailed
      }
    }
    return strings.login.sessionStartFailed
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (submittingLock.current) return
    submittingLock.current = true
    setEmailError(null)
    setPasswordError(null)
    setFormError(null)
    setSubmitting(true)
    session.signOut()
    try {
      const result = await dependencies.login(email, password)
      const { status, data } = result
      const token = data.token
      const tipoPerfil = data.tipoPerfil

      const possuiToken = typeof token === 'string' && token.trim().length > 0
      const ehProfissionalSaude = tipoPerfil === 'PROFISSIONAL_SAUDE'

      if (
        status === 200 &&
        data.autenticado === true &&
        possuiToken &&
        ehProfissionalSaude
      ) {
        session.signIn({
          token,
          tipoPerfil: 'PROFISSIONAL_SAUDE',
          validadoInstitucionalmente: data.validadoInstitucionalmente === true,
          user: {
            id: email.trim().toLowerCase(),
            name: email.trim(),
            email: email.trim().toLowerCase(),
            profile: 'PROFISSIONAL',
            city: null,
          },
        })
        navigate('/oportunidades', { replace: true })
      } else if (status === 200 && data.autenticado === true && possuiToken) {
        const perfil =
          tipoPerfil === 'PACIENTE' || tipoPerfil === 'ADMIN'
            ? tipoPerfil
            : 'DESCONHECIDO'
        session.signIn({
          token,
          tipoPerfil: perfil,
          validadoInstitucionalmente: data.validadoInstitucionalmente === true,
          user: {
            id: email.trim().toLowerCase(),
            name: email.trim(),
            email: email.trim().toLowerCase(),
            profile: perfil === 'PACIENTE' ? 'PACIENTE' : 'DESCONHECIDO',
            city: null,
          },
        })
        setFormError(strings.login.professionalOnly)
      } else {
        setFormError(strings.login.sessionStartFailed)
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
      submittingLock.current = false
    }
  }

  return (
    <AuthCard title={strings.login.title} subtitle={strings.login.subtitle}>
      <form className="cb-auth__form" onSubmit={submit} noValidate>
        <TextField
          label={strings.login.emailLabel}
          placeholder={strings.login.emailPlaceholder}
          type="email"
          autoComplete="username"
          value={email}
          onChange={setEmail}
          errorMessage={emailError}
        />
        <TextField
          label={strings.login.passwordLabel}
          placeholder={strings.login.passwordPlaceholder}
          type="password"
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
