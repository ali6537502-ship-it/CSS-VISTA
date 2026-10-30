import { useState } from 'react'
import { Search, X } from 'lucide-react'
import { optionalGroups } from '@/data/syllabus'
import { profileValues } from './profileForm'
export function ProfileSubjects({ value, onChange, error }: { value: string; onChange: (value: string) => void; error?: string }) {
  const [query, setQuery] = useState('')
  const selected = profileValues(value)
  const choices = optionalGroups.flatMap(group => group.subjects)
  const matches = choices.filter(subject => subject.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
  function toggle(name: string) { onChange(JSON.stringify(selected.includes(name) ? selected.filter(item => item !== name) : [...selected, name])) }
  return <fieldset className="ac-subjects ac-wide" aria-describedby="profile-hint-optional_subjects">
    <legend>Optional subjects <span aria-hidden="true">*</span></legend><p id="profile-hint-optional_subjects" className="ac-hint">Your profile shortlist. Review the full examination combination in My Study Plan.</p>
    {!!selected.length && <div className="ac-subject-chips">{selected.map(name => <button type="button" key={name} onClick={() => toggle(name)} aria-label={`Remove ${name} from profile subjects`}><span dir="auto">{name}</span><X size={13}/></button>)}</div>}
    <label className="ac-subject-search"><Search size={17} aria-hidden="true"/><input id="profile-optional_subjects" aria-label="Find optional subjects" aria-invalid={!!error} aria-describedby={error ? 'profile-error-optional_subjects' : undefined} type="search" placeholder="Search a subject…" value={query} onChange={event => setQuery(event.target.value)}/></label>
    <div className="ac-subject-results">{matches.map(subject => <label key={subject.name}><input type="checkbox" checked={selected.includes(subject.name)} onChange={() => toggle(subject.name)}/><span>{subject.name}</span><small>{subject.marks} marks</small></label>)}{!matches.length && <p>No matching subjects. Try another name.</p>}</div>
    <p className="ac-hint" role="status">{selected.length} selected</p>{error && <p id="profile-error-optional_subjects" className="ac-field-error">{error}</p>}
  </fieldset>
}
