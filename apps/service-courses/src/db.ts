import fs from 'fs'
import path from 'path'
import { COURSES as SEED_COURSES, type Course, type Enrolment } from './data'

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), '.data')
const DB_FILE = path.join(DATA_DIR, 'courses_db.json')

interface DatabaseSchema {
  courses: Course[]
  enrolments: Record<string, Enrolment>
}

class CourseRepository {
  private schema: DatabaseSchema = {
    courses: [...SEED_COURSES],
    enrolments: {},
  }
  private isLoaded = false

  private ensureDir() {
    if (!fs.existsSync(DATA_DIR)) {
      try {
        fs.mkdirSync(DATA_DIR, { recursive: true })
      } catch {
        // In-memory fallback if filesystem is read-only
      }
    }
  }

  private load() {
    if (this.isLoaded) return
    this.ensureDir()
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8')
        const parsed = JSON.parse(raw) as DatabaseSchema
        if (parsed.courses && Array.isArray(parsed.courses)) {
          this.schema.courses = parsed.courses
        }
        if (parsed.enrolments && typeof parsed.enrolments === 'object') {
          this.schema.enrolments = parsed.enrolments
        }
      } catch (err) {
        console.warn('Could not parse courses db, using seed data:', err)
      }
    } else {
      this.persist()
    }
    this.isLoaded = true
  }

  private persist() {
    if (process.env.NODE_ENV === 'test') return
    this.ensureDir()
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.schema, null, 2), 'utf-8')
    } catch {
      // In-memory fallback
    }
  }

  getAllCourses(): Course[] {
    this.load()
    return [...this.schema.courses]
  }

  getCourseById(id: string): Course | undefined {
    this.load()
    return this.schema.courses.find((c) => c.id === id)
  }

  saveCourse(course: Course): Course {
    this.load()
    const index = this.schema.courses.findIndex((c) => c.id === course.id)
    if (index >= 0) {
      this.schema.courses[index] = course
    } else {
      this.schema.courses.push(course)
    }
    this.persist()
    return course
  }

  getEnrolment(publicKey: string, courseId: string): Enrolment | undefined {
    this.load()
    const key = `${publicKey}:${courseId}`
    return this.schema.enrolments[key]
  }

  getUserEnrolments(publicKey: string): Enrolment[] {
    this.load()
    return Object.values(this.schema.enrolments).filter((e) => e.learnerPublicKey === publicKey)
  }

  saveEnrolment(enrolment: Enrolment): Enrolment {
    this.load()
    const key = `${enrolment.learnerPublicKey}:${enrolment.courseId}`
    this.schema.enrolments[key] = enrolment
    this.persist()
    return enrolment
  }

  clearAllEnrolments(): void {
    this.load()
    this.schema.enrolments = {}
    this.persist()
  }
}

export const courseRepo = new CourseRepository()
