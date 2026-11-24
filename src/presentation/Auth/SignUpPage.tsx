import { useEffect, useId, useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { rememberRegistration, useDependencies, useSession } from '@/app/session'
import { Banner, Button, PasswordField, SelectField, TextAreaField, TextField } from '@/designSystem/components'
import { NetworkError } from '@/data/network/httpClient'
import { EMPTY_CATALOG, emptySignUpDraft, type Catalog, type SignUpDraft } from '@/domain/entities'
import {
  signUpErrors,
  validationMessage,
  ValidationError,
  type ValidationCode,
} from '@/domain/useCases'
import { AuthCard } from '@/presentation/Auth/AuthCard'
import { ruleList } from '@/presentation/Auth/passwordRules'
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

const CATALOG_RETRIES = 6
const CATALOG_RETRY_MS = 5000

export function SignUpPage() {
  const dependencies = useDependencies()
  const session = useSession()
  const navigate = useNavigate()
  const documentInputId = useId()

  const [draft, setDraft] = useState<SignUpDraft>(emptySignUpDraft)
  const [biographyOrDescription, setBiographyOrDescription] = useState('')
  const [documents, setDocuments] = useState<File[]>([])
  const [documentsError, setDocumentsError] = useState<string | null>(null)
  const [catalog, setCatalog] = useState<Catalog>(EMPTY_CATALOG)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setSubmitting] = useState(false)

  const [catalogStatus, setCatalogStatus] = useState<'loading' | 'ready' | 'failed'>('loading')
  const [catalogAttempt, setCatalogAttempt] = useState(0)

  // A API no Render dorme sem uso e leva ate ~1 min para acordar: tenta de
  // novo algumas vezes antes de desistir, e abrir uma lista tenta outra vez.
  useEffect(() => {
    let active = true
    let timer: ReturnType<typeof setTimeout> | undefined
    async function load(attempt: number) {
      try {
        const value = await dependencies.loadCatalog()
        if (!active) return
        setCatalog(value)
        setCatalogStatus('ready')
      } catch {
        if (!active) return
        if (attempt < CATALOG_RETRIES) timer = setTimeout(() => void load(attempt + 1), CATALOG_RETRY_MS)
        else setCatalogStatus('failed')
      }
    }
    setCatalogStatus('loading')
    void load(0)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [dependencies, catalogAttempt])

  const catalogEmpty =
    catalogStatus === 'failed' ? strings.common.optionsFailed : strings.common.optionsLoading
  function retryCatalog() {
    if (catalogStatus === 'failed') setCatalogAttempt((current) => current + 1)
  }

  /** Mexer num campo apaga so o erro dele; os outros continuam a vista. */
  function update(patch: Partial<SignUpDraft>, clears: ValidationCode[]) {
    setDraft((current) => ({ ...current, ...patch }))
    setErrors((current) => {
      const next = { ...current }
      for (const code of clears) delete next[code]
      return next
    })
  }

  function selectDocuments(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.currentTarget.files ?? [])
    event.currentTarget.value = ''
    setDocumentsError(null)
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
    setFormError(null)
    setDocumentsError(null)
    // A tela nova nao repete a senha nem tem caixa de termos: criar a conta
    // ja e o aceite, como o texto acima do botao avisa.
    const payload: SignUpDraft = {
      ...draft,
      profile: 'PROFISSIONAL',
      confirmPassword: draft.password,
      acceptedTerms: true,
    }
    const codes = signUpErrors(payload)
    setErrors(Object.fromEntries(codes.map((code) => [code, validationMessage(code)])))
    if (codes.length > 0) {
      requestAnimationFrame(() => {
        document.querySelector<HTMLElement>('.cb-auth__form [aria-invalid="true"]')?.focus()
      })
      return
    }
    setSubmitting(true)
    try {
      const pending = await dependencies.signUp(payload, biographyOrDescription, documents)
      const council = catalog.councils.find((item) => item.id === draft.professional.councilId)
      const state = catalog.states.find((item) => item.id === draft.professional.stateId)
      const registration = `${council?.label ?? ''}/${state?.label ?? ''} ${draft.professional.number.trim()}`
      if (!pending.requiresCode) {
        // API real: a conta ja existe e o registro aguarda conferencia.
        // Entramos com a senha recem-criada para nao pedir login de novo.
        rememberRegistration(pending.email, registration)
        const result = await dependencies.login(pending.email, draft.password)
        session.signIn(result, { registration, isVerified: result.isVerified ?? false })
        navigate('/cadastro-em-verificacao', { replace: true })
        return
      }
      const handoff: SignUpHandoff = {
        email: pending.email,
        codeLength: pending.codeLength,
        registration,
      }
      navigate('/verificacao', { state: handoff })
    } catch (error) {
      if (error instanceof ValidationError) {
        setErrors({ [error.code]: error.message })
      } else if (error instanceof NetworkError && error.kind === 'conflict') {
        setFormError(strings.signUp.emailTaken)
      } else if (error instanceof NetworkError && error.kind === 'badRequest' && error.apiMessage) {
        setFormError(error.apiMessage)
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
          onChange={(name) => update({ name }, ['nameRequired'])}
          errorMessage={errors.nameRequired}
        />
        <TextField
          label={strings.signUp.emailLabel}
          placeholder={strings.signUp.emailPlaceholder}
          type="email"
          autoComplete="email"
          value={draft.email}
          onChange={(email) => update({ email }, ['emailRequired', 'emailInvalid'])}
          errorMessage={errors.emailRequired ?? errors.emailInvalid}
        />
        <div className="cb-row cb-row--compact">
          <SelectField
            label={strings.signUp.councilLabel}
            placeholder={strings.common.select}
            emptyMessage={catalogEmpty}
            onOpen={retryCatalog}
            options={catalog.councils.map((item) => ({ value: item.id, label: item.label }))}
            value={draft.professional.councilId}
            onChange={(councilId) =>
              update({ professional: { ...draft.professional, councilId } }, ['councilRequired'])
            }
            errorMessage={errors.councilRequired}
          />
          <SelectField
            label={strings.signUp.stateLabel}
            placeholder={strings.common.select}
            emptyMessage={catalogEmpty}
            onOpen={retryCatalog}
            options={catalog.states.map((item) => ({ value: item.id, label: item.label }))}
            value={draft.professional.stateId}
            onChange={(stateId) =>
              update({ professional: { ...draft.professional, stateId } }, ['stateRequired'])
            }
            errorMessage={errors.stateRequired}
          />
        </div>
        <TextField
          label={strings.signUp.registrationLabel}
          placeholder={strings.signUp.registrationPlaceholder}
          inputMode="numeric"
          value={draft.professional.number}
          onChange={(number) =>
            update({ professional: { ...draft.professional, number } }, [
              'registrationRequired',
              'registrationInvalid',
            ])
          }
          errorMessage={errors.registrationRequired ?? errors.registrationInvalid}
        />
        <SelectField
          label={strings.signUp.specialtyLabel}
          placeholder={strings.common.select}
          emptyMessage={catalogEmpty}
          onOpen={retryCatalog}
          options={catalog.specialties.map((item) => ({ value: item.id, label: item.label }))}
          value={draft.professional.specialtyId}
          onChange={(specialtyId) =>
            update({ professional: { ...draft.professional, specialtyId } }, ['specialtyRequired'])
          }
          errorMessage={errors.specialtyRequired}
        />
        <TextField
          label={strings.signUp.workplaceLabel}
          placeholder={strings.signUp.workplacePlaceholder}
          autoComplete="organization"
          value={draft.professional.workplace}
          onChange={(workplace) =>
            update({ professional: { ...draft.professional, workplace } }, ['workplaceRequired'])
          }
          errorMessage={errors.workplaceRequired}
        />
        <PasswordField
          label={strings.signUp.passwordLabel}
          placeholder={strings.signUp.passwordPlaceholder}
          autoComplete="new-password"
          value={draft.password}
          onChange={(password) => update({ password }, ['passwordRequired', 'passwordWeak'])}
          errorMessage={errors.passwordRequired ?? errors.passwordWeak}
          rules={ruleList(draft.password)}
        />
        <TextAreaField
          label={strings.signUp.biographyLabel}
          value={biographyOrDescription}
          onChange={setBiographyOrDescription}
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
                    onClick={() => setDocuments((current) => current.filter((item) => item !== file))}
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
