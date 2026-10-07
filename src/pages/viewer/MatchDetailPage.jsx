import { useMemo } from 'react'
import { Link, useParams } from 'react-router'
import { useAuth } from '../../auth/index.js'
import { useMatch, usePlayerMatches } from '../../data/index.js'
import { computeForm, headToHead } from '../../engine/index.js'
import { useLeagueData, useQueryParam, useSeasonData, useSwipeTabs } from '../../hooks/index.js'
import {
  Chip,
  ClayCard,
  Crest,
  EmptyState,
  FormChips,
  IconBall,
  SegmentedTabs,
  Skeleton,
  StatBar,
} from '../../ui/index.js'
import AdminMatchAction from '../admin/AdminMatchAction.jsx'
import { LoadingCards } from './components/LoadingCards.jsx'
import { MatchList } from './components/MatchList.jsx'
import { Section } from './components/Section.jsx'
import { StatGrid } from './components/StatGrid.jsx'
import { clubName, formatDateTime, matchDate, matchMillis, ordinal } from './format.js'

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'stats', label: 'Stats' },
  { id: 'h2h', label: 'H2H' },
]
const TAB_IDS = TABS.map((tab) => tab.id)

const STATUS = {
  scheduled: { label: 'Scheduled', tone: 'blue' },
  played: { label: 'Full time', tone: 'mint' },
  postponed: { label: 'Postponed', tone: 'postponed' },
  void: { label: 'Void', tone: 'void' },
}

function playedBefore(candidate, match) {
  if (candidate.id === match.id || candidate.status !== 'played') return false
  const left = matchMillis(candidate)
  const right = matchMillis(match)
  if (left != null && right != null && left !== right) return left < right
  return (candidate.matchday ?? 0) < (match.matchday ?? 0)
}

function ScoreSide({ player, playerId }) {
  return (
    <Link to={`/players/${playerId}`} className='v-scoreboard__side'>
      <Crest color={player?.color} emoji={player?.emoji} shortCode={player?.shortCode} size='lg' decorative />
      <span className='v-scoreboard__name'>{clubName(player)}</span>
      {player?.name ? <span className='v-muted v-small'>{player.name}</span> : null}
    </Link>
  )
}

function Scoreboard({ match, season, home, away }) {
  const status = STATUS[match.status] ?? STATUS.scheduled
  const played = match.status === 'played'
  return (
    <ClayCard className='v-scoreboard'>
      <div className='v-scoreboard__grid'>
        <ScoreSide player={home} playerId={match.homeId} />
        <div className='v-stack v-hero__center'>
          <span className='v-scoreboard__score'>
            {played ? `${match.homeGoals}–${match.awayGoals}` : 'vs'}
          </span>
          <Chip tone={status.tone}>{status.label}</Chip>
        </div>
        <ScoreSide player={away} playerId={match.awayId} />
      </div>
      <div className='v-scoreboard__meta v-muted v-small'>
        {[season?.name, `Matchday ${match.matchday ?? '–'}`, formatDateTime(matchDate(match))]
          .filter(Boolean)
          .join(' · ')}
      </div>
    </ClayCard>
  )
}

