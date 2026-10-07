import { cn } from './cn.js'

const NAMES = {
  W: 'Win',
  D: 'Draw',
  L: 'Loss',
}

export function FormChips({ form = [], label = 'Form', className }) {
  return (
    <ol className={cn('form-chips', className)} aria-label={label}>
      {form.length === 0 ? (
        <li className='form-chip form-chip--empty' aria-label='No results yet'>
          –
        </li>
      ) : (
        form.map((item, index) => {
          const result = String(item).toUpperCase()
          const name = NAMES[result] || result
          return (
            <li key={`${result}-${index}`} className={cn('form-chip', `form-chip--${result}`)}>
              <span aria-hidden='true'>{result}</span>
              <span className='visually-hidden'>{name}</span>
            </li>
          )
        })
      )}
    </ol>
  )
}
