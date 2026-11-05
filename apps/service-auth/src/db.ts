import { isDatabaseAvailable, query, runMigrations, withTransaction, closePool } from '@stellarlearn/db-client'
import type { PoolClient } from 'pg'

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

/**
 * AuthRepository — PostgreSQL-backed when DATABASE_URL is set,
 * in-memory fallback for tests / local dev.
 */
class AuthRepository {
  private schema: AuthDatabaseSchema = {
    challenges: {},
    users: {},
  }

  async ensureSchema(): Promise<void> {
    if (!isDatabaseAvailable()) return
    await runMigrations()
  }

  setChallenge(publicKey: string, challenge: string, expiresAt: number): void {
    if (isDatabaseAvailable()) {
      // Fire-and-forget async DB write; in-memory caller keeps the authoritative copy
      query(
        `INSERT INTO auth_challenges (public_key, challenge, expires_at)
         VALUES ($1, $2, $3)
         ON CONFLICT (public_key) DO UPDATE SET challenge = $2, expires_at = $3`,
        [publicKey, challenge, expiresAt]
      ).catch(() => {})
    }
    this.schema.challenges[publicKey] = { challenge, expiresAt }
  }

  getChallenge(publicKey: string): { challenge: string; expiresAt: number } | undefined {
    return this.schema.challenges[publicKey]
  }

  async getChallengeAsync(publicKey: string): Promise<{ challenge: string; expiresAt: number } | undefined> {
    const inMem = this.schema.challenges[publicKey]
    if (inMem) return inMem
    if (!isDatabaseAvailable()) return undefined

    const rows = await query<{ challenge: string; expires_at: string }>(
      'SELECT challenge, expires_at FROM auth_challenges WHERE public_key = $1',
      [publicKey]
    )
    if (rows.length === 0) return undefined
    return { challenge: rows[0].challenge, expiresAt: Number(rows[0].expires_at) }
  }

  deleteChallenge(publicKey: string): void {
    if (isDatabaseAvailable()) {
      query('DELETE FROM auth_challenges WHERE public_key = $1', [publicKey]).catch(() => {})
    }
    delete this.schema.challenges[publicKey]
  }

  clearChallenges(): void {
    if (isDatabaseAvailable()) {
      query('DELETE FROM auth_challenges', []).catch(() => {})
    }
    this.schema.challenges = {}
  }

  recordLogin(publicKey: string): UserProfile {
    const now = new Date().toISOString()
    const existing = this.schema.users[publicKey]
    if (existing) {
      existing.lastSeen = now
      existing.loginCount += 1
      if (isDatabaseAvailable()) {
        query(
          'UPDATE users SET last_seen = $1, login_count = login_count + 1 WHERE public_key = $2',
          [now, publicKey]
        ).catch(() => {})
      }
      return existing
    }

    const newUser: UserProfile = {
      publicKey,
      firstSeen: now,
      lastSeen: now,
      loginCount: 1,
    }
    this.schema.users[publicKey] = newUser
    if (isDatabaseAvailable()) {
      query(
        `INSERT INTO users (public_key, first_seen, last_seen, login_count)
         VALUES ($1, $2, $2, 1)`,
        [publicKey, now]
      ).catch(() => {})
    }
    return newUser
  }

  getUser(publicKey: string): UserProfile | undefined {
    return this.schema.users[publicKey]
  }

  getAllUsers(): UserProfile[] {
    return Object.values(this.schema.users)
  }
}

export const authRepo = new AuthRepository()
export { closePool }
