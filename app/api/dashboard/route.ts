import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function GET() {
  const db = createServiceClient()

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  const d1 = new Date(today); d1.setDate(d1.getDate() + 1)
  const d2 = new Date(today); d2.setDate(d2.getDate() + 2)
  const tomorrowStr = d1.toISOString().split('T')[0]
  const dayAfterStr = d2.toISOString().split('T')[0]

  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  const weekStartStr = weekStart.toISOString().split('T')[0]

  const [
    { count: totalBookings },
    { count: thisWeek },
    { count: pending },
    { count: aiActions },
    { data: upcomingAppts },
    { data: recentAi },
  ] = await Promise.all([
    db.from('bookings').select('*', { count: 'exact', head: true }),
    db.from('bookings').select('*', { count: 'exact', head: true }).gte('appointment_date', weekStartStr),
    db.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    db.from('ai_log').select('*', { count: 'exact', head: true }),
    db.from('bookings')
      .select('*, client:clients(*), service:services(*)')
      .in('appointment_date', [todayStr, tomorrowStr, dayAfterStr])
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true }),
    db.from('ai_log')
      .select('*, client:clients(name,email)')
      .order('created_at', { ascending: false })
      .limit(8),
  ])

  return NextResponse.json({
    stats: { totalBookings, thisWeek, pending, aiActions },
    upcomingAppts,
    recentAi,
    dateLabels: { today: todayStr, tomorrow: tomorrowStr, dayAfter: dayAfterStr },
  })
}
