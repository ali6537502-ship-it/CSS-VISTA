import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const failures = []

function requireText(path, ...needles) {
  const text = read(path)
  for (const needle of needles) {
    if (!text.includes(needle)) failures.push(`${path}: missing ${JSON.stringify(needle)}`)
  }
  return text
}

function forbid(path, ...needles) {
  const text = read(path)
  for (const needle of needles) {
    if (text.includes(needle)) failures.push(`${path}: forbidden legacy value ${JSON.stringify(needle)}`)
  }
}

const profileUi = requireText(
  'src/components/StudentProfilePanel.tsx',
  "const MAX_PROFILE_PHOTO_BYTES = 60 * 1024",
  "'Miss Sadia Zahoor'",
  "'Sir Ali Hassan Sargana'",
  "'Both'",
  "multiOptions: ['Batch', 'Test Series', 'Purchased Notes']",
)
if (!profileUi.includes('<fieldset')) failures.push('StudentProfilePanel: service checklist must use a fieldset')

requireText(
  'public/api/student/profile.php',
  "['No','Miss Sadia Zahoor','Sir Ali Hassan Sargana','Both']",
  "['Batch','Test Series','Purchased Notes']",
  'previous_css_vista_services',
  'previous_css_vista_details',
)

requireText(
  'public/api/admin/students.php',
  'previous_css_vista_student',
  'previous_css_vista_services',
  'previous_css_vista_details',
)

requireText(
  'src/pages/admin/StudentManagementPanelV2.tsx',
  'Previous CSS Vista mentor',
  'Previous CSS Vista history',
  'Previous CSS Vista Services',
)

requireText('public/api/_bootstrap_core.php', 'const CSSV_MAX_PROFILE_PHOTO_BYTES = 61440', 'Profile photo must be 60 KB or smaller.')
requireText('public/api/student/photo.php', 'const CSSV_MAX_STUDENT_PROFILE_PHOTO_BYTES = 60 * 1024', '61440')

for (const path of [
  'server/sql/001_hostinger_core_schema.sql',
  'public/api/_bootstrap_schema.sql',
  'public/api/_bootstrap_schema.txt',
  'hosting-migration/mysql-schema.sql',
]) {
  requireText(
    path,
    'previous_css_vista_student',
    'previous_css_vista_services',
    'previous_css_vista_details',
    '61440',
  )
  forbid(path, '25600', '25 KB', '25KB')
}

for (const path of [
  'public/api/_bootstrap_core.php',
  'public/api/student/photo.php',
  'src/components/StudentProfilePanel.tsx',
  'docs/hostinger-native-accounts.md',
  'hosting-migration/MIGRATION_PLAN.md',
]) {
  forbid(path, '25600', '25 KB', '25KB')
}

if (failures.length) {
  console.error('CSS Vista profile contract FAILED:\n- ' + failures.join('\n- '))
  process.exit(1)
}

console.log('CSS Vista profile contract OK: 60 KB photo limit and previous-student history are aligned across UI, API, admin and schemas.')
