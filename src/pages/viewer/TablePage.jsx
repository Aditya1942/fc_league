import { useNavigate } from 'react-router'
import { tableZones } from '../../engine/index.js'
import {
  useLeagueData,
  useQueryParam,
  useSeasonData,
  useSeasonPicker,
  useSwipeTabs,
} from '../../hooks/index.js'
import { EmptyState, IconTable, SegmentedTabs, StandingsTable } from '../../ui/index.js'
import { LoadingCards } from './components/LoadingCards.jsx'
import { SeasonSelect } from './components/SeasonSelect.jsx'

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'home', label: 'Home' },
  { id: 'away', label: 'Away' },
]
const TAB_IDS = TABS.map((tab) => tab.id)

export default function TablePage() {
  const navigate = useNavigate()
  const { playersById } = useLeagueData()
  const { seasonId, setSeasonId, options } = useSeasonPicker()
  const [venueParam, setVenue] = useQueryParam('view')
  const venue = TAB_IDS.includes(venueParam) ? venueParam : 'all'
  const swipe = useSwipeTabs(TAB_IDS, venue, setVenue)
  const { season, standings, loading } = useSeasonData(seasonId, { venue })

  return (
    <div className='v-page' onTouchStart={swipe.onTouchStart} onTouchEnd={swipe.onTouchEnd}>
      <SeasonSelect value={seasonId} options={options} onChange={setSeasonId} />
      <SegmentedTabs tabs={TABS} value={venue} onChange={setVenue} label='Table view' />
      {loading ? (
        <LoadingCards count={1} height='320px' />
      ) : !season ? (
        <EmptyState icon={<IconTable />} title='No table yet' message='There are no seasons to show yet.' />
      ) : (
        <StandingsTable
          rows={standings}
          players={playersById}
          zones={venue === 'all' ? tableZones(standings, season) : []}
          onRowClick={(row) => navigate(`/players/${row.playerId}`)}
        />
      )}
    </div>
  )
}
