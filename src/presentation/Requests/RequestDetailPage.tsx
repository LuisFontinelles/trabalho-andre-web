import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { useDependencies } from '@/app/session'
import {
  Badge,
  Banner,
  Button,
  Modal,
  PageHeader,
  Panel,
  SkeletonRows,
  StateBox,
  TextAreaField,
  type Crumb,
} from '@/designSystem/components'
import { Icon } from '@/designSystem/tokens/icons'
import {
  REQUEST_STATUS_LABEL,
  REQUEST_STATUS_TONE,
  canExchangeMessages,
  documentKind,
  documentSize,
  isDecided,
  isFromProfessional,
  isValidReason,
  messageTime,
  relativeDay,
  remainingVacancies,
  responseDeadline,
  shortDate,
  type ManagedOpportunity,
  type RequestDetail,
  type RequestDocument,
} from '@/domain/professional'
import { strings } from '@/resources/strings'

const text = strings.requestDetail

type Dialog =
  | { kind: 'approve' }
  | { kind: 'reject' }
  | { kind: 'info' }
  | { kind: 'document'; document: RequestDocument }

/** "Hoje" vira "hoje" no meio da frase "Recebida hoje.". */
function lowerFirst(value: string): string {
  return value.charAt(0).toLowerCase() + value.slice(1)
}

