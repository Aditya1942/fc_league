import { useRef } from 'react'

const THRESHOLD = 60

export function useSwipeTabs(tabIds, value, onChange) {
  const start = useRef(null)

  const onTouchStart = (event) => {
    const touch = event.touches[0]
    start.current = touch ? { x: touch.clientX, y: touch.clientY } : null
  }

  const onTouchEnd = (event) => {
    const origin = start.current
    start.current = null
    const touch = event.changedTouches[0]
    if (!origin || !touch) return
    const dx = touch.clientX - origin.x
    const dy = touch.clientY - origin.y
    if (Math.abs(dx) < THRESHOLD || Math.abs(dx) < Math.abs(dy) * 1.5) return
    if (event.target.closest?.('.standings__scroll, .rail__scroller')) return
    const index = tabIds.indexOf(value)
    const next = tabIds[index + (dx < 0 ? 1 : -1)]
    if (next != null) onChange(next)
  }

  return { onTouchStart, onTouchEnd }
}
