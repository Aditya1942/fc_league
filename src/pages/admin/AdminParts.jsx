import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router'
import {
  ClayButton,
  Field,
  IconBack,
  IconButton,
  Input,
  Sheet,
  Toast,
} from '../../ui/index.js'
import { PASTELS } from './format.js'
import { cn } from '../../ui/cn.js'

export function AdminPage({ title, back, right, children }) {
  const navigate = useNavigate()
  return (
    <div className='admin-page'>
      <div className='admin-head'>
        <div className='admin-head__slot'>
          {back ? (
            <IconButton label='Back' onClick={() => navigate(back)}>
              <IconBack />
            </IconButton>
          ) : null}
        </div>
        <h2 className='admin-head__title'>{title}</h2>
        <div className='admin-head__slot admin-head__slot--end'>{right}</div>
      </div>
      <div className='admin-body'>{children}</div>
    </div>
  )
}

export function AdminToast({ toast, onClose }) {
  if (!toast) return null
  return createPortal(
    <Toast
      key={toast.key}
      open
      message={toast.message}
      tone={toast.tone}
      duration={toast.tone === 'danger' ? 6000 : 2800}
      onClose={onClose}
    />,
    document.body,
  )
}

export function ConfirmSheet({ open, title, message, confirmLabel = 'Confirm', danger = false, busy = false, confirmDisabled = false, onConfirm, onClose, children }) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      {message ? <p>{message}</p> : null}
      {children}
      <div className='admin-actions'>
        <ClayButton variant='soft' onClick={onClose} disabled={busy}>Cancel</ClayButton>
        <ClayButton variant={danger ? 'danger' : 'primary'} onClick={onConfirm} disabled={busy || confirmDisabled}>
          {busy ? 'Working…' : confirmLabel}
        </ClayButton>
      </div>
    </Sheet>
  )
}

export function ColorField({ label = 'Color', value, onChange, error }) {
  return (
    <Field label={label} error={error} hint={error ? undefined : 'Pick a pastel or type a #RRGGBB hex'}>
      <div className='admin-stack'>
        <div className='admin-swatches' role='radiogroup' aria-label={label}>
          {PASTELS.map((color) => {
            const selected = value?.toUpperCase() === color
            return (
              <button
                key={color}
                type='button'
                role='radio'
                aria-checked={selected}
                aria-label={color}
                className={cn('admin-swatch', selected && 'is-selected')}
                style={{ '--swatch': color }}
                onClick={() => onChange(color)}
              />
            )
          })}
        </div>
        <Input
          value={value}
          maxLength={7}
          placeholder='#C5D4FF'
          autoCapitalize='characters'
          spellCheck={false}
          aria-label={`${label} hex`}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </Field>
  )
}
