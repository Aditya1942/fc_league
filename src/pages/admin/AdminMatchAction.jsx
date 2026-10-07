import { useCallback, useState } from 'react'
import { useAuth } from '../../auth/index.js'
import {
  clearResult,
  rescheduleMatch,
  saveResult,
  setMatchStatus,
  usePlayers,
  useSeason,
} from '../../data/index.js'
import {
  ClayButton,
  Crest,
  Field,
  IconButton,
  IconChevronDown,
  IconChevronUp,
  IconEdit,
  IconPlus,
  IconTrash,
  Input,
  ScoreStepper,
  Select,
  Sheet,
} from '../../ui/index.js'
import { AdminToast } from './AdminParts.jsx'
import { formatDateTime, fromDateTimeInput, parseIntIn, toDateTimeInput } from './format.js'
import { useToast } from './useToast.js'
import './admin.css'

// firestore.rules only cap the list size; each scorer is validated here.
const MAX_SCORERS = 30
const STATUS_TEXT = {
  scheduled: 'Scheduled',
  played: 'Played',
  postponed: 'Postponed',
  void: 'Void',
}

function text(value) {
  return value == null ? '' : String(value)
}

function initialForm(match) {
  const details = match.details ?? {}
  return {
    homeGoals: match.homeGoals ?? 0,
    awayGoals: match.awayGoals ?? 0,
    scorers: (details.scorers ?? []).map((scorer, index) => ({
      key: index,
      side: scorer.side,
      name: scorer.name,
      minute: text(scorer.minute),
    })),
    homeTeamUsed: text(details.homeTeamUsed),
    awayTeamUsed: text(details.awayTeamUsed),
    possessionHome: text(details.possession?.home || ''),
    possessionAway: text(details.possession?.away || ''),
    shotsHome: text(details.shots?.home || ''),
    shotsAway: text(details.shots?.away || ''),
    onTargetHome: text(details.shotsOnTarget?.home || ''),
    onTargetAway: text(details.shotsOnTarget?.away || ''),
    motm: text(details.motm),
    notes: text(details.notes),
    kickoff: toDateTimeInput(match.scheduledAt),
  }
}

function scoreValue(value, label) {
  if (!Number.isInteger(value) || value < 0 || value > 99) {
    throw new Error(`${label} must be a whole number from 0 to 99`)
  }
  return value
}

function buildDetails(form) {
  if (form.scorers.length > MAX_SCORERS) throw new Error(`Up to ${MAX_SCORERS} scorers can be saved`)
  const scorers = form.scorers.map((scorer, index) => {
    const name = scorer.name.trim()
    if (!name) throw new Error(`Scorer ${index + 1} needs a name`)
    if (name.length > 40) throw new Error(`Scorer ${index + 1} name is too long`)
    if (String(scorer.minute).trim() === '') throw new Error(`Scorer ${index + 1} needs a minute`)
    return {
      side: scorer.side,
      name,
      minute: parseIntIn(scorer.minute, 0, 130, `Scorer ${index + 1} minute`),
    }
  })
  const details = {
    scorers,
    homeTeamUsed: form.homeTeamUsed.trim(),
    awayTeamUsed: form.awayTeamUsed.trim(),
    possession: {
      home: parseIntIn(form.possessionHome, 0, 100, 'Home possession'),
      away: parseIntIn(form.possessionAway, 0, 100, 'Away possession'),
    },
    shots: {
      home: parseIntIn(form.shotsHome, 0, 99, 'Home shots'),
      away: parseIntIn(form.shotsAway, 0, 99, 'Away shots'),
    },
    shotsOnTarget: {
      home: parseIntIn(form.onTargetHome, 0, 99, 'Home shots on target'),
      away: parseIntIn(form.onTargetAway, 0, 99, 'Away shots on target'),
    },
    motm: form.motm.trim(),
    notes: form.notes.trim(),
  }
  const { possession, shots, shotsOnTarget } = details
  if (possession.home + possession.away > 100) throw new Error('Possession cannot add up to more than 100%')
  if (shotsOnTarget.home > shots.home || shotsOnTarget.away > shots.away) {
    throw new Error('Shots on target cannot exceed shots')
  }
  if (details.homeTeamUsed.length > 40 || details.awayTeamUsed.length > 40) throw new Error('Team names are too long')
  if (details.motm.length > 40) throw new Error('MOTM is too long')
  if (details.notes.length > 500) throw new Error('Notes must be 500 characters or fewer')
  const empty = scorers.length === 0
    && !details.homeTeamUsed && !details.awayTeamUsed && !details.motm && !details.notes
    && [possession, shots, shotsOnTarget].every((pair) => pair.home === 0 && pair.away === 0)
  return empty ? null : details
}

function PairField({ label, home, away, max, onHome, onAway }) {
  return (
    <div className='field'>
      <span className='field__label'>{label}</span>
      <div className='admin-grid-2'>
        <Input value={home} inputMode='numeric' maxLength={3} placeholder='Home' aria-label={`${label} home (0–${max})`} onChange={onHome} />
        <Input value={away} inputMode='numeric' maxLength={3} placeholder='Away' aria-label={`${label} away (0–${max})`} onChange={onAway} />
      </div>
    </div>
  )
}

