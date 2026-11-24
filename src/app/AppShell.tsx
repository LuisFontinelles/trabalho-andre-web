import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useSession } from '@/app/session'
import { Button, IconButton, Logo } from '@/designSystem/components'
import { Icon, type IconName } from '@/designSystem/tokens/icons'
import { strings } from '@/resources/strings'

interface NavItem {
  to: string
  label: string
  icon: IconName
}

const NAV: readonly NavItem[] = [
  { to: '/oportunidades', label: strings.nav.myOpportunities, icon: 'medical_services' },
  { to: '/solicitacoes', label: strings.nav.requests, icon: 'inbox' },
  { to: '/oportunidades/nova', label: strings.nav.newOpportunity, icon: 'add_circle' },
  { to: '/configuracoes', label: strings.nav.settings, icon: 'settings' },
]

/** "Dra. Mariana Costa" vira "MC": o titulo nao entra nas iniciais. */
export function initialsOf(name: string): string {
  const parts = name
    .split(' ')
    .filter((part) => part !== '' && !part.endsWith('.'))
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return `${first}${last}`.toUpperCase()
}

/**
 * Casca das telas do painel nas tres larguras do Figma: menu lateral
 * completo no desktop, trilho de icones no tablet e barra superior com o
 * menu recolhido no mobile. O mesmo menu serve aos tres; o CSS decide a forma.
 */
export function AppShell() {
  const session = useSession()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [isMenuOpen, setMenuOpen] = useState(false)
  const user = session.session?.user

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  // "/oportunidades/nova" tambem casa com "/oportunidades" pelo prefixo, e os dois
  // itens ficavam ativos juntos. Minhas oportunidades cobre a lista e a edicao.
  const isCreating = pathname === '/oportunidades/nova'

  function signOut() {
    session.signOut()
    navigate('/', { replace: true })
  }

  return (
    <div className="cb-shell">
      <header className="cb-topbar">
        <IconButton
          icon="menu"
          label={strings.nav.openMenu}
          expanded={isMenuOpen}
          onClick={() => setMenuOpen(true)}
        />
        <Logo />
        <span className="cb-avatar" aria-hidden="true">
          {user ? initialsOf(user.name) : ''}
        </span>
      </header>

      {isMenuOpen && <div className="cb-sidebar-backdrop" onClick={() => setMenuOpen(false)} />}

      <aside className={`cb-sidebar${isMenuOpen ? ' cb-sidebar--open' : ''}`}>
        <div className="cb-sidebar__logo">
          <span className="cb-sidebar__logo-full">
            <Logo />
          </span>
          <span className="cb-sidebar__logo-compact">
            <Logo compact />
          </span>
          <span className="cb-sidebar__close">
            <IconButton
              icon="close"
              label={strings.nav.closeMenu}
              onClick={() => setMenuOpen(false)}
            />
          </span>
        </div>

        <nav className="cb-sidebar__nav" aria-label={strings.nav.label}>
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              title={item.label}
              className={({ isActive }) =>
                `cb-nav-item${
                  isActive && !(item.to === '/oportunidades' && isCreating)
                    ? ' cb-nav-item--active'
                    : ''
                }`
              }
            >
              <Icon name={item.icon} size={22} />
              <span className="cb-nav-item__label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="cb-sidebar__footer">
          {user && (
            <div className="cb-sidebar__user">
              <p className="cb-sidebar__name">{user.name}</p>
              <p className="cb-sidebar__credential">
                {[
                  session.profile.registration,
                  session.profile.isVerified ? strings.nav.verified : strings.nav.pending,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
          )}
          <span className="cb-sidebar__signout-full">
            <Button title={strings.nav.signOut} kind="ghost" size="sm" onClick={signOut} />
          </span>
          <span className="cb-sidebar__signout-compact">
            <IconButton icon="logout" label={strings.nav.signOut} onClick={signOut} />
          </span>
        </div>
      </aside>

      <main className="cb-main">
        <Outlet />
      </main>
    </div>
  )
}
