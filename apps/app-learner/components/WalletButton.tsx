'use client'

import { useWallet } from '@/contexts/WalletContext'

export function WalletButton() {
  const { publicKey, isConnecting, error, connect, disconnect } = useWallet()

  const short = publicKey
    ? `${publicKey.slice(0, 4)}…${publicKey.slice(-4)}`
    : null

  if (publicKey) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-1.5">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
          <span className="text-sm font-mono text-indigo-700">{short}</span>
        </div>
        <button
          onClick={disconnect}
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Disconnect
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={connect}
        disabled={isConnecting}
        className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50
          text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
      >
        {isConnecting ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Connecting…
          </>
        ) : (
          <>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12V7H5a2 2 0 010-4h14v4" />
              <path d="M3 5v14a2 2 0 002 2h16v-5" />
              <path d="M18 12a2 2 0 000 4h4v-4h-4z" />
            </svg>
            Connect Wallet
          </>
        )}
      </button>
      {error && <p className="text-xs text-red-500 max-w-xs text-right">{error}</p>}
    </div>
  )
}
