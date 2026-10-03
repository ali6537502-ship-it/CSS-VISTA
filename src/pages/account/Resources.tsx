import { useCallback, useEffect, useRef, useState } from 'react'
import { Download, FileText, LoaderCircle } from 'lucide-react'
import { useAccount } from '@/lib/accountContext'
import { ACCOUNT_EXPIRED_EVENT, currentHostingerAccountUser, hostingerRequest, PROFILE_UPDATED_EVENT } from '@/lib/hostingerApi'
import { AccountPage } from './shared'

type Resource = { id: string; title: string; format: string; filename: string; available: boolean }

export default function Resources() {
  const { user } = useAccount()
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState('')
  const alive = useRef(false)

  const load = useCallback(async (signal: AbortSignal) => {
    setLoading(true)
    setError('')
    try {
      const result = await hostingerRequest<{ resources: Resource[] }>('student/resources.php', { signal })
      if (!signal.aborted) setResources(result.resources)
    } catch (cause) {
      if (!signal.aborted) setError(cause instanceof Error ? cause.message : 'Could not load your resources. Please try again.')
    } finally {
      if (!signal.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    alive.current = true
    const controller = new AbortController()
    void load(controller.signal)
    return () => { alive.current = false; controller.abort() }
  }, [load, user?.id])

  async function download(resource: Resource) {
    if (!user || downloading) return
    const userId = user.id
    setDownloading(resource.id)
    setError('')
    try {
      const response = await fetch(`/api/student/resources.php?view=download&id=${encodeURIComponent(resource.id)}`, {
        credentials: 'same-origin', cache: 'no-store', headers: { 'X-CSSV-User': userId },
      })
      if (!response.ok) {
        const failure = await response.json().catch(() => ({})) as { error?: string; message?: string }
        if (response.status === 401) window.dispatchEvent(new CustomEvent(ACCOUNT_EXPIRED_EVENT, { detail: { userId } }))
        if (failure.error === 'profile_incomplete') window.dispatchEvent(new CustomEvent(PROFILE_UPDATED_EVENT))
        throw new Error(failure.message || 'Could not download the book. Please try again.')
      }
      if (!response.headers.get('Content-Type')?.startsWith('application/pdf')) throw new Error('Could not download the book. Please try again.')
      const blob = await response.blob()
      if (!alive.current || currentHostingerAccountUser() !== userId) return
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = resource.filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000)
    } catch (cause) {
      if (alive.current && currentHostingerAccountUser() === userId) setError(cause instanceof Error ? cause.message : 'Could not download the book. Please try again.')
    } finally {
      if (alive.current && currentHostingerAccountUser() === userId) setDownloading('')
    }
  }

  return (
    <AccountPage title="My CSS Resources" intro="Free books to download with your 100% complete profile.">
      {error && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">{error}<button type="button" onClick={() => void load(new AbortController().signal)} className="ml-3 min-h-11 font-semibold underline">Try again</button></div>}
      {loading ? <p role="status" className="py-8 text-slate-600">Loading your resources…</p> : (
        <div className="grid gap-5 sm:grid-cols-2">
          {resources.map(resource => (
            <article key={resource.id} className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-start justify-between gap-4">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-50 text-emerald-800"><FileText className="h-6 w-6" /></span>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-800">Free</span>
              </div>
              <h2 className="mt-5 text-xl font-bold text-slate-950">{resource.title}</h2>
              <p className="mt-2 text-sm text-slate-500">{resource.format}</p>
              {resource.available ? (
                <button type="button" disabled={!!downloading} onClick={() => void download(resource)} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-800 px-5 text-base font-semibold text-white hover:bg-emerald-900 disabled:opacity-60">
                  {downloading === resource.id ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
                  {downloading === resource.id ? 'Downloading…' : 'Free Download'}
                </button>
              ) : <p role="status" className="mt-6 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">The book will be available here once uploaded.</p>}
            </article>
          ))}
        </div>
      )}
    </AccountPage>
  )
}
