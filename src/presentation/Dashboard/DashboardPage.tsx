import { useEffect, useState } from 'react'
import { useDependencies, useSession } from '@/app/session'
import { Badge, Card, EmptyState, Skeleton } from '@/designSystem/components'
import { CbIcon } from '@/designSystem/tokens/icons'
import {
  emptyCriteria,
  firstName,
  opportunitySubtitle,
  vacancyLevel,
  type Opportunity,
  type VacancyLevel,
} from '@/domain/entities'
import { strings } from '@/resources/strings'

const TONE: Record<VacancyLevel, 'success' | 'warning' | 'danger'> = {
  plenty: 'success',
  low: 'warning',
  none: 'danger',
}

export function DashboardPage() {
  const dependencies = useDependencies()
  const session = useSession()
  const [items, setItems] = useState<readonly Opportunity[] | null>(null)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    let active = true
    dependencies
      .searchOpportunities(emptyCriteria())
      .then((page) => {
        if (!active) return
        setItems(page.items)
        setTotal(page.totalItems)
      })
      .catch(() => {
        if (active) setItems([])
      })
    return () => {
      active = false
    }
  }, [dependencies])

  const vacancies = (items ?? []).reduce((sum, item) => sum + item.vacancies, 0)
  const user = session.session?.user

  return (
    <>
      <header className="cb-page-header">
        <h1 className="cb-page-header__title">
          {user ? strings.dashboard.greeting(firstName(user)) : strings.dashboard.title}
        </h1>
        <p className="cb-page-header__subtitle">{strings.dashboard.subtitle}</p>
      </header>

      <section className="cb-metrics">
        <Card>
          <p className="cb-metric__value">{total}</p>
          <p className="cb-metric__label">{strings.dashboard.totalOpportunities}</p>
        </Card>
        <Card>
          <p className="cb-metric__value">{vacancies}</p>
          <p className="cb-metric__label">{strings.dashboard.totalVacancies}</p>
        </Card>
        <Card>
          <p className="cb-metric__value">1</p>
          <p className="cb-metric__label">{strings.dashboard.pendingApplications}</p>
        </Card>
      </section>

      <section>
        <h2 className="cb-section-header">{strings.dashboard.recentTitle}</h2>
        {items === null ? (
          <ul className="cb-list" style={{ marginTop: 'var(--cb-space-lg)' }}>
            {[0, 1, 2].map((key) => (
              <li key={key}>
                <Skeleton height={88} />
              </li>
            ))}
          </ul>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<CbIcon.opportunity size={44} />}
            title={strings.dashboard.emptyTitle}
            message={strings.dashboard.emptyMessage}
          />
        ) : (
          <ul className="cb-list" style={{ marginTop: 'var(--cb-space-lg)' }}>
            {items.slice(0, 4).map((item) => (
              <li key={item.id} className="cb-row">
                <span className="cb-row__icon">
                  <CbIcon.opportunity size={24} />
                </span>
                <div className="cb-row__body">
                  <p className="cb-row__title">{item.title}</p>
                  <p className="cb-row__subtitle">{opportunitySubtitle(item)}</p>
                </div>
                <Badge
                  text={
                    item.vacancies === 0
                      ? strings.opportunities.noVacancies
                      : strings.opportunities.vacancies(item.vacancies)
                  }
                  tone={TONE[vacancyLevel(item)]}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
