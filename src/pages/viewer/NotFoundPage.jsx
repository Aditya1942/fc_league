import { useNavigate } from 'react-router'
import { ClayButton, EmptyState, IconBall } from '../../ui/index.js'

export default function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <EmptyState
      icon={<IconBall />}
      title='Page not found'
      message='That page is out of play.'
      action={<ClayButton variant='soft' onClick={() => navigate('/')}>Back to home</ClayButton>}
    />
  )
}
