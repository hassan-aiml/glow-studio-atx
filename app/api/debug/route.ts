import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { Resend } from 'resend'
import twilio from 'twilio'

export async function GET() {
  const results: Record<string, unknown> = {}

  // 1. Supabase
  try {
    const db = createServiceClient()
    const { data, error } = await db.from('settings').select('key').limit(1)
    results.supabase = error ? `ERROR: ${error.message}` : `OK (${data?.length} row)`
  } catch (e) {
    results.supabase = `EXCEPTION: ${e}`
  }

  // 2. Resend — sends to their test address
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { data, error } = await resend.emails.send({
      from: process.env.FROM_EMAIL || 'onboarding@resend.dev',
      to: 'delivered@resend.dev',
      subject: 'TexAgent Debug Test',
      html: '<p>Email delivery test from TexAgent debug endpoint.</p>',
    })
    results.resend = error ? `ERROR: ${JSON.stringify(error)}` : `OK (id: ${data?.id})`
  } catch (e) {
    results.resend = `EXCEPTION: ${e instanceof Error ? e.message : String(e)}`
  }

  // 3. Twilio — just validate credentials
  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    const account = await client.api.accounts(process.env.TWILIO_ACCOUNT_SID!).fetch()
    results.twilio = `OK (account: ${account.friendlyName}, status: ${account.status})`
  } catch (e) {
    results.twilio = `ERROR: ${e instanceof Error ? e.message : String(e)}`
  }

  // 4. Anthropic key check
  results.anthropic_key = process.env.ANTHROPIC_API_KEY
    ? `Set (${process.env.ANTHROPIC_API_KEY.substring(0, 15)}...)`
    : 'MISSING'

  // 5. Env summary
  results.env = {
    supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'MISSING',
    supabase_service_key: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'MISSING',
    resend_key: process.env.RESEND_API_KEY ? 'Set' : 'MISSING',
    from_email: process.env.FROM_EMAIL || 'MISSING',
    twilio_sid: process.env.TWILIO_ACCOUNT_SID ? 'Set' : 'MISSING',
    twilio_token: process.env.TWILIO_AUTH_TOKEN ? 'Set' : 'MISSING',
    twilio_phone: process.env.TWILIO_PHONE_NUMBER || 'MISSING',
    cron_secret: process.env.CRON_SECRET ? 'Set' : 'MISSING',
  }

  return NextResponse.json(results, { status: 200 })
}
