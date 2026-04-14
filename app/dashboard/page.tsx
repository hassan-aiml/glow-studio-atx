'use client'
import { useEffect, useState } from 'react'

interface Stats {
  totalBookings: number
  thisWeek: number
  pending: number
  aiActions: number
}

interface Appt {
  id: string
  appointment_date: string
  appointment_time: string
  status: string
  client?: { name: string; email: string }
  service?: { name: string; price: number }
}

interface AiLog {
  id: string
  trigger: string
  action: string
  result: string
  reasoning?: string
  created_at: string
  client?: { name: string; email: string }
}

interface DateLabels {
  today: string
  tomorrow: string
  dayAfter: string
}

function StatCard({ label, value }: { label: string; value: number | null }) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid rgba(0,0,0,0.07)',
      borderRadius: 8,
      padding: '28px 32px',
    }}>
      <p style={{ fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#7a7568', margin: '0 0 12px' }}>
        {label}
      </p>
      <p style={{ fontSize: 42, fontWeight: 700, color: '#f4694a', margin: 0, lineHeight: 1 }}>
        {value ?? '—'}
      </p>
    </div>
  )
}

function TriggerBadge({ trigger }: { trigger: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    new_booking:  { bg: '#ede9fe', color: '#7c3aed', label: 'New booking' },
    reminder_24h: { bg: '#dbeafe', color: '#1d4ed8', label: 'Reminder' },
    followup_24h: { bg: '#dcfce7', color: '#166534', label: 'Follow-up' },
    reactivation: { bg: '#fce7f3', color: '#9d174d', label: 'Reactivation' },
  }
  const s = map[trigger] || { bg: '#f3f4f6', color: '#374151', label: trigger }
  return (
    <span style={{ background: s.bg, color: s.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500 }}>
      {s.label}
    </span>
  )
}

