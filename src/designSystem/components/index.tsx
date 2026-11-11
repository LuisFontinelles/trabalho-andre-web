import {
  useEffect,
  useId,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { Link } from 'react-router-dom'
import { Icon, type IconName } from '@/designSystem/tokens/icons'
import { strings } from '@/resources/strings'
import logo from '@/assets/logo.svg'
import './components.css'

function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}

/* ------------------------------------------------------------------ marca */

/** Web / Logo: simbolo com o nome. `compact` mostra so o simbolo. */
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="cb-logo">
      <img className="cb-logo__symbol" src={logo} alt="" />
      {compact ? (
        <span className="cb-visually-hidden">{strings.app.name}</span>
      ) : (
        <span className="cb-logo__name">{strings.app.name}</span>
      )}
    </span>
  )
}

/* ------------------------------------------------------------------ botao */

export type ButtonKind = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'dangerSoft'

interface ButtonProps {
  title: string
  /** Primario, Secundario, Contorno, Fantasma, Perigo e Perigo suave. */
  kind?: ButtonKind
  /** M (48) ou P (32). */
  size?: 'md' | 'sm'
  fillsWidth?: boolean
  isEnabled?: boolean
  isLoading?: boolean
  type?: 'button' | 'submit'
  onClick?: () => void
}

export function Button({
  title,
  kind = 'primary',
  size = 'md',
  fillsWidth = false,
  isEnabled = true,
  isLoading = false,
  type = 'button',
  onClick,
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        'cb-button',
        `cb-button--${kind}`,
        `cb-button--${size}`,
        fillsWidth && 'cb-button--fill',
      )}
      disabled={!isEnabled || isLoading}
      aria-busy={isLoading || undefined}
      onClick={onClick}
    >
      {isLoading ? strings.common.loading : title}
    </button>
  )
}

export function IconButton({
  icon,
  label,
  size = 24,
  onClick,
  expanded,
}: {
  icon: IconName
  label: string
  size?: number
  onClick?: () => void
  expanded?: boolean
}) {
  return (
    <button
      type="button"
      className="cb-icon-button"
      aria-label={label}
      aria-expanded={expanded}
      onClick={onClick}
    >
      <Icon name={icon} size={size} />
    </button>
  )
}

/* ------------------------------------------------------------------- selo */

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger'

/** Web / Selo: ponto colorido com o rotulo do status. */
export function Badge({ text, tone = 'neutral' }: { text: string; tone?: BadgeTone }) {
  return (
    <span className={`cb-badge cb-badge--${tone}`}>
      <span className="cb-badge__dot" aria-hidden="true" />
      {text}
    </span>
  )
}

/* ------------------------------------------------------------------- chip */

export function Chip({
  label,
  isSelected = false,
  onClick,
}: {
  label: string
  isSelected?: boolean
  onClick?: () => void
}) {
  if (!onClick) {
    return <span className={cx('cb-chip', isSelected && 'cb-chip--selected')}>{label}</span>
  }
  return (
    <button
      type="button"
      className={cx('cb-chip', isSelected && 'cb-chip--selected')}
      aria-pressed={isSelected}
      onClick={onClick}
    >
      {label}
    </button>
  )
}

/* ------------------------------------------------------------------ passo */

/** Web / Passo: concluido, atual ou pendente. */
export function Stepper({ labels, current }: { labels: readonly string[]; current: number }) {
  return (
    <ol className="cb-steps">
      {labels.map((label, index) => {
        const state = index < current ? 'done' : index === current ? 'current' : 'pending'
        return (
          <li
            key={label}
            className={`cb-step cb-step--${state}`}
            aria-current={state === 'current' ? 'step' : undefined}
          >
            <span className="cb-step__marker">
              {state === 'done' ? <Icon name="check" size={18} /> : index + 1}
            </span>
            {label}
          </li>
        )
      })}
    </ol>
  )
}

/* --------------------------------------------------------- card de opcao */

