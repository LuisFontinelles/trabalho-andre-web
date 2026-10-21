import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useDependencies } from '@/app/session'
import {
  Banner,
  Button,
  SelectField,
  Skeleton,
  TextField,
  ToggleChip,
} from '@/designSystem/components'
import { CbIcon } from '@/designSystem/tokens/icons'
import {
  EMPTY_FILTER_CATALOG,
  type FilterCatalog,
} from '@/domain/entities'
import {
  ACCESS_MODE_HINT,
  ACCESS_MODE_LABEL,
  allowsPrice,
  type AccessMode,
} from '@/domain/professional'
import {
  DRAFT_STEPS,
  DraftError,
  addDocument,
  addQuestion,
  applyAccessMode,
  applyModality,
  applyTriageMode,
  canEditTriage,
  emptyOpportunityDraft,
  nextStep,
  previousStep,
  removeDocument,
  removeQuestion,
  renameDocument,
  renameQuestion,
  toggleDocument,
  validateStep,
  type DraftErrorCode,
  type DraftStep,
  type OpportunityDraft,
} from '@/domain/opportunityDraft'
import { draftFromManagedOpportunity } from '@/data/professionalMappers'
import { strings } from '@/resources/strings'

const ACCESS_MODES: readonly AccessMode[] = ['gratuito', 'preco-social', 'pesquisa']

const STEP_TITLE: Record<DraftStep, string> = {
  DADOS: strings.newOpportunity.stepOne,
  ACESSO: strings.newOpportunity.stepTwo,
  TRIAGEM: strings.newOpportunity.stepThree,
}

type Errors = Partial<Record<DraftErrorCode, string>>

function Required() {
  return <span className="cb-required">*</span>
}

