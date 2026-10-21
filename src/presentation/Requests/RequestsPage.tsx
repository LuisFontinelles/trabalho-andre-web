import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDependencies } from '@/app/session'
import { EmptyState, Skeleton } from '@/designSystem/components'
import { CbIcon } from '@/designSystem/tokens/icons'
import {
  REQUEST_FILTERS,
  REQUEST_FILTER_LABEL,
  REQUEST_STATUS_LABEL,
  countByFilter,
  filterRequests,
  relativeDay,
  type ReceivedRequest,
  type RequestFilter,
  type RequestStatus,
} from '@/domain/professional'
import { strings } from '@/resources/strings'

const STATUS_CLASS: Record<RequestStatus, string> = {
  NOVA: 'cb-status--new',
  EM_ANALISE: 'cb-status--review',
  APROVADA: 'cb-status--approved',
  RECUSADA: 'cb-status--rejected',
}

type State =
  | { status: 'loading' }
  | { status: 'loaded'; items: readonly ReceivedRequest[] }
  | { status: 'failed' }

export function RequestsPage() {
  const dependencies = useDependencies()
  const navigate = useNavigate()
  const [state, setState] = useState<State>({ status: 'loading' })
  const [filter, setFilter] = useState<RequestFilter>('TODAS')

  const load = useCallback(async () => {
    setState({ status: 'loading' })
    try {
      const items = await dependencies.professionalRepository.receivedRequests()
      setState({ status: 'loaded', items })
    } catch {
      setState({ status: 'failed' })
    }
  }, [dependencies])

  useEffect(() => {
    void load()
  }, [load])

  const all = state.status === 'loaded' ? state.items : []
  const visible = filterRequests(all, filter)

  return (
    <>
      <header className="cb-page-header">
        <h1 className="cb-page-header__title cb-page-header__title--brand">
          {strings.requests.title}
        </h1>
        <p className="cb-page-header__subtitle">{strings.requests.subtitle}</p>
      </header>

      <div className="cb-chip-group">
        {REQUEST_FILTERS.map((option) => (
          <button
            key={option}
            type="button"
            className={['cb-chip', option === filter ? 'cb-chip--selected' : '']
              .filter(Boolean)
              .join(' ')}
            aria-pressed={option === filter}
            onClick={() => setFilter(option)}
          >
            {REQUEST_FILTER_LABEL[option]} ({countByFilter(all, option)})
          </button>
        ))}
      </div>

      {state.status === 'loading' && <Skeleton height={220} />}

      {state.status === 'failed' && (
        <EmptyState
          icon={<CbIcon.offline size={44} />}
          title={strings.requests.emptyTitle}
          message={strings.requests.errorMessage}
          actionTitle={strings.common.retry}
          onAction={() => void load()}
        />
      )}

      {state.status === 'loaded' && visible.length === 0 && (
        <EmptyState
          icon={<CbIcon.inbox size={44} />}
          title={strings.requests.emptyTitle}
          message={strings.requests.emptyMessage}
        />
      )}

      {state.status === 'loaded' && visible.length > 0 && (
        <div className="cb-table__scroll">
          <table className="cb-table">
            <thead>
              <tr>
                <th>{strings.requests.columnPatient}</th>
                <th>{strings.requests.columnOpportunity}</th>
                <th>{strings.requests.columnReceived}</th>
                <th>{strings.requests.columnStatus}</th>
                <th>
                  <span className="cb-visually-hidden">{strings.common.continue}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => (
                <tr key={item.id}>
                  <td className="cb-table__name">{item.patientName}</td>
                  <td>{item.opportunityTitle}</td>
                  <td>{relativeDay(item.receivedAt)}</td>
                  <td>
                    <span className={`cb-status ${STATUS_CLASS[item.status]}`}>
                      <span className="cb-status__dot" />
                      {REQUEST_STATUS_LABEL[item.status]}
                    </span>
                  </td>
                  <td>
                    <div className="cb-table__actions">
                      <button
                        type="button"
                        className={[
                          'cb-action',
                          item.canMessage ? 'cb-action--edit' : 'cb-action--ghost',
                          item.hasUnreadMessage ? 'cb-message-dot' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        aria-label={
                          item.hasUnreadMessage ? strings.requests.unread : undefined
                        }
                        onClick={() => navigate(`/solicitacoes/${item.id}`)}
                      >
                        {item.canMessage ? strings.requests.message : strings.requests.view}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
