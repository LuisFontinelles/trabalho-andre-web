import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDependencies } from '@/app/session'
import { Banner, ConfirmDialog, EmptyState, Skeleton } from '@/designSystem/components'
import { CbIcon } from '@/designSystem/tokens/icons'
import {
  ACCESS_MODE_LABEL,
  OPPORTUNITY_STATUS_LABEL,
  canClose,
  canDelete,
  canEdit,
  summarize,
  vacancySummary,
  type ManagedOpportunity,
  type OpportunityStatus,
} from '@/domain/professional'
import { strings } from '@/resources/strings'

const STATUS_CLASS: Record<OpportunityStatus, string> = {
  ATIVA: 'cb-status--active',
  ENCERRADA: 'cb-status--closed',
  RASCUNHO: 'cb-status--draft',
}

type State =
  | { status: 'loading' }
  | { status: 'loaded'; items: readonly ManagedOpportunity[] }
  | { status: 'failed' }

export function MyOpportunitiesPage() {
  const dependencies = useDependencies()
  const navigate = useNavigate()
  const [state, setState] = useState<State>({ status: 'loading' })
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isBusy, setBusy] = useState(false)
  const [pending, setPending] = useState<
    { action: 'close' | 'delete'; item: ManagedOpportunity } | null
  >(null)

  const load = useCallback(async () => {
    setState({ status: 'loading' })
    try {
      const items = await dependencies.professionalRepository.myOpportunities()
      setState({ status: 'loaded', items })
    } catch {
      setState({ status: 'failed' })
    }
  }, [dependencies])

  useEffect(() => {
    void load()
  }, [load])

  async function confirmPending() {
    if (pending === null) return
    const { action, item } = pending
    setBusy(true)
    setNotice(null)
    setError(null)
    try {
      if (action === 'close') {
        await dependencies.professionalRepository.closeOpportunity(item.id)
        setNotice(strings.myOpportunities.closed)
      } else {
        await dependencies.professionalRepository.deleteOpportunity(item.id)
        setNotice(strings.myOpportunities.deleted)
      }
      setPending(null)
      await load()
    } catch {
      setError(strings.myOpportunities.errorMessage)
      setPending(null)
    } finally {
      setBusy(false)
    }
  }

  const items = state.status === 'loaded' ? state.items : []
  const summary = summarize(items, 5)

  return (
    <>
      <header className="cb-page-header">
        <h1 className="cb-page-header__title cb-page-header__title--brand">
          {strings.myOpportunities.title}
        </h1>
        <p className="cb-page-header__subtitle">{strings.myOpportunities.subtitle}</p>
      </header>

      <section className="cb-metrics">
        <div className="cb-stat cb-stat--active">
          <p className="cb-stat__value">{summary.activeCount}</p>
          <p className="cb-stat__label">{strings.myOpportunities.active}</p>
        </div>
        <div className="cb-stat cb-stat--requests">
          <p className="cb-stat__value">{summary.requestCount}</p>
          <p className="cb-stat__label">{strings.myOpportunities.requests}</p>
        </div>
        <div className="cb-stat cb-stat--accepted">
          <p className="cb-stat__value">{summary.acceptedCount}</p>
          <p className="cb-stat__label">{strings.myOpportunities.accepted}</p>
        </div>
      </section>

      {notice && <Banner message={notice} tone="success" />}
      {error && <Banner message={error} />}

      {state.status === 'loading' && <Skeleton height={240} />}

      {state.status === 'failed' && (
        <EmptyState
          icon={<CbIcon.offline size={44} />}
          title={strings.myOpportunities.errorTitle}
          message={strings.myOpportunities.errorMessage}
          actionTitle={strings.common.retry}
          onAction={() => void load()}
        />
      )}

      {state.status === 'loaded' && items.length === 0 && (
        <EmptyState
          icon={<CbIcon.opportunity size={44} />}
          title={strings.myOpportunities.emptyTitle}
          message={strings.myOpportunities.emptyMessage}
          actionTitle={strings.myOpportunities.newOpportunity}
          onAction={() => navigate('/oportunidades/nova')}
        />
      )}

      {state.status === 'loaded' && items.length > 0 && (
        <div className="cb-table__scroll">
          <table className="cb-table">
            <thead>
              <tr>
                <th>{strings.myOpportunities.columnTitle}</th>
                <th>{strings.myOpportunities.columnAccess}</th>
                <th>{strings.myOpportunities.columnVacancies}</th>
                <th>{strings.myOpportunities.columnRequests}</th>
                <th>{strings.myOpportunities.columnStatus}</th>
                <th>
                  <span className="cb-visually-hidden">
                    {strings.myOpportunities.columnActions}
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="cb-table__name">{item.title}</td>
                  <td>{ACCESS_MODE_LABEL[item.accessMode]}</td>
                  <td>{vacancySummary(item)}</td>
                  <td>{item.applicationCount}</td>
                  <td>
                    <span className={`cb-status ${STATUS_CLASS[item.status]}`}>
                      <span className="cb-status__dot" />
                      {OPPORTUNITY_STATUS_LABEL[item.status]}
                    </span>
                  </td>
                  <td>
                    <div className="cb-table__actions">
                      <button
                        type="button"
                        className="cb-action cb-action--edit"
                        disabled={!canEdit(item) || isBusy}
                        title={
                          canEdit(item)
                            ? undefined
                            : strings.myOpportunities.cannotEditClosed
                        }
                        onClick={() => navigate(`/oportunidades/${item.id}/editar`)}
                      >
                        {strings.myOpportunities.edit}
                      </button>
                      <button
                        type="button"
                        className="cb-action cb-action--close"
                        disabled={!canClose(item) || isBusy}
                        onClick={() => setPending({ action: 'close', item })}
                      >
                        {strings.myOpportunities.close}
                      </button>
                      <button
                        type="button"
                        className="cb-action cb-action--delete"
                        disabled={!canDelete() || isBusy}
                        onClick={() => setPending({ action: 'delete', item })}
                      >
                        {strings.myOpportunities.remove}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button
        type="button"
        className="cb-fab"
        onClick={() => navigate('/oportunidades/nova')}
      >
        {strings.myOpportunities.newOpportunity}
      </button>

      <ConfirmDialog
        isOpen={pending !== null}
        title={
          pending?.action === 'delete'
            ? strings.myOpportunities.deleteTitle
            : strings.myOpportunities.closeTitle
        }
        message={
          pending?.action === 'delete'
            ? strings.myOpportunities.deleteMessage
            : strings.myOpportunities.closeMessage
        }
        confirmTitle={
          pending?.action === 'delete'
            ? strings.myOpportunities.remove
            : strings.myOpportunities.close
        }
        cancelTitle={strings.myOpportunities.cancel}
        isDestructive={pending?.action === 'delete'}
        isBusy={isBusy}
        onConfirm={() => void confirmPending()}
        onCancel={() => setPending(null)}
      />
    </>
  )
}
