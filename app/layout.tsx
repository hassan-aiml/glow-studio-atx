import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Glow Studio ATX',
  description: 'AI-powered booking and client management',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&display=swap" rel="stylesheet" />
      </head>
      <body style={{ margin: 0, background: '#f5f0e8', fontFamily: "'DM Sans', sans-serif" }}>
        {children}
      </body>
    </html>
  )
}
