/**
 * The single source of the platform's policy prose.
 *
 * These pages previously existed only as React components, so the published
 * HTML for /privacy-policy and its siblings carried the generic landing
 * template while the actual policy text appeared only after the application
 * had run. Anything reading the page directly — an advertising or compliance
 * review, a crawler, a reader without scripting — never saw the policy at all.
 *
 * Both the React pages and the static prerender now render from this module,
 * so the policy a visitor reads and the policy a reviewer fetches cannot drift
 * apart. Paragraph values are trusted author-written HTML and are injected as
 * markup by both renderers; keep them free of untrusted input.
 */

export const LEGAL_UPDATED = '12 September 2026'

const INSTAGRAM_URL = 'https://www.instagram.com/cssvista?igsh=bmx0cWNiamJ5OTU4&utm_source=qr'
const WHATSAPP_GROUP_URL = 'https://chat.whatsapp.com/KkmMs8KS4wZ7Z39grDLZwT?s=cl&p=i&ilr=2&amv=2'
const LINK_CLASS = 'font-semibold text-pine underline'

const external = (href, label) => `<a class="${LINK_CLASS}" href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>`
const internal = (href, label) => `<a class="${LINK_CLASS}" href="${href}">${label}</a>`

/** Cross-links shown at the top of each policy document. */
export const RELATED_POLICY_LINKS = [
  ['/privacy-policy', 'Privacy'],
  ['/cookie-policy', 'Cookies'],
  ['/terms-and-conditions', 'Terms'],
  ['/disclaimer', 'Disclaimer'],
  ['/copyright', 'Copyright'],
  ['/editorial-policy', 'Editorial policy'],
]