export function NewOpportunityPage() {
  const dependencies = useDependencies()
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = id !== undefined

  const [draft, setDraft] = useState<OpportunityDraft>(emptyOpportunityDraft)
  const [step, setStep] = useState<DraftStep>('DADOS')
  const [catalog, setCatalog] = useState<FilterCatalog>(EMPTY_FILTER_CATALOG)
  const [errors, setErrors] = useState<Errors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setSubmitting] = useState(false)
  const [isLoading, setLoading] = useState(isEditing)

  // Na edicao o formulario abre com o que ja esta publicado.
  useEffect(() => {
    if (id === undefined) return
    let active = true
    dependencies.professionalRepository
      .opportunity(id)
      .then((item) => {
        if (!active) return
        setDraft(draftFromManagedOpportunity(item))
        setLoading(false)
      })
      .catch(() => {
        if (!active) return
        setFormError(strings.newOpportunity.loadFailed)
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [dependencies, id])

  useEffect(() => {
    let active = true
    dependencies
      .loadFilters()
      .then((value) => {
        if (active) setCatalog(value)
      })
      .catch(() => {
        if (active) setCatalog(EMPTY_FILTER_CATALOG)
      })
    return () => {
      active = false
    }
  }, [dependencies])

  function update(patch: Partial<OpportunityDraft>) {
    setDraft((current) => ({ ...current, ...patch }))
    setErrors({})
    setFormError(null)
  }

  function advance() {
    try {
      validateStep(draft, step)
    } catch (error) {
      if (error instanceof DraftError) {
        setErrors({ [error.code]: error.message })
        return
      }
      throw error
    }

    const following = nextStep(step)
    if (following !== null) {
      setStep(following)
      setErrors({})
      return
    }
    void publish()
  }

  async function publish() {
    setSubmitting(true)
    setFormError(null)
    try {
      if (id === undefined) {
        await dependencies.professionalRepository.createOpportunity(draft)
      } else {
        await dependencies.professionalRepository.updateOpportunity(id, draft)
      }
      navigate('/oportunidades', { replace: true })
    } catch {
      setFormError(strings.newOpportunity.failed)
    } finally {
      setSubmitting(false)
    }
  }

  function goBack() {
    const earlier = previousStep(step)
    if (earlier === null) {
      navigate('/oportunidades')
      return
    }
    setStep(earlier)
    setErrors({})
  }

  const editable = canEditTriage(draft)

  const continueTitle =
    step === 'DADOS'
      ? strings.newOpportunity.continue
      : step === 'ACESSO'
        ? strings.newOpportunity.saveAndTriage
        : isEditing
          ? strings.newOpportunity.save
          : strings.newOpportunity.publish

  return (
    <>
      <header className="cb-page-header">
        <h1 className="cb-page-header__title cb-page-header__title--brand">
          {step === 'TRIAGEM'
            ? isEditing
              ? strings.newOpportunity.triageEditTitle
              : strings.newOpportunity.triagePageTitle
            : isEditing
              ? strings.newOpportunity.editTitle
              : strings.newOpportunity.title}
        </h1>
        <p className="cb-page-header__subtitle">
          {step === 'TRIAGEM' ? (
            strings.newOpportunity.triageSubtitle
          ) : (
            <>
              <Required /> {strings.newOpportunity.requiredHint}
            </>
          )}
        </p>
      </header>

      <nav className="cb-steps" aria-label={strings.newOpportunity.title}>
        {DRAFT_STEPS.map((candidate) => (
          <button
            key={candidate}
            type="button"
            className={['cb-step', candidate === step ? 'cb-step--current' : '']
              .filter(Boolean)
              .join(' ')}
            aria-current={candidate === step ? 'step' : undefined}
            disabled
          >
            {STEP_TITLE[candidate]}
          </button>
        ))}
      </nav>

      {isLoading && <Skeleton height={420} />}

      <div className="cb-card" hidden={isLoading}>
        {step === 'DADOS' && (
          <div className="cb-form-stack">
            <TextField
              label={strings.newOpportunity.fieldTitle}
              placeholder={strings.newOpportunity.titlePlaceholder}
              value={draft.title}
              onChange={(title) => update({ title })}
            />

            <div className="cb-field">
              <label className="cb-field__label" htmlFor="descricao">
                <Required /> {strings.newOpportunity.description}
              </label>
              <div
                className={[
                  'cb-field__control',
                  errors.descriptionRequired ? 'cb-field__control--error' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <textarea
                  id="descricao"
                  className="cb-field__input cb-textarea"
                  placeholder={strings.newOpportunity.descriptionPlaceholder}
                  value={draft.description}
                  aria-invalid={Boolean(errors.descriptionRequired)}
                  onChange={(event) => update({ description: event.target.value })}
                />
              </div>
              {errors.descriptionRequired && (
                <span className="cb-field__error" role="alert">
                  <CbIcon.error size={14} />
                  {errors.descriptionRequired}
                </span>
              )}
            </div>

            <div className="cb-form-grid">
              <SelectField
                label={strings.newOpportunity.specialty}
                isRequired
                placeholder={strings.newOpportunity.specialtyPlaceholder}
                options={catalog.specialties}
                value={draft.specialtyId}
                onChange={(specialtyId) => update({ specialtyId })}
                errorMessage={errors.specialtyRequired}
              />
              <TextField
                label={strings.newOpportunity.audience}
                isRequired
                placeholder={strings.newOpportunity.audiencePlaceholder}
                value={draft.audience}
                onChange={(audience) => update({ audience })}
                errorMessage={errors.audienceRequired}
              />
            </div>

            <div className="cb-form-grid">
              <SelectField
                label={strings.newOpportunity.place}
                isRequired
                placeholder={strings.newOpportunity.place}
                options={[
                  { id: 'presencial', label: 'Presencial' },
                  { id: 'online', label: 'Online' },
                ]}
                value={draft.modality}
                onChange={(value) =>
                  setDraft((current) =>
                    applyModality(current, value === 'online' ? 'online' : 'presencial'),
                  )
                }
              />
              <TextField
                label={strings.newOpportunity.address}
                isRequired={draft.modality === 'presencial'}
                placeholder={strings.newOpportunity.addressPlaceholder}
                value={draft.address}
                onChange={(address) => update({ address })}
                isEnabled={draft.modality === 'presencial'}
                errorMessage={errors.addressRequired}
              />
            </div>
          </div>
        )}

        {step === 'ACESSO' && (
          <div className="cb-form-stack">
            <span className="cb-field__label">
              <Required /> {strings.newOpportunity.accessTitle}
            </span>
            <div className="cb-choice-grid">
              {ACCESS_MODES.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={[
                    'cb-choice',
                    mode === draft.accessMode ? 'cb-choice--selected' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  aria-pressed={mode === draft.accessMode}
                  onClick={() => setDraft((current) => applyAccessMode(current, mode))}
                >
                  <p className="cb-choice__title">{ACCESS_MODE_LABEL[mode]}</p>
                  <p className="cb-choice__hint">{ACCESS_MODE_HINT[mode]}</p>
                </button>
              ))}
            </div>

            <div className="cb-form-grid">
              <div>
                <TextField
                  label={strings.newOpportunity.price}
                  isRequired={allowsPrice(draft.accessMode)}
                  placeholder={
                    allowsPrice(draft.accessMode)
                      ? strings.newOpportunity.pricePlaceholder
                      : strings.newOpportunity.pricePlaceholderFree
                  }
                  value={draft.price}
                  onChange={(price) => update({ price })}
                  isEnabled={allowsPrice(draft.accessMode)}
                  errorMessage={errors.priceRequired ?? errors.priceInvalid}
                />
                <p className="cb-note">{strings.newOpportunity.priceNote}</p>
              </div>
              <TextField
                label={strings.newOpportunity.vacancies}
                isRequired
                placeholder={strings.newOpportunity.vacanciesPlaceholder}
                value={draft.totalVacancies}
                onChange={(totalVacancies) => update({ totalVacancies })}
                errorMessage={errors.vacanciesRequired ?? errors.vacanciesInvalid}
              />
            </div>

            <div className="cb-form-grid">
              <div className="cb-field">
                <label className="cb-field__label" htmlFor="inicio">
                  <Required /> {strings.newOpportunity.opensAt}
                </label>
                <div className="cb-field__control">
                  <input
                    id="inicio"
                    type="date"
                    className="cb-field__input"
                    value={draft.opensAt}
                    onChange={(event) => update({ opensAt: event.target.value })}
                  />
                </div>
                {errors.opensAtRequired && (
                  <span className="cb-field__error" role="alert">
                    <CbIcon.error size={14} />
                    {errors.opensAtRequired}
                  </span>
                )}
              </div>
              <div className="cb-field">
                <label className="cb-field__label" htmlFor="fim">
                  <Required /> {strings.newOpportunity.closesAt}
                </label>
                <div className="cb-field__control">
                  <input
                    id="fim"
                    type="date"
                    className="cb-field__input"
                    value={draft.closesAt}
                    onChange={(event) => update({ closesAt: event.target.value })}
                  />
                </div>
                {(errors.closesAtRequired ?? errors.closesBeforeOpens) && (
                  <span className="cb-field__error" role="alert">
                    <CbIcon.error size={14} />
                    {errors.closesAtRequired ?? errors.closesBeforeOpens}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 'TRIAGEM' && (
          <div className="cb-form-stack">
            <div className="cb-choice-grid">
              <button
                type="button"
                className={[
                  'cb-choice',
                  draft.triageMode === 'PADRAO' ? 'cb-choice--selected' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-pressed={draft.triageMode === 'PADRAO'}
                onClick={() => setDraft((c) => applyTriageMode(c, 'PADRAO'))}
              >
                <p className="cb-choice__title">{strings.newOpportunity.triageDefault}</p>
                <p className="cb-choice__hint">{strings.newOpportunity.triageDefaultHint}</p>
              </button>
              <button
                type="button"
                className={[
                  'cb-choice',
                  draft.triageMode === 'PERSONALIZADO' ? 'cb-choice--selected' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-pressed={draft.triageMode === 'PERSONALIZADO'}
                onClick={() => setDraft((c) => applyTriageMode(c, 'PERSONALIZADO'))}
              >
                <p className="cb-choice__title">{strings.newOpportunity.triageCustom}</p>
                <p className="cb-choice__hint">{strings.newOpportunity.triageCustomHint}</p>
              </button>
            </div>

            <section className="cb-panel">
              <h2 className="cb-section-header">{strings.newOpportunity.questions}</h2>
              <ol className="cb-question-list">
                {draft.questions.map((question, index) => (
                  <li key={question.id} className="cb-question">
                    <label
                      className="cb-visually-hidden"
                      htmlFor={`pergunta-${question.id}`}
                    >
                      {strings.newOpportunity.questionLabel(index + 1)}
                    </label>
                    <span className="cb-question__index" aria-hidden="true">
                      {index + 1}.
                    </span>
                    <input
                      id={`pergunta-${question.id}`}
                      className="cb-question__input"
                      value={question.label}
                      disabled={!editable}
                      onChange={(event) =>
                        setDraft((c) => renameQuestion(c, question.id, event.target.value))
                      }
                    />
                    {editable && (
                      <button
                        type="button"
                        className="cb-action cb-action--delete"
                        aria-label={`${strings.newOpportunity.removeQuestion}: ${question.label}`}
                        onClick={() => setDraft((c) => removeQuestion(c, question.id))}
                      >
                        {strings.newOpportunity.remove}
                      </button>
                    )}
                  </li>
                ))}
              </ol>
              {editable && (
                <button
                  type="button"
                  className="cb-add-button"
                  onClick={() => setDraft(addQuestion)}
                >
                  {strings.newOpportunity.addQuestion}
                </button>
              )}
              {errors.questionsRequired && (
                <Banner message={errors.questionsRequired} />
              )}
            </section>

            <section className="cb-panel">
              <h2 className="cb-section-header">{strings.newOpportunity.documentsTitle}</h2>
              <div className="cb-chip-group">
                {draft.documents.map((document) =>
                  document.isCustom && editable ? (
                    <span key={document.id} className="cb-custom-document">
                      <label
                        className="cb-visually-hidden"
                        htmlFor={`documento-${document.id}`}
                      >
                        {strings.newOpportunity.newDocumentLabel}
                      </label>
                      <input
                        id={`documento-${document.id}`}
                        className="cb-custom-document__input"
                        value={document.label}
                        onChange={(event) =>
                          setDraft((c) =>
                            renameDocument(c, document.id, event.target.value),
                          )
                        }
                      />
                      <button
                        type="button"
                        className="cb-custom-document__remove"
                        aria-label={`${strings.newOpportunity.removeDocument}: ${document.label}`}
                        onClick={() => setDraft((c) => removeDocument(c, document.id))}
                      >
                        <CbIcon.clear size={14} />
                      </button>
                    </span>
                  ) : (
                    <ToggleChip
                      key={document.id}
                      title={document.label}
                      isSelected={draft.selectedDocumentIds.includes(document.id)}
                      isEnabled={editable}
                      onClick={() => setDraft((c) => toggleDocument(c, document.id))}
                    />
                  ),
                )}
              </div>
              {editable && (
                <button
                  type="button"
                  className="cb-add-button"
                  onClick={() => setDraft(addDocument)}
                >
                  {strings.newOpportunity.addDocument}
                </button>
              )}
              {errors.documentsRequired && (
                <Banner message={errors.documentsRequired} />
              )}
            </section>
          </div>
        )}

        {formError && <Banner message={formError} />}

        <div className="cb-form-actions" style={{ marginTop: 'var(--cb-space-xl)' }}>
          <Button
            title={step === 'DADOS' ? strings.newOpportunity.cancel : strings.newOpportunity.back}
            kind="tertiary"
            fillsWidth={false}
            isEnabled={!isSubmitting}
            onClick={goBack}
          />
          <Button
            title={continueTitle}
            fillsWidth={false}
            isLoading={isSubmitting}
            onClick={advance}
          />
        </div>
      </div>
    </>
  )
}
