import demoData from '../../aicte_demo_data.json'
import { sampleActivity } from '../data/sampleCases.js'

// The attached JSON is the active fictional dataset. Replace this adapter with
// API calls when a backend service is available.
export const dataMode = 'fictional demo data'

const institutionsById = Object.fromEntries(demoData.institutions.map((item) => [item.institution_id, item]))
const bureausById = Object.fromEntries(demoData.bureaus.map((item) => [item.bureau_id, item]))

export const cases = demoData.cases.map((item) => {
  const institution = institutionsById[item.institution_id]
  return {
    id: item.case_id,
    institutionId: institution?.institution_code ?? item.institution_id,
    institution: institution?.name ?? 'Unknown institution',
    institutionType: institution?.type ?? '',
    institutionState: institution?.state ?? '',
    institutionDistrict: institution?.district ?? '',
    region: institution?.region ?? '',
    category: item.category,
    bureau: bureausById[item.bureau_id]?.name ?? item.bureau_id,
    bureauCode: bureausById[item.bureau_id]?.code ?? item.bureau_id,
    priority: item.priority,
    status: item.status,
    submitted: item.submitted_at,
    updated: item.updated_at ?? '',
    due: item.due_date,
    officer: item.assigned_user_id ?? '',
    title: item.title,
  }
})

export const statusGroups = {
  total: () => true,
  pending: (item) => item.status === 'Pending',
  active: (item) => item.status === 'Under Process',
  disposed: (item) => item.status === 'Disposed',
  transferred: (item) => item.status === 'Transferred',
  overdue: (item) => isOverdue(item),
}

export const isOverdue = (item, today = new Date().toISOString().slice(0, 10)) =>
  item.status === 'Overdue' || (item.status !== 'Disposed' && Boolean(item.due) && item.due < today)

export async function getDashboardData() {
  const bureaus = demoData.bureaus.map(({ bureau_id, name }) => {
    const bureauCases = cases.filter((item) => item.bureau === name)
    return {
      id: bureau_id,
      name,
      total: bureauCases.length,
      active: bureauCases.filter((item) => item.status === 'Under Process').length,
      disposed: bureauCases.filter((item) => item.status === 'Disposed').length,
    }
  }).filter((item) => item.total > 0).sort((a, b) => b.total - a.total)

  const caseIds = new Set(cases.map((item) => item.id))
  const activity = sampleActivity.filter((item) => caseIds.has(item.caseId))

  return { cases, activity, bureaus }
}
