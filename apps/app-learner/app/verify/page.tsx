'use client'

import { useState } from 'react'
import { Card, Button, Badge } from '@stellarlearn/ui-kit'

const STORAGE_URL = process.env.NEXT_PUBLIC_STORAGE_URL ?? 'http://localhost:3004'
const TRIGGERS_URL = process.env.NEXT_PUBLIC_TRIGGERS_URL ?? 'http://localhost:3003'

interface OnChainCredential {
  course_id: string
  metadata_hash: string
  tx_hash: string
  issued_at: string
  on_chain: boolean
}

interface IpfsMetadata {
  '@context'?: string[]
  type?: string[]
  issuer?: { name?: string; network?: string }
  issuanceDate?: string
  credentialSubject?: {
    id?: string
    courseId?: string
    courseTitle?: string
    achievementName?: string
    grade?: number
    instructor?: string
  }
}

interface VerifyResult {
  learner: string
  source: string
  onChain: boolean
  credentials: Array<{
    courseId: string
    metadataHash: string
    txHash: string
    issuedAt: string
    ipfsMetadata?: IpfsMetadata
  }>
}

export default function VerifyPage() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<VerifyResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    setError(null)
    setResult(null)

    const learner = query.trim()

    // Validate it looks like a Stellar public key (starts with G, 56 chars)
    if (!learner.startsWith('G') || learner.length !== 56) {
      setError('Please enter a valid Stellar public key (starts with G, 56 characters)')
      setLoading(false)
      return
    }

    try {
      // 1. Query the ai-triggers service for on-chain credential history
      const triggersRes = await fetch(`${TRIGGERS_URL}/triggers/history/${learner}`)

      if (!triggersRes.ok) {
        setError('Failed to query credential records from the trigger service')
        setLoading(false)
        return
      }

      const triggersData = await triggersRes.json()
      const credentials: OnChainCredential[] = triggersData.credentials || []

      if (credentials.length === 0) {
        setError(`No on-chain credentials found for ${learner.slice(0, 8)}...${learner.slice(-6)}`)
        setLoading(false)
        return
      }

      // 2. For each credential, fetch the IPFS metadata from the storage service
      const enrichedCredentials = await Promise.all(
        credentials.map(async (cred) => {
          const cid = cred.metadata_hash.replace('ipfs://', '')
          try {
            const ipfsRes = await fetch(`${STORAGE_URL}/storage/ipfs/${cid}`)
            if (ipfsRes.ok) {
              const ipfsMetadata = (await ipfsRes.json()) as IpfsMetadata
              return {
                courseId: cred.course_id,
                metadataHash: cred.metadata_hash,
                txHash: cred.tx_hash,
                issuedAt: cred.issued_at,
                ipfsMetadata,
              }
            }
          } catch {
            // IPFS fetch failed — still return the on-chain record
          }
          return {
            courseId: cred.course_id,
            metadataHash: cred.metadata_hash,
            txHash: cred.tx_hash,
            issuedAt: cred.issued_at,
          }
        })
      )

      setResult({
        learner,
        source: triggersData.credentials?.[0]?.on_chain
          ? 'Stellar Testnet Ledger (on-chain)'
          : 'StellarLearn Trigger Service',
        onChain: triggersData.credentials?.[0]?.on_chain ?? false,
        credentials: enrichedCredentials,
      })
    } catch (err) {
      setError(
        err instanceof Error
          ? `Verification failed: ${err.message}`
          : 'An unexpected error occurred during verification'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900">Verify Credential Certificate</h1>
        <p className="text-gray-600 mt-2 max-w-xl mx-auto">
          Verify tamper-proof course completion credentials issued on the Stellar blockchain.
          Enter a learner&apos;s Stellar public key to query on-chain credential records.
        </p>
      </div>

      <Card padding="lg" className="mb-8">
        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-xs uppercase font-bold text-gray-600 mb-1">
              Enter Learner Stellar Public Key
            </label>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. GBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-indigo-600"
            />
          </div>
          <Button type="submit" size="md" disabled={loading || !query.trim()}>
            {loading ? 'Querying on-chain...' : 'Verify Credentials'}
          </Button>
        </form>
      </Card>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm mb-6">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-6">
          <div className="bg-white border-2 border-emerald-500 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between border-b pb-4 mb-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🏅</span>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {result.credentials.length} Credential{result.credentials.length !== 1 ? 's' : ''} Found
                  </h2>
                  <p className="text-xs text-gray-500">Source: {result.source}</p>
                </div>
              </div>
              <Badge variant={result.onChain ? 'success' : 'warning'}>
                {result.onChain ? 'ON-CHAIN VERIFIED' : 'OFF-CHAIN RECORD'}
              </Badge>
            </div>

            <div className="text-xs text-gray-500 font-mono break-all mb-4">
              Learner: <strong>{result.learner}</strong>
            </div>

            {result.credentials.map((cred, idx) => (
              <div
                key={idx}
                className="border border-gray-200 rounded-xl p-5 mb-4 last:mb-0"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-xs text-gray-400 uppercase font-semibold">Course</span>
                    <p className="font-semibold text-gray-800 text-base mt-0.5">
                      {cred.ipfsMetadata?.credentialSubject?.courseTitle ?? cred.courseId}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 uppercase font-semibold">Achievement</span>
                    <p className="font-medium text-gray-800 mt-0.5">
                      {cred.ipfsMetadata?.credentialSubject?.achievementName ?? 'Completion Certificate'}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 uppercase font-semibold">Recipient</span>
                    <p className="font-mono text-xs text-gray-700 mt-0.5 break-all">
                      {cred.ipfsMetadata?.credentialSubject?.id ?? result.learner}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 uppercase font-semibold">Grade</span>
                    <p className="font-semibold text-emerald-600 mt-0.5">
                      {cred.ipfsMetadata?.credentialSubject?.grade ?? 100}%
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 uppercase font-semibold">Issuer</span>
                    <p className="font-medium text-gray-700 mt-0.5">
                      {cred.ipfsMetadata?.issuer?.name ?? 'StellarLearn Verifiable Authority'}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 uppercase font-semibold">Issued Date</span>
                    <p className="font-mono text-xs text-gray-600 mt-0.5">
                      {new Date(cred.issuedAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 p-3 rounded-xl text-xs font-mono text-gray-600 break-all border border-gray-100 mt-4">
                  <div className="mb-1">Tx Hash: <strong>{cred.txHash}</strong></div>
                  <div>IPFS CID: <strong>{cred.metadataHash}</strong></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
