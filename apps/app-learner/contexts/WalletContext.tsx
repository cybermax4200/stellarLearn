'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'

interface WalletContextValue {
  publicKey: string | null
  token: string | null
  isConnecting: boolean
  error: string | null
  connect: () => Promise<void>
  disconnect: () => void
}

const WalletContext = createContext<WalletContextValue | null>(null)

const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL ?? 'http://localhost:3001'

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [publicKey, setPublicKey] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Restore session from localStorage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem('sl_public_key')
    const savedToken = localStorage.getItem('sl_token')
    if (savedKey && savedToken) {
      setPublicKey(savedKey)
      setToken(savedToken)
    }
  }, [])

  const connect = useCallback(async () => {
    setIsConnecting(true)
    setError(null)
    try {
      // Dynamically import Freighter API (browser-only)
      const freighter = await import('@stellar/freighter-api')

      const connected = await freighter.isConnected()
      if (!connected) {
        throw new Error('Freighter wallet not found. Please install the Freighter browser extension.')
      }

      const { address } = await freighter.getAddress()
      if (!address) throw new Error('Could not retrieve public key from Freighter.')

      // 1. Get challenge from service-auth
      const challengeRes = await fetch(`${AUTH_URL}/auth/challenge?publicKey=${address}`)
      if (!challengeRes.ok) throw new Error('Failed to get auth challenge')
      const { challenge } = await challengeRes.json() as { challenge: string }

      // 2. Sign the challenge with Freighter
      const { signedMessage } = await freighter.signMessage(challenge, {
        networkPassphrase: process.env.NEXT_PUBLIC_STELLAR_PASSPHRASE ?? 'Test SDF Network ; September 2015',
        address,
      })

      // 3. Verify signature and get JWT
      const verifyRes = await fetch(`${AUTH_URL}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicKey: address, signature: signedMessage }),
      })
      if (!verifyRes.ok) throw new Error('Signature verification failed')
      const { token: jwt } = await verifyRes.json() as { token: string }

      setPublicKey(address)
      setToken(jwt)
      localStorage.setItem('sl_public_key', address)
      localStorage.setItem('sl_token', jwt)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect wallet')
    } finally {
      setIsConnecting(false)
    }
  }, [])

  const disconnect = useCallback(() => {
    setPublicKey(null)
    setToken(null)
    localStorage.removeItem('sl_public_key')
    localStorage.removeItem('sl_token')
  }, [])

  return (
    <WalletContext.Provider value={{ publicKey, token, isConnecting, error, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const ctx = useContext(WalletContext)
  if (!ctx) throw new Error('useWallet must be used inside WalletProvider')
  return ctx
}
