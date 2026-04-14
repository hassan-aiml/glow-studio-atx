import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get('date')
  if (!date) return NextResponse.json({ booked: [] })

  const db = createServiceClient()
  const { data } = await db
    .from('bookings')
    .select('appointment_time')
    .eq('appointment_date', date)
    .neq('status', 'cancelled')

  const booked = data?.map((b: { appointment_time: string }) => b.appointment_time) || []
  return NextResponse.json({ booked })
}
