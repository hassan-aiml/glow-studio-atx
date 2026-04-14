import Anthropic from '@anthropic-ai/sdk'
import { Resend } from 'resend'
import twilio from 'twilio'
import { createServiceClient } from './supabase'
import type { Booking, Client, Service } from './types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const resend = new Resend(process.env.RESEND_API_KEY)
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)

async function getSettings(): Promise<Record<string, string>> {
  const db = createServiceClient()
  const { data } = await db.from('settings').select('key, value')
  const map: Record<string, string> = {}
  if (data) data.forEach((row: { key: string; value: string }) => { map[row.key] = row.value })
  return map
}

async function logAiAction(params: {
  booking_id?: string
  client_id?: string
  trigger: string
  action: string
  result: string
  reasoning?: string
}) {
  const db = createServiceClient()
  await db.from('ai_log').insert(params)
}

// ── Generate AI content ──────────────────────────────────────────────────────
export async function generateAiMessage(params: {
  type: 'confirmation' | 'reminder' | 'followup' | 'reactivation' | 'crm_note'
  client: Client
  booking?: Booking
  service?: Service
  settings: Record<string, string>
}): Promise<string> {
  const { type, client, booking, service, settings } = params
  const businessName = settings.business_name || 'Glow Studio ATX'
  const isNew = booking?.is_new_client

  const prompts: Record<string, string> = {
    confirmation: `You are the AI assistant for ${businessName}, a boutique day spa.
Write a warm, personalized booking confirmation SMS (under 160 chars) for:
- Client: ${client.name}${isNew ? ' (new client)' : ' (returning client)'}
- Service: ${service?.name} (${service?.duration_minutes} min, $${service?.price})
- Date/Time: ${booking?.appointment_date} at ${booking?.appointment_time}
- Days until appointment: ${Math.ceil((new Date(booking?.appointment_date + 'T12:00:00').getTime() - Date.now()) / 86400000)}
- Prep instructions on file: ${service?.prep_instructions || 'none'}
- IMPORTANT: Only mention prep instructions if there is enough time to follow them. If the appointment is tomorrow or same day, skip prep instructions entirely and just wish them well.- Wellness goal: ${booking?.wellness_goal || 'not specified'}
Keep it warm, professional, and personal. Include the date/time. No emojis unless fitting.`,

    reminder: `You are the AI assistant for ${businessName}.
Write a friendly 24-hour appointment reminder SMS (under 160 chars) for:
- Client: ${client.name}
- Service: ${service?.name}
- Tomorrow at: ${booking?.appointment_time}
- Prep reminder: ${service?.prep_instructions || 'arrive on time'}
Warm, brief, includes service and time.`,

    followup: `You are the AI assistant for ${businessName}.
Write a genuine post-visit follow-up SMS (under 160 chars) for:
- Client: ${client.name}
- Service they just had: ${service?.name}
- Any concerns mentioned: ${booking?.symptoms || 'none'}
Ask how they're feeling, offer to answer questions. Warm and human.`,

    reactivation: `You are the AI assistant for ${businessName}.
Write a reactivation SMS (under 160 chars) for a client who hasn't visited in 28+ days:
- Client: ${client.name}
- Last service: ${service?.name || 'facial'}
- Visit count: ${client.visit_count}
Mention we miss them, offer to rebook, keep it personal not salesy.`,

    crm_note: `You are the AI assistant for ${businessName}.
Write a concise CRM note (2-3 sentences) summarizing this booking for the esthetician:
- Client: ${client.name} (${isNew ? 'NEW' : `${client.visit_count} visits`})
- Service: ${service?.name}
- Wellness goal: ${booking?.wellness_goal || 'not specified'}
- Symptoms/concerns: ${booking?.symptoms || 'none mentioned'}
- Health notes on file: ${client.health_notes || 'none'}
Focus on what the esthetician needs to know. Flag any contraindications. Professional tone.`,
  }

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 300,
    messages: [{ role: 'user', content: prompts[type] }],
  })

  return (response.content[0] as { text: string }).text.trim()
}

