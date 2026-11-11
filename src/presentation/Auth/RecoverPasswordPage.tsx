import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDependencies } from '@/app/session'
import { Banner, Button, TextField } from '@/designSystem/components'
import { ValidationError } from '@/domain/useCases'
import { AuthCard } from '@/presentation/Auth/AuthCard'
import { useCountdown } from '@/presentation/Auth/useCountdown'
import { strings } from '@/resources/strings'

const RESEND_SECONDS = 60

function LinkSent({ email, onResend }: { email: string; onResend: () => Promise<void> }) {
  const navigate = useNavigate()
  const [secondsLeft, restartCountdown] = useCountdown(RESEND_SECONDS)
  const [isSending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function resend() {
    setError(null)
    setSending(true)
    try {
      await onResend()
      restartCountdown()
    } catch {
      setError(strings.common.failed)
    } finally {
      setSending(false)
    }
  }

  return (
    <AuthCard
      icon="mark_email_read"
      title={strings.recover.sentTitle}
      subtitle={strings.recover.sentMessage(email)}
    >
      {error && <Banner message={error} tone="danger" />}
      <Button title={strings.recover.backToLogin} fillsWidth onClick={() => navigate('/')} />
      <Button
        title={secondsLeft > 0 ? strings.recover.resendIn(secondsLeft) : strings.recover.resend}
        kind="ghost"
        fillsWidth
        isEnabled={secondsLeft <= 0 && !isSending}
        onClick={() => void resend()}
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
      else setFormError(strings.common.failed)
    } finally {
      setSubmitting(false)
    }
  }

  if (sentTo !== null) {
    return <LinkSent email={sentTo} onResend={() => dependencies.requestPasswordReset(sentTo)} />
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
