import { useState, type FormEvent } from 'react'
import {
  Button,
  Checkbox,
  Chip,
  IconButton,
  Modal,
  OptionCard,
  Panel,
  SelectField,
  TextAreaField,
  TextField,
  type SelectOption,
} from '@/designSystem/components'
import { Icon } from '@/designSystem/tokens/icons'
import type { FilterOption } from '@/domain/entities'
import {
  DESCRIPTION_MAX,
  DraftError,
  QUESTION_TYPES,
  QUESTION_TYPE_LABEL,
  addDocument,
  applyAccessMode,
  applyModality,
  applyNoRestrictions,
  applyTriageMode,
  canEditTriage,
  draftErrorMessage,
  formatCep,
  newQuestion,
  removeQuestion,
  saveQuestion,
  toggleDocument,
  validateQuestion,
  withQuestionType,
  type DraftErrors,
  type DraftField,
  type OpportunityDraft,
  type QuestionType,
  type TriageQuestion,
} from '@/domain/opportunityDraft'
import {
  ACCESS_MODES,
  ACCESS_MODE_HINT,
  ACCESS_MODE_LABEL,
  AUDIENCES,
  AUDIENCE_LABEL,
  CARE_MODALITIES,
  CARE_MODALITY_LABEL,
  CONTACT_METHODS,
  CONTACT_METHOD_LABEL,
  SERVICE_TYPES,
  SERVICE_TYPE_LABEL,
  allowsPrice,
  requiresAddress,
  type Audience,
  type CareModality,
  type ContactMethod,
  type ServiceType,
} from '@/domain/professional'
import { strings } from '@/resources/strings'

const text = strings.newOpportunity

export interface StepProps {
  draft: OpportunityDraft
  errors: DraftErrors
  /** Recebe o rascunho novo inteiro, para as regras do dominio valerem. */
  onChange: (draft: OpportunityDraft) => void
}

function optionsOf<T extends string>(
  values: readonly T[],
  labels: Record<T, string>,
): SelectOption[] {
  return values.map((value) => ({ value, label: labels[value] }))
}

function messageOf(errors: DraftErrors, field: DraftField): string | null {
  const code = errors[field]
  return code === undefined ? null : draftErrorMessage(code)
}

/* ------------------------------------------------------- 1 Dados basicos */

export function BasicsStep({
  draft,
  errors,
  onChange,
  specialties,
}: StepProps & { specialties: readonly FilterOption[] }) {
  const hasAddress = requiresAddress(draft.modality)
  return (
    <Panel>
      <TextField
        label={text.fieldTitle}
        placeholder={text.titlePlaceholder}
        value={draft.title}
        onChange={(title) => onChange({ ...draft, title })}
        errorMessage={messageOf(errors, 'title')}
      />
      <div className="cb-row">
        <SelectField
          label={text.serviceType}
          placeholder={strings.common.select}
          options={optionsOf(SERVICE_TYPES, SERVICE_TYPE_LABEL)}
          value={draft.serviceType}
          onChange={(value) => onChange({ ...draft, serviceType: value as ServiceType })}
          errorMessage={messageOf(errors, 'serviceType')}
        />
        <SelectField
          multiple
          label={text.audiences}
          placeholder={text.audiencesPlaceholder}
          options={optionsOf(AUDIENCES, AUDIENCE_LABEL)}
          value={draft.audiences}
          onChange={(value) =>
            // Guarda na ordem do catalogo, e nao na ordem dos cliques.
            onChange({
              ...draft,
              audiences: AUDIENCES.filter((item) => value.includes(item)) as Audience[],
            })
          }
          errorMessage={messageOf(errors, 'audiences')}
        />
      </div>
      <TextAreaField
        label={text.description}
        placeholder={text.descriptionPlaceholder}
        value={draft.description}
        maxLength={DESCRIPTION_MAX}
        onChange={(description) => onChange({ ...draft, description })}
        errorMessage={messageOf(errors, 'description')}
      />
      <div className="cb-row">
        <SelectField
          label={text.specialty}
          placeholder={strings.common.select}
          options={specialties.map((item) => ({ value: item.id, label: item.label }))}
          value={draft.specialtyId}
          onChange={(specialtyId) => onChange({ ...draft, specialtyId })}
          errorMessage={messageOf(errors, 'specialtyId')}
        />
        <SelectField
          label={text.modality}
          placeholder={strings.common.select}
          options={optionsOf(CARE_MODALITIES, CARE_MODALITY_LABEL)}
          value={draft.modality}
          onChange={(value) => onChange(applyModality(draft, value as CareModality))}
          errorMessage={messageOf(errors, 'modality')}
        />
      </div>
      <div className="cb-row">
        <TextField
          label={text.cep}
          placeholder={text.cepPlaceholder}
          inputMode="numeric"
          value={draft.cep}
          isEnabled={hasAddress || draft.modality === null}
          onChange={(cep) => onChange({ ...draft, cep: formatCep(cep) })}
          errorMessage={messageOf(errors, 'cep')}
        />
        <TextField
          label={text.address}
          placeholder={text.addressPlaceholder}
          value={draft.address}
          isEnabled={hasAddress || draft.modality === null}
          onChange={(address) => onChange({ ...draft, address })}
          errorMessage={messageOf(errors, 'address')}
        />
      </div>
      <p className="cb-caption">{text.addressHint}</p>
    </Panel>
  )
}

