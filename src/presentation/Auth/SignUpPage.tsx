import { useEffect, useId, useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDependencies } from '@/app/session'
import { Banner, Button, SelectField, TextAreaField, TextField } from '@/designSystem/components'
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

const MAX_DOCUMENT_COUNT = 2
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024
const MAX_REQUEST_SIZE = 22 * 1024 * 1024

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
  const documentInputId = useId()

  const [draft, setDraft] = useState<SignUpDraft>(emptySignUpDraft)
  const [biographyOrDescription, setBiographyOrDescription] = useState('')
  const [documents, setDocuments] = useState<File[]>([])
  const [documentsError, setDocumentsError] = useState<string | null>(null)
  const [catalog, setCatalog] = useState<ProfessionalCatalog>(EMPTY_PROFESSIONAL_CATALOG)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
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
    setSuccessMessage(null)
  }

  function selectDocuments(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.currentTarget.files ?? [])
    event.currentTarget.value = ''
    setDocumentsError(null)
    setSuccessMessage(null)
    if (selected.length > MAX_DOCUMENT_COUNT) {
      setDocumentsError(strings.signUp.tooManyDocuments)
      return
    }
    if (selected.some((file) => file.size > MAX_DOCUMENT_SIZE)) {
      setDocumentsError(strings.signUp.documentTooLarge)
      return
    }
    if (selected.reduce((total, file) => total + file.size, 0) > MAX_REQUEST_SIZE) {
      setDocumentsError(strings.signUp.requestTooLarge)
      return
    }
    setDocuments(selected)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setErrors({})
    setFormError(null)
    setDocumentsError(null)
    setSuccessMessage(null)
    setSubmitting(true)
    try {
      await dependencies.registerProfessional(
        {
          ...draft,
          profile: 'PROFISSIONAL',
          confirmPassword: draft.password,
          acceptedTerms: true,
        },
        biographyOrDescription,
        documents,
      )
      setSuccessMessage(strings.signUp.registrationSubmitted)
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
        <TextAreaField
          label={strings.signUp.biographyLabel}
          value={biographyOrDescription}
          onChange={(value) => {
            setBiographyOrDescription(value)
            setSuccessMessage(null)
          }}
          placeholder={strings.signUp.biographyPlaceholder}
          maxLength={2000}
        />
        <div className="cb-field">
          <label className="cb-field__label" htmlFor={documentInputId}>
            {strings.signUp.documentsLabel}
          </label>
          <div className="cb-field__box">
            <input
              id={documentInputId}
              className="cb-field__input cb-field__input--file"
              type="file"
              multiple
              onChange={selectDocuments}
              aria-describedby={`${documentInputId}-help`}
            />
          </div>
          <span id={`${documentInputId}-help`} className="cb-auth__caption">
            {strings.signUp.documentsHelp}
          </span>
          {documents.length > 0 && (
            <ul className="cb-auth__documents">
              {documents.map((file) => (
                <li key={`${file.name}-${file.lastModified}-${file.size}`}>
                  <span>{file.name}</span>
                  <button
                    type="button"
                    className="cb-auth__document-remove"
                    onClick={() => {
                      setDocuments((current) => current.filter((item) => item !== file))
                      setSuccessMessage(null)
                    }}
                    aria-label={`${strings.signUp.removeDocument}: ${file.name}`}
                  >
                    {strings.signUp.removeDocument}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="cb-auth__caption">{strings.signUp.terms}</p>
        {documentsError && <Banner message={documentsError} tone="danger" />}
        {formError && <Banner message={formError} tone="danger" />}
        {successMessage && <Banner message={successMessage} tone="success" />}
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
