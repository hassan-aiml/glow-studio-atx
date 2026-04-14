'use client'
import { useEffect, useState } from 'react'

interface AiLog {
  id: string
  trigger: string
  action: string
  result: string
  reasoning?: string
  created_at: string
  client?: { name: string; email: string }
}

function TriggerBadge({ trigger }: { trigger: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    new_booking: { bg: '#ede9fe', color: '#7c3aed', label: 'New booking' },
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

function ActionIcon({ action }: { action: string }) {
  const map: Record<string, string> = {
    sms: '📱 sms',
    email: '✉️ email',
    'crm note': '📝 crm note',
  }
  return <span style={{ fontSize: 13 }}>{map[action] || action}</span>
}

export default function AiLogPage() {
  const [logs, setLogs] = useState<AiLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/ai-log')
      .then(r => r.json())
      .then(data => { setLogs(data.logs || []); setLoading(false) })
  }, [])

  return (
    <div>
      <div style={{ marginBottom: 40 }}>
        <p style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#7a7568', margin: '0 0 6px' }}>Automation</p>
        <h1 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 36, fontWeight: 400, margin: '0 0 6px' }}>AI activity log</h1>
        <p style={{ color: '#7a7568', fontSize: 14, margin: 0 }}>{logs.length} autonomous actions recorded</p>
      </div>

      <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 8, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#aaa' }}>Loading...</div>
        ) : logs.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#aaa' }}>No AI actions yet — book an appointment to trigger automation</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#fafaf9', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
                {['Time', 'Trigger', 'Client', 'Action', 'Result', 'AI Reasoning'].map(col => (
                  <th key={col} style={{
                    padding: '13px 20px',
                    textAlign: 'left',
                    fontSize: 11,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: '#7a7568',
                    fontWeight: 500,
                  }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <tr key={log.id} style={{ borderBottom: i < logs.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
                  <td style={{ padding: '14px 20px', fontSize: 13, color: '#555', whiteSpace: 'nowrap' }}>
                    {new Date(log.created_at).toLocaleString('en-US', {
                      month: 'short', day: 'numeric',
                      hour: 'numeric', minute: '2-digit', hour12: true,
                    })}
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <TriggerBadge trigger={log.trigger} />
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: 13 }}>
                    {log.client?.name || '—'}
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <ActionIcon action={log.action} />
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <span style={{
                      color: log.result === 'delivered' ? '#16a34a' : '#dc2626',
                      fontSize: 13,
                      fontWeight: 600,
                    }}>{log.result}</span>
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: 12, color: '#7a7568', maxWidth: 320 }}>
                    <span style={{
                      display: 'block',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }} title={log.reasoning}>
                      {log.reasoning || '—'}
                    </span>
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
