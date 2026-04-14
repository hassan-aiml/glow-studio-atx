import { NextRequest, NextResponse } from 'next/server'
import { runReminders, runFollowups, runReactivation } from '@/lib/automation'
import { createServiceClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret')
  const isLocal = process.env.NODE_ENV === 'development'
  if (!isLocal && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const reminderDate = request.nextUrl.searchParams.get('reminder_date') || undefined
  const followupDate = request.nextUrl.searchParams.get('followup_date') || undefined

  const results: Record<string, unknown> = {}
  try { results.reminders    = await runReminders(reminderDate) } catch (e) { results.reminders_error    = e instanceof Error ? e.message : String(e) }
  try { results.followups    = await runFollowups(followupDate) } catch (e) { results.followups_error    = e instanceof Error ? e.message : String(e) }
  try { results.reactivation = await runReactivation()         } catch (e) { results.reactivation_error = e instanceof Error ? e.message : String(e) }

  return NextResponse.json({ success: true, ran_at: new Date().toISOString(), results })
}

// POST: seed demo bookings — idempotent, won't duplicate
export async function POST(request: NextRequest) {
  const isLocal = process.env.NODE_ENV === 'development'
  const secret = request.nextUrl.searchParams.get('secret')
  if (!isLocal && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createServiceClient()
  const { data: services } = await db.from('services').select('id, name').limit(5)
  if (!services || services.length === 0) {
    return NextResponse.json({ error: 'No services — run schema.sql first' }, { status: 400 })
  }

  const today = new Date()
  const demoPhone = process.env.DEMO_PHONE_OVERRIDE || '+15127432520'

  // Fixed emails so re-seeding reuses existing clients instead of duplicating
  const demoClients = [
    { name: 'Maya Patel',   email: 'maya@glow-demo.com',   phone: demoPhone, source: 'referral',  visit_count: 3, last_visit: new Date(today.getTime() -  7 * 86400000).toISOString().split('T')[0] },
    { name: 'Jordan Lee',   email: 'jordan@glow-demo.com', phone: demoPhone, source: 'website',   visit_count: 1, last_visit: new Date(today.getTime() - 30 * 86400000).toISOString().split('T')[0] },
    { name: 'Priya Sharma', email: 'priya@glow-demo.com',  phone: demoPhone, source: 'instagram', visit_count: 7, last_visit: new Date(today.getTime() -  3 * 86400000).toISOString().split('T')[0] },
  ]

  const clientIds: string[] = []
  for (const c of demoClients) {
    // Upsert — reuse if already exists
    const { data: existing } = await db.from('clients').select('id').eq('email', c.email).single()
    if (existing) {
      clientIds.push(existing.id)
    } else {
      const { data } = await db.from('clients').insert(c).select('id').single()
      if (data) clientIds.push(data.id)
    }
  }

  const serviceIds = services.map((s: { id: string }) => s.id)
  const appts = [
    { daysFromNow: 0, time: '10:00 AM', goal: 'Bright skin before photoshoot',   clientIdx: 0, svcIdx: 0 },
    { daysFromNow: 1, time: '2:00 PM',  goal: 'Anti-aging maintenance',           clientIdx: 1, svcIdx: 1 % serviceIds.length },
    { daysFromNow: 2, time: '11:30 AM', goal: 'Deep cleanse reset',               clientIdx: 2, svcIdx: 2 % serviceIds.length },
  ]

  const created = []
  for (const a of appts) {
    const d = new Date(today)
    d.setDate(d.getDate() + a.daysFromNow)
    const dateStr = d.toISOString().split('T')[0]

    // Don't duplicate if already booked for this client/date/time
    const { data: exists } = await db.from('bookings')
      .select('id').eq('client_id', clientIds[a.clientIdx])
      .eq('appointment_date', dateStr).eq('appointment_time', a.time).single()

    if (exists) { created.push({ date: dateStr, time: a.time, status: 'already exists' }); continue }

    const { data: booking } = await db.from('bookings').insert({
      client_id:        clientIds[a.clientIdx],
      service_id:       serviceIds[a.svcIdx],
      appointment_date: dateStr,
      appointment_time: a.time,
      location_type:    'studio',
      wellness_goal:    a.goal,
      status:           'pending',
      is_new_client:    a.clientIdx === 1,
      confirmation_sent: a.daysFromNow === 0,
      reminder_sent:    false,
      followup_sent:    false,
    }).select('id').single()

    if (booking) created.push({ date: dateStr, time: a.time, id: booking.id, status: 'created' })
  }

  return NextResponse.json({ success: true, seeded: created })
}
