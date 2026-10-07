import { Skeleton } from '../../../ui/index.js'

export function LoadingCards({ count = 3, height = '96px' }) {
  return (
    <div className='v-stack' aria-busy='true' aria-label='Loading'>
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} height={height} radius='var(--radius-card)' />
      ))}
    </div>
  )
}
