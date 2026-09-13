import { useEffect, useState, type ReactNode } from 'react'
import { BookOpen, Search, Bookmark, FileText } from 'lucide-react'
import {
  GlassSurface, Button, Input, Select, Chip, Tabs, FilterBar, FilterSpacer,
  IconCapsule, Avatar, EmptyState, Skeleton,
} from '@/components/vista'

/* ---------------------------------------------------------------- contrast
   The Phase 1 DoD requires contrast measured against the composited
   background behind a glass surface, not against flat white. A translucent
   white panel over the canvas resolves to something slightly darker than
   white, so verifying against #FFF would overstate every ratio. */

function srgbToLinear(channel: number) {
  const c = channel / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

function luminance([r, g, b]: number[]) {
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b)
}

function hexToRgb(hex: string) {
  const h = hex.replace('#', '')
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16))
}

/** Composite an rgba white surface over an opaque backdrop. */
function composite(surfaceAlpha: number, backdrop: number[]) {
  return backdrop.map((c) => Math.round(255 * surfaceAlpha + c * (1 - surfaceAlpha)))
}

function contrast(fg: number[], bg: number[]) {
  const [a, b] = [luminance(fg), luminance(bg)].sort((x, y) => y - x)
  return (a + 0.05) / (b + 0.05)
}

const CANVAS = hexToRgb('#F9FBFA')

const INKS = [
  { name: '--cv-ink-900', hex: '#102C21', role: 'headings, primary fill' },
  { name: '--cv-ink-800', hex: '#1B3A2C', role: 'secondary heading' },
  { name: '--cv-ink-700', hex: '#3F4D47', role: 'body copy' },
  { name: '--cv-ink-500', hex: '#77837C', role: 'metadata, captions' },
  { name: '--cv-ink-400', hex: '#9AA5A0', role: 'placeholders, disabled' },
]

const TIERS = [
  { tier: 1 as const, alpha: 0.55, use: 'Feature panels, hero surfaces' },
  { tier: 2 as const, alpha: 0.68, use: 'Standard cards, gateway tiles' },
  { tier: 3 as const, alpha: 0.78, use: 'Dashboards, list rows' },
  { tier: 4 as const, alpha: 0.94, use: 'Notes, tables, mock questions' },
  { tier: 5 as const, alpha: 0.82, use: 'Header, menus, modals' },
]

const SWATCHES = [
  { group: 'Canvas', items: [
    ['--cv-white', '#FFFFFF'], ['--cv-canvas', '#F9FBFA'],
    ['--cv-icy', '#EFF4F1'], ['--cv-hairline', '#E0E7E3'],
  ] },
  { group: 'Ink', items: [
    ['--cv-ink-900', '#102C21'], ['--cv-ink-800', '#1B3A2C'],
    ['--cv-ink-700', '#3F4D47'], ['--cv-ink-500', '#77837C'], ['--cv-ink-400', '#9AA5A0'],
  ] },
  { group: 'Brand', items: [
    ['--cv-green-600', '#0F6B4A'], ['--cv-green-500', '#14855C'],
    ['--cv-green-050', '#E8F5EE'], ['--cv-gold-500', '#C79E23'],
  ] },
  { group: 'Informational', items: [
    ['--cv-blue-600', '#1B4DD8'], ['--cv-blue-500', '#3B74F0'], ['--cv-blue-050', '#EEF3FE'],
  ] },
  { group: 'Semantic', items: [
    ['--cv-good-600', '#0F8A5F'], ['--cv-warn-600', '#9A5B08'], ['--cv-bad-600', '#A33A2A'],
  ] },
]

const SPACING = ['1', '2', '3', '4', '5', '6', '8', '10', '12', '16', '20', '24', '32']
const RADII = ['sm', 'md', 'lg', 'xl', 'pill']

function Section({ id, title, blurb, children }: { id: string; title: string; blurb?: string; children: ReactNode }) {
  return (
    <section id={id} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--cv-s-4)', marginTop: 'var(--cv-s-16)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--cv-s-2)' }}>
        <h2 className="cv-head">{title}</h2>
        {blurb ? <p className="cv-body cv-body--sm cv-prose">{blurb}</p> : null}
      </div>
      {children}
    </section>
  )
}

