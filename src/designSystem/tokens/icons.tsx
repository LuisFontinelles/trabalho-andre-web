/**
 * Icones do Figma: Material Symbols Rounded, pelo nome do simbolo. A fonte
 * entra pelo index.html. O icone e sempre decorativo; quem precisa de nome
 * acessivel recebe aria-label no botao que o contem.
 */
export type IconName =
  | 'add_circle'
  | 'check'
  | 'check_box'
  | 'check_box_outline_blank'
  | 'check_circle'
  | 'chevron_right'
  | 'close'
  | 'cloud_off'
  | 'description'
  | 'draft'
  | 'drag_indicator'
  | 'error'
  | 'expand_more'
  | 'hourglass_top'
  | 'image'
  | 'inbox'
  | 'info'
  | 'logout'
  | 'mark_email_read'
  | 'medical_services'
  | 'menu'
  | 'more_vert'
  | 'send'
  | 'settings'

export type IconTone =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'brand'
  | 'brand-strong'
  | 'danger'
  | 'warning'
  | 'on-brand'
  | 'inherit'

export function Icon({
  name,
  size = 24,
  tone = 'inherit',
}: {
  name: IconName
  size?: number
  tone?: IconTone
}) {
  return (
    <span
      className={`cb-icon cb-icon--${tone} material-symbols-rounded`}
      // A caixa do glifo no Figma tem 1,2 vez o tamanho da fonte de altura.
      style={{ fontSize: size, width: size, height: Math.round(size * 1.2) }}
      aria-hidden="true"
    >
      {name}
    </span>
  )
}