// ── Send email ───────────────────────────────────────────────────────────────
async function sendEmail(params: {
  to: string
  subject: string
  html: string
}): Promise<boolean> {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.FROM_EMAIL || 'onboarding@resend.dev',
      to: params.to,
      subject: params.subject,
      html: params.html,
    })
    if (error) {
      console.error('  ✗ Email error:', JSON.stringify(error))
      return false
    }
    console.log(`  ✓ Email sent → ${params.to} (id: ${data?.id})`)
    return true
  } catch (e) {
    console.error('  ✗ Email exception:', e instanceof Error ? e.message : e)
    return false
  }
}

// ── Send SMS ─────────────────────────────────────────────────────────────────
async function sendSms(to: string, body: string): Promise<boolean> {
  try {
    if (!to) return false
    // Always use DEMO_PHONE_OVERRIDE if set — required for Twilio trial accounts
    const recipient = process.env.DEMO_PHONE_OVERRIDE || (() => {
      const cleaned = to.replace(/\D/g, '')
      return cleaned.startsWith('1') ? `+${cleaned}` : `+1${cleaned}`
    })()
    const msg = await twilioClient.messages.create({
      body,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: recipient,
    })
    console.log(`  ✓ SMS sent → ${recipient} (sid: ${msg.sid})`)
    console.log(`  📱 "${body}"`)
    return true
  } catch (e) {
    console.error('  ✗ SMS error:', e instanceof Error ? e.message : e)
    return false
  }
}