export function OptionCard({
  title,
  description,
  isSelected,
  onSelect,
}: {
  title: string
  description: string
  isSelected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={isSelected}
      className={cx('cb-option', isSelected && 'cb-option--selected')}
      onClick={onSelect}
    >
      <span className="cb-option__title">{title}</span>
      <span className="cb-option__description">{description}</span>
    </button>
  )
}

/* ------------------------------------------------------------------ campo */

interface FieldShellProps {
  label: string
  htmlFor: string
  errorMessage?: string | null
  isEnabled?: boolean
  children: ReactNode
}

function FieldShell({ label, htmlFor, errorMessage, isEnabled = true, children }: FieldShellProps) {
  return (
    <div className={cx('cb-field', !isEnabled && 'cb-field--disabled')}>
      <label className="cb-field__label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {errorMessage && (
        <span className="cb-field__help" role="alert">
          {errorMessage}
        </span>
      )}
    </div>
  )
}

interface TextFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: 'text' | 'email' | 'password' | 'tel' | 'date'
  inputMode?: 'text' | 'numeric' | 'decimal' | 'email'
  autoComplete?: string
  errorMessage?: string | null
  isEnabled?: boolean
  /** Mostra o valor preenchido sem deixar editar. */
  isReadOnly?: boolean
  maxLength?: number
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  inputMode,
  autoComplete,
  errorMessage,
  isEnabled = true,
  isReadOnly = false,
  maxLength,
}: TextFieldProps) {
  const id = useId()
  return (
    <FieldShell label={label} htmlFor={id} errorMessage={errorMessage} isEnabled={isEnabled}>
      <div className={cx('cb-field__box', errorMessage && 'cb-field__box--error')}>
        <input
          id={id}
          className="cb-field__input"
          type={type}
          inputMode={inputMode}
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          maxLength={maxLength}
          disabled={!isEnabled}
          readOnly={isReadOnly}
          aria-invalid={errorMessage ? true : undefined}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </FieldShell>
  )
}

export function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  errorMessage,
  isEnabled = true,
  maxLength,
}: Omit<TextFieldProps, 'type' | 'inputMode' | 'autoComplete' | 'isReadOnly'>) {
  const id = useId()
  return (
    <FieldShell label={label} htmlFor={id} errorMessage={errorMessage} isEnabled={isEnabled}>
      <div className={cx('cb-field__box cb-field__box--area', errorMessage && 'cb-field__box--error')}>
        <textarea
          id={id}
          className="cb-field__input"
          value={value}
          placeholder={placeholder}
          maxLength={maxLength}
          disabled={!isEnabled}
          aria-invalid={errorMessage ? true : undefined}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </FieldShell>
  )
}

export interface SelectOption {
  value: string
  label: string
}

interface SelectFieldBase {
  label: string
  placeholder: string
  options: readonly SelectOption[]
  errorMessage?: string | null
  isEnabled?: boolean
}

type SelectFieldProps = SelectFieldBase &
  (
    | { multiple?: false; value: string | null; onChange: (value: string) => void }
    | { multiple: true; value: readonly string[]; onChange: (value: readonly string[]) => void }
  )

/**
 * Campo Select com o menu suspenso rolavel do Figma. Aceita uma escolha ou
 * varias (`multiple`), caso em que o menu fica aberto e o valor lista as
 * escolhas separadas por virgula.
 */
