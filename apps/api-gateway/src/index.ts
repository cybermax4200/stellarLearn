import express from 'express'
import cors from 'cors'

const app = express()
app.use(cors())
app.use(express.json())

const PORT = process.env.PORT ?? 4000

export const SERVICES = {
  auth: process.env.AUTH_SERVICE_URL ?? 'http://localhost:3001',
  courses: process.env.COURSES_SERVICE_URL ?? 'http://localhost:3002',
  triggers: process.env.TRIGGERS_SERVICE_URL ?? 'http://localhost:3003',
  storage: process.env.STORAGE_SERVICE_URL ?? 'http://localhost:3004',
  tutor: process.env.TUTOR_SERVICE_URL ?? 'http://localhost:8001',
  adaptive: process.env.ADAPTIVE_SERVICE_URL ?? 'http://localhost:8002',
}

async function proxyRequest(
  targetUrl: string,
  req: express.Request,
  res: express.Response
) {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (req.headers.authorization) {
      headers['Authorization'] = req.headers.authorization
    }

    const options: RequestInit = {
      method: req.method,
      headers,
    }

    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body && Object.keys(req.body).length > 0) {
      options.body = JSON.stringify(req.body)
    }

    const response = await fetch(targetUrl, options)
    const contentType = response.headers.get('content-type') || ''
    
    res.status(response.status)
    if (contentType.includes('application/json')) {
      const data = await response.json()
      return res.json(data)
    } else {
      const text = await response.text()
      return res.send(text)
    }
  } catch (error) {
    return res.status(502).json({
      error: 'Bad Gateway: Could not reach downstream service',
      target: targetUrl,
      details: error instanceof Error ? error.message : String(error),
    })
  }
}

// Routes mapping
app.all('/api/auth/*', (req, res) => {
  const subPath = req.originalUrl.replace('/api/auth', '/auth')
  return proxyRequest(`${SERVICES.auth}${subPath}`, req, res)
})

app.all('/api/courses/*', (req, res) => {
  const subPath = req.originalUrl.replace('/api/courses', '')
  const path = subPath.startsWith('/') ? subPath : `/${subPath}`
  return proxyRequest(`${SERVICES.courses}${path}`, req, res)
})

app.all('/api/triggers/*', (req, res) => {
  const subPath = req.originalUrl.replace('/api/triggers', '/triggers')
  return proxyRequest(`${SERVICES.triggers}${subPath}`, req, res)
})

app.all('/api/storage/*', (req, res) => {
  const subPath = req.originalUrl.replace('/api/storage', '/storage')
  return proxyRequest(`${SERVICES.storage}${subPath}`, req, res)
})

app.all('/api/tutor/*', (req, res) => {
  const subPath = req.originalUrl.replace('/api/tutor', '')
  return proxyRequest(`${SERVICES.tutor}${subPath}`, req, res)
})

app.all('/api/adaptive/*', (req, res) => {
  const subPath = req.originalUrl.replace('/api/adaptive', '')
  return proxyRequest(`${SERVICES.adaptive}${subPath}`, req, res)
})

app.get('/api/routes', (_req, res) => {
  return res.json({
    gateway: 'StellarLearn Unified API Gateway',
    version: '1.0.0',
    services: SERVICES,
  })
})

app.get('/health', async (_req, res) => {
  const statusSummary: Record<string, string> = {}

  for (const [name, url] of Object.entries(SERVICES)) {
    try {
      const probe = await fetch(`${url}/health`, { signal: AbortSignal.timeout(1000) })
      statusSummary[name] = probe.ok ? 'healthy' : 'unhealthy'
    } catch {
      statusSummary[name] = 'offline'
    }
  }

  res.json({
    status: 'ok',
    service: 'api-gateway',
    downstream: statusSummary,
  })
})

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`api-gateway listening on :${PORT}`))
}

export { app }
