import { useEffect, useId, useRef } from 'react'
import { IconButton } from './IconButton.jsx'
import { IconChevronDown } from './icons.jsx'

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

export function Sheet({ open, onClose, title, children }) {
  const dialogRef = useRef(null)
  const titleId = useId()

  useEffect(() => {
    if (!open) return undefined
    const previous = document.activeElement
    const dialog = dialogRef.current
    const nodes = () => [...(dialog?.querySelectorAll(FOCUSABLE) || [])]
    nodes()[0]?.focus()

    const onKey = (event) => {
      if (event.key === 'Escape') {
        onClose?.()
        return
      }
      if (event.key !== 'Tab') return
      const list = nodes()
      if (!list.length) return
      const first = list[0]
      const last = list[list.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
      previous?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className='sheet-root'>
      <button type='button' className='sheet-backdrop' aria-label='Close dialog' tabIndex={-1} onClick={onClose} />
      <div
        className='sheet'
        role='dialog'
        aria-modal='true'
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : 'Dialog'}
        ref={dialogRef}
      >
        <div className='sheet__handle' aria-hidden='true' />
        <div className='sheet__head'>
          {title ? <h2 id={titleId} className='sheet__title'>{title}</h2> : <span />}
          <IconButton label='Close' onClick={onClose}>
            <IconChevronDown />
          </IconButton>
        </div>
        <div className='sheet__body'>{children}</div>
      </div>
    </div>
  )
}
