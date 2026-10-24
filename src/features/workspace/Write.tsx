import { AvailableStudyLink as Link } from '@/features/membership/ProRelease'
import { AccountPage } from '@/pages/account/shared'
import { useWorkspace } from './api'
import { WorkspaceHold, WorkspaceLoad, WorkspaceRecords } from './Records'
export default function WriteHome() {
  const load = useWorkspace('view=recent&type=writing')
  return <AccountPage title="Write" intro="Develop an idea, save your own response and compare revisions in the existing writing workspaces.">
    {!load.data ? <WorkspaceLoad error={load.error} retry={load.refresh} /> : <div className="space-y-6">
      <WorkspaceHold paused={load.data.paused} />
      <section><h2 className="mb-3 text-lg font-semibold">Saved writing</h2>{load.data.items.length ? <WorkspaceRecords items={load.data.items} /> : <p className="rounded-xl border p-5 text-sm">No available saved writing yet.</p>}<Link className="mt-3 inline-flex min-h-11 items-center text-[#14543D] underline" to="/account/preparation?new=writing">Start or open saved writing</Link></section>
      {!load.data.paused && <section><h2 className="mb-3 text-lg font-semibold">Writing practice · Pro</h2><ul className="divide-y rounded-xl border">{[
        ['/account/expression?view=studio','Sentence Studio','Meaning, repair and independent sentence practice.'],
        ['/account/expression','Expression','Typed writing, feedback and version comparison.'],
        ['/account/argumentation','Argumentation','Claims, reasons, evidence and counterarguments.'],
        ['/account/analytical-skills','Analysis','Mechanisms, alternatives and qualified conclusions.'],
        ['/account/essay-builder','Essays','Theme, thesis, outline, independent drafting and revision.'],
        ['/account/precis','Précis','Source-bound compression, fidelity and saved drafts.'],
        ['/account/handwriting','Handwriting','Inspect, correct and confirm extracted text.'],
        ['/account/answer-performance','Mentor evaluations','Your record of external human feedback; student-entered.'],
      ].map(([to,title,description]) => <li key={to} className="p-4"><Link to={to} className="inline-flex min-h-11 items-center font-semibold text-[#14543D] underline">{title}</Link><p className="text-sm leading-7 text-[#47564D]">{description}</p></li>)}</ul></section>}
    </div>}
  </AccountPage>
}
