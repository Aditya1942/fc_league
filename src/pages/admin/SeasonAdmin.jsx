import { useCallback, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import {
  activateSeason,
  addMatch,
  completeSeason,
  deleteSeason,
  replaceFixtures,
  reopenSeason,
  rescheduleMatch,
  useLeague,
  usePlayers,
  useSeason,
  useSeasonMatches,
} from '../../data/index.js'
import { computeStandings, currentMatchday, generateFixtures } from '../../engine/index.js'
import {
  Chip,
  ClayButton,
  ClayCard,
  Crest,
  EmptyState,
  Field,
  IconPlus,
  IconTrophy,
  Input,
  MatchCard,
  MatchdayRail,
  Select,
  Sheet,
  Skeleton,
  StandingsTable,
} from '../../ui/index.js'
import AdminMatchAction from './AdminMatchAction.jsx'
import { AdminPage, AdminToast, ConfirmSheet } from './AdminParts.jsx'
import {
  byId,
  formatDate,
  formatDateTime,
  fromDateTimeInput,
  groupByMatchday,
  parseIntIn,
  STATUS_TONE,
  toDate,
  toDateTimeInput,
} from './format.js'
import { useToast } from './useToast.js'

const STATUS_LABEL = { draft: 'Draft', active: 'Active', completed: 'Completed' }
const OPEN = ['scheduled', 'postponed']

function randomSeed() {
  return Math.floor(Math.random() * 1e9)
}

function seasonRules(season) {
  return {
    pointsWin: season.points?.win ?? 3,
    pointsDraw: season.points?.draw ?? 1,
    pointsLoss: season.points?.loss ?? 0,
  }
}

function FixtureRow({ fixture, playersById }) {
  const home = playersById[fixture.homeId]
  const away = playersById[fixture.awayId]
  return (
    <div className='admin-fixture'>
      <span className='admin-fixture__side'>
        <Crest color={home?.color} emoji={home?.emoji} shortCode={home?.shortCode} size='sm' decorative />
        <span>{home?.shortCode ?? '?'}</span>
      </span>
      <span className='admin-fixture__vs'>vs</span>
      <span className='admin-fixture__side admin-fixture__side--away'>
        <Crest color={away?.color} emoji={away?.emoji} shortCode={away?.shortCode} size='sm' decorative />
        <span>{away?.shortCode ?? '?'}</span>
      </span>
    </div>
  )
}

function sharedKickoff(items) {
  const first = toDate(items[0]?.scheduledAt)?.getTime() ?? null
  return items.every((item) => (toDate(item.scheduledAt)?.getTime() ?? null) === first) ? items[0]?.scheduledAt ?? null : null
}

function MatchdayDate({ matchday, items, toast }) {
  const [value, setValue] = useState(() => toDateTimeInput(sharedKickoff(items)))
  const [busy, setBusy] = useState(false)

  const onSet = async () => {
    const when = fromDateTimeInput(value)
    if (value && !when) {
      toast.fail(new Error('Pick a valid date and time'))
      return
    }
    setBusy(true)
    try {
      await Promise.all(items.map((match) => rescheduleMatch(match, when)))
      toast.show(when ? `Matchday ${matchday}: ${formatDateTime(when)}` : `Matchday ${matchday} date cleared`)
    } catch (error) {
      toast.fail(error)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className='admin-matchday__date'>
      <Field label={`Matchday ${matchday} kickoff`}>
        <Input type='datetime-local' value={value} onChange={(event) => setValue(event.target.value)} />
      </Field>
      <ClayButton variant='soft' disabled={busy} onClick={onSet}>
        {busy ? 'Saving…' : value ? 'Set date' : 'Clear'}
      </ClayButton>
    </div>
  )
}

function SeasonSummary({ season, playersById }) {
  return (
    <ClayCard>
      <div className='admin-stack'>
        <div className='admin-row admin-row--between'>
          <p className='admin-list-item__name'>{season.name}</p>
          <Chip tone={STATUS_TONE[season.status]}>{STATUS_LABEL[season.status] ?? season.status}</Chip>
        </div>
        <p className='admin-muted'>
          Season {season.number} · {season.legs === 2 ? 'Home & away' : 'Single round'} · from {formatDate(season.startDate)}
        </p>
        <p className='admin-muted'>
          Points: win {season.points?.win ?? 3} · draw {season.points?.draw ?? 1} · loss {season.points?.loss ?? 0}
        </p>
        <div className='admin-row'>
          {(season.participantIds ?? []).map((id) => {
            const player = playersById[id]
            return (
              <Crest
                key={id}
                color={player?.color}
                emoji={player?.emoji}
                shortCode={player?.shortCode}
                label={player?.clubName}
                size='sm'
              />
            )
          })}
        </div>
      </div>
    </ClayCard>
  )
}

function DraftPanel({ league, season, matches, playersById, toast }) {
  const navigate = useNavigate()
  const [initialSeed] = useState(randomSeed)
  const [seed, setSeed] = useState(null)
  const [busy, setBusy] = useState('')
  const [confirm, setConfirm] = useState(null)
  const closeConfirm = useCallback(() => setConfirm(null), [])
  const hasSaved = matches.length > 0
  const previewing = seed != null || !hasSaved
  const otherActive = league.activeSeasonId && league.activeSeasonId !== season.id

  const preview = useMemo(() => {
    if (!previewing) return null
    return generateFixtures(season.participantIds ?? [], { legs: season.legs, seed: seed ?? initialSeed })
  }, [previewing, season.participantIds, season.legs, seed, initialSeed])

  const groups = groupByMatchday(previewing ? preview : matches)

  const run = async (name, action, message) => {
    setBusy(name)
    try {
      await action()
      if (message) toast.show(message)
      return true
    } catch (error) {
      toast.fail(error)
      return false
    } finally {
      setBusy('')
    }
  }

  const onSave = async () => {
    const ok = await run('save', () => replaceFixtures(league.id, season.id, preview), `${preview.length} fixtures saved`)
    if (ok) setSeed(null)
  }

  const onActivate = async () => {
    const ok = await run('activate', () => activateSeason(league.id, season.id), `${season.name} is live`)
    if (ok) setConfirm(null)
  }

  const onDelete = async () => {
    const ok = await run('delete', () => deleteSeason(league.id, season.id), 'Draft deleted')
    if (ok) navigate('/admin/seasons', { replace: true })
  }

  return (
    <>
      <section className='admin-stack'>
        <div className='admin-row admin-row--between'>
          <h2 className='admin-section-title'>{previewing ? 'Fixture preview' : 'Saved fixtures'}</h2>
          <span className='admin-muted'>{(previewing ? preview : matches).length} matches · {groups.length} matchdays</span>
        </div>
        {previewing ? (
          <p className='admin-warning'>
            {hasSaved ? 'Unsaved reshuffle. Saving replaces the current fixtures and their dates.' : 'Not saved yet. Reshuffle until you like it, then save.'}
          </p>
        ) : (
          <p className='admin-muted'>Set a kickoff per matchday so upcoming matches show dates.</p>
        )}
        <div className='admin-actions'>
          <ClayButton variant='soft' disabled={busy !== ''} onClick={() => setSeed(randomSeed())}>
            Regenerate
          </ClayButton>
          {previewing ? (
            <ClayButton disabled={busy !== '' || !preview?.length} onClick={onSave}>
              {busy === 'save' ? 'Saving…' : 'Save fixtures'}
            </ClayButton>
          ) : null}
          {previewing && hasSaved ? (
            <ClayButton variant='soft' disabled={busy !== ''} onClick={() => setSeed(null)}>
              Discard
            </ClayButton>
          ) : null}
        </div>
        {groups.map((group) => (
          <ClayCard key={group.matchday}>
            <div className='admin-matchday'>
              {previewing ? (
                <p className='field__label'>Matchday {group.matchday}</p>
              ) : (
                <MatchdayDate matchday={group.matchday} items={group.items} toast={toast} />
              )}
              {group.items.map((fixture, index) => (
                <FixtureRow key={fixture.id ?? index} fixture={fixture} playersById={playersById} />
              ))}
            </div>
          </ClayCard>
        ))}
      </section>

      <section className='admin-stack'>
        {otherActive ? (
          <p className='admin-warning'>Another season is active. Complete it before starting this one.</p>
        ) : null}
        <ClayButton
          size='lg'
          disabled={busy !== '' || !hasSaved || seed != null || Boolean(otherActive)}
          onClick={() => setConfirm('activate')}
        >
          Start season
        </ClayButton>
        <ClayButton variant='danger' disabled={busy !== ''} onClick={() => setConfirm('delete')}>
          Delete draft
        </ClayButton>
      </section>

      <ConfirmSheet
        open={confirm === 'activate'}
        title='Start season?'
        message={`${season.name} becomes the current season on Home. Participants, legs and points are locked once it starts.`}
        confirmLabel='Start season'
        busy={busy === 'activate'}
        onConfirm={onActivate}
        onClose={closeConfirm}
      />
      <ConfirmSheet
        open={confirm === 'delete'}
        title='Delete draft?'
        message={`${season.name} and its ${matches.length} fixtures will be removed.`}
        confirmLabel='Delete draft'
        danger
        busy={busy === 'delete'}
        onConfirm={onDelete}
        onClose={closeConfirm}
      />
    </>
  )
}

function AddMatchForm({ league, season, matches, playersById, onDone, onError }) {
  const participants = (season.participantIds ?? []).map((id) => ({
    value: id,
    label: playersById[id]?.clubName ?? id,
  }))
  const lastMatchday = matches.reduce((max, match) => Math.max(max, match.matchday ?? 0), 0)
  const [homeId, setHomeId] = useState(participants[0]?.value ?? '')
  const [awayId, setAwayId] = useState(participants[1]?.value ?? '')
  const [matchday, setMatchday] = useState(String(Math.min(60, lastMatchday + 1 || 1)))
  const [kickoff, setKickoff] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const onSubmit = async (event) => {
    event.preventDefault()
    setError('')
    let input
    try {
      if (!homeId || !awayId) throw new Error('Pick both players')
      if (homeId === awayId) throw new Error('Home and away must be different players')
      if (String(matchday).trim() === '') throw new Error('Matchday is required')
      const when = fromDateTimeInput(kickoff)
      if (kickoff && !when) throw new Error('Pick a valid date and time')
      input = { homeId, awayId, matchday: parseIntIn(matchday, 1, 60, 'Matchday'), scheduledAt: when }
    } catch (invalid) {
      setError(invalid.message)
      return
    }
    setBusy(true)
    try {
      await addMatch(league.id, season.id, input)
      onDone('Match added')
    } catch (failure) {
      setBusy(false)
      onError(failure)
    }
  }

  return (
    <form className='admin-stack admin-stack--loose' onSubmit={onSubmit} noValidate>
      <Field label='Home'>
        <Select value={homeId} options={participants} onChange={(event) => setHomeId(event.target.value)} />
      </Field>
      <Field label='Away'>
        <Select value={awayId} options={participants} onChange={(event) => setAwayId(event.target.value)} />
      </Field>
      <div className='admin-grid-2'>
        <Field label='Matchday' hint='1–60'>
          <Input value={matchday} inputMode='numeric' maxLength={2} onChange={(event) => setMatchday(event.target.value)} />
        </Field>
        <Field label='Kickoff' hint='Optional'>
          <Input type='datetime-local' value={kickoff} onChange={(event) => setKickoff(event.target.value)} />
        </Field>
      </div>
      {error ? <p className='admin-error' role='alert'>{error}</p> : null}
      <ClayButton type='submit' size='lg' disabled={busy}>
        {busy ? 'Adding…' : 'Add match'}
      </ClayButton>
    </form>
  )
}

function ActivePanel({ league, season, matches, players, playersById, toast }) {
  const [adding, setAdding] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [voidOpen, setVoidOpen] = useState(true)
  const [busy, setBusy] = useState(false)
  const [picked, setPicked] = useState(null)
  const closeAdd = useCallback(() => setAdding(false), [])
  const closeConfirm = useCallback(() => setConfirm(false), [])

  const names = useMemo(() => Object.fromEntries(players.map((player) => [player.id, player.name ?? ''])), [players])
  const standings = useMemo(
    () => computeStandings(matches, season.participantIds ?? [], { ...seasonRules(season), names }),
    [matches, season, names],
  )
  const groups = groupByMatchday(matches)
  const matchdays = groups.map((group) => group.matchday)
  const [now] = useState(() => Date.now())
  const focus = useMemo(() => currentMatchday(matches, now), [matches, now])
  const selected = matchdays.includes(picked) ? picked : (matchdays.includes(focus) ? focus : matchdays[0])
  const group = groups.find((item) => item.matchday === selected)
  const unplayed = matches.filter((match) => OPEN.includes(match.status))
  const played = matches.filter((match) => match.status === 'played').length
  const leader = standings[0] ? playersById[standings[0].playerId] : null

  const onComplete = async () => {
    setBusy(true)
    try {
      await completeSeason(league.id, season.id, {
        finalStandings: standings,
        championId: standings[0].playerId,
        voidMatchIds: voidOpen ? unplayed.map((match) => match.id) : [],
      })
      setConfirm(false)
      toast.show(`${season.name} completed`)
    } catch (error) {
      toast.fail(error)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <ClayCard>
        <div className='admin-row admin-row--between'>
          <span className='admin-list-item__name'>{played} / {matches.length} played</span>
          {leader ? <span className='admin-muted'>Leader: {leader.clubName} ({standings[0].points} pts)</span> : null}
        </div>
      </ClayCard>

      <section className='admin-stack'>
        <div className='admin-row admin-row--between'>
          <h2 className='admin-section-title'>Matches</h2>
          <ClayButton variant='soft' size='sm' onClick={() => setAdding(true)}>
            <IconPlus />
            Add match
          </ClayButton>
        </div>
        {matchdays.length ? (
          <>
            <MatchdayRail matchdays={matchdays} value={selected} onChange={setPicked} />
            {group ? (
              <div className='admin-stack'>
                <ClayCard>
                  <MatchdayDate key={`${group.matchday}`} matchday={group.matchday} items={group.items} toast={toast} />
                </ClayCard>
                {group.items.map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    home={playersById[match.homeId]}
                    away={playersById[match.awayId]}
                    adminAction={<AdminMatchAction match={match} />}
                  />
                ))}
              </div>
            ) : null}
          </>
        ) : (
          <EmptyState title='No matches' message='Add a match to get going.' />
        )}
      </section>

      <section className='admin-stack'>
        <ClayButton size='lg' disabled={busy || standings.length === 0} onClick={() => setConfirm(true)}>
          <IconTrophy />
          Complete season
        </ClayButton>
      </section>

      <Sheet open={adding} onClose={closeAdd} title='Add match'>
        {adding ? (
          <AddMatchForm
            league={league}
            season={season}
            matches={matches}
            playersById={playersById}
            onError={toast.fail}
            onDone={(message) => {
              setAdding(false)
              toast.show(message)
            }}
          />
        ) : null}
      </Sheet>

      <ConfirmSheet
        open={confirm}
        title='Complete season?'
        message={leader ? `${leader.clubName} will be crowned champion and the final table will be frozen.` : null}
        confirmLabel={voidOpen && unplayed.length ? `Void ${unplayed.length} & complete` : 'Complete season'}
        busy={busy}
        onConfirm={onComplete}
        onClose={closeConfirm}
      >
        {unplayed.length ? (
          <div className='admin-stack'>
            <p className='admin-warning'>
              {unplayed.length} match{unplayed.length > 1 ? 'es are' : ' is'} not played yet. Unplayed matches don’t count in the table.
            </p>
            <label className='admin-check'>
              <input type='checkbox' checked={voidOpen} onChange={(event) => setVoidOpen(event.target.checked)} />
              Mark them void
            </label>
          </div>
        ) : null}
      </ConfirmSheet>
    </>
  )
}

function CompletedPanel({ league, season, playersById, toast }) {
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const closeConfirm = useCallback(() => setConfirm(false), [])
  const champion = playersById[season.championId]
  const otherActive = league.activeSeasonId && league.activeSeasonId !== season.id
  const rows = season.finalStandings ?? []

  const onReopen = async () => {
    setBusy(true)
    try {
      await reopenSeason(league.id, season.id)
      setConfirm(false)
      toast.show(`${season.name} reopened`)
    } catch (error) {
      toast.fail(error)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <ClayCard>
        <div className='admin-list-item'>
          <Crest color={champion?.color} emoji={champion?.emoji} shortCode={champion?.shortCode} label={champion?.clubName} size='lg' />
          <div className='admin-grow'>
            <p className='admin-list-item__name'>{champion?.clubName ?? 'Champion'}</p>
            <p className='admin-muted'>Champion · ended {formatDate(season.endDate)}</p>
          </div>
          <IconTrophy />
        </div>
      </ClayCard>
      {rows.length ? (
        <section className='admin-stack'>
          <h2 className='admin-section-title'>Final table</h2>
          <StandingsTable
            rows={rows}
            players={playersById}
            zones={[{ id: 'champion', label: 'Champion', positions: [1] }]}
          />
        </section>
      ) : null}
      {otherActive ? (
        <p className='admin-warning'>Another season is active. Complete it before reopening this one.</p>
      ) : null}
      <ClayButton variant='soft' size='lg' disabled={busy || Boolean(otherActive)} onClick={() => setConfirm(true)}>
        Reopen season
      </ClayButton>
      <ConfirmSheet
        open={confirm}
        title='Reopen season?'
        message='The champion and final table are cleared and the season becomes active again so you can fix results.'
        confirmLabel='Reopen'
        busy={busy}
        onConfirm={onReopen}
        onClose={closeConfirm}
      />
    </>
  )
}

export default function SeasonAdmin() {
  const { seasonId } = useParams()
  const { data: league, loading: leagueLoading } = useLeague()
  const { data: season, loading: seasonLoading } = useSeason(league?.id, seasonId)
  const { data: matches, loading: matchesLoading } = useSeasonMatches(league?.id, seasonId)
  const { data: players } = usePlayers(league?.id)
  const playersById = useMemo(() => byId(players), [players])
  const toast = useToast()
  const loading = leagueLoading || seasonLoading || matchesLoading

  let body
  if (loading) {
    body = (
      <div className='admin-stack'>
        <Skeleton height='140px' radius='var(--radius-card)' />
        <Skeleton height='220px' radius='var(--radius-card)' />
      </div>
    )
  } else if (!league || !season) {
    body = <EmptyState icon={<IconTrophy />} title='Season not found' message='It may have been deleted.' />
  } else {
    const props = { league, season, matches, players, playersById, toast }
    body = (
      <>
        <SeasonSummary season={season} playersById={playersById} />
        {season.status === 'draft' ? <DraftPanel key={season.id} {...props} /> : null}
        {season.status === 'active' ? <ActivePanel key={season.id} {...props} /> : null}
        {season.status === 'completed' ? <CompletedPanel key={season.id} {...props} /> : null}
      </>
    )
  }

  return (
    <AdminPage title={season?.name ?? 'Season'} back='/admin/seasons'>
      {body}
      <AdminToast toast={toast.toast} onClose={toast.hide} />
    </AdminPage>
  )
}
