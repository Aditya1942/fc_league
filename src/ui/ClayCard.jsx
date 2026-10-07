import { cn } from './cn.js'

export function ClayCard({
  as: Tag = 'div',
  className,
  children,
  padded = true,
  ...props
}) {
  return (
    <Tag className={cn('clay-card', padded && 'clay-card--padded', className)} {...props}>
      {children}
    </Tag>
  )
}
