import { useNavigate, useRouteError } from 'react-router'
import { ClayButton, EmptyState, IconBall } from '../ui/index.js'

export function RouteError() {
  const error = useRouteError()
  const navigate = useNavigate()
  const message = error?.statusText || error?.message || 'Something went wrong.'
  return (
    <EmptyState
      icon={<IconBall />}
      title='That did not load'
      message={message}
      action={<ClayButton variant='soft' onClick={() => navigate('/')}>Back to home</ClayButton>}
    />
  )
}
