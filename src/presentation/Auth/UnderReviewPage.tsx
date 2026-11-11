import { useNavigate } from 'react-router-dom'
import { useSession } from '@/app/session'
import { Banner, Button } from '@/designSystem/components'
import { AuthCard } from '@/presentation/Auth/AuthCard'
import { strings } from '@/resources/strings'

/** Depois do codigo: o registro profissional ainda vai ser conferido. */
export function UnderReviewPage() {
  const session = useSession()
  const navigate = useNavigate()
  const { registration } = session.profile

  return (
    <AuthCard
      icon="hourglass_top"
      iconTone="warning"
      title={strings.underReview.title}
      subtitle={
        registration.trim() === ''
          ? strings.underReview.messageFallback
          : strings.underReview.message(registration)
      }
    >
      <Banner message={strings.underReview.note} tone="info" />
      <Button
        title={strings.underReview.goToPanel}
        fillsWidth
        onClick={() => navigate('/oportunidades', { replace: true })}
      />
    </AuthCard>
  )
}
