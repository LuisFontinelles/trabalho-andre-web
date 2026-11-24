import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDependencies } from '@/app/session'
import { Banner, Button, CodeField, TextField } from '@/designSystem/components'
import { NetworkError } from '@/data/network/httpClient'
import { ValidationError } from '@/domain/useCases'
import { AuthCard } from '@/presentation/Auth/AuthCard'
import { useCountdown } from '@/presentation/Auth/useCountdown'
import { strings } from '@/resources/strings'

const RESEND_SECONDS = 60
const CODE_LENGTH = 6

export function RecoverPasswordPage() {
  const dependencies = useDependencies()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [isSubmitting, setSubmitting] = useState(false)
  const [isComplete, setComplete] = useState(false)
  const [secondsLeft, restartCountdown] = useCountdown(RESEND_SECONDS)

  function clearFeedback() {
    setFieldError(null)
    setFormError(null)
    setNotice(null)
  }

  async function requestCode(event: FormEvent) {
    event.preventDefault()
    clearFeedback()
    setSubmitting(true)
    try {
      await dependencies.requestPasswordReset(email)
      setSentTo(email.trim().toLowerCase())
      restartCountdown()
    } catch (error) {
      if (error instanceof ValidationError) setFieldError(error.message)
      else if (error instanceof NetworkError) setFormError(error.apiMessage ?? strings.common.failed)
      else setFormError(strings.common.failed)
    } finally {
      setSubmitting(false)
    }
  }

  async function confirmReset(event: FormEvent) {
    event.preventDefault()
    if (sentTo === null) return
    clearFeedback()
    setSubmitting(true)
    try {
      await dependencies.confirmPasswordReset(sentTo, code, newPassword, confirmPassword)
      setComplete(true)
    } catch (error) {
      if (error instanceof ValidationError) setFieldError(error.message)
      else if (error instanceof NetworkError && error.status === 400) {
        setFieldError(error.apiMessage ?? strings.recover.invalidCode)
      } else if (error instanceof NetworkError) {
        setFormError(error.apiMessage ?? strings.common.failed)
      } else setFormError(strings.common.failed)
    } finally {
      setSubmitting(false)
    }
  }

  async function resend() {
    if (sentTo === null) return
    clearFeedback()
    setSubmitting(true)
    try {
      await dependencies.requestPasswordReset(sentTo)
      setCode('')
      setNotice(strings.verification.resent)
      restartCountdown()
    } catch (error) {
      setFormError(error instanceof NetworkError ? error.apiMessage ?? strings.common.failed : strings.common.failed)
    } finally {
      setSubmitting(false)
    }
  }

  if (isComplete) {
    return (
      <AuthCard icon="check_circle" title={strings.recover.successTitle} subtitle={strings.recover.successMessage}>
        <Button title={strings.recover.backToLogin} fillsWidth onClick={() => navigate('/')} />
      </AuthCard>
    )
  }

  if (sentTo !== null) {
    return (
      <AuthCard title={strings.recover.sentTitle} subtitle={strings.recover.sentMessage(sentTo)}>
        <form className="cb-auth__form" onSubmit={confirmReset} noValidate>
          <CodeField
            length={CODE_LENGTH}
            value={code}
            onChange={(value) => {
              setCode(value)
              clearFeedback()
            }}
            label={strings.recover.codeLabel}
          />
          {code.length === CODE_LENGTH && (
            <>
              <TextField
                label={strings.recover.newPasswordLabel}
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(value) => {
                  setNewPassword(value)
                  clearFeedback()
                }}
              />
              <TextField
                label={strings.recover.confirmPasswordLabel}
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(value) => {
                  setConfirmPassword(value)
                  clearFeedback()
                }}
                errorMessage={fieldError}
              />
            </>
          )}
          {notice && <Banner message={notice} tone="success" />}
          {formError && <Banner message={formError} tone="danger" />}
          {code.length === CODE_LENGTH && (
            <Button
              title={strings.recover.confirm}
              type="submit"
              fillsWidth
              isEnabled={!isSubmitting}
              isLoading={isSubmitting}
            />
          )}
        </form>
        <Button
          title={secondsLeft > 0 ? strings.recover.resendIn(secondsLeft) : strings.recover.resend}
          kind="ghost"
          fillsWidth
          isEnabled={secondsLeft <= 0 && !isSubmitting}
          onClick={() => void resend()}
        />
        <Button title={strings.recover.backToLogin} kind="ghost" fillsWidth onClick={() => navigate('/')} />
      </AuthCard>
    )
  }

  return (
    <AuthCard title={strings.recover.title} subtitle={strings.recover.subtitle}>
      <form className="cb-auth__form" onSubmit={requestCode} noValidate>
        <TextField
          label={strings.recover.emailLabel}
          placeholder={strings.recover.emailPlaceholder}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(value) => {
            setEmail(value)
            clearFeedback()
          }}
          errorMessage={fieldError}
        />
        {formError && <Banner message={formError} tone="danger" />}
        <Button title={strings.recover.submit} type="submit" fillsWidth isLoading={isSubmitting} />
      </form>
      <Button title={strings.recover.backToLogin} kind="ghost" fillsWidth onClick={() => navigate('/')} />
    </AuthCard>
  )
}