import type { AccountUser } from '@/lib/accountContext'
import { hostingerRequest, ownerRequest } from '@/lib/hostingerApi'
import type { CustomTestSeriesRequest } from '@/lib/store'

export interface CloudTestSeriesRequest {
  request_id: string
  user_id: string
  student_name: string
  student_email: string
  phone: string
  subjects: string[]
  test_count: number
  scheduling_mode: string
  start_date: string
  duration_days: number
  gap_days: number
  schedule: Array<{ number: number; date: string; subject: string; syllabus?: string }>
  unit_price: number | null
  total_fee: number | null
  status: 'submitted' | 'contacted' | 'approved' | 'completed' | 'cancelled'
  created_at: string
  updated_at: string
}

export async function submitTestSeriesRequest(user: AccountUser, request: CustomTestSeriesRequest) {
  await hostingerRequest('student/test-series.php', { method: 'POST', headers: { 'X-CSSV-User': user.id }, body: JSON.stringify({
    request_id: request.id,
    user_id: user.id,
    student_name: request.studentName,
    student_email: user.email ?? '',
    phone: request.phone,
    subjects: request.subjects,
    test_count: request.testCount,
    scheduling_mode: request.schedulingMode,
    start_date: request.startDate,
    duration_days: request.durationDays,
    gap_days: request.gapDays,
    schedule: request.schedule,
    unit_price: request.unitPrice,
    total_fee: request.totalFee,
    status: 'submitted',
  }) })
}

export async function getAdminTestSeriesRequests(): Promise<CloudTestSeriesRequest[]> {
  const result = await ownerRequest<{ requests: CloudTestSeriesRequest[] }>('admin/test-series.php')
  return result.requests
}

export async function updateTestSeriesRequestStatus(
  requestId: string,
  status: CloudTestSeriesRequest['status'],
) {
  await ownerRequest('admin/test-series.php', { method: 'PATCH', body: JSON.stringify({ request_id: requestId, status }) })
}
