import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { cn } from './cn.js'

export function TopBar({ title, left, right, collapsing = true }) {
  const ref = useRef(null)
  const [compact, setCompact] = useState(false)

  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return undefined
    const apply = () => {
      document.documentElement.style.setProperty('--topbar-offset', `${element.getBoundingClientRect().height}px`)
    }
    apply()
    const observer = new ResizeObserver(apply)
    observer.observe(element)
    return () => {
      observer.disconnect()
      document.documentElement.style.removeProperty('--topbar-offset')
    }
  }, [])

  useEffect(() => {
    if (!collapsing) return undefined
    const onScroll = () => setCompact(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [collapsing])

  return (
    <header ref={ref} className={cn('topbar', compact && 'is-compact')}>
      <div className='topbar__slot'>{left}</div>
      <h1 className='topbar__title'>{title}</h1>
      <div className='topbar__slot topbar__slot--end'>{right}</div>
    </header>
  )
}
