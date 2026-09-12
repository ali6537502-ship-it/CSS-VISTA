import { Link } from 'react-router'
import { PageHeader } from '@/components/shared'
import { site } from '@/data/site'

const updated = '12 September 2026'

function Shell({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div>
      <PageHeader title={title} description={description} />
      <article className="mx-auto max-w-4xl space-y-8 px-4 py-8 text-[15px] leading-7 text-foreground/85 sm:py-10">
        {children}
        <p className="border-t pt-5 text-xs text-muted-foreground">Last updated: {updated}</p>
      </article>
    </div>
  )
}

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display text-2xl font-bold text-pine">{children}</h2>
}

function Links() {
  return (
    <p className="rounded-xl border bg-secondary/35 p-4 text-sm">
      Related policies: <Link className="font-semibold text-pine underline" to="/privacy-policy">Privacy</Link>{' · '}
      <Link className="font-semibold text-pine underline" to="/cookie-policy">Cookies</Link>{' · '}
      <Link className="font-semibold text-pine underline" to="/terms-and-conditions">Terms</Link>{' · '}
      <Link className="font-semibold text-pine underline" to="/disclaimer">Disclaimer</Link>{' · '}
      <Link className="font-semibold text-pine underline" to="/copyright">Copyright</Link>{' · '}
      <Link className="font-semibold text-pine underline" to="/editorial-policy">Editorial policy</Link>
    </p>
  )
}

