import { RouterProvider } from 'react-router'
import { LeagueDataProvider } from './app/LeagueDataProvider.jsx'
import { router } from './app/router.js'

export default function App() {
  return (
    <LeagueDataProvider>
      <RouterProvider router={router} />
    </LeagueDataProvider>
  )
}
