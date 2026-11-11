import { useState, type FormEvent } from 'react'
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

  function messageFor(error: unknown): string {
    if (error instanceof NetworkError) {
      if (error.kind === 'unauthorized' || error.kind === 'notFound') {
        return strings.login.invalidCredentials
      }
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
      session.signIn(result)
      navigate('/oportunidades', { replace: true })
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
