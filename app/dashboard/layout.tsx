'use client'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'

const NAV = [
  { label: 'Overview', href: '/dashboard' },
  { label: 'Bookings', href: '/dashboard/bookings' },
  { label: 'Clients', href: '/dashboard/clients' },
  { label: 'AI log', href: '/dashboard/ai-log' },
  { label: 'Settings', href: '/dashboard/settings' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f0e8', fontFamily: "'DM Sans', sans-serif" }}>
      {/* NAV */}
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 40px',
        height: 60,
        background: '#f5f0e8',
        borderBottom: '1px solid rgba(0,0,0,0.07)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
          <span style={{ color: '#f4694a', fontWeight: 700, fontSize: 16, letterSpacing: '-0.01em' }}>
            Glow Studio ATX
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            {NAV.map(item => {
              const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 20,
                    fontSize: 14,
                    fontWeight: active ? 500 : 400,
                    color: active ? '#f4694a' : '#555',
                    background: active ? 'rgba(244,105,74,0.1)' : 'transparent',
                    textDecoration: 'none',
                    transition: 'all 0.15s',
                  }}
                >
                  {item.label}
                </Link>
              )
            })}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link
            href="/book"
            target="_blank"
            style={{
              padding: '8px 18px',
              background: '#f4694a',
              color: '#fff',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            → Booking Page
          </Link>
          <button
            onClick={handleLogout}
            style={{
              background: 'none',
              border: 'none',
              color: '#7a7568',
              fontSize: 14,
              cursor: 'pointer',
              padding: '6px 12px',
            }}
          >
            Sign out
          </button>
        </div>
      </nav>

      {/* CONTENT */}
      <main style={{ padding: '48px 40px', maxWidth: 1200, margin: '0 auto' }}>
        {children}
      </main>
    </div>
  )
}
