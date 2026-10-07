import { cn } from './cn.js'

export function Crest({
  color,
  emoji,
  shortCode,
  size = 'md',
  label,
  decorative = false,
  className,
}) {
  const text = emoji || shortCode || '?'
  return (
    <span
      className={cn('crest', `crest--${size}`, !emoji && 'crest--code', className)}
      style={color ? { '--crest': color } : undefined}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : (label || shortCode || 'Club crest')}
      aria-hidden={decorative ? true : undefined}
    >
      {text}
    </span>
  )
}
