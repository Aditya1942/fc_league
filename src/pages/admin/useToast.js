import { useCallback, useMemo, useState } from 'react'

export function useToast() {
  const [toast, setToast] = useState(null)
  const hide = useCallback(() => setToast(null), [])
  const show = useCallback((message, tone = 'mint') => {
    setToast({ message, tone, key: Date.now() })
  }, [])
  const fail = useCallback((error) => {
    setToast({ message: error?.message || String(error), tone: 'danger', key: Date.now() })
  }, [])
  return useMemo(() => ({ toast, show, fail, hide }), [toast, show, fail, hide])
}
