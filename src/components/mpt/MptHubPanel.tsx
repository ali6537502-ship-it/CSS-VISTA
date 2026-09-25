import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { mptApi, type MptCard } from '@/lib/mpt/api'
import { ACTION_LABEL, copy } from '@/lib/mpt/copy'
import { useAccount } from '@/lib/accountContext'
import { actionHref } from './MptHeroCard'
import { StatusBadge } from './StatusBadge'
import { MockSlot } from './MockSlot'
import { LiveMockBanner, isLiveForOthers } from './LiveMockBanner'

/** Public MPT page panel: real mock cards with one state-driven CTA each (Section 11). */
export function MptHubPanel() {
  const { user } = useAccount()
  const [cards, setCards] = useState<MptCard[] | null>(null)
  const [loginFor, setLoginFor] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const controller = new AbortController()
    mptApi.mocks(controller.signal).then((data) => setCards(data.enabled ? data.mocks : [])).catch(() => setCards([]))
    return () => controller.abort()
  }, [user?.id])
  useEffect(() => { if (loginFor) dialogRef.current?.focus() }, [loginFor])
  const openCard = cards?.find((card) => card.state.phase === 'APPLICATIONS_OPEN' || card.state.phase === 'LOGIN_REQUIRED')
  const applyPath = (slug: string) => `/account/mpt/apply/${slug}`

  return (
    <section className="rounded-2xl border border-emerald-900/15 bg-white p-5 sm:p-7" aria-labelledby="mpt-hub-title">
      <h2 id="mpt-hub-title" className="text-2xl font-extrabold tracking-wide text-slate-950">{copy.hub.title}</h2>
      <p className="mt-1 text-base text-slate-700">{copy.hub.tagline}</p>
      {openCard && (
        user
          ? <Link to={applyPath(openCard.mock.slug)} className="mt-4 inline-flex min-h-12 items-center rounded-xl bg-emerald-900 px-5 text-base font-bold text-white hover:bg-emerald-950">{copy.hub.cta}</Link>
          : <button type="button" onClick={() => setLoginFor(openCard.mock.slug)} className="mt-4 inline-flex min-h-12 items-center rounded-xl bg-emerald-900 px-5 text-base font-bold text-white hover:bg-emerald-950">{copy.hub.cta}</button>
      )}
      <p className="mt-2 text-sm text-slate-500">{copy.hub.free}</p>

      {cards && <div className="mt-5 space-y-3"><LiveMockBanner cards={cards} /></div>}
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {cards === null && [0, 1].map((key) => <div key={key} className="h-32 animate-pulse rounded-xl bg-slate-100" />)}
        {cards?.filter((card) => !isLiveForOthers(card)).length === 0 && <p className="text-sm text-slate-600">{copy.hub.noMocks}</p>}
        {cards?.filter((card) => !isLiveForOthers(card)).slice(0, 4).map((card) => {
          const href = actionHref(card)
          const loginNeeded = card.state.primary_action === 'login'
          return (
            <article key={card.mock.slug} className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-slate-950">{card.mock.title}</h3>
                <StatusBadge phase={card.state.phase} />
              </div>
              <div className="mt-1"><MockSlot mock={card.mock} withWindow /></div>
              <p className="mt-1 text-sm text-slate-600">{card.mock.duration_minutes} min · {card.mock.total_questions} questions · Free</p>
              {(card.registered_count || card.slots_available !== null && card.slots_available !== undefined) && (
                <p className="mt-1 text-xs text-slate-500">
                  {card.registered_count ? copy.hub.registered(card.registered_count) : ''}
                  {card.registered_count && card.slots_available != null ? ' · ' : ''}
                  {card.slots_available != null ? copy.hub.slots(card.slots_available) : ''}
                </p>
              )}
              {card.state.primary_action && (loginNeeded
                ? <button type="button" onClick={() => setLoginFor(card.mock.slug)} className="mt-3 inline-flex min-h-11 items-center rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-800">{ACTION_LABEL.login}</button>
                : href && <Link to={href} className="mt-3 inline-flex min-h-11 items-center rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-800 hover:border-emerald-700">{ACTION_LABEL[card.state.primary_action]}</Link>)}
            </article>
          )
        })}
      </div>

      {cards && cards.length > 4 && <Link to="/account/mpt" className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-emerald-800 underline-offset-4 hover:underline">{copy.hub.moreUpcoming}</Link>}

      {loginFor && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4" onClick={() => setLoginFor(null)}>
          <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="mpt-login-title" onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => { if (event.key === 'Escape') setLoginFor(null) }}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl outline-none">
            <h2 id="mpt-login-title" className="text-xl font-bold text-slate-950">{copy.hub.loginTitle}</h2>
            <p className="mt-2 text-sm text-slate-700">{copy.hub.loginBody}</p>
            <div className="mt-5 flex flex-col gap-2">
              <Link to={`/account?mode=create&returnTo=${encodeURIComponent(applyPath(loginFor))}`} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-emerald-900 px-5 font-bold text-white">{copy.hub.createAccount}</Link>
              <Link to={`/account?returnTo=${encodeURIComponent(applyPath(loginFor))}`} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-800">{copy.hub.haveAccount}</Link>
              <button type="button" onClick={() => setLoginFor(null)} className="min-h-11 text-sm text-slate-500">Close</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