/* ------------------------------------------------- 2 Condicoes de acesso */

export function AccessStep({ draft, errors, onChange }: StepProps) {
  const hasPrice = allowsPrice(draft.accessMode)
  const accessError = messageOf(errors, 'accessMode')
  return (
    <Panel>
      <p className="cb-label" id="access-mode-label">
        {text.accessTitle}
      </p>
      <div className="cb-row cb-row--tight" role="radiogroup" aria-labelledby="access-mode-label">
        {ACCESS_MODES.map((mode) => (
          <OptionCard
            key={mode}
            title={ACCESS_MODE_LABEL[mode]}
            description={ACCESS_MODE_HINT[mode]}
            isSelected={draft.accessMode === mode}
            onSelect={() => onChange(applyAccessMode(draft, mode))}
          />
        ))}
      </div>
      {accessError && (
        <span className="cb-field__help" role="alert">
          {accessError}
        </span>
      )}
      <div className="cb-row">
        <TextField
          label={text.price}
          placeholder={text.pricePlaceholder}
          inputMode="decimal"
          // Fora do preco social o campo mostra "Sem custo" e fica travado.
          value={hasPrice ? draft.price : draft.accessMode === null ? '' : text.priceFree}
          isEnabled={hasPrice}
          onChange={(price) => onChange({ ...draft, price })}
          errorMessage={messageOf(errors, 'price')}
        />
        <TextField
          label={text.vacancies}
          placeholder={text.vacanciesPlaceholder}
          inputMode="numeric"
          value={draft.totalVacancies}
          onChange={(totalVacancies) => onChange({ ...draft, totalVacancies })}
          errorMessage={messageOf(errors, 'totalVacancies')}
        />
      </div>
      <p className="cb-caption">{text.priceHint}</p>
      <div className="cb-row">
        <TextField
          label={text.opensAt}
          type="date"
          value={draft.opensAt}
          onChange={(opensAt) => onChange({ ...draft, opensAt })}
          errorMessage={messageOf(errors, 'opensAt')}
        />
        <TextField
          label={text.closesAt}
          type="date"
          value={draft.closesAt}
          onChange={(closesAt) => onChange({ ...draft, closesAt })}
          errorMessage={messageOf(errors, 'closesAt')}
        />
      </div>
      <TextAreaField
        label={text.eligibility}
        placeholder={text.eligibilityPlaceholder}
        value={draft.eligibility}
        isEnabled={!draft.hasNoRestrictions}
        onChange={(eligibility) => onChange({ ...draft, eligibility })}
        errorMessage={messageOf(errors, 'eligibility')}
      />
      <Checkbox
        label={text.noRestrictions}
        isChecked={draft.hasNoRestrictions}
        onChange={(checked) => onChange(applyNoRestrictions(draft, checked))}
      />
      <SelectField
        label={text.contactMethod}
        placeholder={strings.common.select}
        options={optionsOf(CONTACT_METHODS, CONTACT_METHOD_LABEL)}
        value={draft.contactMethod}
        onChange={(value) => onChange({ ...draft, contactMethod: value as ContactMethod })}
        errorMessage={messageOf(errors, 'contactMethod')}
      />
    </Panel>
  )
}

