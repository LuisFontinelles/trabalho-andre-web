import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDependencies } from '@/app/session'
import { Banner, Button, SelectField, TextField } from '@/designSystem/components'
import { NetworkError } from '@/data/network/httpClient'
import {
  EMPTY_PROFESSIONAL_CATALOG,
  emptySignUpDraft,
  type ProfessionalCatalog,
  type SignUpDraft,
} from '@/domain/entities'
import { ValidationError, type ValidationCode } from '@/domain/useCases'
import { AuthCard } from '@/presentation/Auth/AuthCard'
import { strings } from '@/resources/strings'

type FieldErrors = Partial<Record<ValidationCode, string>>

/** O que a tela de verificacao precisa saber sobre o cadastro recem-feito. */
export interface SignUpHandoff {
  email: string
  codeLength: number
  /** "CRM/DF 123456", para a tela de cadastro em verificacao. */
  registration: string
}

export function SignUpPage() {
  const dependencies = useDependencies()
  const navigate = useNavigate()

  const [draft, setDraft] = useState<SignUpDraft>(emptySignUpDraft)
  const [catalog, setCatalog] = useState<ProfessionalCatalog>(EMPTY_PROFESSIONAL_CATALOG)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setSubmitting] = useState(false)

  useEffect(() => {
    let active = true
    dependencies
      .loadProfessionalCatalog()
      .then((value) => {
        if (active) setCatalog(value)
      })
      .catch(() => {
        if (active) setCatalog(EMPTY_PROFESSIONAL_CATALOG)
      })
    return () => {
      active = false
    }
  }, [dependencies])

  function update(patch: Partial<SignUpDraft>) {
    setDraft((current) => ({ ...current, ...patch }))
    setErrors({})
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setErrors({})
    setFormError(null)
    setSubmitting(true)
    try {
      // A tela nova nao repete a senha nem tem caixa de termos: criar a conta
      // ja e o aceite, como o texto acima do botao avisa.
      const pending = await dependencies.signUp({
        ...draft,
        profile: 'PROFISSIONAL',
        confirmPassword: draft.password,
        acceptedTerms: true,
      })
      const council = catalog.councils.find((item) => item.id === draft.professional.councilId)
      const state = catalog.states.find((item) => item.id === draft.professional.stateId)
      const handoff: SignUpHandoff = {
        email: pending.email,
        codeLength: pending.codeLength,
        registration: `${council?.label ?? ''}/${state?.label ?? ''} ${draft.professional.number.trim()}`,
      }
      navigate('/verificacao', { state: handoff })
    } catch (error) {
      if (error instanceof ValidationError) {
        setErrors({ [error.code]: error.message })
      } else if (error instanceof NetworkError && error.status === 409) {
        setFormError(strings.signUp.emailTaken)
      } else {
        setFormError(strings.common.failed)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthCard title={strings.signUp.title} subtitle={strings.signUp.subtitle}>
      <form className="cb-auth__form" onSubmit={submit} noValidate>
        <TextField
          label={strings.signUp.nameLabel}
          placeholder={strings.signUp.namePlaceholder}
          autoComplete="name"
          value={draft.name}
          onChange={(name) => update({ name })}
          errorMessage={errors.nameRequired}
        />
        <TextField
          label={strings.signUp.emailLabel}
          placeholder={strings.signUp.emailPlaceholder}
          type="email"
          autoComplete="email"
          value={draft.email}
          onChange={(email) => update({ email })}
          errorMessage={errors.emailRequired ?? errors.emailInvalid}
        />
        <div className="cb-row cb-row--compact">
          <SelectField
            label={strings.signUp.councilLabel}
            placeholder={strings.common.select}
            options={catalog.councils.map((item) => ({ value: item.id, label: item.label }))}
            value={draft.professional.councilId}
            onChange={(councilId) =>
              update({ professional: { ...draft.professional, councilId } })
            }
            errorMessage={errors.councilRequired}
          />
          <SelectField
            label={strings.signUp.stateLabel}
            placeholder={strings.common.select}
            options={catalog.states.map((item) => ({ value: item.id, label: item.label }))}
            value={draft.professional.stateId}
            onChange={(stateId) => update({ professional: { ...draft.professional, stateId } })}
            errorMessage={errors.stateRequired}
          />
        </div>
        <TextField
          label={strings.signUp.registrationLabel}
          placeholder={strings.signUp.registrationPlaceholder}
          inputMode="numeric"
          value={draft.professional.number}
          onChange={(number) => update({ professional: { ...draft.professional, number } })}
          errorMessage={errors.registrationRequired}
        />
        <TextField
          label={strings.signUp.passwordLabel}
          placeholder={strings.signUp.passwordPlaceholder}
          type="password"
          autoComplete="new-password"
          value={draft.password}
          onChange={(password) => update({ password })}
          errorMessage={errors.passwordRequired ?? errors.passwordWeak}
        />
        <p className="cb-auth__caption">{strings.signUp.terms}</p>
        {formError && <Banner message={formError} tone="danger" />}
        <Button title={strings.signUp.submit} type="submit" fillsWidth isLoading={isSubmitting} />
      </form>
      <Button
        title={strings.signUp.hasAccount}
        kind="ghost"
        fillsWidth
        onClick={() => navigate('/')}
      />
    </AuthCard>
  )
}
