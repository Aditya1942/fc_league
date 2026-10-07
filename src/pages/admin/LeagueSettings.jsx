import { useState } from 'react'
import { createLeague, updateLeague, useLeague } from '../../data/index.js'
import { ClayButton, ClayCard, Crest, Field, Input, Skeleton } from '../../ui/index.js'
import { AdminPage, AdminToast, ColorField } from './AdminParts.jsx'
import { useToast } from './useToast.js'

function LeagueForm({ league, onDone }) {
  const [name, setName] = useState(league?.name ?? 'FC League')
  const [emoji, setEmoji] = useState(league?.emoji ?? '⚽')
  const [color, setColor] = useState(league?.color ?? '#C5D4FF')
  const [busy, setBusy] = useState(false)

  const onSubmit = async (event) => {
    event.preventDefault()
    setBusy(true)
    try {
      if (league) await updateLeague(league.id, { name, emoji, color })
      else await createLeague({ name, emoji, color })
      onDone(null)
    } catch (error) {
      onDone(error)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className='admin-stack admin-stack--loose' onSubmit={onSubmit}>
      <ClayCard>
        <div className='admin-list-item'>
          <Crest color={color} emoji={emoji} label={name} size='lg' />
          <div className='admin-grow'>
            <p className='admin-list-item__name'>{name || 'League name'}</p>
            <p className='admin-muted'>Preview</p>
          </div>
        </div>
      </ClayCard>
      <Field label='League name'>
        <Input value={name} maxLength={60} required onChange={(event) => setName(event.target.value)} />
      </Field>
      <Field label='Logo emoji' hint='One emoji works best'>
        <Input value={emoji} maxLength={32} required onChange={(event) => setEmoji(event.target.value)} />
      </Field>
      <ColorField label='Logo color' value={color} onChange={setColor} />
      <ClayButton type='submit' size='lg' disabled={busy}>
        {busy ? 'Saving…' : league ? 'Save league' : 'Create league'}
      </ClayButton>
    </form>
  )
}

export default function LeagueSettings() {
  const { data: league, loading } = useLeague()
  const toast = useToast()

  const onDone = (error) => {
    if (error) toast.fail(error)
    else toast.show(league ? 'League saved' : 'League created')
  }

  return (
    <AdminPage title={league ? 'League' : 'Create league'} back='/admin'>
      {loading ? (
        <Skeleton height='240px' radius='var(--radius-card)' />
      ) : (
        <LeagueForm key={league?.id ?? 'new'} league={league} onDone={onDone} />
      )}
      <AdminToast toast={toast.toast} onClose={toast.hide} />
    </AdminPage>
  )
}
