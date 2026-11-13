/**
 * PPSC's Mental Ability and Reasoning Test guidebook (6 November 2026).
 * This paper was published after the original October PMS syllabus bundle.
 * The four domains and topic labels below are taken from that guidebook.
 * These are preparation headings, not invented past-paper questions.
 */
export const PMS_MENTAL_ID = 'compulsory-mental-ability-and-reasoning-test'
export const PMS_MENTAL_SOURCE = 'https://www.ppsc.gop.pk/Misc_Uploading/Guidelines%20for%20Mental%20Ability%20and%20Reasoning%20Test_26110615291.pdf'
const categories = [
  {
    title: 'Logical and Analytical Reasoning',
    detail: 'Organize and interpret information, evaluate rules and constraints, identify patterns, and draw conclusions based only on the given information.',
    topics: [
      'Structuring unorganized information',
      'Mapping complex scenarios',
      'Deducing facts from constraints',
      'Identifying patterns and relationships',
      'Evaluating alternatives',
    ],
  },
  {
    title: 'Quantitative and Numeric Processing',
    detail: 'Use basic and intermediate numerical reasoning in practical administrative contexts, including budgets, records and data; formal advanced mathematics is not required by this guidebook.',
    topics: [
      'Percentages and proportional reasoning',
      'Budgeting and financial calculations',
      'Resource allocation',
      'Data interpretation',
      'Averages and summary measures',
      'Rates, ratios, and comparisons',
      'Numerical accuracy and checking',
      'Applied numerical reasoning',
    ],
  },
  {
    title: 'Reading and Verbal Comprehension',
    detail: 'Interpret administrative texts, policies, reports, letters, conditions, exceptions and implications without introducing unsupported assumptions.',
    topics: [
      'Vocabulary and verbal meaning',
      'Understanding sentence structure',
      'Structural relationships between ideas',
      'Main idea and supporting information',
      'Reading for specific information',
      'Comprehension of complex texts',
      'Logical interpretation',
      'Making valid inferences',
      'Identifying tone, purpose, and intent',
      'Accuracy and attention to verbal detail',
    ],
  },
  {
    title: 'Problem Solving and Decision Making',
    detail: 'Assess workplace scenarios and choose appropriate, ethical and practical responses while accounting for priorities, risk, policy and authority.',
    topics: [
      'Situational judgment',
      'Problem identification',
      'Prioritization and competing demands',
      'Evaluation of alternatives',
      'Risk assessment',
      'Professional ethics and integrity',
      'Policy and procedure awareness',
      'Decision-making under pressure',
      'Escalation and appropriate delegation',
      'Communication of decisions',
      'Follow-through and corrective action',
    ],
  },
] as const

export const pmsMentalAbilitySubject = {
  id: PMS_MENTAL_ID,
  title: 'Mental Ability and Reasoning Test',
  designation: 'compulsory' as const,
  marks: 100,
  sourceUrl: PMS_MENTAL_SOURCE,
  file: PMS_MENTAL_SOURCE,
  provenance: 'PPSC Mental Ability and Reasoning Test guidebook published 6 November 2026; separate from the October syllabus PDF bundle',
  sections: categories.map((area,i)=>({
    id: 's'+(i+1),
    title: area.title,
    detail: area.detail,
    topics: area.topics.map((title,j)=>({
      id: 'pms-punjab:vista:'+PMS_MENTAL_ID+':s'+(i+1)+':n'+(j+1),
      title,
      detail: area.detail,
    })),
  })),
  readings: [],
  notes: [
    'Source: PPSC Mental Ability and Reasoning Test Guidebook for the Combined Competitive Examination (CCE).',
    'The PPSC guidebook states that its guidance is non-exhaustive. The paper covers four competency areas; the examples are not an exhaustive question bank.',
    'The revised CCE notice sets a 33% qualifying threshold with negative marking for Paper II, subject to possible later revision. The guidebook does not prescribe an exam date, question count, paper time or negative-mark value.',
  ],
}
