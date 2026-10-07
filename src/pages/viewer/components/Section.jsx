import { Link } from 'react-router'
import { Chip, IconChevronRight } from '../../../ui/index.js'

export function Section({ title, action, children }) {
  return (
    <section className='v-section'>
      <div className='v-section__head'>
        <h2 className='v-section__title'>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

export function SeeAll({ to, children = 'See all' }) {
  return (
    <Link to={to} className='v-see-all'>
      <Chip tone='blue'>
        {children}
        <IconChevronRight />
      </Chip>
    </Link>
  )
}
