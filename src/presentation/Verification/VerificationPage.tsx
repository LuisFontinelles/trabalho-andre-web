import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useDependencies, useSession } from '@/app/session'
import { Banner, Button, CodeField, LinkButton } from '@/designSystem/components'
import { NetworkError } from '@/data/network/httpClient'
import { DEFAULT_CODE_LENGTH, type PendingVerification } from '@/domain/entities'
import { ValidationError } from '@/domain/useCases'
import { strings } from '@/resources/strings'

export function VerificationPage() {
  const dependencies = useDependencies()
  const session = useSession()
  const navigate = useNavigate()
  const location = useLocation()
  const pending = location.state as PendingVerification | null

  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [isSubmitting, setSubmitting] = useState(false)

  if (pending === null) {
    navigate('/cadastro', { replace: true })
    return null
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (pending === null) return
    setCodeError(null)
    setNotice(null)
    setSubmitting(true)
    try {
      const result = await dependencies.verifyCode(pending.email, code, pending.codeLength)
      session.signIn(result)
      navigate('/oportunidades', { replace: true })
    } catch (error) {
      if (error instanceof ValidationError) {
        setCodeError(error.message)
      } else if (error instanceof NetworkError && error.kind === 'unauthorized') {
        setCodeError(strings.verification.invalid)
      } else {
        setCodeError(strings.opportunities.errorMessage)
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function resend() {
    if (pending === null) return
    setCodeError(null)
    setSubmitting(true)
    try {
      await dependencies.resendCode(pending.email)
      setCode('')
      setNotice(strings.verification.resent)
    } catch {
      setCodeError(strings.opportunities.errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="cb-auth">
      <div className="cb-auth__panel">
        <div className="cb-auth__header">
          <h1 className="cb-auth__title">{strings.verification.title}</h1>
          <p className="cb-auth__subtitle">{strings.verification.sentTo}</p>
          <p className="cb-auth__subtitle" style={{ color: 'var(--cb-brand-strong)' }}>
            {pending.email}
          </p>
        </div>

        <form className="cb-auth__form" onSubmit={submit} noValidate>
          <CodeField
            code={code}
            onChange={(value) => {
              setCode(value)
              setCodeError(null)
            }}
            length={pending.codeLength || DEFAULT_CODE_LENGTH}
            errorMessage={codeError}
            label={strings.verification.fieldLabel}
          />

          <p className="cb-auth__footer">
            {strings.verification.notReceived}
            <LinkButton
              title={strings.verification.resend}
              isEnabled={!isSubmitting}
              onClick={() => void resend()}
            />
          </p>

          {notice && <Banner message={notice} tone="success" />}

          <Button title={strings.verification.submit} type="submit" isLoading={isSubmitting} />
        </form>

        <p className="cb-auth__footer">
          <LinkButton title={strings.common.back} onClick={() => navigate('/cadastro')} />
        </p>
      </div>
    </main>
  )
}
