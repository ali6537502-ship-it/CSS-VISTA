import { useState } from 'react'
import { ClipboardCopy } from 'lucide-react'
import { buildMissingCssOptionalSourceCommand } from './vistaGuideModel'

/** The imported FPSC document has no reliable sections for this subject.
 * A research command is available; a fabricated study timetable is not.
 */
export default function MissingOptionalSyllabusCommand({ subject }: { subject: string }) {
  const [feedback,setFeedback]=useState('')
  const [manual,setManual]=useState('')
  async function copy() {
    const command=buildMissingCssOptionalSourceCommand(subject)
    try {
      await navigator.clipboard.writeText(command)
      setManual('')
      setFeedback('Official-syllabus research command copied. Verify the FPSC outline before scheduling.')
    }catch {
      setManual(command)
      setFeedback('Clipboard unavailable. Select and copy the command below.')
    }
  }
  return <div className="mt-3 grid gap-2">
    <button type="button" onClick={copy}
      aria-label={'Copy official syllabus research command for '+subject}
      className="inline-flex min-h-11 max-w-full items-center justify-center gap-2 rounded-lg border border-emerald-700 px-3 text-xs font-semibold text-emerald-900 hover:bg-emerald-50">
      <ClipboardCopy size={15}/>Copy official syllabus research command
    </button>
    {feedback&&<span role="status" className="text-xs text-emerald-900">{feedback}</span>}
    {manual&&<textarea aria-label={'Copy syllabus research command manually for '+subject} value={manual} readOnly rows={6} onFocus={event=>event.currentTarget.select()} className="w-full rounded-lg border p-2 text-xs"/>}
  </div>
}
