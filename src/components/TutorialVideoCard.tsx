import { ArrowUpRight, Play } from 'lucide-react'
import { CSS_VISTA_TUTORIAL_URL, CSS_VISTA_TUTORIAL_THUMBNAIL_URL } from '@/data/tutorialVideo'

type TutorialVideoCardProps = { className?: string }

export default function TutorialVideoCard({ className = '' }: TutorialVideoCardProps) {
  return (
    <section
      className={`overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-[#f3f8f4] shadow-sm ${className}`}
      aria-label="How to use CSS Vista tutorial"
    >
      <div className="grid sm:grid-cols-[minmax(0,290px)_minmax(0,1fr)]">
        <a
          href={CSS_VISTA_TUTORIAL_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Watch the CSS Vista website tutorial on YouTube (opens in a new tab)"
          className="group relative block overflow-hidden bg-slate-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-600"
        >
          <img
            src={CSS_VISTA_TUTORIAL_THUMBNAIL_URL}
            alt="Thumbnail for the CSS Vista website tutorial video"
            width={480}
            height={360}
            loading="lazy"
            decoding="async"
            className="aspect-video h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.035]"
          />
          <span
            className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/10 transition-colors group-hover:bg-black/20"
            aria-hidden="true"
          >
            <span className="grid h-14 w-14 place-items-center rounded-full bg-red-600 text-white shadow-xl sm:h-16 sm:w-16">
              <Play className="ml-1 h-7 w-7 fill-current" />
            </span>
          </span>
        </a>
        <div className="flex min-w-0 flex-col justify-center p-4 sm:p-6">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.13em] text-emerald-800">CSS Vista video tutorial</p>
          <h2 className="mt-2 text-xl font-bold leading-tight text-emerald-950 sm:text-2xl">New to CSS Vista? Start here.</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Watch the walkthrough to learn how to navigate the website and use its preparation tools.
          </p>
          <a
            href={CSS_VISTA_TUTORIAL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex min-h-11 w-fit items-center justify-center gap-2 rounded-xl bg-emerald-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500"
          >
            Watch the tutorial <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  )
}