export const LEGAL_PAGES = {
  '/privacy-policy': {
    title: 'Privacy Policy',
    description: 'How CSS Vista handles account, study-progress, security, advertising and browser-storage data.',
    showRelatedLinks: true,
    sections: [
      {
        heading: 'Scope and who CSS Vista is',
        paragraphs: ['CSS Vista is an independent educational website for competitive-examination preparation in Pakistan. This policy describes the data practices of css-vista.com and the account, study and advertising features delivered through it. CSS Vista is not the Federal Public Service Commission (FPSC) or another government body.'],
      },
      {
        heading: 'Information you provide',
        paragraphs: ['When you create an account, CSS Vista asks for a name, email address and password. Passwords are handled by the authentication system and are not displayed to other users. Depending on the feature you use, you may also provide profile information, answers, notes, selected subjects, study-planner data, quiz or mock-test activity, evaluation requests, test-series request details, or other information you deliberately enter into a study tool.'],
      },
      {
        heading: 'Study progress and browser storage',
        paragraphs: ['CSS Vista is local-first. The browser stores a record under <code>cssvista:v1</code> that can include quiz results, saved answers, bookmarks, completed challenges, visit streaks, subject progress, study plans, tasks, quick notes, goal checklists, evaluation-request drafts, test-series-request drafts and spaced-revision state. Navigation scroll position and short-lived password-reset throttling information can also be kept in session storage. If you sign in and use sync, supported progress is associated with your private account so it can be restored across devices.'],
      },
      {
        heading: 'Authentication and security data',
        paragraphs: [
          'The current Hostinger-hosted account backend uses secure session and CSRF cookies. A normal signed-in session is designed to last up to 14 days unless it is revoked or expires. The backend also processes a shortened IP-network prefix and a cryptographic hash derived from the browser user-agent for login security, session validation and rate limiting. Security-event records may contain hashed email, IP-prefix and event information. Administrator verification uses an additional short-lived secure cookie.',
          'Account authentication, verification and password recovery are processed by the CSS Vista backend hosted on Hostinger. Verification and reset emails use the configured Hostinger mail transport. Recovery links expire and can be used only once.',
        ],
      },
      {
        heading: 'Server and technical information',
        paragraphs: ['Like ordinary web hosting, requests can expose technical information such as IP address, browser/user-agent, requested URL, time and response status to the hosting and security infrastructure. CSS Vista uses this information to deliver the site, protect accounts, diagnose failures, control abuse and maintain availability. We do not describe ordinary server logs as a student profile unless they are actually linked to an account or security event.'],
      },
      {
        heading: 'Advertising and Google',
        paragraphs: [
          'CSS Vista uses Google AdSense on eligible public content pages and may request one clearly separated manual in-page unit at the bottom of a signed-in account overview. The account URL is excluded from Auto Ads, and no account ad is requested on login, registration, password-recovery or password-change screens. CSS Vista does not pass profile fields, answers, scores, study plans or account details as advertising parameters. Google and other third-party vendors may use cookies, web beacons, IP addresses or similar identifiers in connection with ad serving. Google states that third-party vendors, including Google, use cookies to serve ads based on a user&rsquo;s prior visits to this and/or other websites, and that Google&rsquo;s advertising cookies enable Google and its partners to serve ads based on visits to sites on the Internet.',
          `Users can manage Google ad personalization through ${external('https://adssettings.google.com/', 'Google Ads Settings')}. Google&rsquo;s explanation of how it uses information from partner sites is available at ${external('https://policies.google.com/technologies/partner-sites', 'How Google uses information from sites or apps that use its services')}.`,
        ],
      },
      {
        heading: 'Consent in regulated regions',
        paragraphs: ['For visitors in the European Economic Area, United Kingdom and Switzerland, Google requires publishers serving personalized advertising to use a Google-certified consent management platform integrated with the IAB Transparency and Consent Framework. Where a Google Privacy &amp; Messaging message applies, visitors can accept, reject or manage available choices and later reopen the message through the site&rsquo;s Privacy &amp; Cookie Settings control. CSS Vista does not treat a visitor&rsquo;s choice as a shared cacheable page response.'],
      },
      {
        heading: 'Analytics and other third parties',
        paragraphs: ['The audited application source does not currently include a Google Analytics or Google Tag Manager tag. If analytics are added later, this policy and consent configuration must be updated before relying on that processing. External services currently visible in the platform include Google AdSense, Hostinger hosting/infrastructure, Instagram, YouTube, WhatsApp links and official-source links such as FPSC. Opening an external service makes that service&rsquo;s own privacy terms applicable to the interaction.'],
      },
      {
        heading: 'How information is used and shared',
        paragraphs: ['Information is used to operate accounts, sync study progress, provide requested tools, secure the platform, prevent abuse, send account-security or password-reset messages, troubleshoot the service, and display advertising on eligible pages described above. CSS Vista does not publish a student&rsquo;s private account progress as public content. Data may be processed by service providers that are necessary to provide hosting, authentication, email delivery or advertising. CSS Vista does not state that personal information is sold.'],
      },
      {
        heading: 'Retention and your choices',
        paragraphs: ['Browser-stored study data remains until it is cleared by the user, replaced by the application or removed with browser/site-data controls. Account and synced study records are retained while needed to provide the account, maintain security, satisfy legitimate operational records or resolve abuse and support issues. Security records may be retained separately from visible study data. You can use the website without signing in for features that support guest mode, clear browser storage through browser controls, sign out to revoke the current session, and use the Privacy &amp; Cookie Settings control where a Google consent message applies.'],
      },
      {
        heading: 'Children',
        paragraphs: ['CSS Vista is designed for competitive-examination preparation and is not intentionally directed to young children. Users should not submit personal information on behalf of a child unless they have the lawful authority to do so. If CSS Vista becomes aware that information has been collected in circumstances requiring deletion or additional consent, it will address the issue through the available contact channel.'],
      },
      {
        heading: 'International processing',
        paragraphs: ['Some service providers, including Google and Hostinger, operate infrastructure in multiple countries. Information handled by those providers may therefore be processed outside Pakistan under their applicable contractual and legal arrangements.'],
      },
      {
        heading: 'Changes and privacy questions',
        paragraphs: [`This policy will be updated when material data practices change. For privacy questions or requests, use the verified channels on the ${internal('/contact', 'Contact CSS Vista')} page. Do not send passwords, authentication codes or other account secrets through social messaging.`],
      },
    ],
  },

  '/cookie-policy': {
    title: 'Cookie Policy',
    description: 'The cookies, local storage and session storage currently used by CSS Vista and its advertising services.',
    showRelatedLinks: true,
    sections: [
      {
        heading: 'Necessary cookies',
        paragraphs: ['<code>cssv_session</code> is the secure, HTTP-only sign-in session cookie and <code>cssv_csrf</code> is the CSRF protection cookie used to protect signed-in requests. They are first-party cookies, are essential to authenticated account operation, use Secure and SameSite=Lax settings, and are issued for up to 14 days. <code>cssv_admin_mfa</code> is an HTTP-only first-party cookie used for short-lived administrator verification, currently up to 12 hours. Necessary cookies are not used by CSS Vista for advertising personalization.'],
      },
      {
        heading: 'Functional browser storage',
        paragraphs: ['CSS Vista uses first-party browser local storage for local-first study state under <code>cssvista:v1</code>. It can contain quiz and mock results, answers, bookmarks, study plans, streaks, tasks, notes and related progress. Session storage is used for temporary navigation restoration and short-lived interface/security state such as password-reset request timing. These technologies are functional to the study experience and can be deleted through your browser&rsquo;s site-data controls; deleting them may remove unsynced guest progress.'],
      },
      {
        heading: 'Advertising cookies and identifiers',
        paragraphs: ['Eligible public content pages and the signed-in account placement described in the Privacy Policy can load Google AdSense. Google and its advertising partners may place or read cookies, use web beacons, IP addresses or similar identifiers for ad delivery, measurement, fraud prevention and, where permitted by the user&rsquo;s choices and applicable rules, personalization. These are third-party advertising technologies controlled by the relevant provider rather than CSS Vista&rsquo;s first-party session system. Their exact names and lifetimes can change as Google updates its services, so this policy does not invent a fixed cookie-name list.'],
      },
      {
        heading: 'Analytics',
        paragraphs: ['No Google Analytics or Google Tag Manager implementation was found in the audited application source at this update. CSS Vista therefore does not list fabricated analytics cookie names. If a dedicated analytics service is enabled later, this page and the applicable consent configuration must be updated.'],
      },
      {
        heading: 'Managing your choices',
        id: 'managing-cookies',
        paragraphs: [`You can remove or block site data using your browser settings. Blocking necessary account cookies will prevent login from working correctly. Where Google&rsquo;s European regulations message applies, use <strong>Privacy &amp; Cookie Settings</strong> in the site footer to reopen the available consent choices. Google ad personalization can also be controlled through ${external('https://adssettings.google.com/', 'Google Ads Settings')}.`],
      },
    ],
  },

  '/terms-and-conditions': {
    title: 'Terms & Conditions',
    description: "Terms governing use of CSS Vista's educational resources, accounts, study tools and public content.",
    showRelatedLinks: true,
    sections: [
      {
        heading: 'Acceptance and educational purpose',
        paragraphs: ['By using CSS Vista you agree to use the website lawfully and in accordance with these terms. CSS Vista provides educational and examination-preparation resources. It is not an examining authority and use of the platform does not create a guarantee of examination admission, marks, allocation or success.'],
      },
      {
        heading: 'Accounts',
        paragraphs: ['You are responsible for keeping your password and account access secure, for information submitted through your account, and for notifying CSS Vista through the contact page if you reasonably believe an account has been compromised. You must not attempt to access another person&rsquo;s account, administrator functions or private records.'],
      },
      {
        heading: 'Acceptable use',
        paragraphs: ['You may use public resources for genuine personal study and ordinary educational reference. You may not interfere with service operation, bypass access controls, probe private APIs without authorization, submit malicious code, abuse forms, impersonate another person, use automated traffic to manipulate advertising, or scrape/reproduce the platform at a scale that harms the service or unlawfully copies protected material.'],
      },
      {
        heading: 'Content and intellectual property',
        paragraphs: [`CSS Vista&rsquo;s original explanations, analyses, original graphics, software, study tools, database selection/arrangement and other protectable original material remain subject to CSS Vista&rsquo;s rights. Official papers, syllabi, notices, government material, quotations, externally sourced works and third-party media retain the rights and status applicable to their original sources. The footer copyright notice is not a claim of ownership over those third-party works. See the ${internal('/copyright', 'Copyright Policy')}.`],
      },
      {
        heading: 'Past papers, PDFs and external material',
        paragraphs: ['Past papers and official documents are presented for examination preparation and archival reference. Availability on CSS Vista does not by itself mean CSS Vista owns the underlying official or third-party work. External links lead to services controlled by others, whose terms apply when you use them.'],
      },
      {
        heading: 'Availability and changes',
        paragraphs: ['CSS Vista may update, correct, reorganize, suspend or retire features to maintain accuracy, security and service quality. Temporary downtime, content changes or technical failures can occur. Where an account is used to abuse the platform or compromise other users, access may be restricted or suspended.'],
      },
      {
        heading: 'Accuracy and responsibility',
        paragraphs: ['CSS Vista aims to provide useful, checked educational material, but examination rules, dates, official syllabi and notices can change. Users remain responsible for checking current official requirements with FPSC or the relevant examining authority before acting on time-sensitive information.'],
      },
      {
        heading: 'Legal framework and questions',
        paragraphs: [`CSS Vista is operated from Pakistan. These terms are intended to be read consistently with applicable law and do not exclude rights or liabilities that cannot lawfully be excluded. Questions about a specific legal right or dispute may require advice from a qualified lawyer. Contact CSS Vista through the ${internal('/contact', 'Contact page')}.`],
      },
    ],
  },

  '/disclaimer': {
    title: 'Disclaimer',
    description: "Important information about CSS Vista's independent educational role and official examination information.",
    showRelatedLinks: true,
    sections: [
      {
        heading: 'Independent educational platform',
        paragraphs: ['CSS Vista is an independent educational and examination-preparation platform. It is not the Federal Public Service Commission (FPSC), is not an official FPSC website, and does not present itself as a government body.'],
      },
      {
        heading: 'Official information',
        paragraphs: [`References to CSS, PMS, FPSC notices, syllabi, past papers, results or examination procedures are provided for educational and informational use. Rules, eligibility, dates, fees, application procedures, syllabus changes, notices and results should ultimately be verified from the relevant official authority. For federal CSS matters, consult ${external('https://www.fpsc.gov.pk/', 'FPSC&rsquo;s official website')}.`],
      },
      {
        heading: 'Preparation outcomes',
        paragraphs: [`Study tools, MCQs, notes, analyses, mentoring information and practice material are intended to support preparation. They do not guarantee a particular score, selection, allocation or examination result. CSS Vista&rsquo;s editorial objective is accuracy and usefulness; where an error is identified, the correction process is described in the ${internal('/editorial-policy', 'Editorial &amp; Corrections Policy')}.`],
      },
    ],
  },

  '/copyright': {
    title: 'Copyright & Intellectual Property',
    description: "How CSS Vista distinguishes its original work from official, public and third-party material.",
    showRelatedLinks: true,
    sections: [
      {
        heading: 'Original CSS Vista material',
        paragraphs: ['Where created by CSS Vista, original written explanations and analyses, original graphics, website design, software and study tools, original classifications, and the original selection or arrangement of databases and compilations may be protected by applicable intellectual-property law. The notice &ldquo;&copy; CSS Vista. All rights reserved.&rdquo; applies to that protectable original material.'],
      },
      {
        heading: 'Official and third-party material',
        paragraphs: ['CSS Vista does not claim ownership merely because it displays or links to an official examination question, syllabus, FPSC notice, government publication, quotation, third-party book material, external image or other work created by someone else. Those materials remain subject to the rights, public-document status, licences, permissions, exceptions and attribution requirements that apply to the original source.'],
      },
      {
        heading: 'Use and reproduction',
        paragraphs: ['Users may make ordinary personal-study use of CSS Vista resources. Reproducing a substantial part of CSS Vista&rsquo;s original database, site, paid or restricted material, original graphics, or original written work for republication, resale or a competing service requires an appropriate legal basis or permission. This does not restrict rights users may independently have in official/public material or under applicable law.'],
      },
      {
        heading: 'Copyright concerns',
        paragraphs: [`If you own rights in material appearing on CSS Vista and believe it has been used incorrectly, use the ${internal('/contact', 'Contact page')} and identify the work, the CSS Vista URL, your relationship to the work, and the action requested. CSS Vista will review a sufficiently specific notice and correct, attribute, restrict or remove material where appropriate.`],
      },
    ],
  },

  '/about': {
    title: 'About CSS Vista',
    description: 'A complete preparation platform for CSS aspirants in Pakistan.',
    showRelatedLinks: false,
    sections: [
      {
        heading: 'What CSS Vista is',
        paragraphs: ['CSS Vista is an independent competitive-examination preparation platform serving aspirants in Pakistan. It brings public study resources and personal practice tools into one website so users can move from syllabus planning to study, past-paper review, MCQ practice, revision and timed work.'],
      },
      {
        heading: 'What the platform provides',
        paragraphs: ['Current sections include CSS and related past papers, subject MCQ banks, general-knowledge practice, MPT preparation, syllabus and subject guidance, current-affairs material, notes and study resources, book summaries, answer-writing tools, planners, revision tools, account-based progress sync and other examination-preparation utilities. Individual features may change as the platform is maintained.'],
      },
      {
        heading: 'Independence and sourcing',
        paragraphs: ['CSS Vista is not FPSC and is not presented as an official government service. Official examination rules, deadlines and notices are distinguished from CSS Vista&rsquo;s educational organization or analysis, and users are directed to the relevant official source for final verification.'],
      },
      {
        heading: 'People already identified on the platform',
        paragraphs: [`The existing CSS Vista mentor page identifies Sir Ali Hassan Sargana as founder and lists Miss Sadia Zahoor, PAS as a CSS mentor. This page does not add unverified institutional partnerships, awards, traffic figures, testimonials or student-result claims. See the existing ${internal('/mentors', 'mentor information')} for the currently published profiles.`],
      },
    ],
  },

  '/contact': {
    title: 'Contact CSS Vista',
    description: 'Verified channels for general enquiries, technical issues, corrections, privacy and copyright concerns.',
    showRelatedLinks: false,
    sections: [
      {
        heading: 'General and platform enquiries',
        paragraphs: [`CSS Vista&rsquo;s verified public social channel is ${external(INSTAGRAM_URL, 'Instagram')}. The site also publishes an official ${external(WHATSAPP_GROUP_URL, 'CSS Vista WhatsApp group')} for community access.`],
      },
      {
        heading: 'Technical issues and content corrections',
        paragraphs: ['When reporting a broken page or factual issue, include the page URL, the specific text or feature involved, what you expected to see, and&mdash;where relevant&mdash;the official source supporting a correction. Do not send passwords, one-time codes, session tokens or other authentication secrets.'],
      },
      {
        heading: 'Privacy and copyright',
        paragraphs: ['Privacy requests and copyright concerns can be initiated through the same verified Instagram channel. For copyright concerns, include the affected URL and enough information to identify the work and the basis of the request. CSS Vista does not publish an unverified office address, registration number or generic legal email on this page.'],
      },
    ],
  },

  '/editorial-policy': {
    title: 'Editorial & Corrections Policy',
    description: "CSS Vista's practical standards for examination-related accuracy, sourcing, updates and corrections.",
    showRelatedLinks: true,
    sections: [
      {
        heading: 'Accuracy standard',
        paragraphs: ['CSS Vista aims to keep factual examination information accurate, clearly organized and useful for preparation. Time-sensitive claims such as official dates, eligibility rules, results, syllabi and notices should be checked against the relevant examining authority before publication or material update.'],
      },
      {
        heading: 'Official information and analysis',
        paragraphs: ['Official-source material should be identified as such and not presented as if CSS Vista created the underlying official document. Educational explanation, commentary, study guidance and analysis should remain distinguishable from the text or effect of an official notice.'],
      },
      {
        heading: 'Corrections',
        paragraphs: [`When a supported factual correction is identified, the goal is to correct the affected page or dataset rather than leave a known error in place. Material changes should be reflected on the live resource and, where a date-sensitive claim was superseded, wording should make the current position clear. Reports can be sent through the ${internal('/contact', 'Contact page')}.`],
      },
      {
        heading: 'Updating older material',
        paragraphs: ['Past papers and historical material may remain available because their age is part of their educational value. Current rules, deadlines and official procedures should not be inferred from an older document. Where a resource is historical, users should be directed to current official information before taking an administrative or examination action.'],
      },
      {
        heading: 'Sources and third-party rights',
        paragraphs: [`Where a factual claim depends on an external source, CSS Vista should prefer primary or authoritative sources when reasonably available. Quotations, images, books, official publications and third-party materials must be handled consistently with their source, attribution and rights status. See the ${internal('/copyright', 'Copyright Policy')}.`],
      },
    ],
  },
}

