import fs from 'fs'
import path from 'path'

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), '.data')
const DB_FILE = path.join(DATA_DIR, 'auth_db.json')

export interface UserProfile {
  publicKey: string
  firstSeen: string
  lastSeen: string
  loginCount: number
}

interface AuthDatabaseSchema {
  challenges: Record<string, { challenge: string; expiresAt: number }>
  users: Record<string, UserProfile>
}

class AuthRepository {
  private schema: AuthDatabaseSchema = {
    challenges: {},
    users: {},
  }
  private isLoaded = false

  private ensureDir() {
    if (!fs.existsSync(DATA_DIR)) {
      try {
        fs.mkdirSync(DATA_DIR, { recursive: true })
      } catch {
        // In-memory fallback
      }
    }
  }

  private load() {
    if (this.isLoaded) return
    this.ensureDir()
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8')
        const parsed = JSON.parse(raw) as AuthDatabaseSchema
        if (parsed.challenges) this.schema.challenges = parsed.challenges
        if (parsed.users) this.schema.users = parsed.users
      } catch (err) {
        console.warn('Could not load auth db:', err)
      }
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

  setChallenge(publicKey: string, challenge: string, expiresAt: number) {
    this.load()
    this.schema.challenges[publicKey] = { challenge, expiresAt }
    this.persist()
  }

  getChallenge(publicKey: string) {
    this.load()
    return this.schema.challenges[publicKey]
  }

  deleteChallenge(publicKey: string) {
    this.load()
    delete this.schema.challenges[publicKey]
    this.persist()
  }

  clearChallenges() {
    this.load()
    this.schema.challenges = {}
    this.persist()
  }

  recordLogin(publicKey: string): UserProfile {
    this.load()
    const now = new Date().toISOString()
    const existing = this.schema.users[publicKey]
    if (existing) {
      existing.lastSeen = now
      existing.loginCount += 1
      this.persist()
      return existing
    }

    const newUser: UserProfile = {
      publicKey,
      firstSeen: now,
      lastSeen: now,
      loginCount: 1,
    }
    this.schema.users[publicKey] = newUser
    this.persist()
    return newUser
  }

  getUser(publicKey: string): UserProfile | undefined {
    this.load()
    return this.schema.users[publicKey]
  }

  getAllUsers(): UserProfile[] {
    this.load()
    return Object.values(this.schema.users)
  }
}

export const authRepo = new AuthRepository()
