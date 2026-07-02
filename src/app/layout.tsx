import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Shree Surgico Pharmaceuticals',
  description: 'Genuine medicines delivered to your door across Mumbai',
  keywords: 'pharmacy, medicines, online pharmacy, Mumbai, Shree Surgico',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  )
}
