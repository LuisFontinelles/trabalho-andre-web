import type { SVGProps } from 'react'

/**
 * Tokens de icone. O resto do app so conhece o nome semantico, igual ao
 * MHIcon do aplicativo iOS. Trocar por um pacote de icones depois mexe
 * apenas neste arquivo.
 */
type IconProps = SVGProps<SVGSVGElement> & { size?: number }

const Icon = ({ size = 20, children, ...rest }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
    {...rest}
  >
    {children}
  </svg>
)

export const CbIcon = {
  back: (p: IconProps) => <Icon {...p}><path d="M15 18l-6-6 6-6" /></Icon>,
  forward: (p: IconProps) => <Icon {...p}><path d="M9 18l6-6-6-6" /></Icon>,
  expand: (p: IconProps) => <Icon {...p}><path d="M6 9l6 6 6-6" /></Icon>,
  search: (p: IconProps) => (
    <Icon {...p}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></Icon>
  ),
  clear: (p: IconProps) => (
    <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M15 9l-6 6M9 9l6 6" /></Icon>
  ),
  filter: (p: IconProps) => (
    <Icon {...p}><path d="M4 7h16M7 12h10M10 17h4" /></Icon>
  ),
  add: (p: IconProps) => <Icon {...p}><path d="M12 5v14M5 12h14" /></Icon>,
  check: (p: IconProps) => <Icon {...p}><path d="M5 13l4 4L19 7" /></Icon>,
  passwordVisible: (p: IconProps) => (
    <Icon {...p}><path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6z" /><circle cx="12" cy="12" r="3" /></Icon>
  ),
  passwordHidden: (p: IconProps) => (
    <Icon {...p}><path d="M3 3l18 18" /><path d="M10.6 5.2A10.6 10.6 0 0112 5c6.4 0 10 6 10 6a17 17 0 01-3.3 3.9" /><path d="M6.5 7.1A17 17 0 002 11s3.6 6 10 6c1.4 0 2.6-.3 3.7-.7" /></Icon>
  ),
  locked: (p: IconProps) => (
    <Icon {...p}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 118 0v3" /></Icon>
  ),
  underConstruction: (p: IconProps) => (
    <Icon {...p}><path d="M14 7l3-3 4 4-3 3" /><path d="M14.5 9.5L4 20l-1 1 1-1" /><path d="M11 7L7 3 3 7l4 4" /></Icon>
  ),
  verified: (p: IconProps) => (
    <Icon {...p}><path d="M12 3l2.4 1.8 3-.3 1 2.8 2.6 1.5-1.1 2.8 1.1 2.8-2.6 1.5-1 2.8-3-.3L12 21l-2.4-1.8-3 .3-1-2.8L3 15.2l1.1-2.8L3 9.6l2.6-1.5 1-2.8 3 .3z" /><path d="M9 12l2 2 4-4" /></Icon>
  ),
  info: (p: IconProps) => (
    <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></Icon>
  ),
  warning: (p: IconProps) => (
    <Icon {...p}><path d="M12 4l9 16H3z" /><path d="M12 10v4M12 17h.01" /></Icon>
  ),
  error: (p: IconProps) => (
    <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v6M12 16h.01" /></Icon>
  ),
  success: (p: IconProps) => (
    <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M8 12.5l2.5 2.5L16 9" /></Icon>
  ),
  offline: (p: IconProps) => (
    <Icon {...p}><path d="M3 3l18 18" /><path d="M5 12.5a11 11 0 014-2.3M2 8.8A16 16 0 018 5.6" /><path d="M16 10.3a11 11 0 013 2.2M16.2 5.7A16 16 0 0122 8.8" /><path d="M8.5 16a6 6 0 017 0" /><path d="M12 20h.01" /></Icon>
  ),
  opportunity: (p: IconProps) => (
    <Icon {...p}><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2" /><path d="M12 11v5M9.5 13.5h5" /></Icon>
  ),
  document: (p: IconProps) => (
    <Icon {...p}><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z" /><path d="M14 3v5h5" /></Icon>
  ),
  professional: (p: IconProps) => (
    <Icon {...p}><path d="M6 3v6a5 5 0 0010 0V3" /><path d="M4 3h3M13 3h3" /><path d="M11 14v2a4 4 0 008 0v-1" /><circle cx="19" cy="12" r="2" /></Icon>
  ),
  patient: (p: IconProps) => (
    <Icon {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0116 0" /></Icon>
  ),
  logout: (p: IconProps) => (
    <Icon {...p}><path d="M15 3h3a2 2 0 012 2v14a2 2 0 01-2 2h-3" /><path d="M10 17l-5-5 5-5M5 12h12" /></Icon>
  ),
  dashboard: (p: IconProps) => (
    <Icon {...p}><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></Icon>
  ),
  inbox: (p: IconProps) => (
    <Icon {...p}><path d="M3 13h5l1.5 3h5L16 13h5" /><path d="M5 5h14l2 8v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4z" /></Icon>
  ),
} as const

export type CbIconName = keyof typeof CbIcon
