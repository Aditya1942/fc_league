export function Skeleton({
  width = '100%',
  height = '1rem',
  radius = 'var(--radius-pill)',
  className,
}) {
  return (
    <span
      className={className ? `skeleton ${className}` : 'skeleton'}
      style={{ width, height, borderRadius: radius }}
      aria-hidden='true'
    />
  )
}