/* ------------------------------------------------ 3 Triagem e documentos */

function QuestionModal({
  question,
  isNew,
  onSave,
  onDismiss,
}: {
  question: TriageQuestion
  isNew: boolean
  onSave: (question: TriageQuestion) => void
  onDismiss: () => void
}) {
  const [value, setValue] = useState<TriageQuestion>(() =>
    // A multipla escolha abre com duas linhas, o minimo que ela exige.
    question.type === 'MULTIPLA' && question.options.length === 0
      ? { ...question, options: ['', ''] }
      : question,
  )
  const [error, setError] = useState<DraftError | null>(null)

  function update(next: TriageQuestion) {
    setValue(next)
    setError(null)
  }

  function setType(type: QuestionType) {
    const next = withQuestionType(value, type)
    update(type === 'MULTIPLA' && next.options.length === 0 ? { ...next, options: ['', ''] } : next)
  }

  function submit(event?: FormEvent) {
    event?.preventDefault()
    try {
      validateQuestion(value)
    } catch (caught) {
      if (caught instanceof DraftError) {
        setError(caught)
        return
      }
      throw caught
    }
    onSave(value)
  }

  return (
    <Modal
      title={isNew ? text.questionModalNew : text.questionModalEdit}
      message={text.questionModalHint}
      onDismiss={onDismiss}
      actions={
        <>
          <Button title={strings.common.cancel} kind="outline" onClick={onDismiss} />
          <Button title={text.saveQuestion} onClick={() => submit()} />
        </>
      }
    >
      <form className="cb-auth__form" onSubmit={submit} noValidate>
        <TextField
          label={text.questionLabel}
          placeholder={text.questionPlaceholder}
          value={value.label}
          onChange={(label) => update({ ...value, label })}
          errorMessage={error?.code === 'questionLabelRequired' ? error.message : null}
        />
        <SelectField
          label={text.questionType}
          placeholder={strings.common.select}
          options={optionsOf(QUESTION_TYPES, QUESTION_TYPE_LABEL)}
          value={value.type}
          onChange={(type) => setType(type as QuestionType)}
        />
        {value.type === 'MULTIPLA' && (
          <>
            <p className="cb-label">{text.optionsLabel}</p>
            {value.options.map((option, index) => (
              <div key={index} className="cb-option-row">
                <Icon name="drag_indicator" size={20} tone="tertiary" />
                <input
                  className="cb-option-row__input"
                  value={option}
                  placeholder={text.optionPlaceholder}
                  aria-label={`${text.optionPlaceholder} ${index + 1}`}
                  onChange={(event) =>
                    update({
                      ...value,
                      options: value.options.map((item, position) =>
                        position === index ? event.target.value : item,
                      ),
                    })
                  }
                />
                <IconButton
                  icon="close"
                  size={20}
                  label={text.removeOption}
                  onClick={() =>
                    update({
                      ...value,
                      options: value.options.filter((_, position) => position !== index),
                    })
                  }
                />
              </div>
            ))}
            {error?.code === 'questionOptionsRequired' && (
              <span className="cb-field__help" role="alert">
                {error.message}
              </span>
            )}
            <div>
              <Button
                title={text.addOption}
                kind="secondary"
                size="sm"
                onClick={() => update({ ...value, options: [...value.options, ''] })}
              />
            </div>
          </>
        )}
        <Checkbox
          label={text.questionRequired}
          isChecked={value.isRequired}
          onChange={(isRequired) => update({ ...value, isRequired })}
        />
      </form>
    </Modal>
  )
}

