import { useEffect, useState } from 'react'
import { useDependencies } from '@/app/session'
import { Card, EmptyState, KeyValueRow, Skeleton } from '@/designSystem/components'
import { CbIcon } from '@/designSystem/tokens/icons'
import { URGENCY_LABEL, type Application } from '@/domain/entities'
import { strings } from '@/resources/strings'

export function ApplicationsPage() {
  const dependencies = useDependencies()
  const [application, setApplication] = useState<Application | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let active = true
    dependencies
      .loadApplicationStatus('app-20418')
      .then((value) => {
        if (active) setApplication(value)
      })
      .catch(() => {
        if (active) setFailed(true)
      })
    return () => {
      active = false
    }
  }, [dependencies])

  return (
    <>
      <header className="cb-page-header">
        <h1 className="cb-page-header__title">{strings.applications.title}</h1>
        <p className="cb-page-header__subtitle">{strings.applications.subtitle}</p>
      </header>

      {failed && (
        <EmptyState
          icon={<CbIcon.inbox size={44} />}
          title={strings.applications.emptyTitle}
          message={strings.applications.emptyMessage}
        />
      )}

      {!failed && application === null && <Skeleton height={220} />}

      {application !== null && (
        <>
          <Card>
            <h2 className="cb-section-header">
              {strings.applications.protocol(application.protocolNumber)}
            </h2>
            <ol className="cb-timeline" style={{ marginTop: 'var(--cb-space-lg)' }}>
              {application.steps.map((step) => (
                <li key={step.title} className="cb-timeline__item">
                  <span className="cb-timeline__marker">
                    <span
                      className={[
                        'cb-timeline__dot',
                        step.isDone ? 'cb-timeline__dot--done' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    />
                  </span>
                  <span>
                    <p className="cb-timeline__title">{step.title}</p>
                    <p className="cb-timeline__detail">{step.detail}</p>
                  </span>
                </li>
              ))}
            </ol>
          </Card>

          <Card>
            <h2 className="cb-section-header">{strings.applications.triageTitle}</h2>
            <div style={{ marginTop: 'var(--cb-space-md)' }}>
              <KeyValueRow
                label={strings.applications.reason}
                value="Ansiedade e insonia ha tres meses"
              />
              <KeyValueRow label={strings.applications.diagnosis} value={strings.common.no} />
              <KeyValueRow label={strings.applications.medication} value={strings.common.yes} />
              <KeyValueRow
                label={strings.applications.urgency}
                value={URGENCY_LABEL.medium}
              />
            </div>
          </Card>
        </>
      )}
    </>
  )
}