function Overview({ match, season, home, away, homeForm, awayForm }) {
  const details = match.details ?? {}
  const scorers = [...(details.scorers ?? [])].sort(
    (a, b) => (a.minute ?? Infinity) - (b.minute ?? Infinity),
  )
  const facts = [
    ['Season', season?.name],
    ['Matchday', match.matchday],
    [match.status === 'played' ? 'Played' : 'Kick-off', formatDateTime(matchDate(match))],
    [`${home?.shortCode ?? 'Home'} team`, details.homeTeamUsed],
    [`${away?.shortCode ?? 'Away'} team`, details.awayTeamUsed],
    ['Man of the match', details.motm],
  ].filter(([, value]) => value != null && value !== '')

  return (
    <>
      {match.status === 'played' ? (
        <Section title='Goals'>
          <ClayCard>
            {scorers.length ? (
              <ol className='v-list'>
                {scorers.map((scorer, index) => (
                  <li key={index} className='v-timeline__item'>
                    <span className='v-timeline__home'>{scorer.side === 'home' ? scorer.name : ''}</span>
                    <span className='v-timeline__minute'>{scorer.minute != null ? `${scorer.minute}'` : '⚽'}</span>
                    <span>{scorer.side === 'away' ? scorer.name : ''}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className='v-muted v-small'>No scorers recorded.</p>
            )}
          </ClayCard>
        </Section>
      ) : null}

      <Section title='Match info'>
        <ClayCard>
          <ul className='v-list'>
            {facts.map(([label, value]) => (
              <li key={label} className='v-list__item'>
                <span className='v-muted'>{label}</span>
                <strong>{value}</strong>
              </li>
            ))}
          </ul>
        </ClayCard>
      </Section>

      <Section title='Form going in'>
        <ClayCard>
          <ul className='v-list'>
            <li className='v-list__item'>
              <span>{clubName(home)}</span>
              <FormChips form={homeForm} label={`Form for ${clubName(home)}`} />
            </li>
            <li className='v-list__item'>
              <span>{clubName(away)}</span>
              <FormChips form={awayForm} label={`Form for ${clubName(away)}`} />
            </li>
          </ul>
        </ClayCard>
      </Section>

      {details.notes ? (
        <Section title='Notes'>
          <ClayCard>
            <p>{details.notes}</p>
          </ClayCard>
        </Section>
      ) : null}
    </>
  )
}

function Stats({ match }) {
  const details = match.details ?? {}
  const rows = [
    ['Possession %', details.possession],
    ['Shots', details.shots],
    ['Shots on target', details.shotsOnTarget],
  ].filter(([, pair]) => pair && (pair.home != null || pair.away != null))

  if (!rows.length) {
    return <EmptyState icon={<IconBall />} title='No stats' message='No match stats were recorded for this game.' />
  }

  return (
    <ClayCard className='v-stack'>
      {rows.map(([label, pair]) => (
        <StatBar key={label} label={label} home={pair.home ?? 0} away={pair.away ?? 0} />
      ))}
    </ClayCard>
  )
}

function HeadToHead({ match, home, away, standings, seasonMatches }) {
  const history = usePlayerMatches(match.homeId)
  const { seasons } = useLeagueData()
  const visibleSeasons = useMemo(
    () => new Set(seasons.filter((season) => season.status !== 'draft').map((season) => season.id)),
    [seasons],
  )
  const record = useMemo(
    () => headToHead(
      history.data.filter((item) => visibleSeasons.has(item.seasonId)),
      match.homeId,
      match.awayId,
    ),
    [history.data, visibleSeasons, match.homeId, match.awayId],
  )
  const homeRank = standings.find((row) => row.playerId === match.homeId)
  const awayRank = standings.find((row) => row.playerId === match.awayId)
  const meetings = record.matches.filter((item) => item.status === 'played')

  if (history.loading) return <LoadingCards count={2} />

  return (
    <>
      <Section title='All-time meetings'>
        <ClayCard className='v-stack'>
          <StatGrid
            columns={3}
            items={[
              { label: `${home?.shortCode ?? 'Home'} wins`, value: record.winsA },
              { label: 'Draws', value: record.draws },
              { label: `${away?.shortCode ?? 'Away'} wins`, value: record.winsB },
            ]}
          />
          <StatBar label='Goals' home={record.goalsA} away={record.goalsB} />
        </ClayCard>
      </Section>

      <Section title='Current form & rank'>
        <ClayCard>
          <ul className='v-list'>
            {[[home, match.homeId, homeRank], [away, match.awayId, awayRank]].map(([player, id, rank]) => (
              <li key={id} className='v-list__item'>
                <span>
                  <strong>{rank ? ordinal(rank.position) : '–'}</strong>
                  {' '}
                  {clubName(player)}
                </span>
                <FormChips form={computeForm(seasonMatches, id, 5)} label={`Last five for ${clubName(player)}`} />
              </li>
            ))}
          </ul>
        </ClayCard>
      </Section>

      <Section title='Previous meetings'>
        <MatchList
          matches={meetings}
          order='desc'
          emptyTitle='First meeting'
          emptyMessage='These two have not played each other yet.'
        />
      </Section>
    </>
  )
}

export default function MatchDetailPage() {
  const { seasonId, matchId } = useParams()
  const { leagueId, playersById } = useLeagueData()
  const { isAdmin } = useAuth()
  const matchState = useMatch(leagueId, seasonId, matchId)
  const { season, matches, standings, loading } = useSeasonData(seasonId)
  const [tabParam, setTab] = useQueryParam('tab')
  const tab = TAB_IDS.includes(tabParam) ? tabParam : 'overview'
  const swipe = useSwipeTabs(TAB_IDS, tab, setTab)
  const match = matchState.data

  const forms = useMemo(() => {
    if (!match) return { home: [], away: [] }
    const before = matches.filter((candidate) => playedBefore(candidate, match))
    return {
      home: computeForm(before, match.homeId, 5),
      away: computeForm(before, match.awayId, 5),
    }
  }, [matches, match])

  if (!leagueId || matchState.loading || loading) {
    return (
      <div className='v-page'>
        <Skeleton height='160px' radius='var(--radius-card)' />
        <LoadingCards count={2} />
      </div>
    )
  }

  if (!match) {
    return <EmptyState icon={<IconBall />} title='Match not found' message='This match may have been removed.' />
  }

  const home = playersById[match.homeId]
  const away = playersById[match.awayId]

  return (
    <div className='v-page' onTouchStart={swipe.onTouchStart} onTouchEnd={swipe.onTouchEnd}>
      <Scoreboard match={match} season={season} home={home} away={away} />
      {isAdmin ? <AdminMatchAction match={match} /> : null}
      <SegmentedTabs tabs={TABS} value={tab} onChange={setTab} label='Match sections' />
      {tab === 'overview' ? (
        <Overview
          match={match}
          season={season}
          home={home}
          away={away}
          homeForm={forms.home}
          awayForm={forms.away}
        />
      ) : null}
      {tab === 'stats' ? <Stats match={match} /> : null}
      {tab === 'h2h' ? (
        <HeadToHead match={match} home={home} away={away} standings={standings} seasonMatches={matches} />
      ) : null}
    </div>
  )
}
