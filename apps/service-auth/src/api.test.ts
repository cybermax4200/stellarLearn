import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { app, clearChallenges } from './index'
import { Keypair } from '@stellar/stellar-sdk'
import type { Server } from 'http'

describe('service-auth API endpoints', () => {
  let server: Server
  let baseUrl: string

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
    clearChallenges()
  })

  it('GET /health returns service status', async () => {
    const res = await fetch(`${baseUrl}/health`)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toEqual({ status: 'ok', service: 'service-auth' })
  })

  describe('GET /auth/challenge', () => {
    it('returns challenge for valid public key', async () => {
      const kp = Keypair.random()
      const res = await fetch(`${baseUrl}/auth/challenge?publicKey=${kp.publicKey()}`)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.challenge).toBeDefined()
      expect(data.challenge).toContain(kp.publicKey())
    })

    it('returns 400 for invalid public key', async () => {
      const res = await fetch(`${baseUrl}/auth/challenge?publicKey=not-a-stellar-key`)
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe('Invalid Stellar public key')
    })
  })

  describe('POST /auth/verify', () => {
    it('verifies signed challenge and issues JWT token', async () => {
      const kp = Keypair.random()
      const challengeRes = await fetch(`${baseUrl}/auth/challenge?publicKey=${kp.publicKey()}`)
      const { challenge } = await challengeRes.json()

      const sig = kp.sign(Buffer.from(challenge, 'utf8')).toString('base64')

      const verifyRes = await fetch(`${baseUrl}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicKey: kp.publicKey(), signature: sig }),
      })

      expect(verifyRes.status).toBe(200)
      const data = await verifyRes.json()
      expect(data.publicKey).toBe(kp.publicKey())
      expect(data.token).toBeDefined()

      // Challenge should be single-use
      const secondAttempt = await fetch(`${baseUrl}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicKey: kp.publicKey(), signature: sig }),
      })
      expect(secondAttempt.status).toBe(401)
    })

    it('rejects invalid signature', async () => {
      const kp = Keypair.random()
      await fetch(`${baseUrl}/auth/challenge?publicKey=${kp.publicKey()}`)

      const verifyRes = await fetch(`${baseUrl}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicKey: kp.publicKey(), signature: 'aW52YWxpZA==' }),
      })
      expect(verifyRes.status).toBe(401)
      const data = await verifyRes.json()
      expect(data.error).toBe('Invalid signature')
    })

    it('rejects verification without challenge', async () => {
      const kp = Keypair.random()
      const verifyRes = await fetch(`${baseUrl}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicKey: kp.publicKey(), signature: 'something' }),
      })
      expect(verifyRes.status).toBe(401)
    })
  })

  describe('GET /auth/me', () => {
    it('returns decoded identity with valid bearer token', async () => {
      const kp = Keypair.random()
      const challengeRes = await fetch(`${baseUrl}/auth/challenge?publicKey=${kp.publicKey()}`)
      const { challenge } = await challengeRes.json()
      const sig = kp.sign(Buffer.from(challenge, 'utf8')).toString('base64')

      const verifyRes = await fetch(`${baseUrl}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicKey: kp.publicKey(), signature: sig }),
      })
      const { token } = await verifyRes.json()

      const meRes = await fetch(`${baseUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      expect(meRes.status).toBe(200)
      const meData = await meRes.json()
      expect(meData.sub).toBe(kp.publicKey())
      expect(meData.iss).toBe('stellarlearn')
    })

    it('rejects missing or invalid bearer token', async () => {
      const missingRes = await fetch(`${baseUrl}/auth/me`)
      expect(missingRes.status).toBe(401)

      const invalidRes = await fetch(`${baseUrl}/auth/me`, {
        headers: { Authorization: 'Bearer bad.jwt.token' },
      })
      expect(invalidRes.status).toBe(401)
    })
  })
})
