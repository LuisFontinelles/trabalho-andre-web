import { useCallback, useEffect, useState } from 'react'
import { useDependencies } from '@/app/session'
import { Badge, Banner, Button, Chip, EmptyState, Skeleton, TextField } from '@/designSystem/components'
import { CbIcon } from '@/designSystem/tokens/icons'
import {
  EMPTY_FILTER_CATALOG,
  EMPTY_PAGE,
  emptyCriteria,
  opportunitySubtitle,
  vacancyLevel,
  type FilterCatalog,
  type OpportunityPage,
  type SearchCriteria,
  type VacancyLevel,
} from '@/domain/entities'
import { strings } from '@/resources/strings'

const TONE: Record<VacancyLevel, 'success' | 'warning' | 'danger'> = {
  plenty: 'success',
  low: 'warning',
  none: 'danger',
}

type LoadState =
  | { status: 'loading' }
  | { status: 'loaded'; page: OpportunityPage }
  | { status: 'empty' }
  | { status: 'failed' }

export function OpportunitiesPage() {
  const dependencies = useDependencies()
  const [criteria, setCriteria] = useState<SearchCriteria>(emptyCriteria)
  const [catalog, setCatalog] = useState<FilterCatalog>(EMPTY_FILTER_CATALOG)
  const [state, setState] = useState<LoadState>({ status: 'loading' })

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

  const reload = useCallback(
    async (next: SearchCriteria) => {
      setState({ status: 'loading' })
      try {
        const page = await dependencies.searchOpportunities(next)
        setState(page.items.length === 0 ? { status: 'empty' } : { status: 'loaded', page })
      } catch {
        setState({ status: 'failed' })
      }
    },
    [dependencies],
  )

  useEffect(() => {
    const timer = setTimeout(() => void reload(criteria), 250)
    return () => clearTimeout(timer)
  }, [criteria, reload])

  const page = state.status === 'loaded' ? state.page : EMPTY_PAGE
  const selectedSpecialty = criteria.specialties[0] ?? null

  return (
    <>
      <header className="cb-page-header">
        <h1 className="cb-page-header__title">{strings.opportunities.title}</h1>
        <p className="cb-page-header__subtitle">{strings.opportunities.subtitle}</p>
      </header>

      <div className="cb-toolbar">
        <div style={{ flex: 1, minWidth: 260 }}>
          <TextField
            label={strings.opportunities.searchPlaceholder}
            placeholder={strings.opportunities.searchPlaceholder}
            value={criteria.term}
            onChange={(term) => setCriteria((current) => ({ ...current, term, page: 1 }))}
          />
        </div>
        <Button
          title={strings.opportunities.newOpportunity}
          icon={<CbIcon.add size={18} />}
          fillsWidth={false}
          isEnabled={false}
          disabledHint={strings.publish.unavailable}
        />
      </div>

      <div className="cb-chip-group">
        <Chip
          title={strings.opportunities.allSpecialties}
          isSelected={selectedSpecialty === null}
          onClick={() => setCriteria((current) => ({ ...current, specialties: [], page: 1 }))}
        />
        {catalog.specialties.map((option) => (
          <Chip
            key={option.id}
            title={option.label}
            isSelected={selectedSpecialty === option.id}
            onClick={() =>
              setCriteria((current) => ({ ...current, specialties: [option.id], page: 1 }))
            }
          />
        ))}
      </div>

      {state.status === 'loading' && (
        <ul className="cb-list">
          {[0, 1, 2, 3].map((key) => (
            <li key={key}>
              <Skeleton height={88} />
            </li>
          ))}
        </ul>
      )}

      {state.status === 'empty' && (
        <EmptyState
          icon={<CbIcon.search size={44} />}
          title={strings.opportunities.emptyTitle}
          message={strings.opportunities.emptyMessage}
        />
      )}

      {state.status === 'failed' && (
        <>
          <Banner message={strings.opportunities.errorMessage} />
          <EmptyState
            icon={<CbIcon.offline size={44} />}
            title={strings.opportunities.errorTitle}
            message={strings.opportunities.errorMessage}
            actionTitle={strings.common.retry}
            onAction={() => void reload(criteria)}
          />
        </>
      )}

      {state.status === 'loaded' && (
        <>
          <ul className="cb-list">
            {page.items.map((item) => (
              <li key={item.id} className="cb-row">
                <span className="cb-row__icon">
                  <CbIcon.opportunity size={24} />
                </span>
                <div className="cb-row__body">
                  <p className="cb-row__title">{item.title}</p>
                  <p className="cb-row__subtitle">{opportunitySubtitle(item)}</p>
                </div>
                {item.provider.isVerified && <CbIcon.verified size={18} />}
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

          {page.totalPages > 1 && (
            <nav className="cb-pagination" aria-label="Paginacao">
              {Array.from({ length: page.totalPages }, (_, index) => index + 1).map((number) => (
                <button
                  key={number}
                  type="button"
                  className={[
                    'cb-pagination__page',
                    number === page.page ? 'cb-pagination__page--current' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  aria-current={number === page.page ? 'page' : undefined}
                  onClick={() => setCriteria((current) => ({ ...current, page: number }))}
                >
                  {number}
                </button>
              ))}
            </nav>
          )}
        </>
      )}
    </>
  )
}
