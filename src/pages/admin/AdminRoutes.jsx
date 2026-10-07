import { Navigate, Route, Routes, useLocation } from 'react-router'
import { useAuth } from '../../auth/index.js'
import { ClayButton, EmptyState, IconSettings, Spinner } from '../../ui/index.js'
import AdminDashboard from './AdminDashboard.jsx'
import LeagueSettings from './LeagueSettings.jsx'
import PlayersAdmin from './PlayersAdmin.jsx'
import SeasonsAdmin from './SeasonsAdmin.jsx'
import SeasonAdmin from './SeasonAdmin.jsx'
import './admin.css'

export default function AdminRoutes() {
  const { user, isAdmin, loading, signOut } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className='empty' aria-busy='true'>
        <Spinner />
      </div>
    )
  }

  if (!user) {
    return <Navigate to='/signin' replace state={{ from: location.pathname }} />
  }

  if (!isAdmin) {
    return (
      <EmptyState
        icon={<IconSettings />}
        title='Not an admin'
        message='This account can browse the league but cannot change data.'
        action={<ClayButton variant='soft' onClick={() => signOut()}>Sign out</ClayButton>}
      />
    )
  }

  return (
    <Routes>
      <Route index element={<AdminDashboard />} />
      <Route path='league' element={<LeagueSettings />} />
      <Route path='players' element={<PlayersAdmin />} />
      <Route path='seasons' element={<SeasonsAdmin />} />
      <Route path='seasons/:seasonId' element={<SeasonAdmin />} />
      <Route path='*' element={<Navigate to='/admin' replace />} />
    </Routes>
  )
}
