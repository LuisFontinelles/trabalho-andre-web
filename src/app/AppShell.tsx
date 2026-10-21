import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useSession } from '@/app/session'
import { Button, DisabledTag } from '@/designSystem/components'
import { CbIcon } from '@/designSystem/tokens/icons'
import { firstName } from '@/domain/entities'
import { strings } from '@/resources/strings'

export function AppShell() {
  const session = useSession()
  const navigate = useNavigate()
  const user = session.session?.user

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    ['cb-sidebar__link', isActive ? 'cb-sidebar__link--active' : ''].filter(Boolean).join(' ')

  return (
    <div className="cb-shell">
      <aside className="cb-sidebar">
        <div className="cb-sidebar__brand">
          <CbIcon.opportunity size={24} />
          {strings.app.name}
        </div>

        <nav className="cb-sidebar__nav" aria-label={strings.app.tagline}>
          <NavLink to="/painel" className={linkClass}>
            <CbIcon.dashboard size={18} />
            {strings.nav.dashboard}
          </NavLink>
          <NavLink to="/oportunidades" className={linkClass}>
            <CbIcon.opportunity size={18} />
            {strings.nav.opportunities}
          </NavLink>
          <NavLink to="/candidaturas" className={linkClass}>
            <CbIcon.inbox size={18} />
            {strings.nav.applications}
          </NavLink>
        </nav>

        <div className="cb-sidebar__footer">
          {user && (
            <span className="cb-sidebar__user">
              {firstName(user)} · {user.email}
            </span>
          )}
          <DisabledTag text={strings.publish.unavailable} />
          <Button
            title={strings.nav.signOut}
            kind="tertiary"
            size="compact"
            icon={<CbIcon.logout size={16} />}
            onClick={() => {
              session.signOut()
              navigate('/', { replace: true })
            }}
          />
        </div>
      </aside>

      <main className="cb-main">
        <Outlet />
      </main>
    </div>
  )
}
