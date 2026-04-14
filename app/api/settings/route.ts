import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function GET() {
  const db = createServiceClient()
  const { data, error } = await db.from('settings').select('key, value')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const settings: Record<string, string> = {}
  data?.forEach((row: { key: string; value: string }) => { settings[row.key] = row.value })
  return NextResponse.json({ settings })
}

export async function POST(request: NextRequest) {
  const db = createServiceClient()
  const { settings } = await request.json()

  const upserts = Object.entries(settings).map(([key, value]) => ({
    key,
    value: String(value),
    updated_at: new Date().toISOString(),
  }))

  const { error } = await db
    .from('settings')
    .upsert(upserts, { onConflict: 'key' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