/** Documents listed by the Legal & Trust Centre index page. */
export const LEGAL_CENTRE_PAGES = [
  ['/privacy-policy', 'Privacy Policy'],
  ['/cookie-policy', 'Cookie Policy'],
  ['/terms-and-conditions', 'Terms & Conditions'],
  ['/disclaimer', 'Disclaimer'],
  ['/copyright', 'Copyright & Intellectual Property'],
  ['/editorial-policy', 'Editorial & Corrections Policy'],
  ['/about', 'About CSS Vista'],
  ['/contact', 'Contact CSS Vista'],
]

/**
 * Renders a policy document as static HTML for the prerendered page. The React
 * page renders the same structure from the same data.
 */
export function renderLegalPageHtml(path) {
  const page = LEGAL_PAGES[path]
  if (!page) return ''

  const related = page.showRelatedLinks
    ? `<p class="rounded-xl border bg-secondary/35 p-4 text-sm">Related policies: ${RELATED_POLICY_LINKS.map(([href, label]) => internal(href, label)).join(' · ')}</p>`
    : ''

  const sections = page.sections.map((section) => {
    const body = section.paragraphs
      .map((paragraph, index) => `<p class="${index === 0 ? 'mt-2' : 'mt-3'} text-[15px] leading-7 text-foreground/85">${paragraph}</p>`)
      .join('')
    return `<section${section.id ? ` id="${section.id}"` : ''} class="mt-8"><h2 class="font-display text-2xl font-bold text-pine">${section.heading}</h2>${body}</section>`
  }).join('')

  return `<article class="mx-auto max-w-4xl px-4 py-8">${related}${sections}<p class="mt-8 border-t pt-5 text-xs text-muted-foreground">Last updated: ${LEGAL_UPDATED}</p></article>`
}
