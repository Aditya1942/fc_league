import { useMemo, useState } from 'react'
import {
  useLeagueData,
  useQueryParam,
  useSeasonData,
  useSeasonPicker,
  useSwipeTabs,
} from '../../hooks/index.js'
import {
  EmptyState,
  Field,
  IconBall,
  MatchdayRail,
  SegmentedTabs,
  Select,
} from '../../ui/index.js'
import { LoadingCards } from './components/LoadingCards.jsx'
import { MatchList } from './components/MatchList.jsx'
import { SeasonSelect } from './components/SeasonSelect.jsx'
import { clubName, isResult, isUpcoming } from './format.js'

const TABS = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'results', label: 'Results' },
  { id: 'all', label: 'All' },
]
const TAB_IDS = TABS.map((tab) => tab.id)

const FILTERS = {
  upcoming: isUpcoming,
  results: isResult,
  all: () => true,
}

const EMPTY_COPY = {
  upcoming: 'No upcoming matches here.',
  results: 'No results here yet.',
  all: 'No matches here.',
}

function SeasonMatches({ seasonId, tab, playerId }) {
  const { playersById } = useLeagueData()
  const { season, matches, matchdays, currentMatchday, loading } = useSeasonData(seasonId)
  const [picked, setPicked] = useState(null)
  const matchday = picked ?? currentMatchday

  const visible = useMemo(() => {
    const byTab = matches.filter(FILTERS[tab] ?? FILTERS.all)
    if (playerId) return byTab.filter((match) => match.homeId === playerId || match.awayId === playerId)
    return byTab.filter((match) => match.matchday === matchday)
  }, [matches, tab, playerId, matchday])

  if (loading) return <LoadingCards count={4} />
  if (!season) {
    return <EmptyState icon={<IconBall />} title='No season' message='There are no seasons to show yet.' />
  }

  const name = playerId ? clubName(playersById[playerId]) : null
  return (
    <>
      {!playerId && matchdays.length ? (
        <MatchdayRail matchdays={matchdays} value={matchday} onChange={setPicked} />
      ) : null}
      <MatchList
        matches={visible}
        groupBy={playerId ? 'matchday' : 'date'}
        order={tab === 'results' ? 'desc' : 'asc'}
        emptyTitle={matches.length ? 'Nothing to show' : 'No fixtures yet'}
        emptyMessage={playerId ? `${EMPTY_COPY[tab]} Filtered to ${name}.` : EMPTY_COPY[tab]}
      />
    </>
  )
}

export default function MatchesPage() {
  const { players, seasons } = useLeagueData()
  const { seasonId, setSeasonId, options } = useSeasonPicker()
  const [tabParam, setTab] = useQueryParam('tab')
  const [playerId, setPlayerId] = useQueryParam('player')
  const tab = TAB_IDS.includes(tabParam) ? tabParam : 'all'
  const swipe = useSwipeTabs(TAB_IDS, tab, setTab)

  const season = seasons.find((item) => item.id === seasonId)
  const playerOptions = useMemo(() => {
    const ids = new Set(season?.participantIds ?? [])
    return [
      { value: '', label: 'All players' },
      ...players
        .filter((player) => ids.has(player.id))
        .map((player) => ({ value: player.id, label: clubName(player) })),
    ]
  }, [players, season])
  const filterId = playerOptions.some((option) => option.value === playerId) ? playerId : ''

  return (
    <div className='v-page' onTouchStart={swipe.onTouchStart} onTouchEnd={swipe.onTouchEnd}>
      <SeasonSelect value={seasonId} options={options} onChange={setSeasonId} />
      <SegmentedTabs tabs={TABS} value={tab} onChange={setTab} label='Match filter' />
      <Field label='Player'>
        <Select
          value={filterId}
          options={playerOptions}
          onChange={(event) => setPlayerId(event.target.value)}
        />
      </Field>
      <SeasonMatches key={seasonId} seasonId={seasonId} tab={tab} playerId={filterId} />
    </div>
  )
}
