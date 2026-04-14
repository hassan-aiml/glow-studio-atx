'use client'
import { useEffect, useState } from 'react'

interface SettingsMap {
  confirmation_email_enabled: string
  confirmation_sms_enabled: string
  crm_notes_enabled: string
  reminder_enabled: string
  followup_enabled: string
  reactivation_enabled: string
  reactivation_days: string
  business_name: string
  business_phone: string
  studio_address: string
  owner_email: string
  daily_start_time: string
  daily_end_time: string
}

function Toggle({ checked, onChange, label, icon }: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  icon: string
}) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '16px 20px',
      background: '#fff',
      borderRadius: 8,
      border: '1px solid rgba(0,0,0,0.07)',
    }}>
      <span style={{ fontSize: 14, fontWeight: 500 }}>
        {icon} {label}
      </span>
      <button
        onClick={() => onChange(!checked)}
        style={{
          width: 44,
          height: 24,
          borderRadius: 12,
          background: checked ? '#f4694a' : '#d1d5db',
          border: 'none',
          cursor: 'pointer',
          position: 'relative',
          transition: 'background 0.2s',
          flexShrink: 0,
        }}
      >
        <span style={{
          position: 'absolute',
          top: 2,
          left: checked ? 22 : 2,
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          transition: 'left 0.2s',
        }} />
      </button>
    </div>
  )
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Partial<SettingsMap>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => { setSettings(data.settings || {}); setLoading(false) })
  }, [])

  function setKey(key: keyof SettingsMap, value: string) {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  function toggle(key: keyof SettingsMap) {
    setSettings(prev => ({ ...prev, [key]: prev[key] === 'true' ? 'false' : 'true' }))
  }

  async function handleSave() {
    setSaving(true)
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading) return <div style={{ color: '#aaa', padding: 48 }}>Loading settings...</div>

  const bool = (key: keyof SettingsMap) => settings[key] === 'true'

  return (
    <div>
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 36, fontWeight: 400, margin: '0 0 6px' }}>Settings</h1>
        <p style={{ color: '#7a7568', fontSize: 14, margin: 0 }}>Configure AI automations and notifications</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, maxWidth: 900 }}>

        {/* Automated Services */}
        <div style={{ background: '#f9f6f0', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 10, padding: '24px 24px' }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 16px' }}>Automated Services</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Toggle icon="✉️" label="Confirmation & Reminder Emails" checked={bool('confirmation_email_enabled')} onChange={() => toggle('confirmation_email_enabled')} />
            <Toggle icon="📱" label="SMS Text Messages" checked={bool('confirmation_sms_enabled')} onChange={() => toggle('confirmation_sms_enabled')} />
            <Toggle icon="📝" label="CRM Notes" checked={bool('crm_notes_enabled')} onChange={() => toggle('crm_notes_enabled')} />
            <Toggle icon="⏰" label="Appointment Reminders (24h before)" checked={bool('reminder_enabled')} onChange={() => toggle('reminder_enabled')} />
            <Toggle icon="💬" label="Post-Visit Follow-ups" checked={bool('followup_enabled')} onChange={() => toggle('followup_enabled')} />
          </div>
        </div>

        {/* Customer Reactivation */}
        <div style={{ background: '#f9f6f0', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 10, padding: '24px 24px' }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 6px' }}>Customer Reactivation</h2>
          <p style={{ fontSize: 13, color: '#7a7568', margin: '0 0 16px' }}>Automatically reach out to inactive customers</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Toggle icon="🔄" label="Reactivation Campaigns" checked={bool('reactivation_enabled')} onChange={() => toggle('reactivation_enabled')} />
          </div>
          {bool('reactivation_enabled') && (
            <div style={{ marginTop: 20, background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 8, padding: '18px 20px' }}>
              <p style={{ fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#7a7568', margin: '0 0 10px' }}>
                Days of inactivity before reactivation
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="number"
                  value={settings.reactivation_days || '28'}
                  onChange={e => setKey('reactivation_days', e.target.value)}
                  style={{
                    width: 80,
                    padding: '10px 12px',
                    border: '1.5px solid rgba(0,0,0,0.12)',
                    borderRadius: 6,
                    fontSize: 15,
                    fontWeight: 600,
                    fontFamily: "'DM Sans', sans-serif",
                    textAlign: 'center',
                    outline: 'none',
                  }}
                />
                <span style={{ fontSize: 14, color: '#555' }}>days</span>
              </div>
              <p style={{ fontSize: 12, color: '#7a7568', margin: '10px 0 0' }}>
                Customers with no bookings in the last {settings.reactivation_days || '28'} days will receive a reactivation message.
              </p>
            </div>
          )}
        </div>

        {/* Business Info */}
        <div style={{ background: '#f9f6f0', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 10, padding: '24px 24px' }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 16px' }}>Business Info</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {([
              { key: 'business_name', label: 'Business Name' },
              { key: 'business_phone', label: 'Phone' },
              { key: 'owner_email', label: 'Owner Email' },
              { key: 'studio_address', label: 'Address' },
            ] as { key: keyof SettingsMap; label: string }[]).map(({ key, label }) => (
              <div key={key}>
                <label style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7a7568', display: 'block', marginBottom: 6 }}>
                  {label}
                </label>
                <input
                  type="text"
                  value={settings[key] || ''}
                  onChange={e => setKey(key, e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1.5px solid rgba(0,0,0,0.1)',
                    borderRadius: 6,
                    fontSize: 13,
                    fontFamily: "'DM Sans', sans-serif",
                    outline: 'none',
                    background: '#fff',
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Availability */}
        <div style={{ background: '#f9f6f0', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 10, padding: '24px 24px' }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 16px' }}>Availability</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {([
              { key: 'daily_start_time', label: 'Open Time' },
              { key: 'daily_end_time', label: 'Close Time' },
            ] as { key: keyof SettingsMap; label: string }[]).map(({ key, label }) => (
              <div key={key}>
                <label style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7a7568', display: 'block', marginBottom: 6 }}>
                  {label}
                </label>
                <input
                  type="text"
                  value={settings[key] || ''}
                  onChange={e => setKey(key, e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1.5px solid rgba(0,0,0,0.1)',
                    borderRadius: 6,
                    fontSize: 13,
                    fontFamily: "'DM Sans', sans-serif",
                    outline: 'none',
                    background: '#fff',
                  }}
                />
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Save Button */}
      <div style={{ marginTop: 32, maxWidth: 900 }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '13px 32px',
            background: saved ? '#16a34a' : '#f4694a',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontSize: 14,
            fontWeight: 600,
            cursor: saving ? 'not-allowed' : 'pointer',
            fontFamily: "'DM Sans', sans-serif",
            transition: 'background 0.2s',
          }}
        >
          {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save Settings'}
        </button>
      </div>
    </div>
  )
}