export function SelectField(props: SelectFieldProps) {
  const { label, placeholder, options, errorMessage, isEnabled = true } = props
  const id = useId()
  const [isOpen, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const root = useRef<HTMLDivElement>(null)

  const selected: readonly string[] = props.multiple
    ? props.value
    : props.value === null
      ? []
      : [props.value]
  const text = options
    .filter((option) => selected.includes(option.value))
    .map((option) => option.label)
    .join(', ')

  useEffect(() => {
    if (!isOpen) return
    function onPointerDown(event: PointerEvent) {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [isOpen])

  function choose(value: string) {
    if (props.multiple) {
      props.onChange(
        selected.includes(value)
          ? selected.filter((item) => item !== value)
          : [...selected, value],
      )
      return
    }
    props.onChange(value)
    setOpen(false)
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'Escape') {
      setOpen(false)
      return
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!isOpen) {
        setOpen(true)
        return
      }
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActive((current) => (current + step + options.length) % options.length)
      return
    }
    if (isOpen && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault()
      const option = options[active]
      if (option) choose(option.value)
    }
  }

  return (
    <FieldShell label={label} htmlFor={id} errorMessage={errorMessage} isEnabled={isEnabled}>
      <div className="cb-select" ref={root}>
        <button
          id={id}
          type="button"
          className={cx(
            'cb-field__box cb-select__trigger',
            errorMessage && 'cb-field__box--error',
            isOpen && 'cb-field__box--focus',
          )}
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={`${id}-list`}
          aria-invalid={errorMessage ? true : undefined}
          disabled={!isEnabled}
          onClick={() => setOpen((current) => !current)}
          onKeyDown={onKeyDown}
        >
          <span className={cx('cb-select__value', text === '' && 'cb-select__value--empty')}>
            {text === '' ? placeholder : text}
          </span>
          <Icon name="expand_more" size={22} tone="secondary" />
        </button>
        {isOpen && (
          <ul
            id={`${id}-list`}
            className="cb-menu cb-select__menu"
            role="listbox"
            aria-multiselectable={props.multiple || undefined}
          >
            {options.map((option, index) => {
              const isSelected = selected.includes(option.value)
              return (
                <li
                  key={option.value}
                  role="option"
                  aria-selected={isSelected}
                  className={cx(
                    'cb-menu__item',
                    isSelected && 'cb-menu__item--selected',
                    index === active && 'cb-menu__item--active',
                  )}
                  onPointerEnter={() => setActive(index)}
                  onClick={() => choose(option.value)}
                >
                  {option.label}
                  {isSelected && <Icon name="check" size={18} tone="brand" />}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </FieldShell>
  )
}

export function Checkbox({
  label,
  isChecked,
  onChange,
}: {
  label: string
  isChecked: boolean
  onChange: (isChecked: boolean) => void
}) {
  return (
    <label className="cb-checkbox">
      <input
        className="cb-visually-hidden"
        type="checkbox"
        checked={isChecked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <Icon
        name={isChecked ? 'check_box' : 'check_box_outline_blank'}
        size={22}
        tone={isChecked ? 'brand' : 'secondary'}
      />
      <span>{label}</span>
    </label>
  )
}

/** Codigo de verificacao: uma caixa por digito, como na tela do Figma. */
export function CodeField({
  length,
  value,
  onChange,
  label,
}: {
  length: number
  value: string
  onChange: (value: string) => void
  label: string
}) {
  const inputs = useRef<(HTMLInputElement | null)[]>([])
  const digits = Array.from({ length }, (_, index) => value[index] ?? '')

  function setDigit(index: number, raw: string) {
    const digit = raw.replace(/\D/g, '').slice(-1)
    const next = digits.slice()
    next[index] = digit
    onChange(next.join(''))
    if (digit !== '') inputs.current[index + 1]?.focus()
  }

  function onKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && digits[index] === '') inputs.current[index - 1]?.focus()
  }

  function onPaste(event: ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    if (pasted === '') return
    event.preventDefault()
    onChange(pasted)
    inputs.current[Math.min(pasted.length, length - 1)]?.focus()
  }

  return (
    <div className="cb-code" role="group" aria-label={label}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(element) => {
            inputs.current[index] = element
          }}
          className={cx('cb-code__digit', digit !== '' && 'cb-code__digit--filled')}
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          value={digit}
          aria-label={`${index + 1}`}
          onChange={(event) => setDigit(index, event.target.value)}
          onKeyDown={(event) => onKeyDown(index, event)}
          onPaste={onPaste}
        />
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ aviso */

export type BannerTone = 'danger' | 'warning' | 'success' | 'info'

const BANNER_ICON: Record<BannerTone, IconName> = {
  danger: 'error',
  warning: 'info',
  success: 'check_circle',
  info: 'info',
}

export function Banner({
  message,
  tone = 'danger',
  icon,
}: {
  message: string
  tone?: BannerTone
  icon?: IconName
}) {
  return (
    <div
      className={`cb-banner cb-banner--${tone}`}
      role={tone === 'danger' ? 'alert' : 'status'}
    >
      <Icon name={icon ?? BANNER_ICON[tone]} size={20} />
      <span>{message}</span>
    </div>
  )
}

/* ----------------------------------------------------------------- painel */

export function Panel({
  title,
  gap = 'lg',
  children,
}: {
  title?: string
  gap?: 'none' | 'md' | 'lg'
  children: ReactNode
}) {
  return (
    <section className={`cb-panel cb-panel--gap-${gap}`}>
      {title && <h2 className="cb-panel__title">{title}</h2>}
      {children}
    </section>
  )
}

/** Web / Card de indicador. */
export function StatCard({
  tone,
  value,
  label,
}: {
  tone: 'brand' | 'warning' | 'neutral'
  value: number | string
  label: string
}) {
  return (
    <div className={`cb-stat cb-stat--${tone}`}>
      <p className="cb-stat__value">{value}</p>
      <p className="cb-stat__label">{label}</p>
    </div>
  )
}

/* --------------------------------------------------- cabecalho da pagina */

export interface Crumb {
  label: string
  to?: string
}

export function Breadcrumbs({ items }: { items: readonly Crumb[] }) {
  return (
    <nav className="cb-crumbs" aria-label={strings.common.breadcrumbs}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        return (
          <span key={`${item.label}-${index}`} className="cb-crumbs__item">
            {isLast || !item.to ? (
              <span
                className={cx('cb-crumbs__label', isLast && 'cb-crumbs__label--current')}
                aria-current={isLast ? 'page' : undefined}
              >
                {item.label}
              </span>
            ) : (
              <Link className="cb-crumbs__label" to={item.to}>
                {item.label}
              </Link>
            )}
            {!isLast && <Icon name="chevron_right" size={16} tone="tertiary" />}
          </span>
        )
      })}
    </nav>
  )
}

export function PageHeader({
  crumbs,
  title,
  subtitle,
  action,
}: {
  crumbs: readonly Crumb[]
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <>
      <Breadcrumbs items={crumbs} />
      <header className="cb-page-header">
        <div className="cb-page-header__text">
          <h1 className="cb-page-header__title">{title}</h1>
          {subtitle && <p className="cb-page-header__subtitle">{subtitle}</p>}
        </div>
        {action && <div className="cb-page-header__action">{action}</div>}
      </header>
    </>
  )
}

/* ----------------------------------------------------------------- estado */

/** Caixa de estado da lista: vazio, erro de rede e afins. */
export function StateBox({
  icon,
  iconTone = 'tertiary',
  iconSize = 48,
  title,
  titleSize = 'headline',
  message,
  children,
}: {
  icon: IconName
  iconTone?: 'tertiary' | 'brand'
  iconSize?: number
  title: string
  titleSize?: 'headline' | 'title'
  message: string
  children?: ReactNode
}) {
  return (
    <div className="cb-state">
      <Icon name={icon} size={iconSize} tone={iconTone} />
      <h2 className={`cb-state__title cb-state__title--${titleSize}`}>{title}</h2>
      <p className="cb-state__message">{message}</p>
      {children && <div className="cb-state__actions">{children}</div>}
    </div>
  )
}

/** Estado de carregamento da lista: cinco linhas de barras. */
export function SkeletonRows() {
  return (
    <div className="cb-state cb-state--loading" role="status" aria-label={strings.common.loading}>
      {Array.from({ length: 5 }, (_, row) => (
        <div key={row} className="cb-skeleton-row">
          {[280, 120, 80, 100].map((width) => (
            <span key={width} className="cb-skeleton" style={{ width }} />
          ))}
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ modal */

export function Modal({
  title,
  message,
  children,
  actions,
  onDismiss,
}: {
  title: string
  message?: string
  children?: ReactNode
  /** Na ordem do desktop: a acao principal por ultimo. */
  actions: ReactNode
  onDismiss: () => void
}) {
  const titleId = useId()
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    panel.current?.focus()
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') onDismiss()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previous?.focus()
    }
  }, [onDismiss])

  return (
    <div className="cb-overlay">
      <div
        className="cb-overlay__stage"
        onPointerDown={(event) => {
          if (event.target === event.currentTarget) onDismiss()
        }}
      >
        <div
          ref={panel}
          className="cb-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
        >
          <h2 id={titleId} className="cb-modal__title">
            {title}
          </h2>
          {message && <p className="cb-modal__message">{message}</p>}
          {children}
          <div className="cb-modal__actions">{actions}</div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------- menu */

export interface MenuAction {
  label: string
  isEnabled?: boolean
  isDanger?: boolean
  onSelect: () => void
}

/** Menu de mais acoes (more_vert) das linhas da tabela no tablet. */
export function ActionMenu({ label, actions }: { label: string; actions: readonly MenuAction[] }) {
  const [isOpen, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    function onPointerDown(event: PointerEvent) {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [isOpen])

  return (
    <div className="cb-action-menu" ref={root}>
      <IconButton
        icon="more_vert"
        label={label}
        expanded={isOpen}
        onClick={() => setOpen((current) => !current)}
      />
      {isOpen && (
        <ul className="cb-menu cb-action-menu__list" role="menu">
          {actions.map((action) => (
            <li key={action.label} role="none">
              <button
                type="button"
                role="menuitem"
                className={cx('cb-menu__item', action.isDanger && 'cb-menu__item--danger')}
                disabled={action.isEnabled === false}
                onClick={() => {
                  setOpen(false)
                  action.onSelect()
                }}
              >
                {action.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* ----------------------------------------------------------------- tabela */

export interface TableColumn<T> {
  title: string
  /** Largura fixa em px; sem ela a coluna ocupa o que sobra. */
  width?: number
  cell: (item: T) => ReactNode
}

/**
 * Tabela do painel. As colunas mudam por largura (quem chama decide quais
 * passar) e a ultima coluna, sem titulo, guarda as acoes da linha.
 */
export function DataTable<T>({
  columns,
  items,
  rowKey,
  actions,
  actionsWidth,
}: {
  columns: readonly TableColumn<T>[]
  items: readonly T[]
  rowKey: (item: T) => string
  actions: (item: T) => ReactNode
  actionsWidth: number
}) {
  const template = [
    ...columns.map((column) => (column.width ? `${column.width}px` : 'minmax(0, 1fr)')),
    `${actionsWidth}px`,
  ].join(' ')
  return (
    <div className="cb-table" role="table">
      <div className="cb-table__row cb-table__row--head" role="row" style={{ gridTemplateColumns: template }}>
        {columns.map((column) => (
          <span key={column.title} role="columnheader">
            {column.title}
          </span>
        ))}
        <span role="columnheader">
          <span className="cb-visually-hidden">{strings.common.actions}</span>
        </span>
      </div>
      {items.map((item) => (
        <div
          key={rowKey(item)}
          className="cb-table__row"
          role="row"
          style={{ gridTemplateColumns: template }}
        >
          {columns.map((column, index) => (
            <span
              key={column.title}
              role="cell"
              className={cx('cb-table__cell', index === 0 && 'cb-table__cell--strong')}
            >
              {column.cell(item)}
            </span>
          ))}
          <span role="cell" className="cb-table__cell cb-table__cell--actions">
            {actions(item)}
          </span>
        </div>
      ))}
    </div>
  )
}

/* ---------------------------------------------------------------- largura */

export type Viewport = 'desktop' | 'tablet' | 'mobile'

function readViewport(): Viewport {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'desktop'
  if (window.matchMedia('(max-width: 767px)').matches) return 'mobile'
  if (window.matchMedia('(max-width: 1199px)').matches) return 'tablet'
  return 'desktop'
}

/** As tres larguras do Figma: desktop (1440), tablet (834) e mobile (390). */
export function useViewport(): Viewport {
  const [viewport, setViewport] = useState<Viewport>(readViewport)
  useEffect(() => {
    const update = () => setViewport(readViewport())
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  return viewport
}
