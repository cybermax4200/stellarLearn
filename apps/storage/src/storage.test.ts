import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { app, clearStorage, generateCID } from './index'
import type { Server } from 'http'

describe('storage IPFS service', () => {
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
    clearStorage()
  })

  it('GET /health returns storage node status', async () => {
    const res = await fetch(`${baseUrl}/health`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    expect(body.status).toBe('ok')
    expect(body.service).toBe('storage')
  })

  it('pins credential metadata and generates valid IPFS CID', async () => {
    const res = await fetch(`${baseUrl}/storage/pin-credential`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        learner: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
        course_id: 'soroban-smart-contracts',
        title: 'Soroban Smart Contracts',
        grade: 98,
        instructor: 'StellarLearn Team',
      }),
    })

    expect(res.status).toBe(201)
    const data = (await res.json()) as any
    expect(data.success).toBe(true)
    expect(data.cid.startsWith('bafkrei')).toBe(true)
    expect(data.ipfs_uri).toBe(`ipfs://${data.cid}`)

    // Fetch pinned content
    const fetchRes = await fetch(`${baseUrl}/storage/ipfs/${data.cid}`)
    expect(fetchRes.status).toBe(200)
    const content = (await fetchRes.json()) as any
    expect(content.credentialSubject.courseId).toBe('soroban-smart-contracts')
    expect(content.credentialSubject.grade).toBe(98)
  })

  it('returns 400 when missing required fields', async () => {
    const res = await fetch(`${baseUrl}/storage/pin-credential`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ learner: 'G...' }),
    })
    expect(res.status).toBe(400)
  })

  it('returns 404 for non-existent CID', async () => {
    const res = await fetch(`${baseUrl}/storage/ipfs/bafkreiunknown`)
    expect(res.status).toBe(404)
  })

  it('verifies content integrity against CID', async () => {
    const payload = { test: 'verifiable data' }
    const cid = generateCID(payload)

    const res = await fetch(`${baseUrl}/storage/verify/${cid}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    expect(body.valid).toBe(true)
    expect(body.cid).toBe(cid)
  })
})
