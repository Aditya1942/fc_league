import { useMemo } from 'react'
import { usePlayerMatches } from '../../data/index.js'
import { computeForm, headToHead } from '../../engine/index.js'
import { useLeagueData, useQueryParam } from '../../hooks/index.js'
import {
  ClayCard,
  EmptyState,
  Field,
  FormChips,
  IconUsers,
  Select,
  StatBar,
} from '../../ui/index.js'
import { LoadingCards } from './components/LoadingCards.jsx'
import { MatchList } from './components/MatchList.jsx'
import { PlayerBadge } from './components/PlayerRow.jsx'
import { Section } from './components/Section.jsx'
import { StatGrid } from './components/StatGrid.jsx'
import { clubName } from './format.js'

function Comparison({ aId, bId }) {
  const { playersById, seasons } = useLeagueData()
  const history = usePlayerMatches(aId)
  const playerA = playersById[aId]
  const playerB = playersById[bId]

  const matches = useMemo(() => {
    const ids = new Set(seasons.filter((season) => season.status !== 'draft').map((season) => season.id))
    return history.data.filter((match) => ids.has(match.seasonId))
  }, [history.data, seasons])
  const record = useMemo(() => headToHead(matches, aId, bId), [matches, aId, bId])
  const meetings = record.matches.filter((match) => match.status === 'played')

  if (history.loading) return <LoadingCards count={2} />

  return (
    <>
      <ClayCard className='v-stack'>
        <div className='v-row'>
          <PlayerBadge player={playerA} />
          <PlayerBadge player={playerB} />
        </div>
        <StatGrid
          columns={3}
          items={[
            { label: `${playerA?.shortCode ?? 'A'} wins`, value: record.winsA },
            { label: 'Draws', value: record.draws },
            { label: `${playerB?.shortCode ?? 'B'} wins`, value: record.winsB },
          ]}
        />
        <StatBar label='Wins' home={record.winsA} away={record.winsB} />
        <StatBar label='Goals' home={record.goalsA} away={record.goalsB} />
        <StatBar
          label='Goals per game'
          home={meetings.length ? (record.goalsA / meetings.length).toFixed(1) : 0}
          away={meetings.length ? (record.goalsB / meetings.length).toFixed(1) : 0}
        />
      </ClayCard>

      {meetings.length ? (
        <Section title='Last five meetings'>
          <ClayCard>
            <ul className='v-list'>
              <li className='v-list__item'>
                <span>{clubName(playerA)}</span>
                <FormChips form={computeForm(meetings, aId, 5)} label={`${clubName(playerA)} in this fixture`} />
              </li>
              <li className='v-list__item'>
                <span>{clubName(playerB)}</span>
                <FormChips form={computeForm(meetings, bId, 5)} label={`${clubName(playerB)} in this fixture`} />
              </li>
            </ul>
          </ClayCard>
        </Section>
      ) : null}

      <Section title={`All meetings (${record.matches.length})`}>
        <MatchList
          matches={record.matches}
          order='desc'
          emptyTitle='No meetings yet'
          emptyMessage='These two have never played each other.'
        />
      </Section>
    </>
  )
}

export default function H2HPage() {
  const { players, loading } = useLeagueData()
  const [aParam, setA] = useQueryParam('a')
  const [bParam, setB] = useQueryParam('b')

  const ids = new Set(players.map((player) => player.id))
  const a = ids.has(aParam) ? aParam : ''
  const b = ids.has(bParam) && bParam !== a ? bParam : ''
  const options = [
    { value: '', label: 'Choose a player' },
    ...players.map((player) => ({ value: player.id, label: clubName(player) })),
  ]

  if (loading) return <LoadingCards count={3} />

  return (
    <div className='v-page'>
      <div className='v-pair'>
        <Field label='Player A'>
          <Select value={a} options={options} onChange={(event) => setA(event.target.value)} />
        </Field>
        <Field label='Player B'>
          <Select value={b} options={options} onChange={(event) => setB(event.target.value)} />
        </Field>
      </div>
      {a && b ? (
        <Comparison key={`${a}-${b}`} aId={a} bId={b} />
      ) : (
        <EmptyState icon={<IconUsers />} title='Pick two players' message='Choose two clubs to compare their head-to-head record.' />
      )}
    </div>
  )
}
