import { useId, useState, type ChangeEvent, type ReactNode } from 'react'
import { CbIcon } from '@/designSystem/tokens/icons'
import { strings } from '@/resources/strings'
import './components.css'

type ButtonKind = 'primary' | 'secondary' | 'tertiary' | 'destructive'

interface ButtonProps {
  title: string
  kind?: ButtonKind
  size?: 'regular' | 'compact'
  icon?: ReactNode
  isLoading?: boolean
  isEnabled?: boolean
  fillsWidth?: boolean
  disabledHint?: string
  type?: 'button' | 'submit'
  onClick?: () => void
}

export function Button({
  title,
  kind = 'primary',
  size = 'regular',
  icon,
  isLoading = false,
  isEnabled = true,
  fillsWidth = true,
  disabledHint,
  type = 'button',
  onClick,
}: ButtonProps) {
  const active = isEnabled && !isLoading
  const classes = [
    'cb-button',
    `cb-button--${kind}`,
    size === 'compact' ? 'cb-button--compact' : '',
    fillsWidth ? 'cb-button--fill' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div>
      <button type={type} className={classes} disabled={!active} onClick={onClick}>
        {isLoading ? <span aria-hidden="true">...</span> : icon}
        {isLoading ? strings.common.loading : title}
      </button>
      {disabledHint && !active && (
        <p className="cb-hint">
          <CbIcon.locked size={14} />
          {disabledHint}
        </p>
      )}
    </div>
  )
}

export function LinkButton({
  title,
  isEnabled = true,
  onClick,
}: {
  title: string
  isEnabled?: boolean
  onClick?: () => void
}) {
  return (
    <button type="button" className="cb-link-button" disabled={!isEnabled} onClick={onClick}>
      {title}
    </button>
  )
}

export function FieldError({ message }: { message: string }) {
  return (
    <span className="cb-field__error" role="alert">
      <CbIcon.error size={14} />
      {message}
    </span>
  )
}

interface TextFieldProps {
  label: string
  placeholder?: string
  value: string
  onChange: (value: string) => void
  type?: 'text' | 'email' | 'password' | 'tel'
  autoComplete?: string
  errorMessage?: string | null
  isEnabled?: boolean
}

