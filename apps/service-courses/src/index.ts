import express from 'express'
import cors from 'cors'
import jwt from 'jsonwebtoken'
import { COURSES, enrolments, type Enrolment } from './data'

const app = express()
app.use(cors())
app.use(express.json())

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production'
const PORT = process.env.PORT ?? 3002

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
  res.json(COURSES.map(({ modules, ...c }) => ({ ...c, moduleCount: modules.length })))
})

// GET /courses/:id — get a single course with modules
app.get('/courses/:id', (req, res) => {
  const course = COURSES.find((c) => c.id === req.params.id)
  if (!course) return res.status(404).json({ error: 'Course not found' })
  return res.json(course)
})

// POST /courses/:id/enrol — enrol the authenticated learner
app.post('/courses/:id/enrol', requireAuth, (req, res) => {
  const publicKey = res.locals.publicKey as string
  const course = COURSES.find((c) => c.id === req.params.id)
  if (!course) return res.status(404).json({ error: 'Course not found' })

  const key = `${publicKey}:${course.id}`
  if (enrolments.has(key)) return res.status(409).json({ error: 'Already enrolled' })

  const enrolment: Enrolment = {
    learnerPublicKey: publicKey,
    courseId: course.id,
    enrolledAt: new Date().toISOString(),
    progress: {},
  }
  enrolments.set(key, enrolment)
  return res.status(201).json(enrolment)
})

// GET /courses/:id/progress — get learner progress
app.get('/courses/:id/progress', requireAuth, (req, res) => {
  const publicKey = res.locals.publicKey as string
  const enrolment = enrolments.get(`${publicKey}:${req.params.id}`)
  if (!enrolment) return res.status(404).json({ error: 'Not enrolled' })
  return res.json(enrolment)
})

// POST /courses/:id/modules/:moduleId/complete — mark a module complete
app.post('/courses/:id/modules/:moduleId/complete', requireAuth, (req, res) => {
  const publicKey = res.locals.publicKey as string
  const { id: courseId, moduleId } = req.params
  const { score } = req.body as { score?: number }

  const enrolment = enrolments.get(`${publicKey}:${courseId}`)
  if (!enrolment) return res.status(404).json({ error: 'Not enrolled' })

  enrolment.progress[moduleId] = {
    moduleId,
    completed: true,
    score,
    completedAt: new Date().toISOString(),
  }

  // Check if all modules are complete → emit completion event
  const course = COURSES.find((c) => c.id === courseId)!
  const allComplete = course.modules.every((m) => enrolment.progress[m.id]?.completed)

  return res.json({ progress: enrolment.progress, courseComplete: allComplete })
})

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'service-courses' }))

app.listen(PORT, () => console.log(`service-courses listening on :${PORT}`))

export { app }
