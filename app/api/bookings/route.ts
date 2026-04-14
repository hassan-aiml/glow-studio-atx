import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { runBookingAutomation } from '@/lib/automation'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const db = createServiceClient()

    const {
      name, email, phone, source,
      service_id, appointment_date, appointment_time,
      location_type, wellness_goal, symptoms, is_new_client,
    } = body

    // Upsert client
    let client
    const { data: existing } = await db
      .from('clients')
      .select('*')
      .eq('email', email)
      .single()

    if (existing) {
      const { data: updated } = await db
        .from('clients')
        .update({
          name,
          phone: phone || existing.phone,
          visit_count: existing.visit_count + 1,
          last_visit: appointment_date,
        })
        .eq('id', existing.id)
        .select()
        .single()
      client = updated
    } else {
      const { data: created } = await db
        .from('clients')
        .insert({
          name, email, phone,
          source: source || 'booking_page',
          visit_count: 1,
          last_visit: appointment_date,
        })
        .select()
        .single()
      client = created
    }

    if (!client) {
      return NextResponse.json({ error: 'Failed to create client' }, { status: 500 })
    }

    // Check slot availability
    const { data: slotTaken } = await db
      .from('bookings')
      .select('id')
      .eq('appointment_date', appointment_date)
      .eq('appointment_time', appointment_time)
      .neq('status', 'cancelled')
      .single()

    if (slotTaken) {
      return NextResponse.json({ error: 'This time slot is no longer available. Please choose another time.' }, { status: 409 })
    }

    // Create booking
    const { data: booking, error } = await db
      .from('bookings')
      .insert({
        client_id: client.id,
        service_id,
        appointment_date,
        appointment_time,
        location_type: location_type || 'studio',
        wellness_goal,
        symptoms,
        is_new_client: !existing,
        status: 'pending',
      })
      .select()
      .single()

    if (error || !booking) {
      return NextResponse.json({ error: error?.message || 'Booking failed' }, { status: 500 })
    }

    // Fire-and-forget automation
    runBookingAutomation(booking.id).catch(console.error)

    return NextResponse.json({ success: true, booking_id: booking.id })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function GET() {
  const db = createServiceClient()
  const { data, error } = await db
    .from('bookings')
    .select('*, client:clients(*), service:services(*)')
    .order('appointment_date', { ascending: false })
    .order('appointment_time', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ bookings: data })
}
