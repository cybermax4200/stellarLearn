import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { app, clearTriggerHistory } from './index'
import { Keypair } from '@stellarlearn/stellar-sdk-utils'
import type { Server } from 'http'

describe('ai-triggers API', () => {
  let server: Server
  let baseUrl: string
  const learnerKeypair = Keypair.random()
  const learner = learnerKeypair.publicKey()

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address()
        if (addr && typeof addr === 'object') {
          baseUrl = `http://localhost:${addr.port}`
        }
        resolve()
      })
    })
  })

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()))
  })

  beforeEach(() => {
    clearTriggerHistory()
  })

  it('GET /health returns service status and relayer address', async () => {
    const res = await fetch(`${baseUrl}/health`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    expect(body.status).toBe('ok')
    expect(body.service).toBe('ai-triggers')
    expect(body.relayer_address.startsWith('G')).toBe(true)
  })

  it('POST /triggers/claim-credential mints credential and disburses reward', async () => {
    const res = await fetch(`${baseUrl}/triggers/claim-credential`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        learner,
        course_id: 'stellar-fundamentals',
        score: 95,
      }),
    })

    expect(res.status).toBe(201)
    const body = (await res.json()) as any
    expect(body.success).toBe(true)
    expect(body.credential.learner).toBe(learner)
    expect(body.credential.course_id).toBe('stellar-fundamentals')
    expect(body.credential.metadata_hash.startsWith('ipfs://bafkrei')).toBe(true)
    expect(body.credential.tx_hash.startsWith('0x')).toBe(true)
    expect(body.reward.amount).toBe('10 LEARN')
  })

  it('rejects claim if learner public key is invalid', async () => {
    const res = await fetch(`${baseUrl}/triggers/claim-credential`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        learner: 'invalid-address',
        course_id: 'stellar-fundamentals',
      }),
    })

    expect(res.status).toBe(400)
    const body = (await res.json()) as any
    expect(body.error).toContain('Valid learner Stellar public key is required')
  })

  it('rejects claim if score is below 60%', async () => {
    const res = await fetch(`${baseUrl}/triggers/claim-credential`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        learner,
        course_id: 'stellar-fundamentals',
        score: 45,
      }),
    })

    expect(res.status).toBe(400)
    const body = (await res.json()) as any
    expect(body.error).toContain('minimum 60% threshold')
  })

  it('GET /triggers/history/:learner returns issued credentials and rewards', async () => {
    await fetch(`${baseUrl}/triggers/claim-credential`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ learner, course_id: 'stellar-fundamentals', score: 100 }),
    })

    await fetch(`${baseUrl}/triggers/claim-reward`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ learner, milestone: 'ModuleComplete' }),
    })

    const res = await fetch(`${baseUrl}/triggers/history/${learner}`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    expect(body.credentials.length).toBe(1)
    expect(body.rewards.length).toBe(2) // 1 from course complete + 1 module complete
    expect(body.total_learn_earned).toBe(11) // 10 + 1
  })
})
