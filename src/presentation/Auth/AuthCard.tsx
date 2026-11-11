import type { ReactNode } from 'react'
import { Logo } from '@/designSystem/components'
import { Icon, type IconName, type IconTone } from '@/designSystem/tokens/icons'

/**
 * Cartao das telas de acesso (sem menu lateral). `icon` troca a logo pelo
 * icone de estado das telas "Confira seu e-mail" e "Cadastro em verificacao".
 */
export function AuthCard({
  icon,
  iconTone = 'brand',
  title,
  subtitle,
  children,
}: {
  icon?: IconName
  iconTone?: IconTone
  title: string
  subtitle?: string
  children: ReactNode
}) {
  return (
    <main className="cb-auth">
      <div className="cb-auth__card">
        <Logo />
        {icon && <Icon name={icon} size={48} tone={iconTone} />}
        <h1 className="cb-auth__title">{title}</h1>
        {subtitle && <p className="cb-auth__subtitle">{subtitle}</p>}
        {children}
      </div>
    </main>
  )
}
