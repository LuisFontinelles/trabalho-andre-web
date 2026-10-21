import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDependencies, useSession } from '@/app/session'
import { Banner, BrandMark, Button, LinkButton, TextField } from '@/designSystem/components'
import { CbIcon } from '@/designSystem/tokens/icons'
import { NetworkError } from '@/data/network/httpClient'
import { ValidationError } from '@/domain/useCases'
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
      if (error.kind === 'offline') return strings.opportunities.errorMessage
      return strings.opportunities.errorTitle
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
      navigate('/painel', { replace: true })
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
    <main className="cb-auth">
      <div className="cb-auth__panel">
        <div className="cb-auth__header">
          <BrandMark />
          <h1 className="cb-auth__title">{strings.login.title}</h1>
          <p className="cb-auth__subtitle">{strings.login.subtitle}</p>
        </div>

        <form className="cb-auth__form" onSubmit={submit} noValidate>
          <TextField
            label={strings.login.emailLabel}
            placeholder={strings.login.emailPlaceholder}
            value={email}
            onChange={(value) => {
              setEmail(value)
              setEmailError(null)
            }}
            type="email"
            autoComplete="email"
            errorMessage={emailError}
          />
          <TextField
            label={strings.login.passwordLabel}
            placeholder={strings.login.passwordPlaceholder}
            value={password}
            onChange={(value) => {
              setPassword(value)
              setPasswordError(null)
            }}
            type="password"
            autoComplete="current-password"
            errorMessage={passwordError}
          />

          <div className="cb-auth__row">
            <LinkButton title={strings.login.forgotPassword} isEnabled={false} />
          </div>

          {formError && <Banner message={formError} />}

          <div className="cb-auth__separator">{strings.login.separator}</div>

          <Button
            title={strings.login.google}
            kind="tertiary"
            icon={<CbIcon.patient size={18} />}
            isEnabled={!isSubmitting}
            onClick={() => {
              void (async () => {
                setSubmitting(true)
                try {
                  session.signIn(await dependencies.authRepository.loginWithGoogle())
                  navigate('/painel', { replace: true })
                } catch (error) {
                  setFormError(messageFor(error))
                } finally {
                  setSubmitting(false)
                }
              })()
            }}
          />

          <Button title={strings.login.submit} type="submit" isLoading={isSubmitting} />
        </form>

        <p className="cb-auth__footer">
          {strings.login.noAccountPrefix}
          <LinkButton title={strings.login.noAccountAction} onClick={() => navigate('/cadastro')} />
        </p>
      </div>
    </main>
  )
}
