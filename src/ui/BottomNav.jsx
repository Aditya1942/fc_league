import { NavLink } from 'react-router'
import { cn } from './cn.js'

export function BottomNav({ items = [] }) {
  return (
    <nav className='bottom-nav' aria-label='Primary'>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end ?? item.to === '/'}
          className={({ isActive }) => cn('bottom-nav__item', isActive && 'is-active')}
        >
          <span className='bottom-nav__icon' aria-hidden='true'>{item.icon}</span>
          <span className='bottom-nav__label'>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
