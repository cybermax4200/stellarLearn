'use client'

import { useWallet } from '@/contexts/WalletContext'
import { WalletButton } from '@/components/WalletButton'
import Link from 'next/link'

export default function HomePage() {
  const { publicKey } = useWallet()

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      {/* Hero */}
      <div className="text-center max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-full px-4 py-1.5 text-sm text-indigo-700 mb-6">
          <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
          Built on Stellar · Powered by AI
        </div>
        <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
          Learn. Earn. Own your{' '}
          <span className="text-indigo-600">credentials.</span>
        </h1>
        <p className="text-xl text-gray-600 mb-10 leading-relaxed">
          Adaptive AI personalises your learning path. Soroban smart contracts issue tamper-proof
          credentials to your Stellar wallet. You earn <strong>LEARN tokens</strong> for every
          milestone — automatically, trustlessly.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {publicKey ? (
            <Link
              href="/courses"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-8 py-3 rounded-lg transition-colors text-lg"
            >
              Browse Courses →
            </Link>
          ) : (
            <WalletButton />
          )}
          <Link
            href="/courses"
            className="text-gray-600 hover:text-gray-900 font-medium px-8 py-3 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors text-lg"
          >
            Explore Courses
          </Link>
        </div>
      </div>

      {/* Feature grid */}
      <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          {
            icon: '🧠',
            title: 'Adaptive AI Engine',
            desc: 'Bayesian Knowledge Tracing models your mastery in real time and routes you to the most impactful next lesson.',
          },
          {
            icon: '🏆',
            title: 'On-Chain Credentials',
            desc: 'Certificates are minted as NFTs to your Stellar wallet — verifiable by anyone, owned by you forever.',
          },
          {
            icon: '🪙',
            title: 'Earn LEARN Tokens',
            desc: 'Smart contracts automatically disburse LEARN tokens when you hit milestones. No admin approval needed.',
          },
          {
            icon: '💬',
            title: 'AI Tutor 24/7',
            desc: 'Claude-powered tutor answers your questions in the context of your active course, any time.',
          },
          {
            icon: '🌍',
            title: 'Borderless Payments',
            desc: 'Pay for courses in XLM. Near-zero fees mean micro-rewards are economically viable at any scale.',
          },
          {
            icon: '🔐',
            title: 'No Passwords',
            desc: 'Sign in with your Freighter wallet. Your Stellar public key is your identity — no platform lock-in.',
          },
        ].map((f) => (
          <div key={f.title} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="text-3xl mb-3">{f.icon}</div>
            <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
            <p className="text-gray-600 text-sm leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
