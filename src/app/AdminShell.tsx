import { Outlet, useNavigate } from 'react-router-dom'
import { useSession } from '@/app/session'
import { Button, Logo } from '@/designSystem/components'
import { strings } from '@/resources/strings'

export function AdminShell() {
  const session = useSession()
  const navigate = useNavigate()
  const user = session.session?.user

  function signOut() {
    session.signOut()
    navigate('/', { replace: true })
  }

  return (
    <div className="cb-shell">
      <header className="cb-topbar">
        <Logo />
        <Button title={strings.nav.signOut} kind="ghost" size="sm" onClick={signOut} />
      </header>
      <aside className="cb-sidebar">
        <div className="cb-sidebar__logo">
          <span className="cb-sidebar__logo-full"><Logo /></span>
          <span className="cb-sidebar__logo-compact"><Logo compact /></span>
        </div>
        <nav className="cb-sidebar__nav" aria-label={strings.nav.label}>
          <span className="cb-nav-item cb-nav-item--active">
            <span className="cb-nav-item__label">{strings.admin.navProfessionals}</span>
          </span>
        </nav>
        <div className="cb-sidebar__footer">
          <div className="cb-sidebar__user">
            <p className="cb-sidebar__name">{user?.name ?? strings.admin.userName}</p>
            <p className="cb-sidebar__credential">{strings.admin.area}</p>
          </div>
          <span className="cb-sidebar__signout-full">
            <Button title={strings.nav.signOut} kind="ghost" size="sm" onClick={signOut} />
          </span>
        </div>
      </aside>
      <main className="cb-main"><Outlet /></main>
    </div>
  )
}