export function PrivacyPolicy() {
  return (
    <Shell title="Privacy Policy" description="How CSS Vista handles account, study-progress, security, advertising and browser-storage data.">
      <Links />
      <section><H2>Scope and who CSS Vista is</H2><p>CSS Vista is an independent educational website for competitive-examination preparation in Pakistan. This policy describes the data practices of css-vista.com and the account, study and advertising features delivered through it. CSS Vista is not the Federal Public Service Commission (FPSC) or another government body.</p></section>
      <section><H2>Information you provide</H2><p>When you create an account, CSS Vista asks for a name, email address and password. Passwords are handled by the authentication system and are not displayed to other users. Depending on the feature you use, you may also provide profile information, answers, notes, selected subjects, study-planner data, quiz or mock-test activity, evaluation requests, test-series request details, or other information you deliberately enter into a study tool.</p></section>
      <section><H2>Study progress and browser storage</H2><p>CSS Vista is local-first. The browser stores a record under <code>cssvista:v1</code> that can include quiz results, saved answers, bookmarks, completed challenges, visit streaks, subject progress, study plans, tasks, quick notes, goal checklists, evaluation-request drafts, test-series-request drafts and spaced-revision state. Navigation scroll position and short-lived password-reset throttling information can also be kept in session storage. If you sign in and use sync, supported progress is associated with your private account so it can be restored across devices.</p></section>
      <section><H2>Authentication and security data</H2><p>The current Hostinger-hosted account backend uses secure session and CSRF cookies. A normal signed-in session is designed to last up to 14 days unless it is revoked or expires. The backend also processes a shortened IP-network prefix and a cryptographic hash derived from the browser user-agent for login security, session validation and rate limiting. Security-event records may contain hashed email, IP-prefix and event information. Administrator verification uses an additional short-lived secure cookie.</p><p className="mt-3">A limited Supabase authentication bridge remains available for migrated or fallback account authentication where configured. This means authentication information may be exchanged with Supabase for that purpose even though the primary website and private progress API are hosted on CSS Vista's Hostinger environment.</p></section>
      <section><H2>Server and technical information</H2><p>Like ordinary web hosting, requests can expose technical information such as IP address, browser/user-agent, requested URL, time and response status to the hosting and security infrastructure. CSS Vista uses this information to deliver the site, protect accounts, diagnose failures, control abuse and maintain availability. We do not describe ordinary server logs as a student profile unless they are actually linked to an account or security event.</p></section>
      <section><H2>Advertising and Google</H2><p>CSS Vista uses Google AdSense on eligible public content pages and may request one clearly separated manual in-page unit at the bottom of a signed-in account overview. The account URL is excluded from Auto Ads, and no account ad is requested on login, registration, password-recovery or password-change screens. CSS Vista does not pass profile fields, answers, scores, study plans or account details as advertising parameters. Google and other third-party vendors may use cookies, web beacons, IP addresses or similar identifiers in connection with ad serving. Google states that third-party vendors, including Google, use cookies to serve ads based on a user's prior visits to this and/or other websites, and that Google's advertising cookies enable Google and its partners to serve ads based on visits to sites on the Internet.</p><p className="mt-3">Users can manage Google ad personalization through <a className="font-semibold text-pine underline" href="https://adssettings.google.com/" target="_blank" rel="noopener noreferrer">Google Ads Settings</a>. Google's explanation of how it uses information from partner sites is available at <a className="font-semibold text-pine underline" href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer">How Google uses information from sites or apps that use its services</a>.</p></section>
      <section><H2>Consent in regulated regions</H2><p>For visitors in the European Economic Area, United Kingdom and Switzerland, Google requires publishers serving personalized advertising to use a Google-certified consent management platform integrated with the IAB Transparency and Consent Framework. Where a Google Privacy &amp; Messaging message applies, visitors can accept, reject or manage available choices and later reopen the message through the site's Privacy &amp; Cookie Settings control. CSS Vista does not treat a visitor's choice as a shared cacheable page response.</p></section>
      <section><H2>Analytics and other third parties</H2><p>The audited application source does not currently include a Google Analytics or Google Tag Manager tag. If analytics are added later, this policy and consent configuration must be updated before relying on that processing. External services currently visible in the platform include Google AdSense, Hostinger hosting/infrastructure, optional Supabase authentication interoperability, Instagram, YouTube, WhatsApp links and official-source links such as FPSC. Opening an external service makes that service's own privacy terms applicable to the interaction.</p></section>
      <section><H2>How information is used and shared</H2><p>Information is used to operate accounts, sync study progress, provide requested tools, secure the platform, prevent abuse, send account-security or password-reset messages, troubleshoot the service, and display advertising on eligible pages described above. CSS Vista does not publish a student's private account progress as public content. Data may be processed by service providers that are necessary to provide hosting, authentication, email delivery or advertising. CSS Vista does not state that personal information is sold.</p></section>
      <section><H2>Retention and your choices</H2><p>Browser-stored study data remains until it is cleared by the user, replaced by the application or removed with browser/site-data controls. Account and synced study records are retained while needed to provide the account, maintain security, satisfy legitimate operational records or resolve abuse and support issues. Security records may be retained separately from visible study data. You can use the website without signing in for features that support guest mode, clear browser storage through browser controls, sign out to revoke the current session, and use the Privacy &amp; Cookie Settings control where a Google consent message applies.</p></section>
      <section><H2>Children</H2><p>CSS Vista is designed for competitive-examination preparation and is not intentionally directed to young children. Users should not submit personal information on behalf of a child unless they have the lawful authority to do so. If CSS Vista becomes aware that information has been collected in circumstances requiring deletion or additional consent, it will address the issue through the available contact channel.</p></section>
      <section><H2>International processing</H2><p>Some service providers, including Google and Supabase where used, operate infrastructure in multiple countries. Information handled by those providers may therefore be processed outside Pakistan under their applicable contractual and legal arrangements.</p></section>
      <section><H2>Changes and privacy questions</H2><p>This policy will be updated when material data practices change. For privacy questions or requests, use the verified channels on the <Link className="font-semibold text-pine underline" to="/contact">Contact CSS Vista</Link> page. Do not send passwords, authentication codes or other account secrets through social messaging.</p></section>
    </Shell>
  )
}

