import { Children, cloneElement, isValidElement, useId } from 'react'
import { IconChevronDown } from './icons.jsx'
import { cn } from './cn.js'

export function Input({ className, ref, ...props }) {
  return <input ref={ref} className={cn('clay-input', className)} {...props} />
}

export function Select({ options = [], className, ref, ...props }) {
  return (
    <span className='select-wrap'>
      <select ref={ref} className={cn('clay-select', className)} {...props}>
        {options.map((option) => {
          const value = typeof option === 'string' ? option : option.value
          const label = typeof option === 'string' ? option : option.label
          return (
            <option key={value} value={value}>
              {label}
            </option>
          )
        })}
      </select>
      <IconChevronDown />
    </span>
  )
}

export function Field({ label, hint, error, children }) {
  const autoId = useId()
  const hintId = `${autoId}-hint`
  const child = Children.count(children) === 1 && isValidElement(children) ? children : null
  const controlId = child?.props.id || autoId
  const described = error || hint ? hintId : undefined
  const control = child
    ? cloneElement(child, {
      id: controlId,
      'aria-invalid': error ? true : undefined,
      'aria-describedby': described,
    })
    : children

  return (
    <div className='field'>
      {label ? (
        <label className='field__label' htmlFor={child ? controlId : undefined}>
          {label}
        </label>
      ) : null}
      {control}
      {error || hint ? (
        <p id={hintId} className={error ? 'field__error' : 'field__hint'} role={error ? 'alert' : undefined}>
          {error || hint}
        </p>
      ) : null}
    </div>
  )
}
