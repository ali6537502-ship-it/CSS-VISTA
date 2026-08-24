import { Award, Instagram, MessageCircle, Users } from 'lucide-react'
import { PageHeader } from '@/components/shared'
import { mentors, site, waLink } from '@/data/site'
import { getMentorOverride } from '@/lib/admin'

export default function Mentors() {
  const [sadia, ali] = mentors

  return (
    <div>
      <PageHeader
        title="Mentors & Contact"
        description="A CSS position holder for complete mentorship, and an advocate-mentor for subject specialisation and notes. Contact either mentor directly on WhatsApp or Instagram."
      />
      <div className="mx-auto max-w-5xl space-y-6 px-2 py-6 sm:px-4 sm:py-10">
        <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:gap-6">
          {/* Miss Sadia Zahoor, PAS */}
          <MentorCard
            id={sadia.id}
            photo={sadia.photo}
            name={sadia.name}
            role={sadia.role}
            bio={sadia.bio}
            whatsapp={sadia.whatsapp}
            whatsappDisplay={sadia.whatsappDisplay}
            message={sadia.message}
            instagram={sadia.instagram}
          >
            <div className="mt-3 flex flex-wrap gap-1 sm:gap-1.5">
              {sadia.credentials.map((c) => (
                <span key={c} className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[9px] font-semibold text-amber-900 sm:px-3 sm:text-xs">
                  <Award className="h-3 w-3" /> {c}
                </span>
              ))}
            </div>
            <div className="mt-4">
              <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground sm:text-xs">Her optional subjects in CSS</p>
              <div className="mt-1.5 flex flex-wrap gap-1 sm:gap-1.5">
                {sadia.optionalSubjects.map((s) => (
                  <span key={s} className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-medium text-emerald-900 sm:px-3 sm:text-xs">{s}</span>
                ))}
              </div>
            </div>
            <div className="mt-4">
              <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground sm:text-xs">Services</p>
              <ul className="mt-1.5 grid gap-x-4 gap-y-1 text-[10px] leading-relaxed text-foreground/85 sm:text-sm lg:grid-cols-2">
                {sadia.services.map((s) => <li key={s}>· {s}</li>)}
              </ul>
            </div>
          </MentorCard>

          {/* Sir Ali Hassan Sargana */}
          <MentorCard
            id={ali.id}
            photo={ali.photo}
            name={ali.name}
            role={ali.role}
            bio={ali.bio}
            whatsapp={ali.whatsapp}
            whatsappDisplay={ali.whatsappDisplay}
            message={ali.message}
            instagram={ali.instagram}
          >
            <div className="mt-4">
              <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground sm:text-xs">Areas of specialisation</p>
              <div className="mt-1.5 flex flex-wrap gap-1 sm:gap-1.5">
                {(ali.specialisations ?? []).map((s) => (
                  <span key={s} className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-semibold text-emerald-900 sm:px-3 sm:text-xs">{s}</span>
                ))}
              </div>
            </div>
            <div className="mt-4">
              <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground sm:text-xs">Also provides</p>
              <ul className="mt-1.5 space-y-1 text-[10px] leading-relaxed text-foreground/85 sm:text-sm">
                {ali.services.slice(4).map((s) => <li key={s}>· {s}</li>)}
              </ul>
            </div>
          </MentorCard>
        </div>

        {/* WhatsApp group */}
        <div className="rounded-xl border bg-gradient-to-r from-emerald-950 to-pine p-6 text-emerald-50">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3">
              <Users className="mt-0.5 h-6 w-6 shrink-0 text-emerald-300" />
              <div>
                <h2 className="font-display text-lg font-bold">CSS Vista WhatsApp Community</h2>
                <p className="mt-1 text-sm text-emerald-100/90">
                  Announcements, test-series updates, new opinions and preparation discussion - join the official group.
                </p>
              </div>
            </div>
            <a
              href={site.cssGroupLink}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex h-11 shrink-0 items-center gap-2 rounded-md bg-emerald-400 px-5 text-sm font-bold text-emerald-950 hover:bg-emerald-300"
            >
              <MessageCircle className="h-4 w-4" /> Join the group
            </a>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Contact details are shared publicly by the mentors for aspirants. Please message respectfully and during working hours.
        </p>
      </div>
    </div>
  )
}

function MentorCard({
  id, photo, name, role, bio, whatsapp, whatsappDisplay, message, instagram, children,
}: {
  id: string
  photo: string
  name: string
  role: string
  bio: string
  whatsapp: string
  whatsappDisplay: string
  message: string
  instagram: string
  children: React.ReactNode
}) {
  const o = getMentorOverride(id)
  const finalName = o?.name ?? name
  const finalRole = o?.role ?? role
  const finalBio = o?.bio ?? bio
  const finalPhoto = o?.photoData ?? photo
  const finalWa = o?.whatsapp ?? whatsapp
  const finalWaDisplay = o?.whatsapp ? o.whatsapp.replace(/^92/, '0') : whatsappDisplay

  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden rounded-xl border bg-white transition-shadow hover:shadow-md">
      <div className="flex flex-col items-center p-2.5 text-center sm:p-4 lg:p-6">
        <div className="w-full max-w-44 overflow-hidden rounded-lg sm:rounded-xl">
          <img src={finalPhoto} alt={finalName} className="aspect-[4/5] w-full object-cover" />
        </div>
        <h2 className="mt-3 font-display text-sm font-bold leading-tight text-pine sm:mt-4 sm:text-lg lg:text-xl">{finalName}</h2>
        <p className="mt-1 text-[10px] font-semibold leading-tight text-emerald-800 sm:text-sm">{finalRole}</p>
        <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground sm:text-sm">{finalBio}</p>
      </div>
      <div className="flex-1 px-2.5 pb-2 text-left sm:px-4 lg:px-6">{children}</div>
      <div className="flex flex-col gap-2 p-2.5 pt-3 sm:p-4 sm:pt-3 lg:flex-row lg:p-6 lg:pt-3">
        <a
          href={waLink(finalWa, message)}
          target="_blank" rel="noopener noreferrer"
          className="flex h-10 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-2 text-[10px] font-bold text-white hover:bg-emerald-700 sm:text-sm"
        >
          <MessageCircle className="h-4 w-4 shrink-0" /> WhatsApp <span className="hidden lg:inline">- {finalWaDisplay}</span>
        </a>
        <a
          href={instagram}
          target="_blank" rel="noopener noreferrer"
          className="flex h-10 items-center justify-center gap-1.5 rounded-md bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 px-2 text-[10px] font-bold text-white hover:opacity-90 sm:text-sm lg:px-4"
          aria-label={`${finalName} on Instagram`}
        >
          <Instagram className="h-4 w-4" /> Instagram
        </a>
      </div>
    </div>
  )
}
