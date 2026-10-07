import { Field, Select } from '../../../ui/index.js'

export function SeasonSelect({ value, options, onChange }) {
  if (options.length < 2) return null
  return (
    <Field label='Season'>
      <Select value={value} options={options} onChange={(event) => onChange(event.target.value)} />
    </Field>
  )
}
