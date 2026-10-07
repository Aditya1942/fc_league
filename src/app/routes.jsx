import { Layout } from './Layout.jsx'
import { RouteError } from './RouteError.jsx'
import { AdminRoute } from './AdminRoute.jsx'
import HomePage from '../pages/viewer/HomePage.jsx'
import MatchesPage from '../pages/viewer/MatchesPage.jsx'
import MatchDetailPage from '../pages/viewer/MatchDetailPage.jsx'
import TablePage from '../pages/viewer/TablePage.jsx'
import PlayersPage from '../pages/viewer/PlayersPage.jsx'
import PlayerPage from '../pages/viewer/PlayerPage.jsx'
import H2HPage from '../pages/viewer/H2HPage.jsx'
import HistoryPage from '../pages/viewer/HistoryPage.jsx'
import SeasonDetailPage from '../pages/viewer/SeasonDetailPage.jsx'
import SignInPage from '../pages/viewer/SignInPage.jsx'
import NotFoundPage from '../pages/viewer/NotFoundPage.jsx'

export const routes = [
  {
    element: <Layout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'matches', element: <MatchesPage />, handle: { title: 'Matches' } },
      {
        path: 'matches/:seasonId/:matchId',
        element: <MatchDetailPage />,
        handle: { title: 'Match', back: '/matches' },
      },
      { path: 'table', element: <TablePage />, handle: { title: 'Table' } },
      { path: 'players', element: <PlayersPage />, handle: { title: 'Players' } },
      {
        path: 'players/:playerId',
        element: <PlayerPage />,
        handle: { title: 'Player', back: '/players' },
      },
      { path: 'h2h', element: <H2HPage />, handle: { title: 'Head to head', back: '/players' } },
      { path: 'history', element: <HistoryPage />, handle: { title: 'History' } },
      {
        path: 'history/:seasonId',
        element: <SeasonDetailPage />,
        handle: { title: 'Season', back: '/history' },
      },
      { path: 'signin', element: <SignInPage />, handle: { title: 'Admin sign in', back: '/' } },
      {
        path: 'admin/*',
        element: <AdminRoute />,
        handle: { title: 'Admin' },
      },
      { path: '*', element: <NotFoundPage />, handle: { title: 'Not found', back: '/' } },
    ],
  },
]
