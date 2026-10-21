import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useSession } from '@/app/session'
import { CbIcon } from '@/designSystem/tokens/icons'
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
        <div className="cb-sidebar__logo" aria-hidden="true">
          LOGO
        </div>

        <nav className="cb-sidebar__nav" aria-label={strings.app.tagline}>
          <NavLink to="/oportunidades" className={linkClass}>
            {strings.nav.myOpportunities}
          </NavLink>
          <NavLink to="/solicitacoes" className={linkClass}>
            {strings.nav.requests}
          </NavLink>
          <NavLink to="/oportunidades/nova" className={linkClass}>
            {strings.nav.newOpportunity}
          </NavLink>
        </nav>

        <div className="cb-sidebar__footer">
          <hr className="cb-divider" />
          {user && (
            <>
              <p className="cb-sidebar__name">{user.name}</p>
              <p className="cb-sidebar__credential">
                CRM/DF 123456 ·{' '}
                <span className="cb-sidebar__verified">
                  <CbIcon.verified size={12} /> {strings.nav.verified}
                </span>
              </p>
            </>
          )}
          <button
            type="button"
            className="cb-sidebar__signout"
            onClick={() => {
              session.signOut()
              navigate('/', { replace: true })
            }}
          >
            {strings.nav.signOut}
          </button>
        </div>
      </aside>

      <main className="cb-main">
        <Outlet />
      </main>
    </div>
  )
}