// ── Main: run all automation for a new booking ───────────────────────────────
export async function runBookingAutomation(bookingId: string) {
  const db = createServiceClient()
  const settings = await getSettings()

  const { data: booking } = await db
    .from('bookings')
    .select('*, client:clients(*), service:services(*)')
    .eq('id', bookingId)
    .single()

  if (!booking) {
    console.log('⚠️  runBookingAutomation: booking not found', bookingId)
    return
  }

  const client: Client = booking.client
  const service: Service = booking.service

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🤖 AI AUTOMATION TRIGGERED')
  console.log(`   Client:     ${client.name} (${client.email})`)
  console.log(`   Phone:      ${client.phone || 'none'}`)
  console.log(`   Service:    ${service.name} — $${service.price}`)
  console.log(`   Appt:       ${booking.appointment_date} @ ${booking.appointment_time}`)
  console.log(`   New client: ${booking.is_new_client ? 'YES' : 'no'}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  // 1. CRM Note
  if (settings.crm_notes_enabled !== 'false') {
    console.log('\n📝 [1/3] Generating CRM note...')
    try {
      const note = await generateAiMessage({ type: 'crm_note', client, booking, service, settings })
      console.log(`  ✓ Note: "${note.substring(0, 100)}..."`)
      await db.from('clients').update({ health_notes: note }).eq('id', client.id)
      await logAiAction({
        booking_id: bookingId,
        client_id: client.id,
        trigger: 'new_booking',
        action: 'crm note',
        result: 'delivered',
        reasoning: note.substring(0, 120),
      })
    } catch (e) {
      console.error('  ✗ CRM note failed:', e)
    }
  }

  // 2. SMS Confirmation
  if (settings.confirmation_sms_enabled === 'true') {
    console.log('\n📱 [2/3] Sending SMS confirmation...')
    if (!client.phone && !process.env.DEMO_PHONE_OVERRIDE) {
      console.log('  ⚠ Skipped — no phone on file and no DEMO_PHONE_OVERRIDE set')
    } else {
      try {
        const smsBody = await generateAiMessage({ type: 'confirmation', client, booking, service, settings })
        const sent = await sendSms(client.phone || 'override', smsBody)
        await logAiAction({
          booking_id: bookingId,
          client_id: client.id,
          trigger: 'new_booking',
          action: 'sms',
          result: sent ? 'delivered' : 'failed',
          reasoning: smsBody.substring(0, 120),
        })
      } catch (e) {
        console.error('  ✗ SMS failed:', e)
      }
    }
  } else {
    console.log('\n📱 [2/3] SMS skipped (disabled in settings)')
  }

  // 3. Email Confirmation
  if (settings.confirmation_email_enabled === 'true' && client.email) {
    console.log('\n✉️  [3/3] Sending confirmation email...')
    try {
      const emailBody = await generateAiMessage({ type: 'confirmation', client, booking, service, settings })
      const html = buildEmailHtml({ client, booking, service, message: emailBody, businessName: settings.business_name, type: 'confirmation' })
      const sent = await sendEmail({
        to: process.env.DEMO_EMAIL_OVERRIDE || client.email,
        subject: `Your ${service.name} appointment is confirmed — ${settings.business_name}`,
        html,
      })
      await db.from('bookings').update({ confirmation_sent: true }).eq('id', bookingId)
      await logAiAction({
        booking_id: bookingId,
        client_id: client.id,
        trigger: 'new_booking',
        action: 'email',
        result: sent ? 'delivered' : 'failed',
        reasoning: emailBody.substring(0, 120),
      })
    } catch (e) {
      console.error('  ✗ Email failed:', e)
    }
  } else {
    console.log('\n✉️  [3/3] Email skipped (disabled or no email)')
  }

  console.log(`\n✅ Automation complete for ${client.name}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
}

// ── Run reminders ─────────────────────────────────────────────────────────────
export async function runReminders(overrideDate?: string) {
  const db = createServiceClient()
  const settings = await getSettings()
  if (settings.reminder_enabled !== 'true') return { skipped: 'reminder_enabled is false' }

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = overrideDate || tomorrow.toISOString().split('T')[0]

  console.log(`\n⏰ REMINDERS — checking appointments on ${tomorrowStr}`)

  const { data: bookings } = await db
    .from('bookings')
    .select('*, client:clients(*), service:services(*)')
    .eq('appointment_date', tomorrowStr)
    .eq('reminder_sent', false)

  console.log(`   Found: ${bookings?.length ?? 0} booking(s) needing reminders`)

  for (const booking of bookings || []) {
    const client: Client = booking.client
    const service: Service = booking.service
    if (!client || !service) continue

    console.log(`\n   → ${client.name} | ${service.name} @ ${booking.appointment_time}`)
    try {
      const msg = await generateAiMessage({ type: 'reminder', client, booking, service, settings })
      if (client.phone || process.env.DEMO_PHONE_OVERRIDE) {
        const sent = await sendSms(client.phone || 'override', msg)
        await logAiAction({ booking_id: booking.id, client_id: client.id, trigger: 'reminder_24h', action: 'sms', result: sent ? 'delivered' : 'failed', reasoning: msg.substring(0, 120) })
      }
      if (client.email) {
        const html = buildEmailHtml({ client, booking, service, message: msg, businessName: settings.business_name, type: 'reminder' })
        const sent = await sendEmail({ to: process.env.DEMO_EMAIL_OVERRIDE || client.email, subject: `Reminder: ${service.name} tomorrow — ${settings.business_name}`, html })
        await logAiAction({ booking_id: booking.id, client_id: client.id, trigger: 'reminder_24h', action: 'email', result: sent ? 'delivered' : 'failed', reasoning: msg.substring(0, 120) })
      }
      await db.from('bookings').update({ reminder_sent: true }).eq('id', booking.id)
    } catch (e) {
      console.error('  ✗ Reminder error:', e)
    }
  }
  return { date: tomorrowStr, bookings_found: bookings?.length ?? 0 }
}

// ── Run follow-ups ────────────────────────────────────────────────────────────
export async function runFollowups(overrideDate?: string) {
  const db = createServiceClient()
  const settings = await getSettings()
  if (settings.followup_enabled !== 'true') return { skipped: 'followup_enabled is false' }

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = overrideDate || yesterday.toISOString().split('T')[0]

  console.log(`\n💬 FOLLOW-UPS — checking appointments on ${yesterdayStr}`)

  const { data: bookings } = await db
    .from('bookings')
    .select('*, client:clients(*), service:services(*)')
    .eq('appointment_date', yesterdayStr)
    .eq('followup_sent', false)

  console.log(`   Found: ${bookings?.length ?? 0} booking(s) needing follow-ups`)

  for (const booking of bookings || []) {
    const client: Client = booking.client
    const service: Service = booking.service
    if (!client || !service) continue

    console.log(`\n   → Following up with ${client.name} about ${service.name}`)
    try {
      const msg = await generateAiMessage({ type: 'followup', client, booking, service, settings })
      if (client.phone || process.env.DEMO_PHONE_OVERRIDE) {
        const sent = await sendSms(client.phone || 'override', msg)
        await logAiAction({ booking_id: booking.id, client_id: client.id, trigger: 'followup_24h', action: 'sms', result: sent ? 'delivered' : 'failed', reasoning: msg.substring(0, 120) })
      }
      await db.from('bookings').update({ followup_sent: true }).eq('id', booking.id)
    } catch (e) {
      console.error('  ✗ Follow-up error:', e)
    }
  }
  return { date: yesterdayStr, bookings_found: bookings?.length ?? 0 }
}

// ── Run reactivation ──────────────────────────────────────────────────────────
export async function runReactivation() {
  const db = createServiceClient()
  const settings = await getSettings()
  if (settings.reactivation_enabled !== 'true') return { skipped: 'reactivation_enabled is false' }

  const days = parseInt(settings.reactivation_days || '28')
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const cutoffStr = cutoff.toISOString().split('T')[0]

  console.log(`\n🔄 REACTIVATION — clients inactive since ${cutoffStr}`)

  const { data: clients } = await db
    .from('clients')
    .select('*')
    .lt('last_visit', cutoffStr)
    .gt('visit_count', 0)

  console.log(`   Found: ${clients?.length ?? 0} inactive client(s)`)

  for (const client of clients || []) {
    if (!client.phone && !process.env.DEMO_PHONE_OVERRIDE) continue
    console.log(`\n   → Reactivating ${client.name} (last visit: ${client.last_visit})`)
    try {
      const msg = await generateAiMessage({ type: 'reactivation', client, settings })
      const sent = await sendSms(client.phone || 'override', msg)
      await logAiAction({ client_id: client.id, trigger: 'reactivation', action: 'sms', result: sent ? 'delivered' : 'failed', reasoning: msg.substring(0, 120) })
    } catch (e) {
      console.error('  ✗ Reactivation error:', e)
    }
  }
  return { cutoff_date: cutoffStr, clients_found: clients?.length ?? 0 }
}

// ── Email HTML template ───────────────────────────────────────────────────────
function buildEmailHtml(params: {
  client: Client
  booking?: Booking
  service?: Service
  message: string
  businessName?: string
  type: string
}): string {
  const { booking, service, message, businessName = 'Glow Studio ATX' } = params
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:Georgia,serif;">
  <div style="max-width:520px;margin:40px auto;background:#fff;border:1px solid #e8dfc8;border-radius:4px;overflow:hidden;">
    <div style="background:#0e0e0c;padding:32px 40px;text-align:center;">
      <p style="color:#f4694a;font-size:11px;letter-spacing:0.3em;text-transform:uppercase;margin:0 0 8px">${businessName}</p>
      <h1 style="color:#fff;font-size:26px;margin:0;font-weight:400;">
        ${params.type === 'confirmation' ? 'Your appointment is confirmed' : params.type === 'reminder' ? "See you tomorrow!" : "We'd love to hear from you"}
      </h1>
    </div>
    <div style="padding:36px 40px;">
      <p style="color:#333;font-size:15px;line-height:1.7;font-style:italic;border-left:2px solid #f4694a;padding-left:16px;margin:0 0 28px;">${message}</p>
      ${booking && service ? `
      <div style="background:#f9f6f0;border-radius:4px;padding:20px 24px;margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:6px 0;font-size:12px;color:#999;letter-spacing:0.1em;text-transform:uppercase;width:40%">Service</td><td style="font-size:14px;color:#1a1a17;font-weight:500;">${service.name}</td></tr>
          <tr><td style="padding:6px 0;font-size:12px;color:#999;letter-spacing:0.1em;text-transform:uppercase;">Date</td><td style="font-size:14px;color:#1a1a17;">${booking.appointment_date}</td></tr>
          <tr><td style="padding:6px 0;font-size:12px;color:#999;letter-spacing:0.1em;text-transform:uppercase;">Time</td><td style="font-size:14px;color:#1a1a17;">${booking.appointment_time}</td></tr>
          <tr><td style="padding:6px 0;font-size:12px;color:#999;letter-spacing:0.1em;text-transform:uppercase;">Duration</td><td style="font-size:14px;color:#1a1a17;">${service.duration_minutes} minutes</td></tr>
        </table>
      </div>
      ` : ''}
      <p style="color:#888;font-size:12px;text-align:center;margin:0;">Questions? Reply to this email or call us directly.</p>
    </div>
    <div style="background:#f5f0e8;padding:20px 40px;text-align:center;border-top:1px solid #e8dfc8;">
      <p style="color:#f4694a;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;margin:0;">Powered by TexAgent · AI Booking Automation</p>
    </div>
  </div>
</body>
</html>`
}
