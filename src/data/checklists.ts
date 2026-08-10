// Application checklists (guidance). Candidates must verify against the latest FPSC advertisement.
export interface ChecklistStep {
  id: string
  label: string
  hint?: string
}

export const mptChecklist: { group: string; steps: ChecklistStep[] }[] = [
  {
    group: 'Before you apply',
    steps: [
      { id: 'eligibility', label: 'Confirm overall eligibility from the latest FPSC advertisement' },
      { id: 'age', label: 'Check the age requirement (21–30 years as of the advertisement’s cut-off date)' },
      { id: 'relaxation', label: 'Check whether you qualify for age relaxation under the CSS Rules categories' },
      { id: 'qualification', label: 'Bachelor degree (at least 2nd Division) from an HEC-recognised university' },
      { id: 'nationality', label: 'Pakistani citizenship and domicile details confirmed' },
      { id: 'attempts', label: 'Confirm your remaining attempts (maximum three for the written exam)' },
    ],
  },
  {
    group: 'FPSC online application',
    steps: [
      { id: 'account', label: 'Create your account on the FPSC online portal' },
      { id: 'form', label: 'Fill the MPT online application form carefully' },
      { id: 'centre', label: 'Select your examination centre' },
      { id: 'fee', label: 'Pay the application fee (bank challan/treasury receipt) and keep the receipt' },
      { id: 'cnic', label: 'Enter CNIC details exactly as printed on the card' },
      { id: 'photo', label: 'Upload a recent photograph meeting the advertisement specifications' },
      { id: 'academic', label: 'Enter academic information accurately' },
      { id: 'domicile', label: 'Enter domicile information (it decides your quota)' },
      { id: 'review', label: 'Review the complete form for errors before submitting' },
      { id: 'submit', label: 'Submit the application well before the deadline' },
      { id: 'print', label: 'Print/save the submitted application for your record' },
    ],
  },
  {
    group: 'Before the MPT',
    steps: [
      { id: 'admission-cert', label: 'Download your admission certificate when FPSC issues it' },
      { id: 'exam-day', label: 'Prepare examination-day documents: original CNIC, admission certificate, required stationery' },
    ],
  },
]

export const writtenChecklist: { group: string; steps: ChecklistStep[] }[] = [
  {
    group: 'After qualifying the MPT',
    steps: [
      { id: 'mpt-qualified', label: 'Confirm MPT qualification from the official FPSC result' },
      { id: 'written-form', label: 'Fill the written-examination online application form' },
      { id: 'subjects', label: 'Finalise optional-subject selection (validate group rules)' },
      { id: 'centre', label: 'Select your written-examination centre' },
      { id: 'print-form', label: 'Print the submitted application form' },
    ],
  },
  {
    group: 'Documents to attach',
    steps: [
      { id: 'cnic-copy', label: 'CNIC copy' },
      { id: 'domicile', label: 'Domicile certificate' },
      { id: 'matric', label: 'Matric certificate' },
      { id: 'inter', label: 'Intermediate certificate' },
      { id: 'bachelor', label: 'Bachelor’s degree' },
      { id: 'transcript', label: 'Transcript / detailed marks certificate' },
      { id: 'masters', label: 'Master’s degree - where applicable' },
      { id: 'equivalence', label: 'Equivalence certificate (HEC) - for foreign/qualifying degrees, where applicable' },
      { id: 'photos', label: 'Recent photographs as specified' },
      { id: 'fee', label: 'Fee receipt (paid challan/treasury receipt)' },
      { id: 'dept-permission', label: 'Departmental permission - for government employees' },
      { id: 'age-proof', label: 'Age-relaxation proof - where applicable' },
      { id: 'disability', label: 'Disability certificate - where applicable' },
      { id: 'attestation', label: 'Get documents attested as required by the advertisement' },
    ],
  },
  {
    group: 'Submission & after',
    steps: [
      { id: 'post', label: 'Dispatch the hard copy by post/courier to the FPSC address given in the advertisement' },
      { id: 'deadline', label: 'Ensure submission before the official deadline (keep courier receipt)' },
      { id: 'admission', label: 'Download the written-examination admission certificate when issued' },
    ],
  },
]
