import { cn } from './cn.js'

export function IconButton({
  label,
  variant = 'soft',
  className,
  type = 'button',
  children,
  ...props
}) {
  return (
    <button
      {...props}
      type={type}
      className={cn('icon-btn', `icon-btn--${variant}`, className)}
      aria-label={label}
    >
      {children}
    </button>
  )
}
