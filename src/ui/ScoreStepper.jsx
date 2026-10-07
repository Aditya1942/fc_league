export function ScoreStepper({
  value = 0,
  onChange,
  min = 0,
  max = 99,
  label = 'Score',
}) {
  const current = Number.isFinite(Number(value)) ? Number(value) : 0
  const set = (next) => onChange?.(Math.min(max, Math.max(min, next)))

  return (
    <div className='stepper' role='group' aria-label={label}>
      <button
        type='button'
        className='stepper__btn'
        aria-label={`Decrease ${label}`}
        disabled={current <= min}
        onClick={() => set(current - 1)}
      >
        −
      </button>
      <span className='stepper__value' aria-live='polite'>
        {current}
      </span>
      <button
        type='button'
        className='stepper__btn'
        aria-label={`Increase ${label}`}
        disabled={current >= max}
        onClick={() => set(current + 1)}
      >
        +
      </button>
    </div>
  )
}
