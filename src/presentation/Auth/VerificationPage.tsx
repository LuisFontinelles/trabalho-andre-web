import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useDependencies, useSession } from '@/app/session'
import { Banner, Button, CodeField } from '@/designSystem/components'
import { NetworkError } from '@/data/network/httpClient'
import { ValidationError } from '@/domain/useCases'
import { AuthCard } from '@/presentation/Auth/AuthCard'
import type { SignUpHandoff } from '@/presentation/Auth/SignUpPage'
import { useCountdown } from '@/presentation/Auth/useCountdown'
import { strings } from '@/resources/strings'

const RESEND_SECONDS = 45

export function VerificationPage() {
  const dependencies = useDependencies()
  const session = useSession()
  const navigate = useNavigate()
  const location = useLocation()
  const pending = location.state as SignUpHandoff | null

  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [isSubmitting, setSubmitting] = useState(false)
  const [secondsLeft, restartCountdown] = useCountdown(RESEND_SECONDS)

  if (pending === null) return <Navigate to="/cadastro" replace />
  const { email, codeLength, registration } = pending

  async function submit(event: FormEvent) {
    event.preventDefault()
    setCodeError(null)
    setNotice(null)
    setSubmitting(true)
    try {
      const result = await dependencies.verifyCode(email, code, codeLength)
      // Quem acabou de se cadastrar ainda tem o registro em conferencia.
      session.signIn(result, { registration, isVerified: false })
      navigate('/cadastro-em-verificacao', { replace: true })
    } catch (error) {
      if (error instanceof ValidationError) {
        setCodeError(error.message)
      } else if (error instanceof NetworkError && error.kind === 'unauthorized') {
        setCodeError(strings.verification.invalid)
      } else {
        setCodeError(strings.common.failed)
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function resend() {
    setCodeError(null)
    setSubmitting(true)
    try {
      await dependencies.resendCode(email)
      setCode('')
      setNotice(strings.verification.resent)
      restartCountdown()
    } catch {
      setCodeError(strings.common.failed)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthCard title={strings.verification.title} subtitle={strings.verification.sentTo(email)}>
      <form className="cb-auth__form" onSubmit={submit} noValidate>
        <CodeField
          length={codeLength}
          value={code}
          onChange={setCode}
          label={strings.verification.fieldLabel}
        />
        {codeError && <Banner message={codeError} tone="danger" />}
        {notice && <Banner message={notice} tone="success" />}
        <Button
          title={strings.verification.submit}
          type="submit"
          fillsWidth
          isEnabled={code.length === codeLength}
          isLoading={isSubmitting}
        />
      </form>
      <Button
        title={
          secondsLeft > 0
            ? strings.verification.resendIn(secondsLeft)
            : strings.verification.resend
        }
        kind="ghost"
        fillsWidth
        isEnabled={secondsLeft <= 0 && !isSubmitting}
        onClick={() => void resend()}
      />
    </AuthCard>
  )
}
