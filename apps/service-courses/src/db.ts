import { isDatabaseAvailable, query, runMigrations, closePool } from '@stellarlearn/db-client'
import { COURSES as SEED_COURSES, type Course, type Enrolment } from './data'

/**
 * CourseRepository — PostgreSQL-backed when DATABASE_URL is set,
 * in-memory fallback for tests / local dev.
 */
class CourseRepository {
  private courses: Course[] = [...SEED_COURSES]
  private enrolments: Record<string, Enrolment> = {}
  private seeded = false

  async ensureSchema(): Promise<void> {
    if (!isDatabaseAvailable()) return
    await runMigrations()
    await this.seedCourses()
  }

  private async seedCourses(): Promise<void> {
    if (this.seeded) return
    // Insert seed courses if not already in DB
    for (const course of SEED_COURSES) {
      await query(
        `INSERT INTO courses (id, title, description, instructor, price, category, level, modules)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO NOTHING`,
        [
          course.id,
          course.title,
          course.description,
          course.instructor,
          course.price,
          course.category,
          course.level,
          JSON.stringify(course.modules),
        ]
      )
    }
    this.seeded = true
  }

  private rowToCourse(row: Record<string, unknown>): Course {
    return {
      id: row.id as string,
      title: row.title as string,
      description: row.description as string,
      instructor: row.instructor as string,
      price: Number(row.price),
      category: row.category as string,
      level: row.level as 'beginner' | 'intermediate' | 'advanced',
      modules: typeof row.modules === 'string' ? JSON.parse(row.modules) : row.modules as Course['modules'],
    }
  }

  private enrolmentRowToEnrolment(row: Record<string, unknown>): Enrolment {
    const progress = typeof row.progress === 'string' ? JSON.parse(row.progress) : row.progress as Enrolment['progress']
    return {
      learnerPublicKey: row.learner_public_key as string,
      courseId: row.course_id as string,
      enrolledAt: row.enrolled_at as string,
      progress,
    }
  }

  getAllCourses(): Course[] {
    // For DB mode, we fetch async; for in-memory mode, return directly
    if (isDatabaseAvailable()) {
      // Return cached courses synchronously for tests; async fetch happens in ensureSchema
      return this.courses
    }
    return [...this.courses]
  }

  async getAllCoursesAsync(): Promise<Course[]> {
    if (!isDatabaseAvailable()) return [...this.courses]
    const rows = await query('SELECT * FROM courses ORDER BY id')
    this.courses = rows.map((r) => this.rowToCourse(r))
    return this.courses
  }

  getCourseById(id: string): Course | undefined {
    return this.courses.find((c) => c.id === id)
  }

  async getCourseByIdAsync(id: string): Promise<Course | undefined> {
    const inMem = this.courses.find((c) => c.id === id)
    if (inMem && !isDatabaseAvailable()) return inMem
    if (!isDatabaseAvailable()) return inMem

    const rows = await query('SELECT * FROM courses WHERE id = $1', [id])
    if (rows.length === 0) return undefined
    return this.rowToCourse(rows[0])
  }

  saveCourse(course: Course): Course {
    const index = this.courses.findIndex((c) => c.id === course.id)
    if (index >= 0) {
      this.courses[index] = course
    } else {
      this.courses.push(course)
    }
    if (isDatabaseAvailable()) {
      query(
        `INSERT INTO courses (id, title, description, instructor, price, category, level, modules)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET
           title = $2, description = $3, instructor = $4, price = $5, category = $6, level = $7, modules = $8`,
        [
          course.id, course.title, course.description, course.instructor,
          course.price, course.category, course.level, JSON.stringify(course.modules),
        ]
      ).catch(() => {})
    }
    return course
  }

  getEnrolment(publicKey: string, courseId: string): Enrolment | undefined {
    const key = `${publicKey}:${courseId}`
    return this.enrolments[key]
  }

  async getEnrolmentAsync(publicKey: string, courseId: string): Promise<Enrolment | undefined> {
    const inMem = this.enrolments[`${publicKey}:${courseId}`]
    if (inMem && !isDatabaseAvailable()) return inMem
    if (!isDatabaseAvailable()) return inMem

    const rows = await query(
      'SELECT * FROM enrolments WHERE learner_public_key = $1 AND course_id = $2',
      [publicKey, courseId]
    )
    if (rows.length === 0) return undefined
    return this.enrolmentRowToEnrolment(rows[0])
  }

  getUserEnrolments(publicKey: string): Enrolment[] {
    return Object.values(this.enrolments).filter((e) => e.learnerPublicKey === publicKey)
  }

  async getUserEnrolmentsAsync(publicKey: string): Promise<Enrolment[]> {
    if (!isDatabaseAvailable()) return this.getUserEnrolments(publicKey)
    const rows = await query('SELECT * FROM enrolments WHERE learner_public_key = $1', [publicKey])
    return rows.map((r) => this.enrolmentRowToEnrolment(r))
  }

  saveEnrolment(enrolment: Enrolment): Enrolment {
    const key = `${enrolment.learnerPublicKey}:${enrolment.courseId}`
    this.enrolments[key] = enrolment
    if (isDatabaseAvailable()) {
      query(
        `INSERT INTO enrolments (learner_public_key, course_id, enrolled_at, progress)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (learner_public_key, course_id) DO UPDATE SET
           progress = $4`,
        [
          enrolment.learnerPublicKey, enrolment.courseId, enrolment.enrolledAt,
          JSON.stringify(enrolment.progress),
        ]
      ).catch(() => {})
    }
    return enrolment
  }

  clearAllEnrolments(): void {
    this.enrolments = {}
    if (isDatabaseAvailable()) {
      query('DELETE FROM enrolments', []).catch(() => {})
    }
  }
}

export const courseRepo = new CourseRepository()
export { closePool }
