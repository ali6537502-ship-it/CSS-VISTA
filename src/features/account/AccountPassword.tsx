import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
export default function AccountPassword({ value, onChange, error, label, name, fresh, hint }: { value: string; onChange: (value: string) => void; error?: string; label: string; name: string; fresh: boolean; hint?: string }) {
  const [visible, setVisible] = useState(false)
  return <div className="ac-field"><label htmlFor={`access-${name}`}>{label}</label><div className="ac-password"><input id={`access-${name}`} name={name} type={visible ? 'text' : 'password'} value={value} autoComplete={fresh ? 'new-password' : 'current-password'} aria-invalid={!!error} aria-describedby={[hint ? `hint-${name}` : '', error ? `error-${name}` : ''].filter(Boolean).join(' ') || undefined} onChange={event => onChange(event.target.value)}/><button type="button" aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`} aria-pressed={visible} onClick={() => setVisible(current => !current)}>{visible ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div>{hint && <p id={`hint-${name}`} className="ac-hint">{hint}</p>}{error && <p id={`error-${name}`} className="ac-field-error">{error}</p>}</div>
}
