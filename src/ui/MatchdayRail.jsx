import { useLayoutEffect, useRef } from 'react'
import { cn } from './cn.js'
import { IconChevronLeft, IconChevronRight } from './icons.jsx'
import { IconButton } from './IconButton.jsx'

function normalize(matchdays) {
  return (matchdays || []).map((item) => {
    if (item != null && typeof item === 'object') {
      const value = item.value ?? item.id ?? item.matchday
      return { value, label: item.label ?? `MD ${value}` }
    }
    return { value: item, label: `MD ${item}` }
  })
}

export function MatchdayRail({ matchdays = [], value, onChange, className }) {
  const scrollerRef = useRef(null)
  const items = normalize(matchdays)
  const index = items.findIndex((item) => item.value === value)

  useLayoutEffect(() => {
    const scroller = scrollerRef.current
    const chip = scroller?.querySelector('[aria-current="true"]')
    if (!scroller || !chip) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const left = chip.offsetLeft - (scroller.clientWidth - chip.offsetWidth) / 2
    scroller.scrollTo({ left: Math.max(0, left), behavior: reduce ? 'auto' : 'smooth' })
  }, [value, items.length])

  const go = (direction) => {
    const next = items[index + direction]
    if (next) onChange?.(next.value)
  }

  return (
    <div className={cn('rail', className)}>
      <IconButton
        label='Previous matchday'
        onClick={() => go(-1)}
        disabled={index <= 0}
      >
        <IconChevronLeft />
      </IconButton>
      <div className='rail__scroller' ref={scrollerRef} role='list'>
        {items.map((item) => {
          const selected = item.value === value
          return (
            <button
              key={item.value}
              type='button'
              role='listitem'
              className={cn('rail__chip', selected && 'is-selected')}
              aria-current={selected ? 'true' : undefined}
              onClick={() => onChange?.(item.value)}
            >
              {item.label}
            </button>
          )
        })}
      </div>
      <IconButton
        label='Next matchday'
        onClick={() => go(1)}
        disabled={index < 0 || index >= items.length - 1}
      >
        <IconChevronRight />
      </IconButton>
    </div>
  )
}
