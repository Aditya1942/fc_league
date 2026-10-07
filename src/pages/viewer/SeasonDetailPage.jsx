import { useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { seasonLeaders } from '../../engine/index.js'
import { podium, useLeagueData, useQueryParam, useSeasonData, useSwipeTabs } from '../../hooks/index.js'
import {
  Chip,
  ClayCard,
  EmptyState,
  IconHistory,
  SegmentedTabs,
  Skeleton,
  StandingsTable,
} from '../../ui/index.js'
import { LoadingCards } from './components/LoadingCards.jsx'
import { MatchList } from './components/MatchList.jsx'
import { PlayerBadge } from './components/PlayerRow.jsx'
import { Section } from './components/Section.jsx'
import { clubName, formatShortDate, matchPath, tableZones } from './format.js'

const TABS = [
  { id: 'table', label: 'Table' },
  { id: 'matches', label: 'Matches' },
  { id: 'leaders', label: 'Leaders' },
]
const TAB_IDS = TABS.map((tab) => tab.id)

const STATUS = {
  active: { label: 'Live', tone: 'mint' },
  completed: { label: 'Completed', tone: 'lilac' },
  draft: { label: 'Draft', tone: 'void' },
}

function LeaderCard({ title, entries, value, playersById }) {
  return (
    <ClayCard className='v-stack'>
      <span className='v-muted v-small'>{title}</span>
      {entries.length ? entries.map((entry) => (
        <div key={`${entry.playerId}-${entry.matchId ?? ''}`} className='v-row'>
          <PlayerBadge player={playersById[entry.playerId]} />
          {value(entry)}
        </div>
      )) : <span className='v-muted'>–</span>}
    </ClayCard>
  )
}

function Leaders({ matches, standings, playersById }) {
  const leaders = useMemo(() => seasonLeaders(matches, standings), [matches, standings])
  return (
    <div className='v-stack'>
      <LeaderCard
        title='Most goals scored'
        entries={leaders.mostGoals}
        playersById={playersById}
        value={(entry) => <Chip tone='mint'>{`${entry.goalsFor} GF`}</Chip>}
      />
      <LeaderCard
        title='Best defence'
        entries={leaders.bestDefence}
        playersById={playersById}
        value={(entry) => <Chip tone='blue'>{`${entry.goalsAgainst} GA`}</Chip>}
      />
      <LeaderCard
        title='Most wins'
        entries={leaders.mostWins}
        playersById={playersById}
        value={(entry) => <Chip tone='peach'>{`${entry.won} W`}</Chip>}
      />
      <LeaderCard
        title='Biggest win'
        entries={leaders.biggestWin}
        playersById={playersById}
        value={(entry) => (
          <Link to={matchPath({ seasonId: entry.seasonId, id: entry.matchId })} className='v-see-all'>
            <Chip tone='pink'>
              {`${entry.goalsFor}–${entry.goalsAgainst} vs ${playersById[entry.opponentId]?.shortCode ?? clubName(playersById[entry.opponentId])}`}
            </Chip>
          </Link>
        )}
      />
    </div>
  )
}

export default function SeasonDetailPage() {
  const { seasonId } = useParams()
  const navigate = useNavigate()
  const { playersById } = useLeagueData()
  const { season, matches, standings, loading } = useSeasonData(seasonId)
  const [tabParam, setTab] = useQueryParam('tab')
  const tab = TAB_IDS.includes(tabParam) ? tabParam : 'table'
  const swipe = useSwipeTabs(TAB_IDS, tab, setTab)

  if (loading) {
    return (
      <div className='v-page'>
        <Skeleton height='120px' radius='var(--radius-card)' />
        <LoadingCards count={1} height='320px' />
      </div>
    )
  }

  if (!season) {
    return <EmptyState icon={<IconHistory />} title='Season not found' message='This season may have been removed.' />
  }

  const status = STATUS[season.status] ?? STATUS.draft
  const { championId } = podium(season)
  const dates = [formatShortDate(season.startDate), formatShortDate(season.endDate)].filter(Boolean).join(' – ')

  return (
    <div className='v-page' onTouchStart={swipe.onTouchStart} onTouchEnd={swipe.onTouchEnd}>
      <ClayCard className='v-hero'>
        <div className='v-row'>
          <h2 className='v-hero__title'>{season.name ?? 'Season'}</h2>
          <Chip tone={status.tone}>{status.label}</Chip>
        </div>
        {dates ? <span className='v-muted v-small'>{dates}</span> : null}
        {season.status === 'completed' && championId ? (
          <div className='v-row'>
            <PlayerBadge player={playersById[championId]} sub={<span className='v-muted v-small'>Champion</span>} />
            <Chip tone='peach'>🏆</Chip>
          </div>
        ) : null}
      </ClayCard>

      <SegmentedTabs tabs={TABS} value={tab} onChange={setTab} label='Season sections' />

      {tab === 'table' ? (
        <Section title={season.status === 'completed' ? 'Final table' : 'Table'}>
          <StandingsTable
            rows={standings}
            players={playersById}
            zones={tableZones(standings, season.status === 'completed')}
            onRowClick={(row) => navigate(`/players/${row.playerId}`)}
          />
        </Section>
      ) : null}
      {tab === 'matches' ? (
        <MatchList matches={matches} groupBy='matchday' emptyTitle='No matches' emptyMessage='This season has no fixtures.' />
      ) : null}
      {tab === 'leaders' ? <Leaders matches={matches} standings={standings} playersById={playersById} /> : null}
    </div>
  )
}
