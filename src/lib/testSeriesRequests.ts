import type { User } from '@supabase/supabase-js'
import { getSupabaseClient } from '@/lib/supabase'
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

export async function submitTestSeriesRequest(user: User, request: CustomTestSeriesRequest) {
  const client = await getSupabaseClient()
  if (!client) throw new Error('Account service is unavailable.')
  const { error } = await client.from('custom_test_series_requests').upsert({
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
  }, { onConflict: 'request_id' })
  if (error) throw error
}

export async function getAdminTestSeriesRequests(): Promise<CloudTestSeriesRequest[]> {
  const client = await getSupabaseClient()
  if (!client) return []
  const { data, error } = await client
    .from('custom_test_series_requests')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as CloudTestSeriesRequest[]
}

export async function updateTestSeriesRequestStatus(
  requestId: string,
  status: CloudTestSeriesRequest['status'],
) {
  const client = await getSupabaseClient()
  if (!client) throw new Error('Account service is unavailable.')
  const { error } = await client
    .from('custom_test_series_requests')
    .update({ status })
    .eq('request_id', requestId)
  if (error) throw error
}
