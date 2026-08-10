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
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-10">
        <div className="grid gap-6 md:grid-cols-2">
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
            <div className="mt-3 flex flex-wrap gap-1.5">
              {sadia.credentials.map((c) => (
                <span key={c} className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
                  <Award className="h-3 w-3" /> {c}
                </span>
              ))}
            </div>
            <div className="mt-4">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Her optional subjects in CSS</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {sadia.optionalSubjects.map((s) => (
                  <span key={s} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-900">{s}</span>
                ))}
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Services</p>
              <ul className="mt-1.5 grid gap-x-4 gap-y-1 text-sm text-foreground/85 sm:grid-cols-2">
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
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Areas of specialisation</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {(ali.specialisations ?? []).map((s) => (
                  <span key={s} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900">{s}</span>
                ))}
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Also provides</p>
              <ul className="mt-1.5 space-y-1 text-sm text-foreground/85">
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
    <div className="overflow-hidden rounded-xl border bg-white transition-shadow hover:shadow-md">
      <div className="flex flex-col items-center p-6 text-center">
        <div className="w-44 overflow-hidden rounded-xl">
          <img src={finalPhoto} alt={finalName} className="aspect-[4/5] w-full object-cover" />
        </div>
        <h2 className="mt-4 font-display text-xl font-bold text-pine">{finalName}</h2>
        <p className="mt-0.5 text-sm font-semibold text-emerald-800">{finalRole}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{finalBio}</p>
      </div>
      <div className="px-6 pb-2 text-left">{children}</div>
      <div className="flex gap-2 p-6 pt-3">
        <a
          href={waLink(finalWa, message)}
          target="_blank" rel="noopener noreferrer"
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-md bg-emerald-600 text-sm font-bold text-white hover:bg-emerald-700"
        >
          <MessageCircle className="h-4 w-4" /> WhatsApp - {finalWaDisplay}
        </a>
        <a
          href={instagram}
          target="_blank" rel="noopener noreferrer"
          className="flex h-11 items-center justify-center gap-2 rounded-md bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 px-4 text-sm font-bold text-white hover:opacity-90"
          aria-label={`${finalName} on Instagram`}
        >
          <Instagram className="h-4 w-4" /> Instagram
        </a>
      </div>
    </div>
  )
}