export function TextField({
  label,
  placeholder,
  value,
  onChange,
  type = 'text',
  autoComplete,
  errorMessage,
  isEnabled = true,
}: TextFieldProps) {
  const id = useId()
  const [revealed, setRevealed] = useState(false)
  const isSecure = type === 'password'
  const hasError = Boolean(errorMessage)
  const inputType = isSecure && !revealed ? 'password' : isSecure ? 'text' : type

  return (
    <div className="cb-field">
      <label className="cb-field__label" htmlFor={id}>
        {label}
      </label>
      <div
        className={[
          'cb-field__control',
          hasError ? 'cb-field__control--error' : '',
          isEnabled ? '' : 'cb-field__control--disabled',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <input
          id={id}
          className="cb-field__input"
          type={inputType}
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={!isEnabled}
          aria-invalid={hasError}
          onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
        />
        {isSecure && (
          <button
            type="button"
            className="cb-field__reveal"
            aria-label={revealed ? strings.login.hidePassword : strings.login.showPassword}
            onClick={() => setRevealed((current) => !current)}
          >
            {revealed ? <CbIcon.passwordVisible /> : <CbIcon.passwordHidden />}
          </button>
        )}
      </div>
      {errorMessage && <FieldError message={errorMessage} />}
    </div>
  )
}

interface SelectFieldProps {
  label: string
  placeholder: string
  options: readonly { id: string; label: string }[]
  value: string | null
  onChange: (value: string | null) => void
  errorMessage?: string | null
  isEnabled?: boolean
}

export function SelectField({
  label,
  placeholder,
  options,
  value,
  onChange,
  errorMessage,
  isEnabled = true,
}: SelectFieldProps) {
  const id = useId()
  const hasError = Boolean(errorMessage)

  return (
    <div className="cb-field">
      <label className="cb-field__label" htmlFor={id}>
        {label}
      </label>
      <div
        className={[
          'cb-field__control',
          hasError ? 'cb-field__control--error' : '',
          isEnabled ? '' : 'cb-field__control--disabled',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <select
          id={id}
          className="cb-select"
          value={value ?? ''}
          disabled={!isEnabled}
          aria-invalid={hasError}
          onChange={(event) => onChange(event.target.value === '' ? null : event.target.value)}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        <CbIcon.expand size={16} />
      </div>
      {errorMessage && <FieldError message={errorMessage} />}
    </div>
  )
}

interface OptionSelectorProps<T extends string> {
  label?: string
  options: readonly { id: T; title: string; isEnabled?: boolean }[]
  value: T
  onChange: (value: T) => void
  disabledHint?: string
}

export function OptionSelector<T extends string>({
  label,
  options,
  value,
  onChange,
  disabledHint,
}: OptionSelectorProps<T>) {
  const hasDisabled = options.some((option) => option.isEnabled === false)

  return (
    <div className="cb-option-selector">
      {label && <span className="cb-field__label">{label}</span>}
      <div className="cb-option-selector__options" role="group" aria-label={label}>
        {options.map((option) => {
          const enabled = option.isEnabled !== false
          const selected = option.id === value
          return (
            <button
              key={option.id}
              type="button"
              className={['cb-option', selected ? 'cb-option--selected' : ''].filter(Boolean).join(' ')}
              disabled={!enabled}
              aria-pressed={selected}
              onClick={() => enabled && onChange(option.id)}
            >
              {!enabled && <CbIcon.locked size={13} />}
              {option.title}
            </button>
          )
        })}
      </div>
      {disabledHint && hasDisabled && (
        <span className="cb-hint">
          <CbIcon.underConstruction size={14} />
          {disabledHint}
        </span>
      )}
    </div>
  )
}

export function Checkbox({
  title,
  checked,
  onChange,
  errorMessage,
}: {
  title: string
  checked: boolean
  onChange: (value: boolean) => void
  errorMessage?: string | null
}) {
  const hasError = Boolean(errorMessage)
  return (
    <div className="cb-checkbox">
      <button
        type="button"
        className="cb-checkbox__row"
        role="checkbox"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
      >
        <span
          className={[
            'cb-checkbox__box',
            checked ? 'cb-checkbox__box--on' : '',
            hasError ? 'cb-checkbox__box--error' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {checked && <CbIcon.check size={14} />}
        </span>
        {title}
      </button>
      {errorMessage && <FieldError message={errorMessage} />}
    </div>
  )
}

export function CodeField({
  code,
  onChange,
  length = 4,
  errorMessage,
  label,
}: {
  code: string
  onChange: (value: string) => void
  length?: number
  errorMessage?: string | null
  label: string
}) {
  const id = useId()
  const digits = [...code]
  const hasError = Boolean(errorMessage)

  return (
    <div className="cb-code-field">
      <label className="cb-field__label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className="cb-field__input"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={length}
        value={code}
        aria-invalid={hasError}
        style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, '').slice(0, length))}
      />
      <div className="cb-code-field__boxes" aria-hidden="true">
        {Array.from({ length }, (_, index) => (
          <span
            key={index}
            className={[
              'cb-code-field__box',
              index < digits.length ? 'cb-code-field__box--filled' : '',
              hasError ? 'cb-code-field__box--error' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {digits[index] ?? '-'}
          </span>
        ))}
      </div>
      {errorMessage && <FieldError message={errorMessage} />}
    </div>
  )
}

export type BadgeTone = 'success' | 'warning' | 'danger' | 'neutral' | 'info'

export function Badge({ text, tone = 'success' }: { text: string; tone?: BadgeTone }) {
  return <span className={`cb-badge cb-badge--${tone}`}>{text}</span>
}

export function Chip({
  title,
  isSelected,
  onClick,
}: {
  title: string
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={['cb-chip', isSelected ? 'cb-chip--selected' : ''].filter(Boolean).join(' ')}
      aria-pressed={isSelected}
      onClick={onClick}
    >
      {title}
    </button>
  )
}

export function Card({ children }: { children: ReactNode }) {
  return <div className="cb-card">{children}</div>
}

export function KeyValueRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="cb-key-value">
      <span className="cb-key-value__key">{label}</span>
      <span className="cb-key-value__value">{value}</span>
    </div>
  )
}

export type BannerTone = 'error' | 'warning' | 'info' | 'success'

export function Banner({ message, tone = 'error' }: { message: string; tone?: BannerTone }) {
  const Icon =
    tone === 'error'
      ? CbIcon.error
      : tone === 'warning'
        ? CbIcon.warning
        : tone === 'success'
          ? CbIcon.success
          : CbIcon.info

  return (
    <div className={`cb-banner cb-banner--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <Icon size={16} />
      <span>{message}</span>
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  message,
  actionTitle,
  onAction,
}: {
  icon: ReactNode
  title: string
  message: string
  actionTitle?: string
  onAction?: () => void
}) {
  return (
    <div className="cb-empty-state">
      <span className="cb-empty-state__icon">{icon}</span>
      <h3 className="cb-empty-state__title">{title}</h3>
      <p className="cb-empty-state__message">{message}</p>
      {actionTitle && onAction && (
        <Button title={actionTitle} kind="secondary" size="compact" fillsWidth={false} onClick={onAction} />
      )}
    </div>
  )
}

export function Skeleton({ height = 16, width }: { height?: number; width?: number | string }) {
  return <div className="cb-skeleton" style={{ height, width: width ?? '100%' }} aria-hidden="true" />
}

export function DisabledTag({ text = strings.common.soon }: { text?: string }) {
  return (
    <span className="cb-disabled-tag">
      <CbIcon.underConstruction size={12} />
      {text}
    </span>
  )
}

export function BrandMark() {
  return <span className="cb-brand-mark">{strings.app.name}</span>
}
