import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Talk Transcripts',
  description: 'Review and approve talk transcripts',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
