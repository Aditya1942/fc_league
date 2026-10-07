import { cn } from './cn.js'

export function Chip({
  tone = 'soft',
  selected = false,
  className,
  children,
  onClick,
  type = 'button',
  ...props
}) {
  if (onClick) {
    return (
      <button
        {...props}
        type={type}
        className={cn('chip', `chip--${tone}`, selected && 'is-selected', className)}
        aria-pressed={selected}
        onClick={onClick}
      >
        {children}
      </button>
    )
  }

  return (
    <span {...props} className={cn('chip', `chip--${tone}`, selected && 'is-selected', className)}>
      {children}
    </span>
  )
}
