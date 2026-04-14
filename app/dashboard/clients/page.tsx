'use client'
import { useEffect, useState } from 'react'

interface Client {
  id: string
  name: string
  email: string
  phone?: string
  source?: string
  visit_count: number
  last_visit?: string
  health_notes?: string
  created_at: string
}

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(' ')
  const init = parts.length >= 2 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].substring(0, 2)
  return (
    <div style={{
      width: 48, height: 48,
      borderRadius: '50%',
      background: '#f4694a',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 16,
      fontWeight: 700,
      flexShrink: 0,
    }}>
      {init.toUpperCase()}
    </div>
  )
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/clients')
      .then(r => r.json())
      .then(data => { setClients(data.clients || []); setLoading(false) })
  }, [])

  return (
    <div>
      <div style={{ marginBottom: 40 }}>
        <p style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#7a7568', margin: '0 0 6px' }}>CRM</p>
        <h1 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 36, fontWeight: 400, margin: '0 0 6px' }}>Clients</h1>
        <p style={{ color: '#7a7568', fontSize: 14, margin: 0 }}>{clients.length} {clients.length === 1 ? 'person' : 'people'} in your database</p>
      </div>

      {loading ? (
        <div style={{ color: '#aaa', fontSize: 14 }}>Loading clients...</div>
      ) : clients.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 8, padding: 48, textAlign: 'center', color: '#aaa' }}>
          No clients yet — bookings will appear here automatically
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {clients.map(client => (
            <div key={client.id} style={{
              background: '#fff',
              border: '1px solid rgba(0,0,0,0.07)',
              borderRadius: 8,
              padding: '24px 28px',
            }}>
              {/* Header row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: client.health_notes ? 20 : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <Initials name={client.name} />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: 15 }}>{client.name}</span>
                      <span style={{
                        background: '#f3f4f6',
                        color: '#374151',
                        padding: '2px 8px',
                        borderRadius: 20,
                        fontSize: 11,
                        fontWeight: 500,
                      }}>
                        {client.visit_count} {client.visit_count === 1 ? 'visit' : 'visits'}
                      </span>
                      {client.source && (
                        <span style={{
                          background: '#e0f2fe',
                          color: '#075985',
                          padding: '2px 8px',
                          borderRadius: 20,
                          fontSize: 11,
                        }}>{client.source}</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 16, fontSize: 13, color: '#7a7568' }}>
                      <span>{client.email}</span>
                      {client.phone && <span>{client.phone}</span>}
                    </div>
                  </div>
                </div>
                {client.last_visit && (
                  <span style={{ fontSize: 12, color: '#7a7568' }}>Last visit: {client.last_visit}</span>
                )}
              </div>

              {/* AI Note */}
              {client.health_notes && (
                <div style={{
                  background: '#fafaf9',
                  border: '1px solid rgba(0,0,0,0.06)',
                  borderRadius: 6,
                  padding: '14px 18px',
                  marginLeft: 64,
                }}>
                  <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7a7568', margin: '0 0 6px', fontWeight: 600 }}>
                    AI Note
                  </p>
                  <p style={{ fontSize: 13, color: '#333', margin: 0, lineHeight: 1.6 }}>
                    {client.health_notes}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