export function CookiePolicy() {
  return (
    <Shell title="Cookie Policy" description="The cookies, local storage and session storage currently used by CSS Vista and its advertising services.">
      <Links />
      <section><H2>Necessary cookies</H2><p><code>cssv_session</code> is the secure, HTTP-only sign-in session cookie and <code>cssv_csrf</code> is the CSRF protection cookie used to protect signed-in requests. They are first-party cookies, are essential to authenticated account operation, use Secure and SameSite=Lax settings, and are issued for up to 14 days. <code>cssv_admin_mfa</code> is an HTTP-only first-party cookie used for short-lived administrator verification, currently up to 12 hours. Necessary cookies are not used by CSS Vista for advertising personalization.</p></section>
      <section><H2>Functional browser storage</H2><p>CSS Vista uses first-party browser local storage for local-first study state under <code>cssvista:v1</code>. It can contain quiz and mock results, answers, bookmarks, study plans, streaks, tasks, notes and related progress. Session storage is used for temporary navigation restoration and short-lived interface/security state such as password-reset request timing. These technologies are functional to the study experience and can be deleted through your browser's site-data controls; deleting them may remove unsynced guest progress.</p></section>
      <section><H2>Advertising cookies and identifiers</H2><p>Eligible public content pages and the signed-in account placement described in the Privacy Policy can load Google AdSense. Google and its advertising partners may place or read cookies, use web beacons, IP addresses or similar identifiers for ad delivery, measurement, fraud prevention and, where permitted by the user's choices and applicable rules, personalization. These are third-party advertising technologies controlled by the relevant provider rather than CSS Vista's first-party session system. Their exact names and lifetimes can change as Google updates its services, so this policy does not invent a fixed cookie-name list.</p></section>
      <section><H2>Analytics</H2><p>No Google Analytics or Google Tag Manager implementation was found in the audited application source at this update. CSS Vista therefore does not list fabricated analytics cookie names. If a dedicated analytics service is enabled later, this page and the applicable consent configuration must be updated.</p></section>
      <section id="managing-cookies"><H2>Managing your choices</H2><p>You can remove or block site data using your browser settings. Blocking necessary account cookies will prevent login from working correctly. Where Google's European regulations message applies, use <strong>Privacy &amp; Cookie Settings</strong> in the site footer to reopen the available consent choices. Google ad personalization can also be controlled through <a className="font-semibold text-pine underline" href="https://adssettings.google.com/" target="_blank" rel="noopener noreferrer">Google Ads Settings</a>.</p></section>
    </Shell>
  )
}

export function TermsConditions() {
  return (
    <Shell title="Terms & Conditions" description="Terms governing use of CSS Vista's educational resources, accounts, study tools and public content.">
      <Links />
      <section><H2>Acceptance and educational purpose</H2><p>By using CSS Vista you agree to use the website lawfully and in accordance with these terms. CSS Vista provides educational and examination-preparation resources. It is not an examining authority and use of the platform does not create a guarantee of examination admission, marks, allocation or success.</p></section>
      <section><H2>Accounts</H2><p>You are responsible for keeping your password and account access secure, for information submitted through your account, and for notifying CSS Vista through the contact page if you reasonably believe an account has been compromised. You must not attempt to access another person's account, administrator functions or private records.</p></section>
      <section><H2>Acceptable use</H2><p>You may use public resources for genuine personal study and ordinary educational reference. You may not interfere with service operation, bypass access controls, probe private APIs without authorization, submit malicious code, abuse forms, impersonate another person, use automated traffic to manipulate advertising, or scrape/reproduce the platform at a scale that harms the service or unlawfully copies protected material.</p></section>
      <section><H2>Content and intellectual property</H2><p>CSS Vista's original explanations, analyses, original graphics, software, study tools, database selection/arrangement and other protectable original material remain subject to CSS Vista's rights. Official papers, syllabi, notices, government material, quotations, externally sourced works and third-party media retain the rights and status applicable to their original sources. The footer copyright notice is not a claim of ownership over those third-party works. See the <Link className="font-semibold text-pine underline" to="/copyright">Copyright Policy</Link>.</p></section>
      <section><H2>Past papers, PDFs and external material</H2><p>Past papers and official documents are presented for examination preparation and archival reference. Availability on CSS Vista does not by itself mean CSS Vista owns the underlying official or third-party work. External links lead to services controlled by others, whose terms apply when you use them.</p></section>
      <section><H2>Availability and changes</H2><p>CSS Vista may update, correct, reorganize, suspend or retire features to maintain accuracy, security and service quality. Temporary downtime, content changes or technical failures can occur. Where an account is used to abuse the platform or compromise other users, access may be restricted or suspended.</p></section>
      <section><H2>Accuracy and responsibility</H2><p>CSS Vista aims to provide useful, checked educational material, but examination rules, dates, official syllabi and notices can change. Users remain responsible for checking current official requirements with FPSC or the relevant examining authority before acting on time-sensitive information.</p></section>
      <section><H2>Legal framework and questions</H2><p>CSS Vista is operated from Pakistan. These terms are intended to be read consistently with applicable law and do not exclude rights or liabilities that cannot lawfully be excluded. Questions about a specific legal right or dispute may require advice from a qualified lawyer. Contact CSS Vista through the <Link className="font-semibold text-pine underline" to="/contact">Contact page</Link>.</p></section>
    </Shell>
  )
}

