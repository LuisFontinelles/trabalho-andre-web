import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '@/app/session'
import { readTheme, saveTheme, type ThemeChoice } from '@/app/theme'
import {
  Banner,
  Button,
  Chip,
  Modal,
  PageHeader,
  Panel,
  TextField,
} from '@/designSystem/components'
import { strings } from '@/resources/strings'

const text = strings.settings

const THEMES: readonly { value: ThemeChoice; label: string }[] = [
  { value: 'system', label: text.themeSystem },
  { value: 'light', label: text.themeLight },
  { value: 'dark', label: text.themeDark },
]

type NoticeKey = 'newRequest' | 'deadline' | 'weekly'

const NOTICES: readonly { key: NoticeKey; label: string }[] = [
  { key: 'newRequest', label: text.noticeNewRequest },
  { key: 'deadline', label: text.noticeDeadline },
  { key: 'weekly', label: text.noticeWeekly },
]

const NOTICES_KEY = 'carebridge.notices'
const DEFAULT_NOTICES: Record<NoticeKey, boolean> = {
  newRequest: true,
  deadline: true,
  weekly: false,
}

function readNotices(): Record<NoticeKey, boolean> {
  try {
    const raw = localStorage.getItem(NOTICES_KEY)
    return raw === null ? DEFAULT_NOTICES : { ...DEFAULT_NOTICES, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_NOTICES
  }
}

function noop() {
  // Os campos do perfil sao so de leitura nesta versao.
}

export function SettingsPage() {
  const session = useSession()
  const navigate = useNavigate()
  const user = session.session?.user
  const { registration, isVerified } = session.profile

  const [theme, setTheme] = useState<ThemeChoice>(readTheme)
  const [notices, setNotices] = useState(readNotices)
  const [notice, setNotice] = useState<string | null>(null)
  const [isDeleting, setDeleting] = useState(false)

  function chooseTheme(choice: ThemeChoice) {
    setTheme(choice)
    saveTheme(choice)
  }

  function toggleNotice(key: NoticeKey) {
    const next = { ...notices, [key]: !notices[key] }
    setNotices(next)
    try {
      localStorage.setItem(NOTICES_KEY, JSON.stringify(next))
    } catch {
      // Sem armazenamento a escolha vale so ate recarregar a pagina.
    }
  }

  /** Entrega em JSON o que o painel sabe da conta, como a LGPD pede. */
  function downloadData() {
    const blob = new Blob(
      [JSON.stringify({ user, registration, isVerified, notices, theme }, null, 2)],
      { type: 'application/json' },
    )
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'carebridge-meus-dados.json'
    link.click()
    URL.revokeObjectURL(url)
    setNotice(text.downloadReady)
  }

  function signOut() {
    session.signOut()
    navigate('/', { replace: true })
  }

  return (
    <>
      <PageHeader crumbs={[{ label: text.title }]} title={text.title} subtitle={text.subtitle} />

      {notice && <Banner message={notice} tone="success" />}

      <Panel title={text.profileTitle}>
        <div className="cb-row">
          <TextField label={text.name} value={user?.name ?? ''} onChange={noop} isReadOnly />
          <TextField label={text.email} value={user?.email ?? ''} onChange={noop} isReadOnly />
        </div>
        <div className="cb-row">
          <TextField label={text.registration} value={registration} onChange={noop} isEnabled={false} />
          <TextField
            label={text.registrationStatus}
            value={isVerified ? text.verified : text.underReview}
            onChange={noop}
            isEnabled={false}
          />
        </div>
      </Panel>

      <Panel title={text.appearanceTitle}>
        <div className="cb-chips" role="group" aria-label={text.themeLabel}>
          {THEMES.map((item) => (
            <Chip
              key={item.value}
              label={item.label}
              isSelected={theme === item.value}
              onClick={() => chooseTheme(item.value)}
            />
          ))}
        </div>
      </Panel>

      <Panel title={text.noticesTitle} gap="none">
        {NOTICES.map((item) => (
          <div key={item.key} className="cb-setting">
            <span>{item.label}</span>
            <Chip
              label={notices[item.key] ? text.enabled : text.disabled}
              isSelected={notices[item.key]}
              onClick={() => toggleNotice(item.key)}
            />
          </div>
        ))}
      </Panel>

      <Panel title={text.accountTitle} gap="md">
        <div className="cb-account-actions">
          <Button title={text.download} kind="outline" onClick={downloadData} />
          <Button title={text.signOut} kind="outline" onClick={signOut} />
          <Button title={text.deleteAccount} kind="dangerSoft" onClick={() => setDeleting(true)} />
        </div>
      </Panel>

      {isDeleting && (
        <Modal
          title={text.deleteTitle}
          message={text.deleteMessage}
          onDismiss={() => setDeleting(false)}
          actions={<Button title={strings.common.close} onClick={() => setDeleting(false)} />}
        />
      )}
    </>
  )
}
