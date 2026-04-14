'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    const data = await res.json()
    if (data.success) {
      router.push('/dashboard')
    } else {
      setError('Incorrect password')
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f5f0e8',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <div style={{ width: '100%', maxWidth: 400, padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <p style={{ color: '#f4694a', fontSize: 13, fontWeight: 600, letterSpacing: '0.08em', marginBottom: 8 }}>
            Glow Studio ATX
          </p>
          <h1 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 32, fontWeight: 400, margin: 0 }}>
            Owner Dashboard
          </h1>
          <p style={{ color: '#7a7568', fontSize: 14, marginTop: 8 }}>Enter your password to continue</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 8, padding: '32px 32px', boxShadow: '0 2px 16px rgba(0,0,0,0.05)' }}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#7a7568', display: 'block', marginBottom: 8 }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  border: '1.5px solid rgba(0,0,0,0.1)',
                  borderRadius: 6,
                  fontSize: 15,
                  fontFamily: "'DM Sans', sans-serif",
                  outline: 'none',
                  background: '#fafafa',
                }}
                placeholder="••••••••"
                required
              />
              {error && <p style={{ color: '#dc2626', fontSize: 13, marginTop: 8 }}>{error}</p>}
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '13px',
                background: loading ? '#f8a090' : '#f4694a',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: '0.08em',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {loading ? 'Signing in...' : 'Sign In →'}
            </button>
          </div>
        </form>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: '#aaa', lineHeight: 1.6 }}>
          Default password: <code style={{ background: '#e8e0d0', padding: '2px 6px', borderRadius: 3 }}>glow2024</code>
          <br />
          <span style={{ fontSize: 11 }}>Change via <code style={{ background: '#e8e0d0', padding: '1px 5px', borderRadius: 3 }}>DASHBOARD_PASSWORD</code> in .env.local</span>
        </p>
      </div>
    </div>
  )
}
