import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { app, clearEnrolments } from './index'
import jwt from 'jsonwebtoken'
import type { Server } from 'http'

const JWT_SECRET = 'dev-secret-change-in-production'

function createAuthToken(publicKey: string): string {
  return jwt.sign({ sub: publicKey, iss: 'stellarlearn', aud: 'stellarlearn-api' }, JWT_SECRET)
}

describe('service-courses API', () => {
  let server: Server
  let baseUrl: string
  const testLearner = 'GA2C5RFPE6GCKMY3US5PAB6UZLKIGAHWKXX2G2ZVOUSZDYQU6WNTF4'
  let token: string

  beforeAll(async () => {
    token = createAuthToken(testLearner)
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
    clearEnrolments()
  })

  it('GET /health returns health check payload', async () => {
    const res = await fetch(`${baseUrl}/health`)
    expect(res.status).toBe(200)
    const json = await res.json() as Record<string, unknown>
    expect(json).toEqual({ status: 'ok', service: 'service-courses' })
  })

  it('GET /courses returns course summaries with module counts', async () => {
    const res = await fetch(`${baseUrl}/courses`)
    expect(res.status).toBe(200)
    const courses = await res.json() as Array<Record<string, unknown>>
    expect(Array.isArray(courses)).toBe(true)
    expect(courses.length).toBeGreaterThan(0)
    expect(courses[0].moduleCount).toBeDefined()
    expect(courses[0].modules).toBeUndefined()
  })

  it('GET /courses/:id returns full course detail with modules', async () => {
    const res = await fetch(`${baseUrl}/courses/stellar-fundamentals`)
    expect(res.status).toBe(200)
    const course = await res.json() as Record<string, unknown>
    expect(course.id).toBe('stellar-fundamentals')
    expect(course.modules).toBeDefined()
    expect((course.modules as unknown[]).length).toBe(3)
  })

  it('GET /courses/:id returns 404 for unknown course', async () => {
    const res = await fetch(`${baseUrl}/courses/non-existent-course`)
    expect(res.status).toBe(404)
  })

  describe('Enrolment workflow', () => {
    it('requires authentication to enrol', async () => {
      const res = await fetch(`${baseUrl}/courses/stellar-fundamentals/enrol`, {
        method: 'POST',
      })
      expect(res.status).toBe(401)
    })

    it('successfully enrols an authenticated learner', async () => {
      const res = await fetch(`${baseUrl}/courses/stellar-fundamentals/enrol`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      expect(res.status).toBe(201)
      const data = await res.json() as Record<string, unknown>
      expect(data.courseId).toBe('stellar-fundamentals')
      expect(data.learnerPublicKey).toBe(testLearner)
    })

    it('returns 409 when enrolling in already enrolled course', async () => {
      await fetch(`${baseUrl}/courses/stellar-fundamentals/enrol`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })

      const duplicate = await fetch(`${baseUrl}/courses/stellar-fundamentals/enrol`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      expect(duplicate.status).toBe(409)
    })

    it('GET /enrolments/mine returns all enrolled courses for learner', async () => {
      // Initially 0
      const initialRes = await fetch(`${baseUrl}/enrolments/mine`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      expect(initialRes.status).toBe(200)
      const initialData = await initialRes.json() as Record<string, unknown>
      expect(initialData.count).toBe(0)

      // Enrol in stellar-fundamentals
      await fetch(`${baseUrl}/courses/stellar-fundamentals/enrol`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })

      const afterRes = await fetch(`${baseUrl}/enrolments/mine`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      expect(afterRes.status).toBe(200)
      const afterData = await afterRes.json() as { count: number; enrolments: Array<Record<string, unknown>> }
      expect(afterData.count).toBe(1)
      expect(afterData.enrolments[0].courseId).toBe('stellar-fundamentals')
      expect((afterData.enrolments[0].course as Record<string, unknown>).title).toBe('Stellar Fundamentals')
      expect(afterData.enrolments[0].completedModulesCount).toBe(0)
      expect(afterData.enrolments[0].isCompleted).toBe(false)
    })

    it('completes modules and flags courseComplete when all modules are done', async () => {
      await fetch(`${baseUrl}/courses/stellar-fundamentals/enrol`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })

      // Complete module 1
      const mod1Res = await fetch(`${baseUrl}/courses/stellar-fundamentals/modules/intro-stellar/complete`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ score: 100 }),
      })
      expect(mod1Res.status).toBe(200)
      const mod1Data = await mod1Res.json() as { courseComplete: boolean; progress: Record<string, { completed: boolean }> }
      expect(mod1Data.courseComplete).toBe(false)
      expect(mod1Data.progress['intro-stellar'].completed).toBe(true)

      // Complete module 2
      await fetch(`${baseUrl}/courses/stellar-fundamentals/modules/accounts-assets/complete`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ score: 90 }),
      })

      // Complete module 3 (last module)
      const mod3Res = await fetch(`${baseUrl}/courses/stellar-fundamentals/modules/quiz-basics/complete`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ score: 95 }),
      })
      expect(mod3Res.status).toBe(200)
      const mod3Data = await mod3Res.json() as { courseComplete: boolean }
      expect(mod3Data.courseComplete).toBe(true)

      // Check /enrolments/mine reflects completion
      const mineRes = await fetch(`${baseUrl}/enrolments/mine`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const mineData = await mineRes.json() as { enrolments: Array<Record<string, unknown>> }
      expect(mineData.enrolments[0].completedModulesCount).toBe(3)
      expect(mineData.enrolments[0].isCompleted).toBe(true)
    })

    it('rejects completing a module not in the course', async () => {
      await fetch(`${baseUrl}/courses/stellar-fundamentals/enrol`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })

      const invalidModRes = await fetch(`${baseUrl}/courses/stellar-fundamentals/modules/invalid-module-id/complete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      expect(invalidModRes.status).toBe(404)
    })
  })
})
