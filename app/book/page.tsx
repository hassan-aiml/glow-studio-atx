'use client'
import { useEffect, useState } from 'react'

interface Service {
  id: string
  name: string
  slug: string
  description?: string
  duration_minutes: number
  price: number
  prep_instructions?: string
}

const TIME_SLOTS = [
  '9:00 AM','9:45 AM','10:30 AM','11:15 AM','12:00 PM',
  '12:45 PM','2:00 PM','2:45 PM','3:30 PM','4:15 PM','5:00 PM',
]

const SERVICE_ICONS: Record<string, string> = {
  'custom-facial': '✦',
  'deep-cleanse': '◈',
  'anti-aging': '⬡',
  dermaplaning: '◎',
  'chemical-peel': '❋',
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: '0.15em',
  textTransform: 'uppercase',
  color: '#7a7568',
  display: 'block',
  marginBottom: 7,
  fontWeight: 500,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  border: '1.5px solid rgba(0,0,0,0.1)',
  borderRadius: 6,
  fontSize: 14,
  fontFamily: "'DM Sans', sans-serif",
  outline: 'none',
  background: '#fff',
  color: '#0e0e0c',
}

function SectionHeader({ number, title, subtitle }: { number: string; title: string; subtitle: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        background: '#0e0e0c', color: '#f4694a',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, fontWeight: 700, flexShrink: 0,
      }}>{number}</div>
      <div>
        <p style={{ fontFamily: "'Instrument Serif', serif", fontSize: 18, margin: 0, fontWeight: 400 }}>{title}</p>
        <p style={{ fontSize: 12, color: '#7a7568', margin: '2px 0 0' }}>{subtitle}</p>
      </div>
    </div>
  )
}