export function TriageStep({ draft, errors, onChange }: StepProps) {
  const isEditable = canEditTriage(draft)
  const [editing, setEditing] = useState<{ question: TriageQuestion; isNew: boolean } | null>(null)
  const [newDocument, setNewDocument] = useState<string | null>(null)
  const questionsError = messageOf(errors, 'questions')
  const documentsError = messageOf(errors, 'documents')

  function submitDocument(event: FormEvent) {
    event.preventDefault()
    if (newDocument === null) return
    onChange(addDocument(draft, newDocument))
    setNewDocument(null)
  }

  return (
    <>
      <div className="cb-row cb-row--tight" role="radiogroup" aria-label={text.triageModeLabel}>
        <OptionCard
          title={text.triageDefault}
          description={text.triageDefaultHint}
          isSelected={draft.triageMode === 'PADRAO'}
          onSelect={() => onChange(applyTriageMode(draft, 'PADRAO'))}
        />
        <OptionCard
          title={text.triageCustom}
          description={text.triageCustomHint}
          isSelected={draft.triageMode === 'PERSONALIZADO'}
          onSelect={() => onChange(applyTriageMode(draft, 'PERSONALIZADO'))}
        />
      </div>

      <Panel title={text.questions} gap="md">
        {draft.questions.map((question) => (
          <div key={question.id} className="cb-question">
            {isEditable ? (
              <button
                type="button"
                className="cb-question__label cb-question__label--button"
                title={`${text.edit}: ${question.label}`}
                onClick={() => setEditing({ question, isNew: false })}
              >
                {question.label}
              </button>
            ) : (
              <span className="cb-question__label" title={question.label}>
                {question.label}
              </span>
            )}
            <span className="cb-question__tags">
              <Chip label={QUESTION_TYPE_LABEL[question.type]} />
              <Chip
                label={question.isRequired ? text.required : text.optional}
                isSelected={question.isRequired}
              />
            </span>
            {isEditable && (
              <Button
                title={text.remove}
                kind="dangerSoft"
                size="sm"
                onClick={() => onChange(removeQuestion(draft, question.id))}
              />
            )}
          </div>
        ))}
        {questionsError && (
          <span className="cb-field__help" role="alert">
            {questionsError}
          </span>
        )}
        {isEditable && (
          <div>
            <Button
              title={text.addQuestion}
              kind="secondary"
              size="sm"
              onClick={() => setEditing({ question: newQuestion(), isNew: true })}
            />
          </div>
        )}
      </Panel>

      <Panel title={text.documentsTitle} gap="md">
        <div className="cb-chips">
          {draft.documents.map((document) => {
            const isSelected = draft.selectedDocumentIds.includes(document.id)
            return (
              <Chip
                key={document.id}
                label={document.label}
                isSelected={isSelected}
                onClick={isEditable ? () => onChange(toggleDocument(draft, document.id)) : undefined}
              />
            )
          })}
        </div>
        {documentsError && (
          <span className="cb-field__help" role="alert">
            {documentsError}
          </span>
        )}
        {isEditable && newDocument === null && (
          <div>
            <Button
              title={text.addDocument}
              kind="secondary"
              size="sm"
              onClick={() => setNewDocument('')}
            />
          </div>
        )}
        {isEditable && newDocument !== null && (
          <form className="cb-inline-form" onSubmit={submitDocument}>
            <TextField
              label={text.newDocumentLabel}
              placeholder={text.newDocument}
              value={newDocument}
              onChange={setNewDocument}
            />
            <Button title={strings.common.cancel} kind="outline" onClick={() => setNewDocument(null)} />
            <Button title={text.add} type="submit" isEnabled={newDocument.trim() !== ''} />
          </form>
        )}
      </Panel>

      {editing && (
        <QuestionModal
          question={editing.question}
          isNew={editing.isNew}
          onDismiss={() => setEditing(null)}
          onSave={(question) => {
            onChange(saveQuestion(draft, question))
            setEditing(null)
          }}
        />
      )}
    </>
  )
}
