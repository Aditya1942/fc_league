import { useCallback, useMemo, useState } from 'react'
import { createPlayer, updatePlayer, useAllMatches, useLeague, usePlayers, useSeasons } from '../../data/index.js'
import {
  Chip,
  ClayButton,
  ClayCard,
  Crest,
  EmptyState,
  Field,
  IconEdit,
  IconButton,
  IconPlus,
  IconUsers,
  Input,
  Sheet,
  Skeleton,
} from '../../ui/index.js'
import { AdminPage, AdminToast, ColorField } from './AdminParts.jsx'
import { deletePlayer } from './adminWrites.js'
import { PASTELS } from './format.js'
import { useToast } from './useToast.js'

const EMPTY = { name: '', clubName: '', shortCode: '', emoji: '', color: PASTELS[0] }

function PlayerForm({ leagueId, player, hasHistory, onDone, onError }) {
  const [form, setForm] = useState(() => ({ ...EMPTY, ...(player ?? {}) }))
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))

  const run = async (action, message) => {
    setBusy(true)
    try {
      await action()
      onDone(message)
    } catch (error) {
      onError(error)
      setBusy(false)
    }
  }

  const onSubmit = (event) => {
    event.preventDefault()
    const input = {
      name: form.name,
      clubName: form.clubName,
      shortCode: form.shortCode,
      emoji: form.emoji,
      color: form.color,
    }
    if (player) run(() => updatePlayer(leagueId, player.id, input), 'Player saved')
    else run(() => createPlayer(leagueId, input), 'Player added')
  }

  return (
    <form className='admin-stack admin-stack--loose' onSubmit={onSubmit}>
      <div className='admin-list-item'>
        <Crest color={form.color} emoji={form.emoji} shortCode={form.shortCode.toUpperCase()} label={form.clubName} size='lg' />
        <div className='admin-grow'>
          <p className='admin-list-item__name'>{form.clubName || 'Club name'}</p>
          <p className='admin-muted'>{form.name || 'Player name'}</p>
        </div>
      </div>
      <Field label='Player name'>
        <Input value={form.name} maxLength={40} required autoComplete='off' onChange={set('name')} />
      </Field>
      <Field label='Club name'>
        <Input value={form.clubName} maxLength={48} required autoComplete='off' onChange={set('clubName')} />
      </Field>
      <div className='admin-grid-2'>
        <Field label='Short code' hint='2–4 letters'>
          <Input
            value={form.shortCode}
            maxLength={4}
            minLength={2}
            required
            autoCapitalize='characters'
            autoComplete='off'
            pattern='[A-Za-z0-9]{2,4}'
            onChange={set('shortCode')}
          />
        </Field>
        <Field label='Crest emoji'>
          <Input value={form.emoji} maxLength={32} required autoComplete='off' onChange={set('emoji')} />
        </Field>
      </div>
      <ColorField label='Crest color' value={form.color} onChange={(color) => setForm((prev) => ({ ...prev, color }))} />
      <ClayButton type='submit' size='lg' disabled={busy}>
        {busy ? 'Saving…' : player ? 'Save player' : 'Add player'}
      </ClayButton>

      {player ? (
        <div className='admin-stack'>
          <ClayButton
            variant='soft'
            disabled={busy}
            onClick={() => run(
              () => updatePlayer(leagueId, player.id, { archived: !player.archived }),
              player.archived ? 'Player restored' : 'Player archived',
            )}
          >
            {player.archived ? 'Restore player' : 'Archive player'}
          </ClayButton>
          {hasHistory ? (
            <p className='admin-muted'>
              This player has matches or is in a season, so they can’t be deleted. Archive them to hide them from pickers; their history stays.
            </p>
          ) : confirmDelete ? (
            <div className='admin-actions'>
              <ClayButton variant='soft' disabled={busy} onClick={() => setConfirmDelete(false)}>Keep</ClayButton>
              <ClayButton
                variant='danger'
                disabled={busy}
                onClick={() => run(() => deletePlayer(leagueId, player.id), 'Player deleted')}
              >
                Delete for good
              </ClayButton>
            </div>
          ) : (
            <ClayButton variant='danger' disabled={busy} onClick={() => setConfirmDelete(true)}>
              Delete player
            </ClayButton>
          )}
        </div>
      ) : null}
    </form>
  )
}

