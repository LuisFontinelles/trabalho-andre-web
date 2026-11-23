import {
  DEFAULT_CODE_LENGTH,
  requiresProfessionalData,
  type Catalog,
  type PendingVerification,
  type Session,
  type SignUpDraft,
} from '@/domain/entities'
import type { AuthRepository } from '@/domain/repositories'
import { strings } from '@/resources/strings'

export type ValidationCode =
  | 'emailRequired'
  | 'emailInvalid'
  | 'passwordRequired'
  | 'passwordWeak'
  | 'nameRequired'
  | 'passwordMismatch'
  | 'termsNotAccepted'
  | 'councilRequired'
  | 'stateRequired'
  | 'registrationRequired'
  | 'registrationInvalid'
  | 'specialtyRequired'
  | 'workplaceRequired'
  | 'codeIncomplete'
  | 'newPasswordWeak'

const VALIDATION_MESSAGE: Record<ValidationCode, string> = {
  emailRequired: strings.login.emailRequired,
  emailInvalid: strings.login.emailInvalid,
  passwordRequired: strings.login.passwordRequired,
  passwordWeak: strings.signUp.passwordRule,
  nameRequired: strings.signUp.nameRequired,
  passwordMismatch: strings.signUp.passwordMismatch,
  termsNotAccepted: strings.signUp.termsRequired,
  councilRequired: strings.signUp.councilRequired,
  stateRequired: strings.signUp.stateRequired,
  registrationRequired: strings.signUp.registrationRequired,
  registrationInvalid: strings.signUp.registrationInvalid,
  specialtyRequired: strings.signUp.specialtyRequired,
  workplaceRequired: strings.signUp.workplaceRequired,
  codeIncomplete: strings.verification.incomplete,
  newPasswordWeak: strings.recover.passwordRule,
}

export class ValidationError extends Error {
  readonly code: ValidationCode

  constructor(code: ValidationCode) {
    super(VALIDATION_MESSAGE[code])
    this.name = 'ValidationError'
    this.code = code
  }
}

const REGISTRATION_PATTERN = /^\d{4,7}$/

const EMAIL_PATTERN = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/

export function validateEmail(email: string): void {
  const value = email.trim()
  if (value === '') throw new ValidationError('emailRequired')
  if (!EMAIL_PATTERN.test(value)) throw new ValidationError('emailInvalid')
}

export function validatePassword(password: string, strict: boolean): void {
  if (password === '') throw new ValidationError('passwordRequired')
  if (!strict) return
  const hasUpper = /[A-Z]/.test(password)
  const hasDigit = /[0-9]/.test(password)
  if (password.length < 8 || !hasUpper || !hasDigit) {
    throw new ValidationError('passwordWeak')
  }
}

/**
 * Valida na ordem em que os campos aparecem na tela, para o primeiro erro
 * mostrado ser o primeiro campo problematico.
 */
export function validateSignUp(draft: SignUpDraft): void {
  if (draft.name.trim() === '') throw new ValidationError('nameRequired')
  validateEmail(draft.email)

  if (requiresProfessionalData(draft)) {
    if (draft.professional.councilId === null)
      throw new ValidationError('councilRequired')
    if (draft.professional.stateId === null)
      throw new ValidationError('stateRequired')
    const number = draft.professional.number.trim()
    if (number === '') throw new ValidationError('registrationRequired')
    // O contrato aceita de 4 a 7 digitos no numero do registro.
    if (!REGISTRATION_PATTERN.test(number)) throw new ValidationError('registrationInvalid')
    if (draft.professional.specialtyId === null) throw new ValidationError('specialtyRequired')
    if (draft.professional.workplace.trim() === '') throw new ValidationError('workplaceRequired')
  }

  validatePassword(draft.password, true)
  if (draft.password !== draft.confirmPassword)
    throw new ValidationError('passwordMismatch')
  if (!draft.acceptedTerms) throw new ValidationError('termsNotAccepted')
}

export function makeLogin(repository: AuthRepository) {
  return async (email: string, password: string): Promise<Session> => {
    validateEmail(email)
    validatePassword(password, false)
    return repository.login(email.trim().toLowerCase(), password)
  }
}

export function makeSignUp(repository: AuthRepository) {
  return async (draft: SignUpDraft): Promise<PendingVerification> => {
    validateSignUp(draft)
    return repository.signUp({
      ...draft,
      name: draft.name.trim(),
      email: draft.email.trim().toLowerCase(),
      professional: {
        ...draft.professional,
        number: draft.professional.number.trim(),
        workplace: draft.professional.workplace.trim(),
      },
    })
  }
}

export function makeVerifyCode(repository: AuthRepository) {
  return async (
    email: string,
    code: string,
    length: number = DEFAULT_CODE_LENGTH,
  ): Promise<Session | null> => {
    const digits = code.replace(/\D/g, '')
    if (digits.length !== length) throw new ValidationError('codeIncomplete')
    return repository.verify(email, digits)
  }
}

export function makeResendCode(repository: AuthRepository) {
  return (email: string): Promise<void> => repository.resendCode(email)
}

export function makeRequestPasswordReset(repository: AuthRepository) {
  return async (email: string): Promise<void> => {
    validateEmail(email)
    await repository.requestPasswordReset(email.trim().toLowerCase())
  }
}

export const RESET_CODE_LENGTH = 6

/** Mesma regra da API para a nova senha: 8+, maiuscula, minuscula, numero e simbolo. */
const STRONG_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/

export function makeResetPassword(repository: AuthRepository) {
  return async (email: string, code: string, newPassword: string): Promise<void> => {
    const digits = code.replace(/\D/g, '')
    if (digits.length !== RESET_CODE_LENGTH) throw new ValidationError('codeIncomplete')
    if (newPassword === '') throw new ValidationError('passwordRequired')
    if (!STRONG_PASSWORD.test(newPassword)) throw new ValidationError('newPasswordWeak')
    await repository.resetPassword(email.trim().toLowerCase(), digits, newPassword)
  }
}

export function makeDeleteAccount(repository: AuthRepository) {
  return async (password: string): Promise<void> => {
    if (password === '') throw new ValidationError('passwordRequired')
    await repository.deleteAccount(password)
  }
}

export function makeLoadCatalog(repository: AuthRepository) {
  return (): Promise<Catalog> => repository.catalog()
}
