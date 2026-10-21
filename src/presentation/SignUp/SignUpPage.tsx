import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDependencies } from '@/app/session'
import {
  Banner,
  Button,
  Checkbox,
  LinkButton,
  OptionSelector,
  SelectField,
  TextField,
} from '@/designSystem/components'
import { NetworkError } from '@/data/network/httpClient'
import {
  EMPTY_PROFESSIONAL_CATALOG,
  emptySignUpDraft,
  requiresProfessionalData,
  type ProfessionalCatalog,
  type SignUpDraft,
  type UserProfile,
} from '@/domain/entities'
import { ValidationError, type ValidationCode } from '@/domain/useCases'
import { strings } from '@/resources/strings'

type FieldErrors = Partial<Record<ValidationCode, string>>

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
      const pending = await dependencies.signUp(draft)
      navigate('/verificacao', { state: pending })
    } catch (error) {
      if (error instanceof ValidationError) {
        setErrors({ [error.code]: error.message })
      } else if (error instanceof NetworkError && error.status === 409) {
        setFormError(strings.signUp.emailTaken)
      } else {
        setFormError(strings.opportunities.errorMessage)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="cb-auth">
      <div className="cb-auth__panel">
        <div className="cb-auth__header">
          <h1 className="cb-auth__title">{strings.signUp.title}</h1>
        </div>

        <form className="cb-auth__form" onSubmit={submit} noValidate>
          <OptionSelector<UserProfile>
            label={strings.signUp.profileLabel}
            options={[
              { id: 'PACIENTE', title: strings.signUp.profilePatient },
              { id: 'PROFISSIONAL', title: strings.signUp.profileProfessional },
            ]}
            value={draft.profile}
            onChange={(profile) => update({ profile })}
          />

          {draft.profile === 'PACIENTE' && <Banner message={strings.login.patientOnlyApp} tone="info" />}

          <TextField
            label={strings.signUp.nameLabel}
            placeholder={strings.signUp.namePlaceholder}
            value={draft.name}
            onChange={(name) => update({ name })}
            autoComplete="name"
            errorMessage={errors.nameRequired}
          />
          <TextField
            label={strings.signUp.emailLabel}
            placeholder={strings.signUp.emailPlaceholder}
            value={draft.email}
            onChange={(email) => update({ email })}
            type="email"
            autoComplete="email"
            errorMessage={errors.emailRequired ?? errors.emailInvalid}
          />

          {requiresProfessionalData(draft) && (
            <section className="cb-professional-block">
              <span className="cb-field__label">{strings.signUp.professionalSection}</span>
              <div className="cb-professional-block__row">
                <SelectField
                  label={strings.signUp.councilLabel}
                  placeholder={strings.signUp.councilPlaceholder}
                  options={catalog.councils}
                  value={draft.professional.councilId}
                  onChange={(councilId) =>
                    update({ professional: { ...draft.professional, councilId } })
                  }
                  errorMessage={errors.councilRequired}
                />
                <SelectField
                  label={strings.signUp.stateLabel}
                  placeholder={strings.signUp.statePlaceholder}
                  options={catalog.states}
                  value={draft.professional.stateId}
                  onChange={(stateId) =>
                    update({ professional: { ...draft.professional, stateId } })
                  }
                  errorMessage={errors.stateRequired}
                />
              </div>
              <TextField
                label={strings.signUp.registrationLabel}
                placeholder={strings.signUp.registrationPlaceholder}
                value={draft.professional.number}
                onChange={(number) => update({ professional: { ...draft.professional, number } })}
                errorMessage={errors.registrationRequired}
              />
              <p className="cb-professional-block__note">{strings.signUp.professionalNote}</p>
            </section>
          )}

          <TextField
            label={strings.signUp.passwordLabel}
            placeholder={strings.signUp.passwordPlaceholder}
            value={draft.password}
            onChange={(password) => update({ password })}
            type="password"
            autoComplete="new-password"
            errorMessage={errors.passwordRequired ?? errors.passwordWeak}
          />
          <TextField
            label={strings.signUp.confirmPasswordLabel}
            placeholder={strings.signUp.confirmPasswordPlaceholder}
            value={draft.confirmPassword}
            onChange={(confirmPassword) => update({ confirmPassword })}
            type="password"
            autoComplete="new-password"
            errorMessage={errors.passwordMismatch}
          />

          <Checkbox
            title={strings.signUp.terms}
            checked={draft.acceptedTerms}
            onChange={(acceptedTerms) => update({ acceptedTerms })}
            errorMessage={errors.termsNotAccepted}
          />

          {formError && <Banner message={formError} />}

          <Button title={strings.signUp.submit} type="submit" isLoading={isSubmitting} />
        </form>

        <p className="cb-auth__footer">
          <LinkButton title={strings.signUp.hasAccount} onClick={() => navigate('/')} />
        </p>
      </div>
    </main>
  )
}
