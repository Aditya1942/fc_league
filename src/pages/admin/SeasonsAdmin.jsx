import { useCallback, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { createSeason, useLeague, usePlayers, useSeasons } from '../../data/index.js'
import {
  Chip,
  ClayButton,
  ClayCard,
  Crest,
  EmptyState,
  Field,
  IconButton,
  IconChevronRight,
  IconPlus,
  IconTrophy,
  Input,
  SegmentedTabs,
  Sheet,
  Skeleton,
} from '../../ui/index.js'
import { AdminPage, AdminToast } from './AdminParts.jsx'
import { formatDate, fromDateInput, parseIntIn, STATUS_TONE, toDateInput } from './format.js'
import { useToast } from './useToast.js'

const STATUS_LABEL = { draft: 'Draft', active: 'Active', completed: 'Completed' }

function CreateSeasonForm({ leagueId, players, nextNumber, onCreated, onError }) {
  const selectable = players.filter((player) => !player.archived)
  const [name, setName] = useState(`Season ${nextNumber}`)
  const [number, setNumber] = useState(String(nextNumber))
  const [startDate, setStartDate] = useState(() => toDateInput(new Date()))
  const [participantIds, setParticipantIds] = useState(() => selectable.map((player) => player.id).slice(0, 12))
  const [legs, setLegs] = useState('1')
  const [points, setPoints] = useState({ win: '3', draw: '1', loss: '0' })
  const [spots, setSpots] = useState('1')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const maxSpots = Math.max(1, participantIds.length - 1)

  const toggle = (id) => {
    setParticipantIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setError('')
    let input
    try {
      if (participantIds.length < 2 || participantIds.length > 12) {
        throw new Error('Pick 2–12 participants')
      }
      const start = fromDateInput(startDate)
      if (!start) throw new Error('Start date is required')
      input = {
        name,
        number: parseIntIn(number, 1, 999, 'Season number'),
        startDate: start,
        participantIds,
        legs: Number(legs),
        points: {
          win: parseIntIn(points.win, 0, 20, 'Win points'),
          draw: parseIntIn(points.draw, 0, 20, 'Draw points'),
          loss: parseIntIn(points.loss, 0, 20, 'Loss points'),
        },
        qualificationSpots: parseIntIn(spots, 1, maxSpots, 'Qualification spots'),
      }
    } catch (invalid) {
      setError(invalid.message)
      return
    }
    setBusy(true)
    try {
      const id = await createSeason(leagueId, input)
      onCreated(id)
    } catch (failure) {
      setBusy(false)
      onError(failure)
    }
  }

  const setPoint = (key) => (event) => setPoints((prev) => ({ ...prev, [key]: event.target.value }))

  return (
    <form className='admin-stack admin-stack--loose' onSubmit={onSubmit} noValidate>
      <div className='admin-grid-2'>
        <Field label='Name'>
          <Input value={name} maxLength={60} required onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field label='Number'>
          <Input value={number} inputMode='numeric' onChange={(event) => setNumber(event.target.value)} />
        </Field>
      </div>
      <Field label='Start date'>
        <Input type='date' value={startDate} required onChange={(event) => setStartDate(event.target.value)} />
      </Field>
      <div className='field'>
        <span className='field__label'>Participants ({participantIds.length})</span>
        {selectable.length < 2 ? (
          <p className='admin-error'>Add at least two players first.</p>
        ) : (
          <div className='admin-row' role='group' aria-label='Participants'>
            {selectable.map((player) => (
              <Chip
                key={player.id}
                tone={participantIds.includes(player.id) ? 'blue' : 'soft'}
                selected={participantIds.includes(player.id)}
                onClick={() => toggle(player.id)}
              >
                {player.emoji} {player.shortCode}
              </Chip>
            ))}
          </div>
        )}
      </div>
      <div className='field'>
        <span className='field__label'>Format</span>
        <SegmentedTabs
          label='Legs'
          value={legs}
          onChange={setLegs}
          tabs={[
            { id: '1', label: 'Single round' },
            { id: '2', label: 'Home & away' },
          ]}
        />
      </div>
      <div className='field'>
        <span className='field__label'>Points</span>
        <div className='admin-grid-3'>
          <Field label='Win'>
            <Input value={points.win} inputMode='numeric' onChange={setPoint('win')} />
          </Field>
          <Field label='Draw'>
            <Input value={points.draw} inputMode='numeric' onChange={setPoint('draw')} />
          </Field>
          <Field label='Loss'>
            <Input value={points.loss} inputMode='numeric' onChange={setPoint('loss')} />
          </Field>
        </div>
      </div>
      <Field label='Qualification spots' hint={`Top 1–${maxSpots} highlighted, counting 1st place`}>
        <Input value={spots} inputMode='numeric' onChange={(event) => setSpots(event.target.value)} />
      </Field>
      {error ? <p className='admin-error' role='alert'>{error}</p> : null}
      <ClayButton type='submit' size='lg' disabled={busy || selectable.length < 2}>
        {busy ? 'Creating…' : 'Create draft'}
      </ClayButton>
    </form>
  )
}

function SeasonRow({ season, players }) {
  const champion = season.championId ? players.find((player) => player.id === season.championId) : null
  return (
    <ClayCard as={Link} to={`/admin/seasons/${season.id}`} className='admin-link-card'>
      <span className='admin-grow'>
        <span className='admin-row'>
          <span className='admin-link-card__title'>{season.name}</span>
          <Chip tone={STATUS_TONE[season.status]}>{STATUS_LABEL[season.status] ?? season.status}</Chip>
        </span>
        <span className='admin-muted admin-block'>
          {season.participantIds?.length ?? 0} players · {season.legs === 2 ? 'home & away' : 'single round'} · from {formatDate(season.startDate)}
        </span>
        {champion ? (
          <span className='admin-row admin-muted'>
            <Crest color={champion.color} emoji={champion.emoji} shortCode={champion.shortCode} size='sm' decorative />
            Champion: {champion.clubName}
          </span>
        ) : null}
      </span>
      <IconChevronRight />
    </ClayCard>
  )
}

export default function SeasonsAdmin() {
  const navigate = useNavigate()
  const { data: league, loading: leagueLoading } = useLeague()
  const { data: seasons, loading } = useSeasons(league?.id)
  const { data: players } = usePlayers(league?.id)
  const [creating, setCreating] = useState(false)
  const toast = useToast()
  const close = useCallback(() => setCreating(false), [])
  const nextNumber = seasons.reduce((max, season) => Math.max(max, season.number ?? 0), 0) + 1

  if (!leagueLoading && !league) {
    return (
      <AdminPage title='Seasons' back='/admin'>
        <EmptyState icon={<IconTrophy />} title='No league yet' message='Create the league first.' />
      </AdminPage>
    )
  }

  return (
    <AdminPage
      title='Seasons'
      back='/admin'
      right={(
        <IconButton label='New season' variant='primary' onClick={() => setCreating(true)} disabled={!league}>
          <IconPlus />
        </IconButton>
      )}
    >
      {loading || leagueLoading ? (
        <div className='admin-stack'>
          <Skeleton height='88px' radius='var(--radius-card)' />
          <Skeleton height='88px' radius='var(--radius-card)' />
        </div>
      ) : seasons.length === 0 ? (
        <EmptyState
          icon={<IconTrophy />}
          title='No seasons yet'
          message='Create a draft, preview the fixtures, then start it.'
          action={<ClayButton onClick={() => setCreating(true)}>New season</ClayButton>}
        />
      ) : (
        <div className='admin-stack'>
          {seasons.map((season) => <SeasonRow key={season.id} season={season} players={players} />)}
        </div>
      )}

      <Sheet open={creating} onClose={close} title='New season'>
        {creating ? (
          <CreateSeasonForm
            leagueId={league?.id}
            players={players}
            nextNumber={nextNumber}
            onError={toast.fail}
            onCreated={(id) => {
              setCreating(false)
              navigate(`/admin/seasons/${id}`)
            }}
          />
        ) : null}
      </Sheet>
      <AdminToast toast={toast.toast} onClose={toast.hide} />
    </AdminPage>
  )
}
