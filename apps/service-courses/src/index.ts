import express from 'express'
import cors from 'cors'
import jwt from 'jsonwebtoken'
import { COURSES, enrolments, type Course, type Enrolment } from './data'
import { courseRepo } from './db'
import { isDatabaseAvailable } from '@stellarlearn/db-client'

const app = express()
app.use(cors())
app.use(express.json())

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production'
const PORT = process.env.PORT ?? 3002
const ADAPTIVE_URL = process.env.ADAPTIVE_URL ?? 'http://localhost:8002'

export function clearEnrolments(): void {
  enrolments.clear()
  courseRepo.clearAllEnrolments()
}

// ============================================
// Adaptive engine integration
// ============================================

interface AdaptiveRecommendation {
  module_id: string | null
  reason?: string
  type?: string
  message?: string
}

/**
 * Call the ai-adaptive service to update mastery after module completion
 * and get a recommendation for the next module.
 *
 * Falls back gracefully when the adaptive service is unavailable.
 */
async function updateAdaptiveEngine(params: {
  learnerId: string
  courseId: string
  moduleId: string
  score: number
  completedModules: string[]
  performanceScores: Record<string, number>
}): Promise<AdaptiveRecommendation | null> {
  const { learnerId, courseId, moduleId, score, completedModules, performanceScores } = params

  // Determine if the learner "got it right" — score >= 60 means correct
  const correct = score >= 60

  try {
    // 1. Update mastery for the completed concept
    await fetch(`${ADAPTIVE_URL}/mastery/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        learner_id: learnerId,
        concept_id: moduleId,
        correct,
      }),
      signal: AbortSignal.timeout(3000),
    })

    // 2. Get recommendation for next module
    const recResponse = await fetch(`${ADAPTIVE_URL}/recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        learner_id: learnerId,
        completed_modules: completedModules,
        performance_scores: performanceScores,
        course_id: courseId,
      }),
      signal: AbortSignal.timeout(3000),
    })

    if (recResponse.ok) {
      return (await recResponse.json()) as AdaptiveRecommendation
    }
  } catch (err) {
    console.warn('Adaptive engine call failed (non-fatal):', err instanceof Error ? err.message : err)
  }

  return null
}

function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorised' })
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET) as { sub: string }
    res.locals.publicKey = payload.sub
    next()
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}

// GET /courses — list all courses
app.get('/courses', (_req, res) => {
  const all = courseRepo.getAllCourses()
  res.json(all.map(({ modules, ...c }) => ({ ...c, moduleCount: modules.length })))
})

// GET /enrolments/mine — list all enrolled courses with course metadata for the authenticated learner
app.get('/enrolments/mine', requireAuth, (_req, res) => {
  const publicKey = res.locals.publicKey as string
  const allCourses = courseRepo.getAllCourses()
  const userEnrolments: Array<Enrolment & { course: Course; completedModulesCount: number; isCompleted: boolean }> = []

  for (const course of allCourses) {
    const key = `${publicKey}:${course.id}`
    const enrolment = enrolments.get(key) || courseRepo.getEnrolment(publicKey, course.id)
    if (enrolment) {
      const completedCount = course.modules.filter((m) => enrolment.progress[m.id]?.completed).length
      userEnrolments.push({
        ...enrolment,
        course,
        completedModulesCount: completedCount,
        isCompleted: completedCount === course.modules.length,
      })
    }
  }

  return res.json({ enrolments: userEnrolments, count: userEnrolments.length })
})

// GET /courses/:id — get a single course with modules
app.get('/courses/:id', (req, res) => {
  const course = courseRepo.getCourseById(req.params.id) || COURSES.find((c) => c.id === req.params.id)
  if (!course) return res.status(404).json({ error: 'Course not found' })
  return res.json(course)
})

