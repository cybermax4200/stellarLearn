'use client'

import { useWallet } from '@/contexts/WalletContext'
import Link from 'next/link'

export default function DashboardPage() {
  const { publicKey, disconnect } = useWallet()

  if (!publicKey) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="text-5xl mb-4">🔐</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Connect your wallet</h1>
        <p className="text-gray-600 mb-6">Connect your Freighter wallet to view your dashboard.</p>
        <Link href="/" className="text-indigo-600 hover:underline">← Back to home</Link>
      </div>
    )
  }

  const short = `${publicKey.slice(0, 8)}…${publicKey.slice(-8)}`

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 font-mono text-sm mt-1">{short}</p>
        </div>
        <button
          onClick={disconnect}
          className="text-sm text-gray-500 hover:text-red-600 transition-colors border border-gray-200 px-3 py-1.5 rounded-lg"
        >
          Disconnect
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {[
          { label: 'Courses Enrolled', value: '—', icon: '📚' },
          { label: 'LEARN Tokens', value: '—', icon: '🪙' },
          { label: 'Credentials Earned', value: '—', icon: '🏆' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="text-2xl mb-2">{stat.icon}</div>
            <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
            <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h2 className="font-semibold text-gray-900 mb-4">My Courses</h2>
        <div className="text-center py-10 text-gray-400">
          <div className="text-4xl mb-3">📖</div>
          <p className="text-sm">You haven&apos;t enrolled in any courses yet.</p>
          <Link
            href="/courses"
            className="mt-4 inline-block text-indigo-600 hover:underline text-sm"
          >
            Browse the catalogue →
          </Link>
        </div>
      </div>
    </div>
  )
}
