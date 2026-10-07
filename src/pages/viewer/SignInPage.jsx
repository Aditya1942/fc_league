import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { useAuth } from '../../auth/index.js'
import { ClayButton, ClayCard, Field, Input, Spinner } from '../../ui/index.js'

const MESSAGES = {
  'auth/invalid-credential': 'Wrong email or password.',
  'auth/invalid-email': 'That email address is not valid.',
  'auth/user-disabled': 'This account is disabled.',
  'auth/too-many-requests': 'Too many attempts. Try again in a minute.',
  'auth/network-request-failed': 'No connection. Check your network and retry.',
}

export default function SignInPage() {
  const { user, isAdmin, loading, signIn, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const target = location.state?.from?.startsWith('/admin') ? location.state.from : '/admin'

  if (isAdmin) return <Navigate to={target} replace />

  const onSubmit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await signIn(email.trim(), password)
      navigate(target, { replace: true })
    } catch (err) {
      setError(MESSAGES[err?.code] ?? 'Sign in failed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  if (loading && !busy) {
    return (
      <div className='empty' aria-busy='true'>
        <Spinner />
      </div>
    )
  }

  return (
    <div className='v-page'>
      <ClayCard as='form' className='v-form' onSubmit={onSubmit} noValidate>
        <p className='v-muted v-small'>Only the league admin needs to sign in. Everyone else can browse freely.</p>
        {user && !isAdmin ? (
          <p className='v-error'>
            {`${user.email ?? 'This account'} is signed in but is not an admin.`}
          </p>
        ) : null}
        <Field label='Email'>
          <Input
            type='email'
            autoComplete='email'
            inputMode='email'
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </Field>
        <Field label='Password' error={error || undefined}>
          <Input
            type='password'
            autoComplete='current-password'
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </Field>
        <div className='v-form__actions'>
          {user ? <ClayButton variant='soft' onClick={() => signOut()}>Sign out</ClayButton> : null}
          <ClayButton type='submit' disabled={busy || !email || !password}>
            {busy ? 'Signing in…' : 'Sign in'}
          </ClayButton>
        </div>
      </ClayCard>
    </div>
  )
}
