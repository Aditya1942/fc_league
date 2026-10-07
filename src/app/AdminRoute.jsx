import { lazy, Suspense } from 'react'
import { LoadingCards } from '../pages/viewer/components/LoadingCards.jsx'

const AdminRoutes = lazy(() => import('../pages/admin/AdminRoutes.jsx'))

export function AdminRoute() {
  return (
    <Suspense fallback={<LoadingCards count={3} />}>
      <AdminRoutes />
    </Suspense>
  )
}
