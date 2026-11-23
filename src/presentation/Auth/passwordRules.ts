import type { PasswordRule } from '@/designSystem/components'
import { passwordRules } from '@/domain/useCases'
import { strings } from '@/resources/strings'

export function ruleList(password: string): PasswordRule[] {
  return passwordRules(password).map((rule) => ({
    label: strings.common.passwordRules[rule.id],
    met: rule.met,
  }))
}
