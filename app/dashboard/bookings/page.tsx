'use client'
import { useEffect, useState } from 'react'

interface Booking {
  id: string
  appointment_date: string
  appointment_time: string
  location_type: string
  status: string
  confirmation_sent: boolean
  reminder_sent: boolean
  is_new_client: boolean
  client?: { name: string; email: string }
  service?: { name: string; price: number }
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    pending: { bg: '#fef9c3', color: '#854d0e' },
    confirmed: { bg: '#dcfce7', color: '#166534' },
    cancelled: { bg: '#fee2e2', color: '#991b1b' },
    completed: { bg: '#e0f2fe', color: '#075985' },
  }
  const s = map[status] || map.pending
  return (
    <span style={{ background: s.bg, color: s.color, padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500, textTransform: 'capitalize' }}>
      {status}
    </span>
  )
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/bookings')
      .then(r => r.json())
      .then(data => { setBookings(data.bookings || []); setLoading(false) })
  }, [])

  return (
    <div>
      <div style={{ marginBottom: 40 }}>
        <p style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#7a7568', margin: '0 0 6px' }}>Management</p>
        <h1 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 36, fontWeight: 400, margin: '0 0 6px' }}>Bookings</h1>
        <p style={{ color: '#7a7568', fontSize: 14, margin: 0 }}>{bookings.length} most recent appointments</p>
      </div>

      <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 8, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#aaa' }}>Loading bookings...</div>
        ) : bookings.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#aaa' }}>No bookings yet</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
                {['Client', 'Service', 'Date', 'Time', 'Location', 'Status', 'Sent'].map(col => (
                  <th key={col} style={{
                    padding: '14px 20px',
                    textAlign: 'left',
                    fontSize: 11,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: '#7a7568',
                    fontWeight: 500,
                    background: '#fafaf9',
                  }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bookings.map((b, i) => (
                <tr key={b.id} style={{
                  borderBottom: i < bookings.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
                  transition: 'background 0.1s',
                }}>
                  <td style={{ padding: '18px 20px' }}>
                    <p style={{ fontWeight: 600, fontSize: 14, margin: '0 0 2px' }}>
                      {b.client?.name}
                      {b.is_new_client && (
                        <span style={{ background: '#dbeafe', color: '#1d4ed8', fontSize: 10, padding: '1px 6px', borderRadius: 10, marginLeft: 6, fontWeight: 500 }}>new</span>
                      )}
                    </p>
                    <p style={{ fontSize: 12, color: '#7a7568', margin: 0 }}>{b.client?.email}</p>
                  </td>
                  <td style={{ padding: '18px 20px' }}>
                    <p style={{ fontSize: 14, margin: '0 0 2px' }}>{b.service?.name}</p>
                    <p style={{ fontSize: 13, color: '#f4694a', fontWeight: 600, margin: 0 }}>${b.service?.price}</p>
                  </td>
                  <td style={{ padding: '18px 20px', fontSize: 14, color: '#333' }}>{b.appointment_date}</td>
                  <td style={{ padding: '18px 20px', fontSize: 14, color: '#333' }}>{b.appointment_time}</td>
                  <td style={{ padding: '18px 20px' }}>
                    <span style={{
                      background: '#f3f4f6',
                      color: '#374151',
                      padding: '3px 10px',
                      borderRadius: 20,
                      fontSize: 12,
                      textTransform: 'capitalize',
                    }}>{b.location_type}</span>
                  </td>
                  <td style={{ padding: '18px 20px' }}>
                    <StatusBadge status={b.status} />
                  </td>
                  <td style={{ padding: '18px 20px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <span title="Confirmation" style={{ fontSize: 14, opacity: b.confirmation_sent ? 1 : 0.25 }}>✉️</span>
                      <span title="Reminder" style={{ fontSize: 14, opacity: b.reminder_sent ? 1 : 0.25 }}>⏰</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
