import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDependencies } from '@/app/session'
import { Banner, Button, CodeField, PasswordField, TextField } from '@/designSystem/components'
import { NetworkError } from '@/data/network/httpClient'
import { RESET_CODE_LENGTH, ValidationError } from '@/domain/useCases'
import { AuthCard } from '@/presentation/Auth/AuthCard'
import type { LoginHandoff } from '@/presentation/Auth/LoginPage'
import { ruleList } from '@/presentation/Auth/passwordRules'
import { useCountdown } from '@/presentation/Auth/useCountdown'
import { strings } from '@/resources/strings'

const RESEND_SECONDS = 60

function NewPasswordForm({ email, onResend }: { email: string; onResend: () => Promise<void> }) {
  const dependencies = useDependencies()
  const navigate = useNavigate()
  const [secondsLeft, restartCountdown] = useCountdown(RESEND_SECONDS)
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [isBusy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setPasswordError(null)
    setError(null)
    setNotice(null)
    setBusy(true)
    try {
      await dependencies.resetPassword(email, code, password)
      const handoff: LoginHandoff = { notice: strings.recover.done, email }
      navigate('/', { replace: true, state: handoff })
    } catch (caught) {
      if (caught instanceof ValidationError && caught.code !== 'codeIncomplete') {
        setPasswordError(caught.message)
      } else if (caught instanceof ValidationError) {
        setError(caught.message)
      } else if (caught instanceof NetworkError && caught.kind === 'badRequest') {
        setError(caught.apiMessage ?? strings.recover.invalidCode)
      } else if (caught instanceof NetworkError && caught.apiMessage) {
        setError(caught.apiMessage)
      } else {
        setError(strings.common.failed)
      }
    } finally {
      setBusy(false)
    }
  }

  async function resend() {
    setError(null)
    setBusy(true)
    try {
      await onResend()
      setCode('')
      setNotice(strings.verification.resent)
      restartCountdown()
    } catch (caught) {
      setError(caught instanceof NetworkError && caught.apiMessage ? caught.apiMessage : strings.common.failed)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthCard
      icon="mark_email_read"
      title={strings.recover.sentTitle}
      subtitle={strings.recover.sentMessage(email)}
    >
      <form className="cb-auth__form" onSubmit={submit} noValidate>
        <CodeField
          length={RESET_CODE_LENGTH}
          value={code}
          onChange={setCode}
          label={strings.recover.codeLabel}
        />
        <PasswordField
          label={strings.recover.passwordLabel}
          placeholder={strings.recover.passwordPlaceholder}
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
          errorMessage={passwordError}
          rules={ruleList(password)}
        />
        {error && <Banner message={error} tone="danger" />}
        {notice && <Banner message={notice} tone="success" />}
        <Button
          title={strings.recover.save}
          type="submit"
          fillsWidth
          isEnabled={code.length === RESET_CODE_LENGTH}
          isLoading={isBusy}
        />
      </form>
      <Button
        title={secondsLeft > 0 ? strings.recover.resendIn(secondsLeft) : strings.recover.resend}
        kind="ghost"
        fillsWidth
        isEnabled={secondsLeft <= 0 && !isBusy}
        onClick={() => void resend()}
      />
      <Button
        title={strings.recover.backToLogin}
        kind="ghost"
        fillsWidth
        onClick={() => navigate('/')}
      />
    </AuthCard>
  )
}

export function RecoverPasswordPage() {
  const dependencies = useDependencies()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setSubmitting] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setEmailError(null)
    setFormError(null)
    setSubmitting(true)
    try {
      await dependencies.requestPasswordReset(email)
      setSentTo(email.trim().toLowerCase())
    } catch (error) {
      if (error instanceof ValidationError) setEmailError(error.message)
      else if (error instanceof NetworkError && error.apiMessage) setFormError(error.apiMessage)
      else setFormError(strings.common.failed)
    } finally {
      setSubmitting(false)
    }
  }

  if (sentTo !== null) {
    return (
      <NewPasswordForm email={sentTo} onResend={() => dependencies.requestPasswordReset(sentTo)} />
    )
  }

  return (
    <AuthCard title={strings.recover.title} subtitle={strings.recover.subtitle}>
      <form className="cb-auth__form" onSubmit={submit} noValidate>
        <TextField
          label={strings.recover.emailLabel}
          placeholder={strings.recover.emailPlaceholder}
          type="email"
          autoComplete="email"
          value={email}
          onChange={setEmail}
          errorMessage={emailError}
        />
        {formError && <Banner message={formError} tone="danger" />}
        <Button title={strings.recover.submit} type="submit" fillsWidth isLoading={isSubmitting} />
      </form>
      <Button
        title={strings.recover.backToLogin}
        kind="ghost"
        fillsWidth
        onClick={() => navigate('/')}
      />
    </AuthCard>
  )
}