// POST /courses — create or update a course
app.post('/courses', (req, res) => {
  const course = req.body as Course
  if (!course?.id || !course?.title || !Array.isArray(course?.modules)) {
    return res.status(400).json({ error: 'id, title, and modules array are required' })
  }
  const saved = courseRepo.saveCourse(course)
  return res.status(201).json(saved)
})

// POST /courses/:id/enrol — enrol the authenticated learner
app.post('/courses/:id/enrol', requireAuth, (req, res) => {
  const publicKey = res.locals.publicKey as string
  const course = courseRepo.getCourseById(req.params.id) || COURSES.find((c) => c.id === req.params.id)
  if (!course) return res.status(404).json({ error: 'Course not found' })

  const key = `${publicKey}:${course.id}`
  if (enrolments.has(key) || courseRepo.getEnrolment(publicKey, course.id)) {
    return res.status(409).json({ error: 'Already enrolled' })
  }

  const enrolment: Enrolment = {
    learnerPublicKey: publicKey,
    courseId: course.id,
    enrolledAt: new Date().toISOString(),
    progress: {},
  }
  enrolments.set(key, enrolment)
  courseRepo.saveEnrolment(enrolment)
  return res.status(201).json(enrolment)
})

// GET /courses/:id/progress — get learner progress
app.get('/courses/:id/progress', requireAuth, (req, res) => {
  const publicKey = res.locals.publicKey as string
  const enrolment = enrolments.get(`${publicKey}:${req.params.id}`) || courseRepo.getEnrolment(publicKey, req.params.id)
  if (!enrolment) return res.status(404).json({ error: 'Not enrolled' })
  return res.json(enrolment)
})

// POST /courses/:id/modules/:moduleId/complete — mark a module complete
app.post('/courses/:id/modules/:moduleId/complete', requireAuth, async (req, res) => {
  const publicKey = res.locals.publicKey as string
  const { id: courseId, moduleId } = req.params
  const { score } = req.body as { score?: number }

  const course = courseRepo.getCourseById(courseId) || COURSES.find((c) => c.id === courseId)
  if (!course) return res.status(404).json({ error: 'Course not found' })

  const moduleExists = course.modules.some((m) => m.id === moduleId)
  if (!moduleExists) return res.status(404).json({ error: 'Module not found in this course' })

  const key = `${publicKey}:${courseId}`
  let enrolment = enrolments.get(key) || courseRepo.getEnrolment(publicKey, courseId)
  if (!enrolment) return res.status(404).json({ error: 'Not enrolled' })

  enrolment.progress[moduleId] = {
    moduleId,
    completed: true,
    score,
    completedAt: new Date().toISOString(),
  }
  enrolments.set(key, enrolment)
  courseRepo.saveEnrolment(enrolment)

  // Check if all modules are complete
  const allComplete = course.modules.every((m) => enrolment!.progress[m.id]?.completed)

  // Call adaptive engine to update mastery and get next recommendation
  const completedModules = course.modules
    .filter((m) => enrolment!.progress[m.id]?.completed)
    .map((m) => m.id)
  const performanceScores: Record<string, number> = {}
  for (const m of course.modules) {
    const p = enrolment.progress[m.id]
    if (p?.completed && p.score !== undefined) {
      performanceScores[m.id] = p.score / 100 // normalise to 0-1
    }
  }

  const recommendation = await updateAdaptiveEngine({
    learnerId: publicKey,
    courseId,
    moduleId,
    score: score ?? 100,
    completedModules,
    performanceScores,
  })

  return res.json({
    progress: enrolment.progress,
    courseComplete: allComplete,
    recommendation,
  })
})

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'service-courses' }))

if (process.env.NODE_ENV !== 'test') {
  // Run database migrations and seed data on startup
  if (isDatabaseAvailable()) {
    courseRepo.ensureSchema().catch((err) => {
      console.warn('Database migration failed, using in-memory fallback:', err.message)
    })
  }
  app.listen(PORT, () => console.log(`service-courses listening on :${PORT}`))
}

export { app }
