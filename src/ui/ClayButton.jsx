import { cn } from './cn.js'

export function ClayButton({
  variant = 'primary',
  size = 'md',
  pressed = false,
  className,
  type = 'button',
  children,
  ...props
}) {
  return (
    <button
      {...props}
      type={type}
      className={cn(
        'clay-btn',
        `clay-btn--${variant}`,
        `clay-btn--${size}`,
        pressed && 'is-pressed',
        className,
      )}
      aria-pressed={pressed ? true : undefined}
    >
      {children}
    </button>
  )
}