export function RequestDetailPage() {
  const dependencies = useDependencies()
  const { id = '' } = useParams()

  const [detail, setDetail] = useState<RequestDetail | null>(null)
  const [opportunity, setOpportunity] = useState<ManagedOpportunity | null>(null)
  const [failed, setFailed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dialog, setDialog] = useState<Dialog | null>(null)
  const [dialogText, setDialogText] = useState('')
  const [dialogError, setDialogError] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [isBusy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setFailed(false)
    try {
      const repository = dependencies.professionalRepository
      const loaded = await repository.requestDetail(id)
      setDetail(loaded)
      // As vagas vem da oportunidade. Se ela nao carregar, o detalhe segue
      // sem a contagem.
      setOpportunity(await repository.opportunity(loaded.opportunityId).catch(() => null))
    } catch {
      setFailed(true)
    }
  }, [dependencies, id])

  useEffect(() => {
    void load()
  }, [load])

  function openDialog(next: Dialog, initialText = '') {
    setDialog(next)
    setDialogText(initialText)
    setDialogError(null)
  }

  async function run(action: () => Promise<RequestDetail>) {
    setBusy(true)
    setError(null)
    try {
      setDetail(await action())
      setDialog(null)
    } catch {
      setError(text.decisionFailed)
      setDialog(null)
    } finally {
      setBusy(false)
    }
  }

  function approve() {
    void run(async () => {
      const updated = await dependencies.professionalRepository.decideRequest(id, 'APROVADA')
      // A aprovacao ocupa uma vaga; a contagem da tela acompanha.
      setOpportunity((current) =>
        current === null
          ? null
          : { ...current, filledVacancies: current.filledVacancies + 1 },
      )
      return updated
    })
  }

  function reject() {
    if (!isValidReason(dialogText)) {
      setDialogError(text.rejectReasonRequired)
      return
    }
    void run(() => dependencies.professionalRepository.decideRequest(id, 'RECUSADA', dialogText))
  }

  function askInfo() {
    if (dialogText.trim() === '') {
      setDialogError(text.infoRequired)
      return
    }
    void run(() => dependencies.professionalRepository.requestInfo(id, dialogText))
  }

  async function send(event: FormEvent) {
    event.preventDefault()
    const body = message.trim()
    if (body === '' || detail === null) return
    setBusy(true)
    setError(null)
    try {
      const sent = await dependencies.professionalRepository.sendMessage(id, body)
      setDetail({ ...detail, messages: [...detail.messages, sent] })
      setMessage('')
    } catch {
      setError(text.messageFailed)
    } finally {
      setBusy(false)
    }
  }

  const home: Crumb = { label: strings.nav.requests, to: '/solicitacoes' }

  if (failed) {
    return (
      <>
        <PageHeader crumbs={[home]} title={strings.nav.requests} />
        <StateBox icon="cloud_off" title={text.notFound} message={strings.requests.errorMessage}>
          <Button title={strings.common.retry} onClick={() => void load()} />
        </StateBox>
      </>
    )
  }

  if (detail === null) {
    return (
      <>
        <PageHeader crumbs={[home]} title={strings.nav.requests} />
        <SkeletonRows />
      </>
    )
  }

  const left = opportunity === null ? null : remainingVacancies(opportunity)
  const total = opportunity?.totalVacancies ?? null
  const decided = isDecided(detail.status)
  const canMessage = canExchangeMessages(detail.status)
  const closeDialog = () => setDialog(null)

  return (
    <>
      <PageHeader
        crumbs={[home, { label: detail.patientName }]}
        title={detail.patientName}
        subtitle={text.subtitle(detail.opportunityTitle, detail.protocol)}
        action={
          <Badge text={REQUEST_STATUS_LABEL[detail.status]} tone={REQUEST_STATUS_TONE[detail.status]} />
        }
      />

      {error && <Banner message={error} tone="danger" />}

      <div className="cb-columns">
        <div className="cb-columns__main">
          <Panel title={text.triageTitle} gap="none">
            {detail.triage.map((item) => (
              <div key={item.question} className="cb-answer">
                <span className="cb-answer__key">{item.question}</span>
                <span className="cb-answer__value">{item.answer}</span>
              </div>
            ))}
          </Panel>

          <Panel title={text.documentsTitle} gap="md">
            {detail.documents.length === 0 && <p className="cb-callout">{text.noDocuments}</p>}
            {detail.documents.map((document) => (
              <div key={document.id} className="cb-file">
                <Icon name="description" size={22} tone="secondary" />
                <span className="cb-file__name">{document.name}</span>
                <Button
                  title={text.open}
                  kind="outline"
                  size="sm"
                  onClick={() => openDialog({ kind: 'document', document })}
                />
              </div>
            ))}
          </Panel>
        </div>

        <div className="cb-columns__side">
          <Panel title={text.decisionTitle} gap="md">
            {detail.status === 'APROVADA' && (
              <Banner
                message={text.approvedNote(
                  shortDate(detail.decidedAt),
                  left !== null && total !== null ? text.vacanciesLeft(left, total) : '',
                )}
                tone="success"
              />
            )}
            {detail.status === 'RECUSADA' && (
              <Banner message={text.rejectedNote(shortDate(detail.decidedAt))} tone="danger" icon="info" />
            )}
            {detail.status === 'AGUARDANDO_INFO' && (
              <Banner message={text.waitingNote} tone="warning" icon="hourglass_top" />
            )}
            {!decided && (
              <>
                <p className="cb-callout">
                  {text.pendingHint(
                    lowerFirst(relativeDay(detail.receivedAt)),
                    shortDate(responseDeadline(detail.receivedAt)),
                  )}
                  {left !== null && total !== null && text.vacanciesLeft(left, total)}
                </p>
                <Button
                  title={text.approve}
                  fillsWidth
                  isEnabled={!isBusy && left !== 0}
                  onClick={() => openDialog({ kind: 'approve' })}
                />
                <Button
                  title={text.askInfo}
                  kind="outline"
                  fillsWidth
                  isEnabled={!isBusy}
                  onClick={() => openDialog({ kind: 'info' })}
                />
                <Button
                  title={text.reject}
                  kind="dangerSoft"
                  fillsWidth
                  isEnabled={!isBusy}
                  onClick={() => openDialog({ kind: 'reject' })}
                />
              </>
            )}
          </Panel>

          <Panel title={text.messagesTitle} gap="md">
            {!canMessage ? (
              <p className="cb-callout">{text.messagesLocked}</p>
            ) : (
              <>
                {detail.messages.map((item) => (
                  <div
                    key={item.id}
                    className={`cb-message${isFromProfessional(item) ? ' cb-message--mine' : ''}`}
                  >
                    <span className="cb-message__bubble">{item.text}</span>
                    <span className="cb-message__time">{messageTime(item.sentAt)}</span>
                  </div>
                ))}
                <form className="cb-compose" onSubmit={send}>
                  <input
                    className="cb-compose__input"
                    value={message}
                    placeholder={text.messagePlaceholder}
                    aria-label={text.messagePlaceholder}
                    onChange={(event) => setMessage(event.target.value)}
                  />
                  <button
                    type="submit"
                    className="cb-compose__send"
                    aria-label={text.send}
                    disabled={isBusy}
                  >
                    <Icon name="send" size={22} tone="on-brand" />
                  </button>
                </form>
              </>
            )}
          </Panel>
        </div>
      </div>

      {dialog?.kind === 'approve' && (
        <Modal
          title={text.approveTitle(detail.patientName)}
          message={text.approveMessage(left === null ? null : Math.max(left - 1, 0), total)}
          onDismiss={closeDialog}
          actions={
            <>
              <Button title={strings.common.cancel} kind="outline" onClick={closeDialog} />
              <Button title={text.approveConfirm} isLoading={isBusy} onClick={approve} />
            </>
          }
        />
      )}

      {dialog?.kind === 'reject' && (
        <Modal
          title={text.rejectTitle(detail.patientName)}
          message={text.rejectMessage}
          onDismiss={closeDialog}
          actions={
            <>
              <Button title={strings.common.cancel} kind="outline" onClick={closeDialog} />
              <Button title={text.rejectConfirm} kind="danger" isLoading={isBusy} onClick={reject} />
            </>
          }
        >
          <TextAreaField
            label={text.rejectReason}
            placeholder={text.rejectReasonPlaceholder}
            value={dialogText}
            onChange={(value) => {
              setDialogText(value)
              setDialogError(null)
            }}
            errorMessage={dialogError}
          />
        </Modal>
      )}

      {dialog?.kind === 'info' && (
        <Modal
          title={text.infoTitle}
          message={text.infoMessage}
          onDismiss={closeDialog}
          actions={
            <>
              <Button title={strings.common.cancel} kind="outline" onClick={closeDialog} />
              <Button title={text.infoConfirm} isLoading={isBusy} onClick={askInfo} />
            </>
          }
        >
          <TextAreaField
            label={text.infoField}
            placeholder={text.infoPlaceholder}
            value={dialogText}
            onChange={(value) => {
              setDialogText(value)
              setDialogError(null)
            }}
            errorMessage={dialogError}
          />
        </Modal>
      )}

      {dialog?.kind === 'document' && (
        <Modal
          title={dialog.document.name}
          message={text.documentMeta(
            detail.patientName,
            shortDate(dialog.document.sentAt),
            documentKind(dialog.document),
            documentSize(dialog.document),
          )}
          onDismiss={closeDialog}
          actions={
            <>
              {/* O arquivo ainda nao vem da API: baixar fica visivel e travado. */}
              <Button title={text.download} kind="outline" isEnabled={false} />
              <Button
                title={text.askResend}
                kind="ghost"
                isEnabled={!decided}
                onClick={() => openDialog({ kind: 'info' }, text.resendText(dialog.document.name))}
              />
              <Button title={strings.common.close} onClick={closeDialog} />
            </>
          }
        >
          <div className="cb-preview">
            <Icon name="image" size={56} tone="tertiary" />
            <p className="cb-callout">{text.documentPreview}</p>
          </div>
          <Banner message={text.documentNote} tone="info" />
        </Modal>
      )}
    </>
  )
}
