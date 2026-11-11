import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useDependencies, useSession } from '@/app/session'
import {
  ActionMenu,
  Badge,
  Banner,
  Button,
  DataTable,
  Modal,
  PageHeader,
  SkeletonRows,
  StatCard,
  StateBox,
  useViewport,
  type TableColumn,
} from '@/designSystem/components'
import {
  ACCESS_MODE_LABEL,
  OPPORTUNITY_STATUS_LABEL,
  OPPORTUNITY_STATUS_TONE,
  canClose,
  canDelete,
  canEdit,
  summarize,
  vacancySummary,
  type ManagedOpportunity,
} from '@/domain/professional'
import { strings } from '@/resources/strings'

type State =
  | { status: 'loading' }
  | { status: 'loaded'; items: readonly ManagedOpportunity[]; acceptedCount: number }
  | { status: 'failed' }

type Pending = { action: 'close' | 'delete'; item: ManagedOpportunity }

const text = strings.myOpportunities

export function MyOpportunitiesPage() {
  const dependencies = useDependencies()
  const session = useSession()
  const navigate = useNavigate()
  const location = useLocation()
  const viewport = useViewport()
  const [state, setState] = useState<State>({ status: 'loading' })
  // Aviso que a tela de edicao deixa ao voltar ("Rascunho salvo.").
  const [notice, setNotice] = useState<string | null>(
    (location.state as { notice?: string } | null)?.notice ?? null,
  )
  const [error, setError] = useState<string | null>(null)
  const [isBusy, setBusy] = useState(false)
  const [pending, setPending] = useState<Pending | null>(null)

  const load = useCallback(async () => {
    setState({ status: 'loading' })
    try {
      const repository = dependencies.professionalRepository
      const [items, requests] = await Promise.all([
        repository.myOpportunities(),
        // O indicador "Aceitas" conta as solicitacoes aprovadas. Se a lista
        // de pedidos falhar, as oportunidades continuam aparecendo.
        repository.receivedRequests().catch(() => []),
      ])
      setState({
        status: 'loaded',
        items,
        acceptedCount: requests.filter((item) => item.status === 'APROVADA').length,
      })
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
        setNotice(text.closed)
      } else {
        await dependencies.professionalRepository.deleteOpportunity(item.id)
        setNotice(text.deleted)
      }
      setPending(null)
      await load()
    } catch {
      setError(strings.common.failed)
      setPending(null)
    } finally {
      setBusy(false)
    }
  }

  const { isVerified, registration } = session.profile
  const items = state.status === 'loaded' ? state.items : []
  const summary = summarize(items, state.status === 'loaded' ? state.acceptedCount : 0)
  const isEmpty = state.status === 'loaded' && items.length === 0
  const goToNew = () => navigate('/oportunidades/nova')
  const goToEdit = (item: ManagedOpportunity) => navigate(`/oportunidades/${item.id}/editar`)

  const statusBadge = (item: ManagedOpportunity) => (
    <Badge
      text={OPPORTUNITY_STATUS_LABEL[item.status]}
      tone={OPPORTUNITY_STATUS_TONE[item.status]}
    />
  )

  /** Rascunho se exclui; o que ja foi publicado se encerra. */
  const secondAction = (item: ManagedOpportunity) =>
    canDelete(item) ? (
      <Button
        title={text.remove}
        kind="dangerSoft"
        size="sm"
        onClick={() => setPending({ action: 'delete', item })}
      />
    ) : (
      <Button
        title={text.close}
        kind="outline"
        size="sm"
        isEnabled={canClose(item)}
        onClick={() => setPending({ action: 'close', item })}
      />
    )

  const editButton = (item: ManagedOpportunity) => (
    <Button
      title={text.edit}
      kind="secondary"
      size="sm"
      isEnabled={canEdit(item)}
      onClick={() => goToEdit(item)}
    />
  )

  const title: TableColumn<ManagedOpportunity> = { title: text.columnTitle, cell: (item) => item.title }
  const columns: TableColumn<ManagedOpportunity>[] =
    viewport === 'desktop'
      ? [
          title,
          { title: text.columnAccess, width: 140, cell: (item) => ACCESS_MODE_LABEL[item.accessMode] },
          { title: text.columnVacancies, width: 100, cell: vacancySummary },
          { title: text.columnRequests, width: 120, cell: (item) => item.applicationCount },
          { title: text.columnStatus, width: 130, cell: statusBadge },
        ]
      : [
          title,
          { title: text.columnVacancies, width: 90, cell: vacancySummary },
          { title: text.columnStatus, width: 120, cell: statusBadge },
        ]

  return (
    <>
      <PageHeader
        crumbs={[{ label: text.title }]}
        title={text.title}
        subtitle={text.subtitle}
        action={<Button title={text.newOpportunity} onClick={goToNew} />}
      />

      {!isVerified && <Banner message={text.underReviewBanner(registration)} tone="warning" icon="hourglass_top" />}
      {notice && <Banner message={notice} tone="success" />}
      {error && <Banner message={error} tone="danger" />}

      {state.status === 'loading' && <SkeletonRows />}

      {state.status === 'failed' && (
        <StateBox icon="cloud_off" title={text.errorTitle} message={text.errorMessage}>
          <Button title={strings.common.retry} onClick={() => void load()} />
        </StateBox>
      )}

      {isEmpty && (
        <StateBox icon="medical_services" title={text.emptyTitle} message={text.emptyMessage}>
          <Button title={text.newOpportunity} onClick={goToNew} />
        </StateBox>
      )}

      {state.status === 'loaded' && !isEmpty && (
        <>
          <section className="cb-stats">
            <StatCard tone="brand" value={summary.activeCount} label={text.active} />
            <StatCard tone="warning" value={summary.requestCount} label={text.requests} />
            <StatCard tone="neutral" value={summary.acceptedCount} label={text.accepted} />
          </section>

          {viewport === 'mobile' ? (
            <div className="cb-card-list">
              {items.map((item) => (
                <article key={item.id} className="cb-list-card">
                  <div className="cb-list-card__top">
                    <h2 className="cb-list-card__title">{item.title}</h2>
                    {statusBadge(item)}
                  </div>
                  <p className="cb-callout">
                    {text.cardSummary(
                      ACCESS_MODE_LABEL[item.accessMode],
                      vacancySummary(item),
                      item.applicationCount,
                    )}
                  </p>
                  <div className="cb-list-card__actions">
                    {editButton(item)}
                    {secondAction(item)}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <DataTable
              columns={columns}
              items={items}
              rowKey={(item) => item.id}
              actionsWidth={viewport === 'desktop' ? 250 : 150}
              actions={(item) =>
                viewport === 'desktop' ? (
                  <>
                    {editButton(item)}
                    {secondAction(item)}
                  </>
                ) : (
                  <>
                    {editButton(item)}
                    <ActionMenu
                      label={strings.common.moreActions}
                      actions={[
                        canDelete(item)
                          ? {
                              label: text.remove,
                              isDanger: true,
                              onSelect: () => setPending({ action: 'delete', item }),
                            }
                          : {
                              label: text.close,
                              isEnabled: canClose(item),
                              onSelect: () => setPending({ action: 'close', item }),
                            },
                      ]}
                    />
                  </>
                )
              }
            />
          )}
        </>
      )}

      {pending?.action === 'delete' && (
        <Modal
          title={text.deleteTitle}
          message={text.deleteMessage(pending.item.title)}
          onDismiss={() => setPending(null)}
          actions={
            <>
              <Button title={strings.common.cancel} kind="outline" onClick={() => setPending(null)} />
              <Button
                title={text.deleteConfirm}
                kind="danger"
                isLoading={isBusy}
                onClick={() => void confirmPending()}
              />
            </>
          }
        />
      )}

      {pending?.action === 'close' && (
        <Modal
          title={text.closeTitle}
          message={text.closeMessage(pending.item.applicationCount)}
          onDismiss={() => setPending(null)}
          actions={
            <>
              <Button title={strings.common.cancel} kind="outline" onClick={() => setPending(null)} />
              <Button
                title={text.closeConfirm}
                kind="danger"
                isLoading={isBusy}
                onClick={() => void confirmPending()}
              />
            </>
          }
        />
      )}
    </>
  )
}