function MatchSheetBody({ match, onDone, onError }) {
  const { data: players } = usePlayers(match.leagueId)
  const { data: season } = useSeason(match.leagueId, match.seasonId)
  const [form, setForm] = useState(() => initialForm(match))
  const [moreOpen, setMoreOpen] = useState(() => match.details != null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const home = players.find((player) => player.id === match.homeId)
  const away = players.find((player) => player.id === match.awayId)
  const homeName = home?.clubName || 'Home'
  const awayName = away?.clubName || 'Away'
  const locked = season?.status === 'completed'
  const played = match.status === 'played'

  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))
  const setScorer = (key, field, value) => setForm((prev) => ({
    ...prev,
    scorers: prev.scorers.map((scorer) => (scorer.key === key ? { ...scorer, [field]: value } : scorer)),
  }))
  const addScorer = () => setForm((prev) => ({
    ...prev,
    scorers: [
      ...prev.scorers,
      { key: Date.now(), side: 'home', name: '', minute: '' },
    ],
  }))
  const removeScorer = (key) => setForm((prev) => ({
    ...prev,
    scorers: prev.scorers.filter((scorer) => scorer.key !== key),
  }))

  const run = async (name, action, message) => {
    setError('')
    setBusy(name)
    try {
      await action()
      onDone(message)
    } catch (failure) {
      setBusy('')
      onError(failure)
    }
  }

  const onSave = (event) => {
    event.preventDefault()
    let input
    try {
      input = {
        homeGoals: scoreValue(form.homeGoals, 'Home goals'),
        awayGoals: scoreValue(form.awayGoals, 'Away goals'),
        details: buildDetails(form),
      }
    } catch (invalid) {
      setError(invalid.message)
      setMoreOpen(true)
      return
    }
    run('save', () => saveResult(match, input), played ? 'Result updated' : 'Result saved')
  }

  const onReschedule = () => {
    const when = fromDateTimeInput(form.kickoff)
    if (form.kickoff && !when) {
      setError('Pick a valid date and time')
      return
    }
    run('reschedule', () => rescheduleMatch(match, when), when ? `Kickoff set to ${formatDateTime(when)}` : 'Kickoff date cleared')
  }

  if (locked) {
    return (
      <div className='admin-stack'>
        <p className='admin-warning'>This season is completed. Reopen it from Admin → Seasons to change results.</p>
      </div>
    )
  }

  const disabled = busy !== ''

  return (
    <form className='admin-stack admin-stack--loose' onSubmit={onSave} noValidate>
      <p className='admin-muted admin-center'>
        Matchday {match.matchday} · {STATUS_TEXT[match.status] ?? match.status}
      </p>
      <div className='admin-score-head'>
        <div className='admin-score-side'>
          <Crest color={home?.color} emoji={home?.emoji} shortCode={home?.shortCode} label={homeName} size='lg' />
          <span>{homeName}</span>
          <ScoreStepper
            label={`${homeName} goals`}
            value={form.homeGoals}
            onChange={(value) => setForm((prev) => ({ ...prev, homeGoals: value }))}
          />
        </div>
        <div className='admin-score-side'>
          <Crest color={away?.color} emoji={away?.emoji} shortCode={away?.shortCode} label={awayName} size='lg' />
          <span>{awayName}</span>
          <ScoreStepper
            label={`${awayName} goals`}
            value={form.awayGoals}
            onChange={(value) => setForm((prev) => ({ ...prev, awayGoals: value }))}
          />
        </div>
      </div>

      <ClayButton
        variant='soft'
        aria-expanded={moreOpen}
        onClick={() => setMoreOpen((open) => !open)}
      >
        More details
        {moreOpen ? <IconChevronUp /> : <IconChevronDown />}
      </ClayButton>

      {moreOpen ? (
        <div className='admin-stack admin-stack--loose'>
          <div className='field'>
            <span className='field__label'>Scorers ({form.scorers.length}/{MAX_SCORERS})</span>
            <div className='admin-stack'>
              {form.scorers.map((scorer, index) => (
                <div key={scorer.key} className='admin-scorer'>
                  <Select
                    aria-label={`Scorer ${index + 1} side`}
                    value={scorer.side}
                    onChange={(event) => setScorer(scorer.key, 'side', event.target.value)}
                    options={[
                      { value: 'home', label: home?.shortCode || 'Home' },
                      { value: 'away', label: away?.shortCode || 'Away' },
                    ]}
                  />
                  <Input
                    aria-label={`Scorer ${index + 1} name`}
                    placeholder='Name'
                    maxLength={40}
                    value={scorer.name}
                    onChange={(event) => setScorer(scorer.key, 'name', event.target.value)}
                  />
                  <Input
                    aria-label={`Scorer ${index + 1} minute`}
                    placeholder='Min'
                    inputMode='numeric'
                    maxLength={3}
                    value={scorer.minute}
                    onChange={(event) => setScorer(scorer.key, 'minute', event.target.value)}
                  />
                  <IconButton label={`Remove scorer ${index + 1}`} variant='danger' onClick={() => removeScorer(scorer.key)}>
                    <IconTrash />
                  </IconButton>
                </div>
              ))}
              <ClayButton variant='soft' size='sm' onClick={addScorer} disabled={form.scorers.length >= MAX_SCORERS}>
                <IconPlus />
                Add scorer
              </ClayButton>
            </div>
          </div>
          <div className='admin-grid-2'>
            <Field label={`${home?.shortCode || 'Home'} team used`}>
              <Input value={form.homeTeamUsed} maxLength={40} placeholder='e.g. Real Madrid' onChange={set('homeTeamUsed')} />
            </Field>
            <Field label={`${away?.shortCode || 'Away'} team used`}>
              <Input value={form.awayTeamUsed} maxLength={40} placeholder='e.g. Arsenal' onChange={set('awayTeamUsed')} />
            </Field>
          </div>
          <PairField label='Possession %' max={100} home={form.possessionHome} away={form.possessionAway} onHome={set('possessionHome')} onAway={set('possessionAway')} />
          <PairField label='Shots' max={99} home={form.shotsHome} away={form.shotsAway} onHome={set('shotsHome')} onAway={set('shotsAway')} />
          <PairField label='Shots on target' max={99} home={form.onTargetHome} away={form.onTargetAway} onHome={set('onTargetHome')} onAway={set('onTargetAway')} />
          <Field label='Man of the match'>
            <Input value={form.motm} maxLength={40} onChange={set('motm')} />
          </Field>
          <Field label='Notes'>
            <textarea className='clay-input admin-textarea' value={form.notes} maxLength={500} onChange={set('notes')} />
          </Field>
        </div>
      ) : null}

      {error ? <p className='admin-error' role='alert'>{error}</p> : null}

      <div className='admin-sticky-actions'>
        <ClayButton type='submit' size='lg' disabled={disabled}>
          {busy === 'save' ? 'Saving…' : played ? 'Update result' : 'Save result'}
        </ClayButton>
      </div>

      <div className='admin-stack'>
        <span className='field__label'>Match status</span>
        <div className='admin-actions'>
          {played ? (
            <ClayButton variant='soft' disabled={disabled} onClick={() => run('clear', () => clearResult(match), 'Result cleared')}>
              Clear result
            </ClayButton>
          ) : null}
          {match.status === 'postponed' || match.status === 'void' ? (
            <ClayButton variant='soft' disabled={disabled} onClick={() => run('scheduled', () => setMatchStatus(match, 'scheduled'), 'Match back to scheduled')}>
              Mark scheduled
            </ClayButton>
          ) : null}
          {match.status !== 'postponed' ? (
            <ClayButton variant='soft' disabled={disabled} onClick={() => run('postponed', () => setMatchStatus(match, 'postponed'), 'Match postponed')}>
              Postpone
            </ClayButton>
          ) : null}
          {match.status !== 'void' ? (
            <ClayButton variant='danger' disabled={disabled} onClick={() => run('void', () => setMatchStatus(match, 'void'), 'Match voided')}>
              Void
            </ClayButton>
          ) : null}
        </div>
      </div>

      <div className='admin-stack'>
        <Field label='Kickoff' hint={`Now: ${formatDateTime(match.scheduledAt)}`}>
          <Input type='datetime-local' value={form.kickoff} onChange={set('kickoff')} />
        </Field>
        <ClayButton variant='soft' disabled={disabled} onClick={onReschedule}>
          {busy === 'reschedule' ? 'Saving…' : form.kickoff ? 'Reschedule' : 'Clear kickoff date'}
        </ClayButton>
      </div>
    </form>
  )
}

export default function AdminMatchAction({ match }) {
  const { isAdmin } = useAuth()
  const [open, setOpen] = useState(false)
  const toast = useToast()
  const close = useCallback(() => setOpen(false), [])
  const { data: season } = useSeason(match?.leagueId, match?.seasonId)

  if (!isAdmin || !match?.id || season?.status === 'completed') return null

  const played = match.status === 'played'

  return (
    <>
      <ClayButton
        variant={played ? 'soft' : 'primary'}
        size='sm'
        className='admin-match-action'
        onClick={(event) => {
          event.stopPropagation()
          setOpen(true)
        }}
      >
        <IconEdit />
        {played ? 'Edit' : 'Result'}
      </ClayButton>
      <Sheet open={open} onClose={close} title={played ? 'Edit result' : 'Enter result'}>
        {open ? (
          <MatchSheetBody
            key={match.id}
            match={match}
            onDone={(message) => {
              setOpen(false)
              toast.show(message)
            }}
            onError={toast.fail}
          />
        ) : null}
      </Sheet>
      <AdminToast toast={toast.toast} onClose={toast.hide} />
    </>
  )
}