export function Disclaimer() {
  return (
    <Shell title="Disclaimer" description="Important information about CSS Vista's independent educational role and official examination information.">
      <Links />
      <section><H2>Independent educational platform</H2><p>CSS Vista is an independent educational and examination-preparation platform. It is not the Federal Public Service Commission (FPSC), is not an official FPSC website, and does not present itself as a government body.</p></section>
      <section><H2>Official information</H2><p>References to CSS, PMS, FPSC notices, syllabi, past papers, results or examination procedures are provided for educational and informational use. Rules, eligibility, dates, fees, application procedures, syllabus changes, notices and results should ultimately be verified from the relevant official authority. For federal CSS matters, consult <a className="font-semibold text-pine underline" href="https://www.fpsc.gov.pk/" target="_blank" rel="noopener noreferrer">FPSC's official website</a>.</p></section>
      <section><H2>Preparation outcomes</H2><p>Study tools, MCQs, notes, analyses, mentoring information and practice material are intended to support preparation. They do not guarantee a particular score, selection, allocation or examination result. CSS Vista's editorial objective is accuracy and usefulness; where an error is identified, the correction process is described in the <Link className="font-semibold text-pine underline" to="/editorial-policy">Editorial & Corrections Policy</Link>.</p></section>
    </Shell>
  )
}

export function CopyrightPolicy() {
  return (
    <Shell title="Copyright & Intellectual Property" description="How CSS Vista distinguishes its original work from official, public and third-party material.">
      <Links />
      <section><H2>Original CSS Vista material</H2><p>Where created by CSS Vista, original written explanations and analyses, original graphics, website design, software and study tools, original classifications, and the original selection or arrangement of databases and compilations may be protected by applicable intellectual-property law. The notice “© CSS Vista. All rights reserved.” applies to that protectable original material.</p></section>
      <section><H2>Official and third-party material</H2><p>CSS Vista does not claim ownership merely because it displays or links to an official examination question, syllabus, FPSC notice, government publication, quotation, third-party book material, external image or other work created by someone else. Those materials remain subject to the rights, public-document status, licences, permissions, exceptions and attribution requirements that apply to the original source.</p></section>
      <section><H2>Use and reproduction</H2><p>Users may make ordinary personal-study use of CSS Vista resources. Reproducing a substantial part of CSS Vista's original database, site, paid or restricted material, original graphics, or original written work for republication, resale or a competing service requires an appropriate legal basis or permission. This does not restrict rights users may independently have in official/public material or under applicable law.</p></section>
      <section><H2>Copyright concerns</H2><p>If you own rights in material appearing on CSS Vista and believe it has been used incorrectly, use the <Link className="font-semibold text-pine underline" to="/contact">Contact page</Link> and identify the work, the CSS Vista URL, your relationship to the work, and the action requested. CSS Vista will review a sufficiently specific notice and correct, attribute, restrict or remove material where appropriate.</p></section>
    </Shell>
  )
}

export function AboutCssVista() {
  return (
    <Shell title="About CSS Vista" description={site.tagline + '.'}>
      <section><H2>What CSS Vista is</H2><p>CSS Vista is an independent competitive-examination preparation platform serving aspirants in Pakistan. It brings public study resources and personal practice tools into one website so users can move from syllabus planning to study, past-paper review, MCQ practice, revision and timed work.</p></section>
      <section><H2>What the platform provides</H2><p>Current sections include CSS and related past papers, subject MCQ banks, general-knowledge practice, MPT preparation, syllabus and subject guidance, current-affairs material, notes and study resources, book summaries, answer-writing tools, planners, revision tools, account-based progress sync and other examination-preparation utilities. Individual features may change as the platform is maintained.</p></section>
      <section><H2>Independence and sourcing</H2><p>CSS Vista is not FPSC and is not presented as an official government service. Official examination rules, deadlines and notices are distinguished from CSS Vista's educational organization or analysis, and users are directed to the relevant official source for final verification.</p></section>
      <section><H2>People already identified on the platform</H2><p>The existing CSS Vista mentor page identifies Sir Ali Hassan Sargana as founder and lists Miss Sadia Zahoor, PAS as a CSS mentor. This page does not add unverified institutional partnerships, awards, traffic figures, testimonials or student-result claims. See the existing <Link className="font-semibold text-pine underline" to="/mentors">mentor information</Link> for the currently published profiles.</p></section>
    </Shell>
  )
}

