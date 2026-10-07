import { Outlet, ScrollRestoration, useLocation, useMatches, useNavigate } from 'react-router'
import { useAuth } from '../auth/index.js'
import { useLeagueData } from '../hooks/index.js'
import {
  BottomNav,
  Crest,
  IconBack,
  IconBall,
  IconHistory,
  IconHome,
  IconSettings,
  IconTable,
  IconUsers,
  IconButton,
  TopBar,
} from '../ui/index.js'
import './layout.css'
import '../pages/viewer/viewer.css'

const NAV = [
  { to: '/', label: 'Home', icon: <IconHome /> },
  { to: '/matches', label: 'Matches', icon: <IconBall /> },
  { to: '/table', label: 'Table', icon: <IconTable /> },
  { to: '/history', label: 'History', icon: <IconHistory /> },
  { to: '/players', label: 'Players', icon: <IconUsers /> },
]

function BackButton({ fallback }) {
  const navigate = useNavigate()
  const location = useLocation()
  const goBack = () => {
    if (location.key === 'default') navigate(fallback, { replace: true })
    else navigate(-1)
  }
  return (
    <IconButton label='Back' onClick={goBack}>
      <IconBack />
    </IconButton>
  )
}

function AccountButton() {
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  return (
    <IconButton
      label={isAdmin ? 'Admin' : 'Admin sign in'}
      variant={isAdmin ? 'primary' : 'soft'}
      onClick={() => navigate(isAdmin ? '/admin' : '/signin')}
    >
      <IconSettings />
    </IconButton>
  )
}

export function Layout() {
  const matches = useMatches()
  const { league } = useLeagueData()
  const handle = [...matches].reverse().find((match) => match.handle)?.handle ?? {}
  const leagueName = league?.name || 'FC League'
  const title = handle.title ?? leagueName

  const left = handle.back ? (
    <BackButton fallback={handle.back} />
  ) : league ? (
    <Crest color={league.color} emoji={league.emoji} size='sm' label={leagueName} />
  ) : null

  return (
    <div className='app-shell'>
      <TopBar title={title} left={left} right={<AccountButton />} />
      <main className='app-main with-tabbar'>
        <Outlet />
      </main>
      <BottomNav items={NAV} />
      <ScrollRestoration />
    </div>
  )
}
