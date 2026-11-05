import { Pool, type PoolClient } from 'pg'

/**
 * Shared PostgreSQL connection pool.
 *
 * Falls back to in-memory mode when DATABASE_URL is not set
 * (e.g. during tests or local dev without docker-compose).
 */
let pool: Pool | null = null

export function isDatabaseAvailable(): boolean {
  return !!process.env.DATABASE_URL
}

export function getPool(): Pool {
  if (!pool && isDatabaseAvailable()) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    })

    pool.on('error', (err) => {
      console.error('PostgreSQL pool error:', err.message)
    })
  }
  return pool!
}

export async function query<T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const p = getPool()
  if (!p) throw new Error('Database not available — DATABASE_URL not set')
  const result = await p.query<T extends infer R ? R : never>(text, params as never[])
  return result.rows as T[]
}

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const p = getPool()
  if (!p) throw new Error('Database not available — DATABASE_URL not set')
  const client = await p.connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

/**
 * Run migration SQL files to initialise schema.
 * Safe to call multiple times (uses CREATE TABLE IF NOT EXISTS).
 */
export async function runMigrations(): Promise<void> {
  if (!isDatabaseAvailable()) return
  const fs = await import('fs')
  const path = await import('path')
  const migrationsDir = path.join(__dirname, '..', 'migrations')
  if (!fs.existsSync(migrationsDir)) return

  const files = fs.readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8')
    await query(sql)
    console.log(`Migration applied: ${file}`)
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end()
    pool = null
  }
}