function PlayerRow({ player, onEdit }) {
  return (
    <ClayCard>
      <div className='admin-list-item'>
        <Crest color={player.color} emoji={player.emoji} shortCode={player.shortCode} label={player.clubName} />
        <div className='admin-grow'>
          <p className='admin-list-item__name'>{player.clubName}</p>
          <p className='admin-muted'>{player.name} · {player.shortCode}</p>
        </div>
        {player.archived ? <Chip tone='void'>Archived</Chip> : null}
        <IconButton label={`Edit ${player.name}`} onClick={() => onEdit(player)}>
          <IconEdit />
        </IconButton>
      </div>
    </ClayCard>
  )
}

export default function PlayersAdmin() {
  const { data: league, loading: leagueLoading } = useLeague()
  const { data: players, loading } = usePlayers(league?.id)
  const { data: seasons, loading: seasonsLoading } = useSeasons(league?.id)
  const { data: matches, loading: matchesLoading } = useAllMatches(league?.id)
  const [editing, setEditing] = useState(null)
  const toast = useToast()

  const inSeason = useMemo(() => {
    const ids = new Set()
    for (const season of seasons) for (const id of season.participantIds ?? []) ids.add(id)
    for (const match of matches) for (const id of match.playerIds ?? [match.homeId, match.awayId]) ids.add(id)
    return ids
  }, [seasons, matches])

  const current = players.filter((player) => !player.archived)
  const archived = players.filter((player) => player.archived)
  const close = useCallback(() => setEditing(null), [])
  const editingPlayer = editing && editing !== 'new' ? players.find((player) => player.id === editing.id) ?? editing : null

  const onDone = (message) => {
    setEditing(null)
    toast.show(message)
  }

  if (!leagueLoading && !league) {
    return (
      <AdminPage title='Players' back='/admin'>
        <EmptyState icon={<IconUsers />} title='No league yet' message='Create the league first, then add players.' />
      </AdminPage>
    )
  }

  return (
    <AdminPage
      title='Players'
      back='/admin'
      right={(
        <IconButton label='Add player' variant='primary' onClick={() => setEditing('new')} disabled={!league}>
          <IconPlus />
        </IconButton>
      )}
    >
      {loading || leagueLoading ? (
        <div className='admin-stack'>
          <Skeleton height='88px' radius='var(--radius-card)' />
          <Skeleton height='88px' radius='var(--radius-card)' />
        </div>
      ) : (
        <>
          {current.length === 0 ? (
            <EmptyState
              icon={<IconUsers />}
              title='No players yet'
              message='Every friend is a club. Add the first one.'
              action={<ClayButton onClick={() => setEditing('new')}>Add player</ClayButton>}
            />
          ) : (
            <section className='admin-stack'>
              <h2 className='admin-section-title'>Active ({current.length})</h2>
              {current.map((player) => <PlayerRow key={player.id} player={player} onEdit={setEditing} />)}
            </section>
          )}
          {archived.length ? (
            <section className='admin-stack'>
              <h2 className='admin-section-title'>Archived ({archived.length})</h2>
              {archived.map((player) => <PlayerRow key={player.id} player={player} onEdit={setEditing} />)}
            </section>
          ) : null}
        </>
      )}

      <Sheet open={editing != null} onClose={close} title={editing === 'new' ? 'Add player' : 'Edit player'}>
        {editing != null ? (
          <PlayerForm
            key={editing === 'new' ? 'new' : editing.id}
            leagueId={league?.id}
            player={editingPlayer}
            hasHistory={editingPlayer ? seasonsLoading || matchesLoading || inSeason.has(editingPlayer.id) : false}
            onDone={onDone}
            onError={toast.fail}
          />
        ) : null}
      </Sheet>
      <AdminToast toast={toast.toast} onClose={toast.hide} />
    </AdminPage>
  )
}
