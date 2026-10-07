export function EmptyState({ icon, title, message, action }) {
  return (
    <div className='empty'>
      {icon ? <div className='empty__icon' aria-hidden='true'>{icon}</div> : null}
      {title ? <h2 className='empty__title'>{title}</h2> : null}
      {message ? <p className='empty__message'>{message}</p> : null}
      {action}
    </div>
  )
}
