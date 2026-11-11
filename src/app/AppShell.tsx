import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useSession } from '@/app/session'
import { CbIcon } from '@/designSystem/tokens/icons'
import { strings } from '@/resources/strings'
import logo from '../assets/logo.svg'


export function AppShell() {
  const session = useSession()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const user = session.session?.user

  // "/oportunidades/nova" tambem casa com "/oportunidades" pelo prefixo, e os dois
  // itens ficavam ativos juntos. Minhas oportunidades cobre a lista e a edicao.
  const isCreating = pathname === '/oportunidades/nova'

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    ['cb-sidebar__link', isActive ? 'cb-sidebar__link--active' : ''].filter(Boolean).join(' ')

  return (
    <div className="cb-shell">
      <aside className="cb-sidebar">
        <div className="cb-sidebar__logo">
          <img src={logo} alt="" />
          <span className="cb-sidebar__brand">{strings.app.name}</span>
        </div>

        <nav className="cb-sidebar__nav" aria-label={strings.app.tagline}>
          <NavLink
            to="/oportunidades"
            className={({ isActive }) => linkClass({ isActive: isActive && !isCreating })}
          >
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
