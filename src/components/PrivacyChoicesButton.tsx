import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { requestPrivacyChoices, type PrivacyChoiceResult, type PrivacyWindow } from '@/lib/privacyChoices'

export default function PrivacyChoicesButton({ className }: { className?: string }) {
  const [status, setStatus] = useState<'idle' | 'waiting' | PrivacyChoiceResult>('idle')
  const cancel = useRef<(() => void) | null>(null)
  useEffect(() => () => cancel.current?.(), [])
  const open = () => {
    cancel.current?.()
    setStatus('waiting')
    cancel.current = requestPrivacyChoices(window as PrivacyWindow, setStatus)
  }
  return <span className="inline-block max-w-sm">
    <button type="button" onClick={open} disabled={status === 'waiting'} className={className}>Privacy &amp; Cookie Settings</button>
    {status !== 'idle' && <span role="status" className="mt-2 block text-xs leading-6 text-muted-foreground">
      {status === 'waiting' ? 'Waiting for Google privacy choices…' : status === 'requested' ? 'Privacy choices requested. If no message appears, use the links below.' : 'Google privacy choices are unavailable here. Try the homepage, or read the cookie help.'}
      {' '}<Link to="/" className="font-semibold underline">Open homepage</Link>{' · '}
      <Link to="/cookie-policy#managing-cookies" className="font-semibold underline">Cookie help</Link>
    </span>}
  </span>
}
