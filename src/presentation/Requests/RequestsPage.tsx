import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDependencies } from '@/app/session'
import {
  Badge,
  Button,
  Chip,
  DataTable,
  PageHeader,
  SkeletonRows,
  StateBox,
  useViewport,
  type TableColumn,
} from '@/designSystem/components'
import {
  REQUEST_FILTERS,
  REQUEST_FILTER_LABEL,
  REQUEST_STATUS_LABEL,
  REQUEST_STATUS_TONE,
  countByFilter,
  filterRequests,
  relativeDay,
  type ReceivedRequest,
  type RequestFilter,
} from '@/domain/professional'
import { strings } from '@/resources/strings'

type State =
  | { status: 'loading' }
  | { status: 'loaded'; items: readonly ReceivedRequest[] }
  | { status: 'failed' }

const text = strings.requests

export function RequestsPage() {
  const dependencies = useDependencies()
  const navigate = useNavigate()
  const viewport = useViewport()
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

  const items = state.status === 'loaded' ? state.items : []
  const visible = filterRequests(items, filter)
  const isEmpty = state.status === 'loaded' && items.length === 0
  const open = (item: ReceivedRequest) => navigate(`/solicitacoes/${item.id}`)

  const statusBadge = (item: ReceivedRequest) => (
    <Badge text={REQUEST_STATUS_LABEL[item.status]} tone={REQUEST_STATUS_TONE[item.status]} />
  )
  const viewButton = (item: ReceivedRequest) => (
    <Button title={text.view} kind="secondary" size="sm" onClick={() => open(item)} />
  )
  // As mensagens abrem no detalhe, e so existem depois da aprovacao.
  const messageButton = (item: ReceivedRequest) => (
    <Button
      title={text.message}
      kind="ghost"
      size="sm"
      isEnabled={item.canMessage}
      onClick={() => open(item)}
    />
  )

  const patient: TableColumn<ReceivedRequest> = {
    title: text.columnPatient,
    cell: (item) => item.patientName,
  }
  const received = (width: number): TableColumn<ReceivedRequest> => ({
    title: text.columnReceived,
    width,
    cell: (item) => relativeDay(item.receivedAt),
  })
  const columns: TableColumn<ReceivedRequest>[] =
    viewport === 'desktop'
      ? [
          patient,
          { title: text.columnOpportunity, width: 260, cell: (item) => item.opportunityTitle },
          received(120),
          { title: text.columnStatus, width: 140, cell: statusBadge },
        ]
      : [patient, received(100), { title: text.columnStatus, width: 130, cell: statusBadge }]

  return (
    <>
      <PageHeader
        crumbs={[{ label: text.title }]}
        title={text.title}
        subtitle={isEmpty ? text.emptySubtitle : text.subtitle}
      />

      {state.status === 'loading' && <SkeletonRows />}

      {state.status === 'failed' && (
        <StateBox icon="cloud_off" title={text.errorTitle} message={text.errorMessage}>
          <Button title={strings.common.retry} onClick={() => void load()} />
        </StateBox>
      )}

      {isEmpty && (
        <StateBox icon="inbox" title={text.emptyTitle} message={text.emptyMessage}>
          <Button
            title={text.seeOpportunities}
            kind="secondary"
            onClick={() => navigate('/oportunidades')}
          />
        </StateBox>
      )}

      {state.status === 'loaded' && !isEmpty && (
        <>
          <div className="cb-chips cb-chips--scroll">
            {REQUEST_FILTERS.map((item) => (
              <Chip
                key={item}
                label={text.filterLabel(REQUEST_FILTER_LABEL[item], countByFilter(items, item))}
                isSelected={filter === item}
                onClick={() => setFilter(item)}
              />
            ))}
          </div>

          {visible.length === 0 ? (
            <StateBox icon="inbox" title={text.emptyFilterTitle} message={text.emptyFilterMessage} />
          ) : viewport === 'mobile' ? (
            <div className="cb-card-list">
              {visible.map((item) => (
                <article key={item.id} className="cb-list-card">
                  <div className="cb-list-card__top">
                    <h2 className="cb-list-card__title">{item.patientName}</h2>
                    {statusBadge(item)}
                  </div>
                  <p className="cb-callout">
                    {item.opportunityTitle} · {relativeDay(item.receivedAt)}
                  </p>
                  <div className="cb-list-card__actions">
                    {viewButton(item)}
                    {messageButton(item)}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <DataTable
              columns={columns}
              items={visible}
              rowKey={(item) => item.id}
              actionsWidth={viewport === 'desktop' ? 250 : 150}
              actions={(item) =>
                viewport === 'desktop' ? (
                  <>
                    {viewButton(item)}
                    {messageButton(item)}
                  </>
                ) : (
                  viewButton(item)
                )
              }
            />
          )}
        </>
      )}
    </>
  )
}
