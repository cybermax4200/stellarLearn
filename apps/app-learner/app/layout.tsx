import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import { WalletProvider } from '@/contexts/WalletContext'
import { WalletButton } from '@/components/WalletButton'

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
  fallback: ['system-ui', 'sans-serif'],
})

export const metadata: Metadata = {
  title: 'StellarLearn — AI-Powered Learning on Stellar',
  description: 'Adaptive learning, verifiable credentials, and token rewards on the Stellar blockchain.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.className} bg-gray-50 min-h-screen font-sans`}>
        <WalletProvider>
          <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
              <a href="/" className="flex items-center gap-2">
                <span className="text-2xl">🎓</span>
                <span className="font-bold text-gray-900 text-lg">StellarLearn</span>
              </a>
              <nav className="hidden md:flex items-center gap-6 text-sm text-gray-600">
                <a href="/courses" className="hover:text-gray-900 transition-colors">Courses</a>
                <a href="/dashboard" className="hover:text-gray-900 transition-colors">Dashboard</a>
                <a href="/instructor" className="hover:text-gray-900 transition-colors">Instructor</a>
                <a href="/verify" className="hover:text-gray-900 transition-colors">Verify Certificate</a>
              </nav>
              <WalletButton />
            </div>
          </header>
          <main>{children}</main>
        </WalletProvider>
      </body>
    </html>
  )
}
