import { useEffect } from 'react'
import { cn } from './cn.js'
import { IconButton } from './IconButton.jsx'

export function Toast({ message, open = true, onClose, tone = 'soft', duration = 0 }) {
  useEffect(() => {
    if (!open || !message || !duration || !onClose) return undefined
    const id = setTimeout(onClose, duration)
    return () => clearTimeout(id)
  }, [open, message, duration, onClose])

  if (!open || !message) return null

  return (
    <div className={cn('toast', `toast--${tone}`)} role='status' aria-live='polite'>
      <p className='toast__message'>{message}</p>
      {onClose ? (
        <IconButton label='Dismiss notification' onClick={onClose}>
          ×
        </IconButton>
      ) : null}
    </div>
  )
}