export default function BookPage() {
  const [services, setServices] = useState<Service[]>([])
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [bookedSlots, setBookedSlots] = useState<string[]>([])
  const [form, setForm] = useState({ name: '', email: '', phone: '', wellness_goal: '', symptoms: '' })
  const [submitting, setSubmitting] = useState(false)
  const [bookingError, setBookingError] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [aiMessage, setAiMessage] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [businessName, setBusinessName] = useState('Glow Studio ATX')

  useEffect(() => {
    fetch('/api/services').then(r => r.json()).then(d => setServices(d.services || []))
    fetch('/api/settings').then(r => r.json()).then(d => {
      if (d.settings?.business_name) setBusinessName(d.settings.business_name)
    })
    const today = new Date()
    const y = today.getFullYear()
    const m = String(today.getMonth() + 1).padStart(2, '0')
    const d = String(today.getDate()).padStart(2, '0')
    setSelectedDate(`${y}-${m}-${d}`)
  }, [])

  useEffect(() => {
    if (!selectedDate) return
    setSelectedTime('')
    fetch(`/api/availability?date=${selectedDate}`)
      .then(r => r.json())
      .then(d => setBookedSlots(d.booked || []))
  }, [selectedDate])

  function getAvailableSlots() {
    const now = new Date()
    const todayLocal = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
    const isToday = selectedDate === todayLocal
    return TIME_SLOTS.filter(t => {
      if (isToday) {
        const [timePart, meridiem] = t.split(' ')
        const [hours, minutes] = timePart.split(':').map(Number)
        let slotHour = hours
        if (meridiem === 'PM' && hours !== 12) slotHour = hours + 12
        if (meridiem === 'AM' && hours === 12) slotHour = 0
        const slotMinutes = slotHour * 60 + minutes
        const currentMinutes = now.getHours() * 60 + now.getMinutes()
        if (slotMinutes <= currentMinutes + 60) return false
      }
      return true
    })
  }

  const canSubmit = !!selectedService && !!selectedDate && !!selectedTime
    && !!form.name && !!form.email && !!form.phone

  async function handleSubmit() {
    if (!canSubmit) return
    setSubmitting(true)
    setBookingError('')
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        email: form.email,
        phone: form.phone,
        service_id: selectedService!.id,
        appointment_date: selectedDate,
        appointment_time: selectedTime,
        location_type: 'studio',
        wellness_goal: form.wellness_goal,
        symptoms: form.symptoms,
        source: 'booking_page',
      }),
    })
    const data = await res.json()
    setSubmitting(false)
    if (data.success) {
      setConfirmed(true)
      generateAiConfirmation()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      setBookingError(data.error || 'Something went wrong. Please try again.')
      if (res.status === 409) {
        setSelectedTime('')
        fetch(`/api/availability?date=${selectedDate}`).then(r => r.json()).then(d => setBookedSlots(d.booked || []))
      }
    }
  }

  async function generateAiConfirmation() {
    setAiLoading(true)
    const dateFormatted = selectedDate
      ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
      : ''
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: `You are the AI concierge for ${businessName}, a boutique day spa. Write a warm, personalized 2-3 sentence booking confirmation for:
- Client: ${form.name}
- Service: ${selectedService?.name} (${selectedService?.duration_minutes} min, $${selectedService?.price})
- Date: ${dateFormatted} at ${selectedTime}
- Wellness goal: ${form.wellness_goal || 'not specified'}
Warm, refined tone. Reference the specific service. Just the message, no greetings or sign-offs.`,
          }],
        }),
      })
      const json = await res.json()
      setAiMessage(json.content?.[0]?.text || `${form.name.split(' ')[0]}, we're looking forward to welcoming you for your ${selectedService?.name}. Your appointment is confirmed — we'll see you soon.`)
    } catch {
      setAiMessage(`${form.name.split(' ')[0]}, we're looking forward to welcoming you for your ${selectedService?.name}. Your appointment is confirmed — we'll see you soon.`)
    }
    setAiLoading(false)
  }

  function resetForm() {
    setConfirmed(false)
    setSelectedService(null)
    setSelectedTime('')
    setForm({ name: '', email: '', phone: '', wellness_goal: '', symptoms: '' })
    setBookingError('')
    setAiMessage('')
  }

  const dateFormatted = selectedDate
    ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    : ''

  const availableSlots = getAvailableSlots()

  if (confirmed) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f0e8', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ maxWidth: 580, width: '100%' }}>
          <div style={{ background: '#0e0e0c', borderRadius: '8px 8px 0 0', padding: '48px 40px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -40, left: '50%', transform: 'translateX(-50%)', width: 160, height: 160, background: 'radial-gradient(circle, rgba(244,105,74,0.2) 0%, transparent 70%)', borderRadius: '50%' }} />
            <div style={{ width: 60, height: 60, borderRadius: '50%', border: '1.5px solid #f4694a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', position: 'relative', zIndex: 1 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f4694a" strokeWidth="1.8"><path d="M20 6L9 17l-5-5"/></svg>
            </div>
            <h1 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 30, color: '#fff', margin: '0 0 8px', fontWeight: 400, position: 'relative', zIndex: 1 }}>
              You&apos;re <em style={{ color: '#f4694a' }}>Confirmed</em>
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, position: 'relative', zIndex: 1 }}>We&apos;ll see you soon at {businessName}</p>
          </div>
          <div style={{ background: '#1a1a17', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
            {[
              { label: 'Service', value: selectedService?.name },
              { label: 'Date & Time', value: `${dateFormatted} · ${selectedTime}` },
              { label: 'Investment', value: `$${selectedService?.price}` },
            ].map((item, i) => (
              <div key={i} style={{ padding: '18px 16px', borderRight: i < 2 ? '1px solid rgba(255,255,255,0.06)' : 'none', textAlign: 'center' }}>
                <p style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', margin: '0 0 5px' }}>{item.label}</p>
                <p style={{ fontSize: 13, color: '#fff', margin: 0 }}>{item.value}</p>
              </div>
            ))}
          </div>
          <div style={{ background: '#fff', padding: '32px 36px', borderRadius: '0 0 8px 8px', border: '1px solid rgba(0,0,0,0.07)', borderTop: 'none' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#f4694a', padding: '5px 14px', border: '1px solid rgba(244,105,74,0.25)', borderRadius: 20, marginBottom: 20 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f4694a', animation: 'pulse 1.5s infinite' }} />
              AI-Personalized Message
            </div>
            {aiLoading ? (
              <div style={{ display: 'flex', gap: 6, padding: '8px 0' }}>
                {[0,1,2].map(i => <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#f4694a', opacity: 0.5, display: 'inline-block' }} />)}
              </div>
            ) : (
              <p style={{ fontFamily: "'Instrument Serif', serif", fontSize: 17, lineHeight: 1.75, color: '#0e0e0c', fontStyle: 'italic', borderLeft: '2px solid #f4694a', paddingLeft: 18, margin: 0 }}>
                {aiMessage}
              </p>
            )}
            <div style={{ marginTop: 28, display: 'flex', justifyContent: 'center' }}>
              <button onClick={resetForm} style={{ padding: '10px 24px', background: 'transparent', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 6, fontSize: 13, cursor: 'pointer', color: '#555', fontFamily: "'DM Sans', sans-serif" }}>
                Book Another Visit
              </button>
            </div>
          </div>
        </div>
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f0e8', fontFamily: "'DM Sans', sans-serif" }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 40px', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
        <div>
          <p style={{ fontFamily: "'Instrument Serif', serif", fontSize: 20, margin: 0 }}>{businessName}</p>
          <p style={{ fontSize: 10, color: '#f4694a', letterSpacing: '0.2em', textTransform: 'uppercase', margin: '2px 0 0' }}>Facial Artistry · Austin TX</p>
        </div>
        <span style={{ fontSize: 12, color: '#7a7568', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Book Online</span>
      </header>

      <div style={{ textAlign: 'center', padding: '48px 24px 36px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 14, color: '#f4694a', fontSize: 11, letterSpacing: '0.28em', textTransform: 'uppercase' }}>
          <span style={{ width: 28, height: 1, background: '#f4694a', display: 'inline-block', opacity: 0.5 }} />
          Reserve Your Experience
          <span style={{ width: 28, height: 1, background: '#f4694a', display: 'inline-block', opacity: 0.5 }} />
        </div>
        <h1 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 48, fontWeight: 400, margin: '0 0 10px', lineHeight: 1.08 }}>
          Skin Care, <em style={{ color: '#f4694a' }}>Elevated</em>
        </h1>
        <p style={{ color: '#7a7568', fontSize: 14, fontWeight: 300, maxWidth: 340, margin: '0 auto' }}>
          Fill out the form below and we&apos;ll take care of everything else.
        </p>
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto 80px', padding: '0 20px' }}>
        <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 8, overflow: 'hidden', boxShadow: '0 2px 32px rgba(0,0,0,0.05)' }}>
          <div style={{ padding: '40px 40px' }}>

            <SectionHeader number="1" title="Choose Your Treatment" subtitle="Select from our signature services" />
            {services.length === 0 ? (
              <p style={{ color: '#aaa', fontSize: 14, marginBottom: 40 }}>Loading services...</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 40 }}>
                {services.map(s => {
                  const active = selectedService?.id === s.id
                  return (
                    <div key={s.id} onClick={() => setSelectedService(s)} style={{ border: `1.5px solid ${active ? '#f4694a' : 'rgba(0,0,0,0.08)'}`, borderRadius: 6, padding: '16px 14px', cursor: 'pointer', background: active ? '#fde8e3' : '#fafaf9', boxShadow: active ? '0 0 0 1px #f4694a' : 'none', transition: 'all 0.2s', position: 'relative' }}>
                      {active && (
                        <div style={{ position: 'absolute', top: 8, right: 8, width: 18, height: 18, borderRadius: '50%', background: '#f4694a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="9" height="7" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>
                        </div>
                      )}
                      <span style={{ fontSize: 20, marginBottom: 8, display: 'block' }}>{SERVICE_ICONS[s.slug] || '✦'}</span>
                      <p style={{ fontFamily: "'Instrument Serif', serif", fontSize: 14, margin: '0 0 3px', fontWeight: 400 }}>{s.name}</p>
                      <p style={{ fontSize: 10, color: '#7a7568', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 6px' }}>{s.duration_minutes} min</p>
                      <p style={{ fontSize: 16, fontWeight: 600, color: '#f4694a', margin: 0 }}>${s.price}</p>
                    </div>
                  )
                })}
              </div>
            )}

            <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', marginBottom: 36 }} />

            <SectionHeader number="2" title="Select Date & Time" subtitle="Choose when you'd like to visit" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
              <div>
                <label style={labelStyle}>Date</label>
                <input type="date" value={selectedDate} min={(() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}` })()} onChange={e => setSelectedDate(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Esthetician</label>
                <select style={inputStyle}>
                  <option>Any available</option>
                  <option>Sophia L. — Senior Esthetician</option>
                  <option>Mia K. — Specialist, Anti-aging</option>
                </select>
              </div>
            </div>
            <label style={labelStyle}>Available Times</label>
            {availableSlots.length === 0 ? (
              <p style={{ fontSize: 13, color: '#aaa', marginBottom: 36 }}>No available slots for this date. Please select another date.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 40 }}>
                {availableSlots.map(t => {
                  const unavail = bookedSlots.includes(t)
                  const active = selectedTime === t
                  return (
                    <button key={t} disabled={unavail} onClick={() => setSelectedTime(t)} style={{ padding: '11px 8px', border: `1.5px solid ${active ? '#0e0e0c' : 'rgba(0,0,0,0.1)'}`, borderRadius: 6, background: active ? '#0e0e0c' : unavail ? '#f5f5f5' : '#fafaf9', color: active ? '#f4694a' : unavail ? '#ccc' : '#333', fontSize: 13, fontWeight: active ? 600 : 400, cursor: unavail ? 'not-allowed' : 'pointer', textDecoration: unavail ? 'line-through' : 'none', fontFamily: "'DM Sans', sans-serif", transition: 'all 0.15s' }}>
                      {t}
                    </button>
                  )
                })}
              </div>
            )}

            <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', marginBottom: 36 }} />

            <SectionHeader number="3" title="Your Information" subtitle="Just a few details to confirm your booking" />
            {selectedService && selectedTime && (
              <div style={{ background: '#0e0e0c', borderRadius: 6, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                  <p style={{ fontFamily: "'Instrument Serif', serif", fontSize: 16, color: '#fff', margin: '0 0 2px' }}>{selectedService.name}</p>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: 0 }}>{dateFormatted} · {selectedTime}</p>
                </div>
                <p style={{ fontSize: 20, fontWeight: 600, color: '#f4694a', margin: 0 }}>${selectedService.price}</p>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Full Name</label>
                <input type="text" placeholder="Jane Smith" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input type="email" placeholder="jane@email.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Phone</label>
                <input type="text" placeholder="(512) 000-0000" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} style={inputStyle} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Wellness Goal (optional)</label>
                <input type="text" placeholder="e.g. brighter skin, reduce redness" value={form.wellness_goal} onChange={e => setForm(f => ({ ...f, wellness_goal: e.target.value }))} style={inputStyle} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Skin Concerns (optional)</label>
                <input type="text" placeholder="e.g. dryness, hyperpigmentation" value={form.symptoms} onChange={e => setForm(f => ({ ...f, symptoms: e.target.value }))} style={inputStyle} />
              </div>
            </div>
          </div>

          <div style={{ padding: '20px 40px 36px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
            {bookingError && (
              <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 6, padding: '10px 14px', fontSize: 13, color: '#991b1b', marginBottom: 16 }}>
                ⚠️ {bookingError}
              </div>
            )}
            {!canSubmit && (
              <p style={{ fontSize: 12, color: '#aaa', marginBottom: 12 }}>
                {!selectedService ? '← Select a service to continue' : !selectedTime ? '← Pick a date and time' : '← Fill in your contact details'}
              </p>
            )}
            <button onClick={handleSubmit} disabled={!canSubmit || submitting} style={{ width: '100%', padding: '15px', background: canSubmit && !submitting ? '#0e0e0c' : '#d1cdc7', color: canSubmit && !submitting ? '#f4694a' : '#999', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', cursor: canSubmit && !submitting ? 'pointer' : 'not-allowed', fontFamily: "'DM Sans', sans-serif", transition: 'all 0.2s' }}>
              {submitting ? 'Confirming your booking...' : 'Confirm Booking →'}
            </button>
          </div>

        </div>
      </div>

      <div style={{ textAlign: 'center', paddingBottom: 48 }}>
        <span style={{ background: '#0e0e0c', color: '#f4694a', padding: '6px 16px', borderRadius: 20, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          ⚡ AI Booking by TexAgent
        </span>
      </div>
    </div>
  )
}