function Row({ children }: { children: ReactNode }) {
  return <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--cv-s-3)', alignItems: 'center' }}>{children}</div>
}

export default function DesignSystem() {
  const [tab, setTab] = useState('all')
  const [blurSupported, setBlurSupported] = useState(true)

  useEffect(() => {
    document.title = 'Design System | CSS Vista'
    setBlurSupported(
      typeof CSS !== 'undefined' && typeof CSS.supports === 'function'
        ? CSS.supports('backdrop-filter', 'blur(1px)') || CSS.supports('-webkit-backdrop-filter', 'blur(1px)')
        : false,
    )
  }, [])

  return (
    <div style={{ background: 'var(--cv-canvas)', minHeight: '100vh', position: 'relative' }}>
      <div className="cv-atmosphere" />
      <div style={{ position: 'relative', maxWidth: '1080px', margin: '0 auto', paddingInline: 'var(--cv-s-5)', paddingBlock: 'var(--cv-s-16) var(--cv-s-24)' }}>

        <header style={{ display: 'flex', flexDirection: 'column', gap: 'var(--cv-s-3)' }}>
          <p className="cv-label">Phase 1 · Tokens &amp; primitives</p>
          <h1 className="cv-title">CSS Vista Design System</h1>
          <p className="cv-body cv-body--lg cv-prose">
            Every colour, surface, control and state in the new system. Nothing on this page
            is styled directly — it all resolves to tokens in <code>src/styles/tokens.css</code>,
            which is the only file that defines a design value.
          </p>
          <Row>
            <Chip tone="brand">Palette B · Field</Chip>
            <Chip tone="neutral">Alata · Sansation · Commissioner</Chip>
            <Chip tone={blurSupported ? 'good' : 'warn'}>
              {blurSupported ? 'backdrop-filter supported' : 'backdrop-filter fallback active'}
            </Chip>
          </Row>
        </header>

        {/* ------------------------------------------------------ typography */}
        <Section
          id="type"
          title="Typography"
          blurb="Three faces, three jobs. Alata ships one weight and is used for page titles only — it is never set bold, because the browser would synthesise it and smear the outlines. Sansation carries section headings and labels at a true 700 and supplies the only real italics. Commissioner carries reading."
        >
          <GlassSurface tier={4} style={{ padding: 'var(--cv-s-6)', display: 'flex', flexDirection: 'column', gap: 'var(--cv-s-5)' }}>
            <div>
              <p className="cv-label">Alata 400 · page title</p>
              <p className="cv-title" style={{ marginTop: 'var(--cv-s-2)' }}>Every CSS paper, organised</p>
            </div>
            <div>
              <p className="cv-label">Sansation 700 · section heading</p>
              <p className="cv-head" style={{ marginTop: 'var(--cv-s-2)' }}>English Précis &amp; Composition</p>
            </div>
            <div>
              <p className="cv-label">Sansation 700 · label</p>
            </div>
            <div>
              <p className="cv-label">Commissioner 350 · reading</p>
              <p className="cv-body cv-prose" style={{ marginTop: 'var(--cv-s-2)' }}>
                Commissioner was drawn for long text on screen, so it holds up across a full
                notes page without tiring the eye. It runs 200 to 700, which covers body copy,
                emphasis and the tabular figures used for counts.
              </p>
            </div>
            <div>
              <p className="cv-label">Sansation 300 italic · caption</p>
              <p className="cv-caption" style={{ marginTop: 'var(--cv-s-2)' }}>Source: FPSC examination papers, 2024.</p>
            </div>
            <div>
              <p className="cv-label">Noto Nastaliq Urdu · preserved</p>
              <p className="cv-urdu" style={{ marginTop: 'var(--cv-s-2)', fontSize: 'var(--cv-body-lg)' }}>سی ایس ایس کی تیاری</p>
            </div>
          </GlassSurface>
        </Section>

        {/* ---------------------------------------------------------- colour */}
        <Section id="colour" title="Colour" blurb="Green leads. Blue is informational only and must never become a second brand colour. Gold is reserved for featured and award markers.">
          {SWATCHES.map((group) => (
            <div key={group.group} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--cv-s-2)' }}>
              <p className="cv-head cv-head--h4">{group.group}</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 'var(--cv-s-3)' }}>
                {group.items.map(([name, hex]) => (
                  <GlassSurface key={name} tier={4} radius="sm" style={{ overflow: 'hidden' }}>
                    <div style={{ background: hex, height: 'var(--cv-s-12)', borderBottom: 'var(--cv-border-fine)' }} />
                    <div style={{ padding: 'var(--cv-s-3)' }}>
                      <p className="cv-body cv-body--sm" style={{ fontFamily: 'var(--cv-font-body)', color: 'var(--cv-ink-900)' }}>{hex}</p>
                      <p className="cv-caption" style={{ fontStyle: 'normal' }}>{name}</p>
                    </div>
                  </GlassSurface>
                ))}
              </div>
            </div>
          ))}
        </Section>

        {/* -------------------------------------------------------- contrast */}
        <Section
          id="contrast"
          title="Contrast, measured on composited backgrounds"
          blurb="Each ratio below is computed against the actual colour behind the glass — the tier's white alpha composited over the canvas — not against flat white, which would overstate every figure. Body text must clear 4.5:1."
        >
          <GlassSurface tier={4} style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--cv-font-body)', fontSize: 'var(--cv-small)', minWidth: '520px' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: 'var(--cv-s-3)', borderBottom: 'var(--cv-border-fine)' }} className="cv-field-label">Ink</th>
                  {TIERS.map((t) => (
                    <th key={t.tier} style={{ textAlign: 'left', padding: 'var(--cv-s-3)', borderBottom: 'var(--cv-border-fine)' }} className="cv-field-label">T{t.tier}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {INKS.map((ink) => (
                  <tr key={ink.name}>
                    <td style={{ padding: 'var(--cv-s-3)', borderBottom: 'var(--cv-border-fine)', color: 'var(--cv-ink-900)' }}>
                      <div>{ink.hex}</div>
                      <div style={{ color: 'var(--cv-ink-500)', fontSize: 'var(--cv-meta)' }}>{ink.role}</div>
                    </td>
                    {TIERS.map((t) => {
                      const ratio = contrast(hexToRgb(ink.hex), composite(t.alpha, CANVAS))
                      const pass = ratio >= 4.5
                      return (
                        <td key={t.tier} style={{ padding: 'var(--cv-s-3)', borderBottom: 'var(--cv-border-fine)', fontVariantNumeric: 'tabular-nums' }}>
                          <span style={{ color: pass ? 'var(--cv-good-600)' : 'var(--cv-warn-600)' }}>
                            {ratio.toFixed(2)}
                          </span>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </GlassSurface>
          <p className="cv-caption">
            ink-400 is a placeholder and disabled colour only; it is not body text and is not
            required to clear 4.5:1.
          </p>
        </Section>

        {/* ----------------------------------------------------- glass tiers */}
        <Section
          id="tiers"
          title="Glass tiers"
          blurb="Opacity rises and blur falls as a surface moves from decorative to readable. Tiers 1, 2 and 5 composite a backdrop-filter — the budget is three per viewport, so anything that repeats in a list belongs on tier 3 or 4."
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 'var(--cv-s-4)' }}>
            {TIERS.map((t) => (
              <GlassSurface key={t.tier} tier={t.tier} style={{ padding: 'var(--cv-s-5)', display: 'flex', flexDirection: 'column', gap: 'var(--cv-s-2)' }}>
                <p className="cv-label">Tier {t.tier}</p>
                <p className="cv-head cv-head--h4">{String(Math.round(t.alpha * 100))}% white</p>
                <p className="cv-body cv-body--sm">{t.use}</p>
              </GlassSurface>
            ))}
          </div>
        </Section>

        {/* --------------------------------------------------------- buttons */}
        <Section id="buttons" title="Buttons" blurb="Not every action is a filled button. Tertiary exists so a surface can carry several actions without three competing fills.">
          <GlassSurface tier={4} style={{ padding: 'var(--cv-s-6)', display: 'flex', flexDirection: 'column', gap: 'var(--cv-s-5)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--cv-s-2)' }}>
              <p className="cv-field-label">Variants</p>
              <Row>
                <Button variant="primary">Start practising</Button>
                <Button variant="brand">Browse papers</Button>
                <Button variant="secondary">Search</Button>
                <Button variant="tertiary">View all subjects</Button>
              </Row>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--cv-s-2)' }}>
              <p className="cv-field-label">Disabled</p>
              <Row>
                <Button variant="primary" disabled>Start practising</Button>
                <Button variant="secondary" disabled>Search</Button>
              </Row>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--cv-s-2)' }}>
              <p className="cv-field-label">Square, for toolbars</p>
              <Row>
                <Button variant="secondary" square>Print</Button>
                <Button variant="secondary" square>Save</Button>
              </Row>
            </div>
            <p className="cv-caption">Tab to any button to see the focus ring. Hover lifts 1px; press sinks 1px with an inset shadow.</p>
          </GlassSurface>
        </Section>

        {/* ---------------------------------------------------------- inputs */}
        <Section id="inputs" title="Inputs" blurb="Font-size stays at 16px on mobile so iOS does not zoom the viewport on focus. Focus is a blue ring plus a border step-up.">
          <GlassSurface tier={4} style={{ padding: 'var(--cv-s-6)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 'var(--cv-s-5)' }}>
            <Input id="ds-search" label="Search" placeholder="Search subjects, topics, past papers…" />
            <Input id="ds-hint" label="Target attempt" placeholder="2027" hint="Used to work out your countdown." />
            <Input id="ds-error" label="Email" defaultValue="not-an-email" error="Enter an email address so we can send your sign-in link." />
            <Input id="ds-disabled" label="Roll number" placeholder="Assigned after registration" disabled />
            <Select id="ds-select" label="Subject" defaultValue="essay">
              <option value="essay">Essay</option>
              <option value="precis">English Précis &amp; Composition</option>
              <option value="gsa">General Science &amp; Ability</option>
              <option value="pak">Pakistan Affairs</option>
            </Select>
          </GlassSurface>
        </Section>

        {/* ----------------------------------------------------------- chips */}
        <Section id="chips" title="Chips" blurb="Semantic tone is separate from the brand accent. Gold marks featured or award items only.">
          <GlassSurface tier={4} style={{ padding: 'var(--cv-s-6)' }}>
            <Row>
              <Chip>782 papers</Chip>
              <Chip tone="brand">Free</Chip>
              <Chip tone="info">Updated weekly</Chip>
              <Chip tone="good">Verified</Chip>
              <Chip tone="warn">Draft</Chip>
              <Chip tone="bad">Withdrawn</Chip>
              <Chip tone="gold">Featured</Chip>
            </Row>
          </GlassSurface>
        </Section>

        {/* ------------------------------------------------ tabs & filterbar */}
        <Section id="nav" title="Tabs and filter bar">
          <GlassSurface tier={4} style={{ padding: 'var(--cv-s-6)', display: 'flex', flexDirection: 'column', gap: 'var(--cv-s-5)' }}>
            <Tabs
              aria-label="Paper type"
              value={tab}
              onChange={setTab}
              tabs={[
                { id: 'all', label: 'All papers' },
                { id: 'compulsory', label: 'Compulsory' },
                { id: 'optional', label: 'Optional' },
                { id: 'pms', label: 'PMS' },
              ]}
            />
            <FilterBar>
              <Chip tone="brand">CSS</Chip>
              <Chip>2024</Chip>
              <Chip>Compulsory</Chip>
              <FilterSpacer />
              <Button variant="tertiary">Clear all</Button>
            </FilterBar>
          </GlassSurface>
        </Section>

        {/* ------------------------------------------------ avatars, states */}
        <Section id="states" title="Avatars, capsules and states" blurb="Initials are the default avatar — a photo is optional and never part of onboarding, so the initials state has to look deliberate rather than like a fallback.">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--cv-s-4)' }}>
            <GlassSurface tier={4} style={{ padding: 'var(--cv-s-6)', display: 'flex', flexDirection: 'column', gap: 'var(--cv-s-4)' }}>
              <p className="cv-field-label">Avatar</p>
              <Row>
                <Avatar name="Ali Hassan" size="sm" />
                <Avatar name="Ali Hassan" />
                <Avatar name="Sadia Zahoor" size="lg" />
              </Row>
              <p className="cv-field-label">Icon capsule</p>
              <Row>
                <IconCapsule><BookOpen /></IconCapsule>
                <IconCapsule><Search /></IconCapsule>
                <IconCapsule><Bookmark /></IconCapsule>
                <IconCapsule small><FileText /></IconCapsule>
              </Row>
            </GlassSurface>

            <GlassSurface tier={4} style={{ padding: 'var(--cv-s-6)', display: 'flex', flexDirection: 'column', gap: 'var(--cv-s-4)' }}>
              <p className="cv-field-label">Loading</p>
              <Skeleton height="var(--cv-s-6)" width="60%" />
              <Skeleton height="var(--cv-s-4)" />
              <Skeleton height="var(--cv-s-4)" width="80%" />
            </GlassSurface>
          </div>

          <EmptyState
            icon={<Bookmark />}
            title="No attempts yet"
            body="Once you finish a mock, your score and weak areas appear here. Nothing is shown until there is something real to show."
            action={<Button variant="brand">Take a mock</Button>}
          />
        </Section>

        {/* -------------------------------------------------- scale & motion */}
        <Section id="scale" title="Spacing, radius and elevation">
          <GlassSurface tier={4} style={{ padding: 'var(--cv-s-6)', display: 'flex', flexDirection: 'column', gap: 'var(--cv-s-5)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--cv-s-2)' }}>
              <p className="cv-field-label">Spacing · 4px base</p>
              <div style={{ display: 'flex', gap: 'var(--cv-s-2)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                {SPACING.map((s) => (
                  <div key={s} style={{ textAlign: 'center' }}>
                    <div style={{ width: `var(--cv-s-${s})`, height: `var(--cv-s-${s})`, background: 'var(--cv-green-050)', border: 'var(--cv-border-fine)', borderRadius: 'var(--cv-r-sm)' }} />
                    <p className="cv-caption" style={{ fontStyle: 'normal' }}>{s}</p>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--cv-s-2)' }}>
              <p className="cv-field-label">Radius</p>
              <Row>
                {RADII.map((r) => (
                  <div key={r} style={{ textAlign: 'center' }}>
                    <div style={{ width: 'var(--cv-s-16)', height: 'var(--cv-s-10)', background: 'var(--cv-icy)', border: 'var(--cv-border-fine)', borderRadius: `var(--cv-r-${r})` }} />
                    <p className="cv-caption" style={{ fontStyle: 'normal' }}>{r}</p>
                  </div>
                ))}
              </Row>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--cv-s-2)' }}>
              <p className="cv-field-label">Elevation</p>
              <Row>
                {([1, 2, 3] as const).map((e) => (
                  <GlassSurface key={e} tier={4} elevation={e} style={{ padding: 'var(--cv-s-4) var(--cv-s-5)' }}>
                    <span className="cv-body cv-body--sm">shadow-{e}</span>
                  </GlassSurface>
                ))}
              </Row>
            </div>
          </GlassSurface>
        </Section>

        <footer style={{ marginTop: 'var(--cv-s-20)', paddingTop: 'var(--cv-s-5)', borderTop: 'var(--cv-border-fine)' }}>
          <p className="cv-caption">
            Preview route · noindex, nofollow · not in any sitemap · no existing page imports anything from this system yet.
          </p>
        </footer>

      </div>
    </div>
  )
}
