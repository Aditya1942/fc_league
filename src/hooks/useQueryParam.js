import { useCallback } from 'react'
import { useSearchParams } from 'react-router'

export function useQueryParam(name) {
  const [params, setParams] = useSearchParams()
  const value = params.get(name) ?? ''

  const setValue = useCallback((next) => {
    setParams((current) => {
      const updated = new URLSearchParams(current)
      if (next == null || next === '') updated.delete(name)
      else updated.set(name, String(next))
      return updated
    }, { replace: true })
  }, [name, setParams])

  return [value, setValue]
}
