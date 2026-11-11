import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useDependencies, useSession } from '@/app/session'
import {
  Banner,
  Button,
  PageHeader,
  SkeletonRows,
  StateBox,
  Stepper,
  type Crumb,
} from '@/designSystem/components'
import { draftFromManagedOpportunity } from '@/data/professionalMappers'
import { EMPTY_FILTER_CATALOG, type FilterCatalog } from '@/domain/entities'
import {
  DRAFT_STEPS,
  DRAFT_STEP_LABEL,
  canSaveAsDraft,
  emptyOpportunityDraft,
  errorCount,
  nextStep,
  previousStep,
  stepErrors,
  type DraftErrors,
  type DraftStep,
  type OpportunityDraft,
} from '@/domain/opportunityDraft'
import { shortDate, type ManagedOpportunity } from '@/domain/professional'
import { AccessStep, BasicsStep, TriageStep } from '@/presentation/NewOpportunity/Steps'
import { strings } from '@/resources/strings'

const text = strings.newOpportunity

/** "2026-12-10" vira "10/12/2026", como a tela de publicada mostra. */
function longDate(iso: string): string {
  const day = shortDate(iso)
  return day === '' ? '' : `${day}/${iso.slice(0, 4)}`
}

export function NewOpportunityPage() {
  const dependencies = useDependencies()
  const session = useSession()
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = id !== undefined

  const [draft, setDraft] = useState<OpportunityDraft>(emptyOpportunityDraft)
  const [original, setOriginal] = useState<ManagedOpportunity | null>(null)
  const [step, setStep] = useState<DraftStep>('DADOS')
  const [catalog, setCatalog] = useState<FilterCatalog>(EMPTY_FILTER_CATALOG)
  const [errors, setErrors] = useState<DraftErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState<'publish' | 'draft' | null>(null)
  const [isLoading, setLoading] = useState(isEditing)
  const [published, setPublished] = useState<ManagedOpportunity | null>(null)

  // Na edicao o formulario abre com o que ja esta salvo.
  useEffect(() => {
    if (id === undefined) return
    let active = true
    dependencies.professionalRepository
      .opportunity(id)
      .then((item) => {
        if (!active) return
        setOriginal(item)
        setDraft(draftFromManagedOpportunity(item))
        setLoading(false)
      })
      .catch(() => {
        if (!active) return
        setFormError(text.loadFailed)
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

  // O que ja foi publicado nao volta a ser rascunho; so se salvam alteracoes.
  const isPublishedItem = original !== null && original.status !== 'RASCUNHO'
  const canPublish = session.profile.isVerified

  function change(next: OpportunityDraft) {
    setDraft(next)
    // Depois da primeira tentativa os erros acompanham a digitacao.
    if (errorCount(errors) > 0) setErrors(stepErrors(next, step))
    setFormError(null)
  }

  function advance() {
    const found = stepErrors(draft, step)
    if (errorCount(found) > 0) {
      setErrors(found)
      window.scrollTo({ top: 0 })
      return
    }
    setErrors({})
    const following = nextStep(step)
    if (following !== null) {
      setStep(following)
      window.scrollTo({ top: 0 })
      return
    }
    void publish()
  }

  async function publish() {
    setBusy('publish')
    setFormError(null)
    try {
      const repository = dependencies.professionalRepository
      const saved =
        id === undefined
          ? await repository.createOpportunity(draft)
          : await repository.updateOpportunity(id, draft)
      if (isPublishedItem) {
        navigate('/oportunidades', {
          replace: true,
          state: { notice: strings.myOpportunities.saved },
        })
        return
      }
      setPublished(saved)
    } catch {
      setFormError(text.failed)
    } finally {
      setBusy(null)
    }
  }

  async function saveDraft() {
    if (!canSaveAsDraft(draft)) {
      setStep('DADOS')
      setErrors({ title: 'titleRequired' })
      setFormError(text.draftNeedsTitle)
      return
    }
    setBusy('draft')
    setFormError(null)
    try {
      const repository = dependencies.professionalRepository
      if (id === undefined) await repository.createOpportunity(draft, true)
      else await repository.updateOpportunity(id, draft, true)
      navigate('/oportunidades', {
        replace: true,
        state: { notice: strings.myOpportunities.draftSaved },
      })
    } catch {
      setFormError(strings.common.failed)
    } finally {
      setBusy(null)
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

  if (published !== null) {
    return (
      <StateBox
        icon="check_circle"
        iconTone="brand"
        iconSize={64}
        title={text.publishedTitle}
        titleSize="title"
        message={text.publishedMessage(published.title, longDate(published.closesAt ?? ''))}
      >
        <span title={text.viewAsPatientHint}>
          <Button title={text.viewAsPatient} kind="outline" isEnabled={false} />
        </span>
        <Button title={text.goToList} onClick={() => navigate('/oportunidades', { replace: true })} />
      </StateBox>
    )
  }

  const stepLabel = DRAFT_STEP_LABEL[step]
  const home: Crumb = { label: strings.nav.myOpportunities, to: '/oportunidades' }
  const crumbs: Crumb[] = isEditing
    ? [home, { label: original?.title ?? text.editTitle }, { label: text.crumbEdit }, { label: stepLabel }]
    : [home, { label: text.title }, { label: stepLabel }]
  const isLast = nextStep(step) === null
  const missing = errorCount(errors)

  return (
    <>
      <PageHeader
        crumbs={crumbs}
        title={isEditing ? text.editTitle : text.title}
        subtitle={step === 'TRIAGEM' ? text.triageHint : text.requiredHint}
      />
      <Stepper labels={DRAFT_STEPS.map((item) => DRAFT_STEP_LABEL[item])} current={DRAFT_STEPS.indexOf(step)} />

      {missing > 0 && <Banner message={text.missingFields(missing)} tone="danger" />}
      {formError && <Banner message={formError} tone="danger" />}
      {isLast && !canPublish && !isPublishedItem && (
        <Banner message={text.publishLocked} tone="warning" icon="hourglass_top" />
      )}

      {isLoading ? (
        <SkeletonRows />
      ) : (
        <>
          {step === 'DADOS' && (
            <BasicsStep draft={draft} errors={errors} onChange={change} specialties={catalog.specialties} />
          )}
          {step === 'ACESSO' && <AccessStep draft={draft} errors={errors} onChange={change} />}
          {step === 'TRIAGEM' && <TriageStep draft={draft} errors={errors} onChange={change} />}

          <div className="cb-actions">
            {!isPublishedItem && (
              <Button
                title={text.saveDraft}
                kind="ghost"
                isEnabled={busy === null}
                isLoading={busy === 'draft'}
                onClick={() => void saveDraft()}
              />
            )}
            <Button
              title={step === 'DADOS' ? strings.common.cancel : strings.common.back}
              kind="outline"
              isEnabled={busy === null}
              onClick={goBack}
            />
            <Button
              title={!isLast ? strings.common.continue : isPublishedItem ? text.save : text.publish}
              isEnabled={busy === null && (!isLast || canPublish || isPublishedItem)}
              isLoading={busy === 'publish'}
              onClick={advance}
            />
          </div>
        </>
      )}
    </>
  )
}
