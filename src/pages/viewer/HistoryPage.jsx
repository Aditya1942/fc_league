import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAllMatches } from '../../data/index.js'
import { allTimeTable, seasonOrderOf } from '../../engine/index.js'
import { podium, useLeagueData, useQueryParam, useSwipeTabs } from '../../hooks/index.js'
import {
  Chip,
  ClayCard,
  EmptyState,
  IconChevronRight,
  IconHistory,
  IconTrophy,
  SegmentedTabs,
  StandingsTable,
} from '../../ui/index.js'
import { LoadingCards } from './components/LoadingCards.jsx'
import { PlayerBadge, PlayerRow } from './components/PlayerRow.jsx'
import { clubName, formatShortDate } from './format.js'

const TABS = [
  { id: 'seasons', label: 'Seasons' },
  { id: 'alltime', label: 'All-time' },
  { id: 'honours', label: 'Honours' },
]
const TAB_IDS = TABS.map((tab) => tab.id)

function SeasonsList({ seasons, playersById }) {
  if (!seasons.length) {
    return (
      <EmptyState
        icon={<IconHistory />}
        title='No finished seasons'
        message='Completed seasons and their champions will be listed here.'
      />
    )
  }
  return (
    <div className='v-stack'>
      {seasons.map((season) => {
        const { championId, runnerUpId } = podium(season)
        const ended = formatShortDate(season.endDate)
        return (
          <ClayCard key={season.id} as={Link} to={`/history/${season.id}`} className='v-stack v-see-all'>
            <div className='v-row'>
              <strong>{season.name ?? 'Season'}</strong>
              <span className='v-row-link__end'>
                {ended ? <span className='v-small'>{ended}</span> : null}
                <IconChevronRight />
              </span>
            </div>
            <div className='v-row'>
              <PlayerBadge player={playersById[championId]} sub={<span className='v-muted v-small'>Champion</span>} />
              <Chip tone='peach'>🏆</Chip>
            </div>
            {runnerUpId ? (
              <div className='v-row'>
                <PlayerBadge player={playersById[runnerUpId]} sub={<span className='v-muted v-small'>Runner-up</span>} />
                <Chip tone='lilac'>2nd</Chip>
              </div>
            ) : null}
          </ClayCard>
        )
      })}
    </div>
  )
}

function AllTime({ leagueId, seasons, playersById, names }) {
  const navigate = useNavigate()
  const all = useAllMatches(leagueId)
  const rows = useMemo(() => {
    const ids = new Set(seasons.filter((season) => season.status !== 'draft').map((season) => season.id))
    return allTimeTable(all.data.filter((match) => ids.has(match.seasonId)), { names, seasonOrder: seasonOrderOf(seasons) })
  }, [all.data, seasons, names])

  if (all.loading) return <LoadingCards count={1} height='320px' />
  return (
    <>
      <StandingsTable
        rows={rows}
        players={playersById}
        onRowClick={(row) => navigate(`/players/${row.playerId}`)}
      />
      <p className='v-muted v-small'>Every played match across all seasons, scored 3 / 1 / 0.</p>
    </>
  )
}

function Honours({ completed, players }) {
  const honours = players
    .map((player) => {
      let titles = 0
      let runnerUps = 0
      const won = []
      for (const season of completed) {
        const { championId, runnerUpId } = podium(season)
        if (championId === player.id) {
          titles += 1
          won.push(season.name ?? 'Season')
        }
        if (runnerUpId === player.id) runnerUps += 1
      }
      return { player, titles, runnerUps, won }
    })
    .filter((entry) => entry.titles || entry.runnerUps)
    .sort((a, b) => b.titles - a.titles || b.runnerUps - a.runnerUps || clubName(a.player).localeCompare(clubName(b.player)))

  if (!honours.length) {
    return <EmptyState icon={<IconTrophy />} title='Trophy cabinet is empty' message='Titles appear here once a season is completed.' />
  }

  return (
    <div className='v-stack'>
      {honours.map(({ player, titles, runnerUps, won }) => (
        <PlayerRow
          key={player.id}
          player={player}
          to={`/players/${player.id}`}
          sub={won.length ? <span className='v-muted v-small'>{won.join(', ')}</span> : undefined}
          trailing={(
            <>
              {titles ? <Chip tone='peach'>{`🏆 ${titles}`}</Chip> : null}
              {runnerUps ? <Chip tone='lilac'>{`🥈 ${runnerUps}`}</Chip> : null}
            </>
          )}
        />
      ))}
    </div>
  )
}

export default function HistoryPage() {
  const { leagueId, seasons, players, playersById, names, loading } = useLeagueData()
  const [tabParam, setTab] = useQueryParam('tab')
  const tab = TAB_IDS.includes(tabParam) ? tabParam : 'seasons'
  const swipe = useSwipeTabs(TAB_IDS, tab, setTab)
  const completed = useMemo(() => seasons.filter((season) => season.status === 'completed'), [seasons])

  return (
    <div className='v-page' onTouchStart={swipe.onTouchStart} onTouchEnd={swipe.onTouchEnd}>
      <SegmentedTabs tabs={TABS} value={tab} onChange={setTab} label='History sections' />
      {loading ? <LoadingCards count={3} /> : null}
      {!loading && tab === 'seasons' ? <SeasonsList seasons={completed} playersById={playersById} /> : null}
      {!loading && tab === 'alltime' ? (
        <AllTime leagueId={leagueId} seasons={seasons} playersById={playersById} names={names} />
      ) : null}
      {!loading && tab === 'honours' ? <Honours completed={completed} players={players} /> : null}
    </div>
  )
}
