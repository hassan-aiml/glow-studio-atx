import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function GET(request: NextRequest) {
  const to = request.nextUrl.searchParams.get('to') || 'delivered@resend.dev'
  const resend = new Resend(process.env.RESEND_API_KEY)

  console.log('\n📧 DEBUG EMAIL TEST')
  console.log(`   From: ${process.env.FROM_EMAIL}`)
  console.log(`   To:   ${to}`)

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.FROM_EMAIL || 'onboarding@resend.dev',
      to,
      subject: 'TexAgent — Email Test',
      html: `<p>Test email from TexAgent at ${new Date().toISOString()}</p>`,
    })

    if (error) {
      console.error('   ✗ Resend error:', JSON.stringify(error))
      return NextResponse.json({ success: false, error, from: process.env.FROM_EMAIL, to })
    }

    console.log(`   ✓ Sent! ID: ${data?.id}`)
    return NextResponse.json({ success: true, id: data?.id, from: process.env.FROM_EMAIL, to })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('   ✗ Exception:', msg)
    return NextResponse.json({ success: false, exception: msg })
  }
}