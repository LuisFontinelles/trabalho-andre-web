import { useCallback, useEffect, useState } from 'react'
import { useDependencies } from '@/app/session'
import {
  Banner,
  Button,
  DataTable,
  Modal,
  PageHeader,
  SkeletonRows,
  StateBox,
  useViewport,
  type TableColumn,
} from '@/designSystem/components'
import { NetworkError } from '@/data/network/httpClient'
import type { PendingProfessional } from '@/domain/entities'
import { strings } from '@/resources/strings'

type State =
  | { status: 'loading' }
  | { status: 'loaded'; items: readonly PendingProfessional[] }
  | { status: 'failed' }

type Decision = { action: 'approve' | 'reject'; professional: PendingProfessional }

const text = strings.admin

export function AdminProfessionalsPage() {
  const dependencies = useDependencies()
  const viewport = useViewport()
  const [state, setState] = useState<State>({ status: 'loading' })
  const [decision, setDecision] = useState<Decision | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isBusy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setState({ status: 'loading' })
    setError(null)
    try {
      const items = await dependencies.adminRepository.pendingProfessionals()
      setState({ status: 'loaded', items })
    } catch {
      setState({ status: 'failed' })
    }
  }, [dependencies])

  useEffect(() => {
    void load()
  }, [load])

  async function confirmDecision() {
    if (decision === null) return
    const { action, professional } = decision
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      if (action === 'approve') {
        await dependencies.adminRepository.approveProfessional(professional.id)
        setNotice(text.approved(professional.name))
      } else {
        await dependencies.adminRepository.rejectProfessional(professional.id)
        setNotice(text.rejected(professional.name))
      }
      setState((current) =>
        current.status === 'loaded'
          ? { status: 'loaded', items: current.items.filter((item) => item.id !== professional.id) }
          : current,
      )
      setDecision(null)
    } catch (caught) {
      setError(
        caught instanceof NetworkError && caught.apiMessage
          ? caught.apiMessage
          : text.actionFailed,
      )
      setDecision(null)
    } finally {
      setBusy(false)
    }
  }

  const items = state.status === 'loaded' ? state.items : []
  const isEmpty = state.status === 'loaded' && items.length === 0
  const columns: TableColumn<PendingProfessional>[] = viewport === 'desktop'
    ? [
        { title: text.columnProfessional, cell: (item) => <>{item.name}<br /><span className="cb-caption">{item.email}</span></> },
        { title: text.columnRegistration, width: 170, cell: (item) => [item.council, item.state, item.registrationNumber].filter(Boolean).join(' ') },
        { title: text.columnSpecialty, width: 170, cell: (item) => item.specialty || '—' },
        { title: text.columnWorkplace, width: 210, cell: (item) => item.workplace || '—' },
      ]
    : [
        { title: text.columnProfessional, cell: (item) => <>{item.name}<br /><span className="cb-caption">{item.email}</span></> },
        { title: text.columnRegistration, width: 170, cell: (item) => [item.council, item.state, item.registrationNumber].filter(Boolean).join(' ') },
      ]

  const actions = (professional: PendingProfessional) => (
    <div className="cb-list-card__actions">
      <Button title={text.reject} kind="dangerSoft" size="sm" onClick={() => setDecision({ action: 'reject', professional })} />
      <Button title={text.approve} size="sm" onClick={() => setDecision({ action: 'approve', professional })} />
    </div>
  )

  return (
    <>
      <PageHeader crumbs={[{ label: text.area }]} title={text.title} subtitle={text.subtitle} />
      {notice && <Banner message={notice} tone="success" />}
      {error && <Banner message={error} tone="danger" />}
      {state.status === 'loading' && <SkeletonRows />}
      {state.status === 'failed' && (
        <StateBox icon="cloud_off" title={text.errorTitle} message={text.errorMessage}>
          <Button title={strings.common.retry} onClick={() => void load()} />
        </StateBox>
      )}
      {isEmpty && <StateBox icon="inbox" title={text.emptyTitle} message={text.emptyMessage} />}
      {state.status === 'loaded' && !isEmpty && (
        viewport === 'mobile' ? (
          <div className="cb-card-list">
            {items.map((item) => (
              <article key={item.id} className="cb-list-card">
                <div className="cb-list-card__top"><h2 className="cb-list-card__title">{item.name}</h2></div>
                <p className="cb-caption">{item.email}</p>
                <p className="cb-callout">{[item.council, item.state, item.registrationNumber].filter(Boolean).join(' ')}</p>
                <p className="cb-caption">{[item.specialty, item.workplace].filter(Boolean).join(' · ')}</p>
                {actions(item)}
              </article>
            ))}
          </div>
        ) : (
          <DataTable columns={columns} items={items} rowKey={(item) => item.id} actions={actions} actionsWidth={190} />
        )
      )}
      {decision && (
        <Modal
          title={decision.action === 'approve' ? text.approveTitle : text.rejectTitle}
          message={decision.action === 'approve' ? text.approveMessage(decision.professional.name) : text.rejectMessage(decision.professional.name)}
          onDismiss={() => { if (!isBusy) setDecision(null) }}
          actions={
            <>
              <Button title={strings.common.cancel} kind="ghost" isEnabled={!isBusy} onClick={() => setDecision(null)} />
              <Button
                title={decision.action === 'approve' ? text.approveConfirm : text.rejectConfirm}
                kind={decision.action === 'approve' ? 'primary' : 'danger'}
                isLoading={isBusy}
                onClick={() => void confirmDecision()}
              />
            </>
          }
        />
      )}
    </>
  )
}