function dayLabel(dateStr: string, labels: DateLabels) {
  if (dateStr === labels.today) return 'Today'
  if (dateStr === labels.tomorrow) return 'Tomorrow'
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [upcomingAppts, setUpcomingAppts] = useState<Appt[]>([])
  const [recentAi, setRecentAi] = useState<AiLog[]>([])
  const [dateLabels, setDateLabels] = useState<DateLabels>({ today: '', tomorrow: '', dayAfter: '' })
  const [loading, setLoading] = useState(true)

  const fetchDashboard = () => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(data => {
        setStats(data.stats)
        setUpcomingAppts(data.upcomingAppts || [])
        setRecentAi(data.recentAi || [])
        setDateLabels(data.dateLabels || { today: '', tomorrow: '', dayAfter: '' })
        setLoading(false)
      })
  }
  
  useEffect(() => {
    fetchDashboard()
    const interval = setInterval(fetchDashboard, 10000) // refresh every 10 seconds
    return () => clearInterval(interval)
  }, [])

  // Group appointments by date
  const grouped: Record<string, Appt[]> = {}
  for (const a of upcomingAppts) {
    if (!grouped[a.appointment_date]) grouped[a.appointment_date] = []
    grouped[a.appointment_date].push(a)
  }

  return (
    <div>
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 36, fontWeight: 400, margin: '0 0 6px' }}>Dashboard</h1>
        <p style={{ color: '#7a7568', fontSize: 14, margin: 0 }}>Overview of your appointments and AI automation</p>
      </div>

      {/* STAT CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 40 }}>
        <StatCard label="Total Bookings" value={stats?.totalBookings ?? null} />
        <StatCard label="This Week"      value={stats?.thisWeek ?? null} />
        <StatCard label="Pending"        value={stats?.pending ?? null} />
        <StatCard label="AI Actions"     value={stats?.aiActions ?? null} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 24 }}>

        {/* UPCOMING APPOINTMENTS */}
        <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 8, padding: '28px 28px', minHeight: 320 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Upcoming Appointments</h2>
            <span style={{ fontSize: 11, color: '#7a7568', letterSpacing: '0.05em' }}>Next 3 days</span>
          </div>

          {loading ? (
            <p style={{ color: '#aaa', fontSize: 14 }}>Loading...</p>
          ) : upcomingAppts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <p style={{ color: '#ccc', fontSize: 28, margin: '0 0 10px' }}>📅</p>
              <p style={{ fontSize: 14, color: '#aaa', margin: '0 0 16px' }}>No appointments in the next 3 days</p>
              <button
                onClick={async () => {
                  await fetch('/api/cron', { method: 'POST' })
                  window.location.reload()
                }}
                style={{
                  padding: '8px 18px', background: '#f4694a', color: '#fff',
                  border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                }}
              >
                + Seed Demo Bookings
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {Object.entries(grouped).map(([date, appts]) => (
                <div key={date}>
                  <p style={{
                    fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase',
                    color: date === dateLabels.today ? '#f4694a' : '#7a7568',
                    fontWeight: 600, margin: '0 0 8px',
                  }}>
                    {dayLabel(date, dateLabels)}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {appts.map(appt => (
                      <div key={appt.id} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '12px 16px', background: '#f9f6f0', borderRadius: 6,
                        border: '1px solid rgba(0,0,0,0.05)',
                        borderLeft: `3px solid ${date === dateLabels.today ? '#f4694a' : '#d1c9b8'}`,
                      }}>
                        <div>
                          <p style={{ fontWeight: 600, fontSize: 14, margin: '0 0 2px' }}>{appt.client?.name}</p>
                          <p style={{ fontSize: 12, color: '#7a7568', margin: 0 }}>
                            {appt.service?.name} · {appt.appointment_time}
                          </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{
                            background: appt.status === 'confirmed' ? '#dcfce7' : '#fef9c3',
                            color: appt.status === 'confirmed' ? '#166534' : '#854d0e',
                            padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500,
                            textTransform: 'capitalize', display: 'block', marginBottom: 4,
                          }}>{appt.status}</span>
                          <p style={{ fontSize: 13, color: '#f4694a', fontWeight: 600, margin: 0 }}>
                            ${appt.service?.price}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RECENT AI ACTIONS */}
        <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 8, padding: '28px 28px', minHeight: 320 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 20px' }}>Recent AI Actions</h2>

          {loading ? (
            <p style={{ color: '#aaa', fontSize: 14 }}>Loading...</p>
          ) : recentAi.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <p style={{ color: '#ccc', fontSize: 28, margin: '0 0 10px' }}>🤖</p>
              <p style={{ fontSize: 14, color: '#aaa' }}>No AI actions yet — make a booking to trigger automation</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {recentAi.map((log, i) => (
                <div key={log.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                  padding: '13px 0',
                  borderBottom: i < recentAi.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 14 }}>
                        {log.action === 'sms' ? '📱' : log.action === 'email' ? '✉️' : '📝'}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 600, textTransform: 'capitalize' }}>{log.action}</span>
                    </div>
                    <p style={{ fontSize: 12, color: '#7a7568', margin: '0 0 2px' }}>
                      {log.client?.name || '—'} · {log.client?.email || ''}
                    </p>
                    <p style={{ fontSize: 11, color: '#bbb', margin: 0 }}>
                      {new Date(log.created_at).toLocaleString('en-US', {
                        month: 'short', day: 'numeric',
                        hour: 'numeric', minute: '2-digit', hour12: true,
                      })}
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0, marginLeft: 12 }}>
                    <span style={{
                      color: log.result === 'delivered' ? '#16a34a' : '#dc2626',
                      fontSize: 12, fontWeight: 600,
                    }}>{log.result}</span>
                    <TriggerBadge trigger={log.trigger} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* DEBUG STRIP — visible in dev */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{ marginTop: 32, padding: '16px 20px', background: '#1a1a17', borderRadius: 8, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: '#f4694a', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>Dev tools</span>
          <DevBtn label="Seed demo bookings" onClick={async () => { await fetch('/api/cron', { method: 'POST' }); window.location.reload() }} />
          <DevBtn label="Run reminders (today→tomorrow)" onClick={async () => {
            const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
            const res = await fetch(`/api/cron?reminder_date=${tomorrow.toISOString().split('T')[0]}`)
            alert(JSON.stringify(await res.json(), null, 2))
          }} />
          <DevBtn label="Run all cron" onClick={async () => {
            const res = await fetch('/api/cron')
            alert(JSON.stringify(await res.json(), null, 2))
          }} />
          <DevBtn label="Debug integrations" onClick={async () => {
            const res = await fetch('/api/debug')
            alert(JSON.stringify(await res.json(), null, 2))
          }} />
        </div>
      )}
    </div>
  )
}

function DevBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: '7px 14px', background: 'rgba(244,105,74,0.15)',
      color: '#f4694a', border: '1px solid rgba(244,105,74,0.3)',
      borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
      fontFamily: "'DM Sans', sans-serif", letterSpacing: '0.05em',
    }}>{label}</button>
  )
}