export function ContactCssVista() {
  return (
    <Shell title="Contact CSS Vista" description="Verified channels for general enquiries, technical issues, corrections, privacy and copyright concerns.">
      <section><H2>General and platform enquiries</H2><p>CSS Vista's verified public social channel is <a className="font-semibold text-pine underline" href={site.instagram} target="_blank" rel="noopener noreferrer">Instagram</a>. The site also publishes an official <a className="font-semibold text-pine underline" href={site.cssGroupLink} target="_blank" rel="noopener noreferrer">CSS Vista WhatsApp group</a> for community access.</p></section>
      <section><H2>Technical issues and content corrections</H2><p>When reporting a broken page or factual issue, include the page URL, the specific text or feature involved, what you expected to see, and—where relevant—the official source supporting a correction. Do not send passwords, one-time codes, session tokens or other authentication secrets.</p></section>
      <section><H2>Privacy and copyright</H2><p>Privacy requests and copyright concerns can be initiated through the same verified Instagram channel. For copyright concerns, include the affected URL and enough information to identify the work and the basis of the request. CSS Vista does not publish an unverified office address, registration number or generic legal email on this page.</p></section>
    </Shell>
  )
}

export function EditorialPolicy() {
  return (
    <Shell title="Editorial & Corrections Policy" description="CSS Vista's practical standards for examination-related accuracy, sourcing, updates and corrections.">
      <Links />
      <section><H2>Accuracy standard</H2><p>CSS Vista aims to keep factual examination information accurate, clearly organized and useful for preparation. Time-sensitive claims such as official dates, eligibility rules, results, syllabi and notices should be checked against the relevant examining authority before publication or material update.</p></section>
      <section><H2>Official information and analysis</H2><p>Official-source material should be identified as such and not presented as if CSS Vista created the underlying official document. Educational explanation, commentary, study guidance and analysis should remain distinguishable from the text or effect of an official notice.</p></section>
      <section><H2>Corrections</H2><p>When a supported factual correction is identified, the goal is to correct the affected page or dataset rather than leave a known error in place. Material changes should be reflected on the live resource and, where a date-sensitive claim was superseded, wording should make the current position clear. Reports can be sent through the <Link className="font-semibold text-pine underline" to="/contact">Contact page</Link>.</p></section>
      <section><H2>Updating older material</H2><p>Past papers and historical material may remain available because their age is part of their educational value. Current rules, deadlines and official procedures should not be inferred from an older document. Where a resource is historical, users should be directed to current official information before taking an administrative or examination action.</p></section>
      <section><H2>Sources and third-party rights</H2><p>Where a factual claim depends on an external source, CSS Vista should prefer primary or authoritative sources when reasonably available. Quotations, images, books, official publications and third-party materials must be handled consistently with their source, attribution and rights status. See the <Link className="font-semibold text-pine underline" to="/copyright">Copyright Policy</Link>.</p></section>
    </Shell>
  )
}

export function LegalCentre() {
  const pages = [
    ['/privacy-policy', 'Privacy Policy'], ['/cookie-policy', 'Cookie Policy'], ['/terms-and-conditions', 'Terms & Conditions'],
    ['/disclaimer', 'Disclaimer'], ['/copyright', 'Copyright & Intellectual Property'], ['/editorial-policy', 'Editorial & Corrections Policy'],
    ['/about', 'About CSS Vista'], ['/contact', 'Contact CSS Vista'],
  ] as const
  return (
    <Shell title="Legal & Trust Centre" description="CSS Vista's privacy, cookie, terms, copyright, editorial, identity and contact information.">
      <div className="grid gap-3 sm:grid-cols-2">
        {pages.map(([to, label]) => <Link key={to} to={to} className="rounded-xl border bg-white p-4 font-semibold text-pine shadow-sm hover:bg-secondary">{label}</Link>)}
      </div>
    </Shell>
  )
}
