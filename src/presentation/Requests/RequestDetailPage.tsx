import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useDependencies } from '@/app/session'
import { Banner, Card, KeyValueRow, Skeleton, TextField } from '@/designSystem/components'
import { CbIcon } from '@/designSystem/tokens/icons'
import {
  DECIDABLE_STATUSES,
  REQUEST_STATUS_LABEL,
  isFromProfessional,
  messageTime,
  type RequestDetail,
  type RequestStatus,
} from '@/domain/professional'
import { strings } from '@/resources/strings'

export function RequestDetailPage() {
  const dependencies = useDependencies()
  const navigate = useNavigate()
  const { id = '' } = useParams()

  const [detail, setDetail] = useState<RequestDetail | null>(null)
  const [failed, setFailed] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [isBusy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setFailed(false)
    try {
      setDetail(await dependencies.professionalRepository.requestDetail(id))
    } catch {
      setFailed(true)
    }
  }, [dependencies, id])

  useEffect(() => {
    void load()
  }, [load])

  async function decide(status: RequestStatus) {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const updated = await dependencies.professionalRepository.decideRequest(id, status)
      setDetail(updated)
      setNotice(strings.requestDetail.decided(REQUEST_STATUS_LABEL[status]))
    } catch {
      setError(strings.requestDetail.decisionFailed)
    } finally {
      setBusy(false)
    }
  }

  async function send(event: FormEvent) {
    event.preventDefault()
    const text = draft.trim()
    if (text === '' || detail === null) return
    setBusy(true)
    setError(null)
    try {
      const message = await dependencies.professionalRepository.sendMessage(id, text)
      setDetail({ ...detail, messages: [...detail.messages, message] })
      setDraft('')
    } catch {
      setError(strings.requestDetail.messageFailed)
    } finally {
      setBusy(false)
    }
  }

  if (failed) {
    return (
      <>
        <button type="button" className="cb-back-link" onClick={() => navigate('/solicitacoes')}>
          <CbIcon.back size={16} />
          {strings.requestDetail.back}
        </button>
        <Banner message={strings.requestDetail.notFound} />
      </>
    )
  }

  if (detail === null) return <Skeleton height={420} />

  return (
    <>
      <div>
        <button type="button" className="cb-back-link" onClick={() => navigate('/solicitacoes')}>
          <CbIcon.back size={16} />
          {strings.requestDetail.back}
        </button>
        <h1 className="cb-detail-title">{detail.patientName}</h1>
        <p className="cb-detail-subtitle">{detail.opportunityTitle}</p>
      </div>

      {notice && <Banner message={notice} tone="success" />}
      {error && <Banner message={error} />}

      <div className="cb-detail-grid">
        <div className="cb-detail-column">
          <Card>
            <h2 className="cb-section-header">{strings.requestDetail.triageTitle}</h2>
            <div style={{ marginTop: 'var(--cb-space-md)' }}>
              {detail.triage.map((answer) => (
                <KeyValueRow
                  key={answer.question}
                  label={answer.question}
                  value={answer.answer}
                />
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="cb-section-header">{strings.requestDetail.documentsTitle}</h2>
            <div className="cb-form-stack" style={{ marginTop: 'var(--cb-space-lg)' }}>
              {detail.documents.map((document) => (
                <div key={document.id} className="cb-document">
                  <CbIcon.document size={18} />
                  <span className="cb-document__name">{document.name}</span>
                  <button
                    type="button"
                    className="cb-action cb-action--ghost"
                    disabled
                    title={strings.requestDetail.viewSoon}
                  >
                    {strings.requestDetail.view}
                  </button>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="cb-detail-column">
          <Card>
            <h2 className="cb-section-header">{strings.requestDetail.decisionTitle}</h2>
            <p className="cb-note">{strings.requestDetail.decisionSubtitle}</p>

            <div className="cb-field" style={{ marginTop: 'var(--cb-space-md)' }}>
              <div className="cb-field__control">
                <select
                  className="cb-select"
                  value={detail.status === 'NOVA' ? 'EM_ANALISE' : detail.status}
                  disabled={isBusy}
                  aria-label={strings.requestDetail.decisionSubtitle}
                  onChange={(event) => void decide(event.target.value as RequestStatus)}
                >
                  {DECIDABLE_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {REQUEST_STATUS_LABEL[status]}
                    </option>
                  ))}
                </select>
                <CbIcon.expand size={16} />
              </div>
            </div>

            <div className="cb-decision-actions">
              <button
                type="button"
                className="cb-decision__approve"
                disabled={isBusy}
                onClick={() => void decide('APROVADA')}
              >
                {strings.requestDetail.approve}
              </button>
              <button
                type="button"
                className="cb-decision__reject"
                disabled={isBusy}
                onClick={() => void decide('RECUSADA')}
              >
                {strings.requestDetail.reject}
              </button>
            </div>
          </Card>

          <Card>
            <h2 className="cb-section-header">{strings.requestDetail.messagesTitle}</h2>
            <div className="cb-chat" style={{ marginTop: 'var(--cb-space-lg)' }}>
              <ul className="cb-chat__list">
                {detail.messages.map((message) => (
                  <li
                    key={message.id}
                    className={[
                      'cb-chat__item',
                      isFromProfessional(message) ? 'cb-chat__item--mine' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <span className="cb-chat__bubble">{message.text}</span>
                    <span className="cb-chat__time">{messageTime(message.sentAt)}</span>
                  </li>
                ))}
              </ul>

              <form className="cb-chat__composer" onSubmit={send}>
                <TextField
                  label={strings.requestDetail.messagePlaceholder}
                  placeholder={strings.requestDetail.messagePlaceholder}
                  value={draft}
                  onChange={setDraft}
                  isEnabled={!isBusy}
                />
                <button
                  type="submit"
                  className="cb-chat__send"
                  disabled={isBusy || draft.trim() === ''}
                  aria-label={strings.requestDetail.send}
                >
                  <CbIcon.forward size={18} />
                </button>
              </form>
            </div>
          </Card>
        </div>
      </div>
    </>
  )
}
