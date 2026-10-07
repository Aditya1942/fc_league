import { useEffect, useRef } from 'react'
import { cn } from './cn.js'

export function SegmentedTabs({
  tabs = [],
  value,
  onChange,
  label = 'Sections',
  className,
}) {
  const ref = useRef(null)
  const ids = tabs.map((tab) => tab.id ?? tab.value)

  useEffect(() => {
    const selected = ref.current?.querySelector('[aria-selected="true"]')
    if (selected && ref.current.contains(document.activeElement)) selected.focus()
  }, [value])

  const onKeyDown = (event) => {
    const current = Math.max(0, ids.indexOf(value))
    let nextIndex = null
    if (event.key === 'ArrowRight') nextIndex = (current + 1) % ids.length
    if (event.key === 'ArrowLeft') nextIndex = (current - 1 + ids.length) % ids.length
    if (event.key === 'Home') nextIndex = 0
    if (event.key === 'End') nextIndex = ids.length - 1
    if (nextIndex == null || !ids.length) return
    event.preventDefault()
    onChange?.(ids[nextIndex])
  }

  return (
    <div
      ref={ref}
      className={cn('segments', className)}
      role='tablist'
      aria-label={label}
      onKeyDown={onKeyDown}
    >
      {tabs.map((tab) => {
        const id = tab.id ?? tab.value
        const selected = id === value
        return (
          <button
            key={id}
            type='button'
            role='tab'
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            className={cn('segments__tab', selected && 'is-selected')}
            onClick={() => onChange?.(id)}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
