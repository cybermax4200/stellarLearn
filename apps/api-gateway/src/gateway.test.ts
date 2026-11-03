import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { app, SERVICES } from './index'
import type { Server } from 'http'
import express from 'express'

describe('api-gateway', () => {
  let gatewayServer: Server
  let mockBackendServer: Server
  let gatewayUrl: string
  let mockBackendUrl: string

  beforeAll(async () => {
    // Spin up mock backend to test reverse proxy
    const mockApp = express()
    mockApp.use(express.json())
    mockApp.get('/health', (_req, res) => res.json({ status: 'ok', service: 'mock' }))
    mockApp.get('/test', (_req, res) => res.json({ proxied: true }))

    await new Promise<void>((resolve) => {
      mockBackendServer = mockApp.listen(0, () => {
        const addr = mockBackendServer.address()
        if (addr && typeof addr === 'object') {
          mockBackendUrl = `http://localhost:${addr.port}`
        }
        resolve()
      })
    })

    // Point courses service to mock backend
    SERVICES.courses = mockBackendUrl

    await new Promise<void>((resolve) => {
      gatewayServer = app.listen(0, () => {
        const addr = gatewayServer.address()
        if (addr && typeof addr === 'object') {
          gatewayUrl = `http://localhost:${addr.port}`
        }
        resolve()
      })
    })
  })

  afterAll(async () => {
    await new Promise<void>((resolve) => gatewayServer.close(() => resolve()))
    await new Promise<void>((resolve) => mockBackendServer.close(() => resolve()))
  })

  it('GET /api/routes lists registered microservices', async () => {
    const res = await fetch(`${gatewayUrl}/api/routes`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    expect(body.gateway).toBe('StellarLearn Unified API Gateway')
    expect(body.services.courses).toBeDefined()
  })

  it('GET /health returns gateway health report', async () => {
    const res = await fetch(`${gatewayUrl}/health`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    expect(body.status).toBe('ok')
    expect(body.service).toBe('api-gateway')
    expect(body.downstream.courses).toBe('healthy')
  })

  it('proxies request to downstream service', async () => {
    const res = await fetch(`${gatewayUrl}/api/courses/test`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    expect(body.proxied).toBe(true)
  })

  it('returns 502 for unreachable downstream service', async () => {
    SERVICES.auth = 'http://localhost:59999' // Non-existent port
    const res = await fetch(`${gatewayUrl}/api/auth/challenge?publicKey=G...`)
    expect(res.status).toBe(502)
    const body = (await res.json()) as any
    expect(body.error).toContain('Bad Gateway')
  })
})
