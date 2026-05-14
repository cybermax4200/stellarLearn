import express from 'express'
import cors from 'cors'
import jwt from 'jsonwebtoken'
import { verifyWalletSignature, generateAuthChallenge } from '@stellarlearn/stellar-sdk-utils'

const app = express()
app.use(cors())
app.use(express.json())

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production'
const PORT = process.env.PORT ?? 3001

// In-memory challenge store (use Redis in production)
const challenges = new Map<string, { challenge: string; expiresAt: number }>()

/**
 * GET /auth/challenge?publicKey=G...
 * Returns a challenge string the learner must sign with their Stellar wallet.
 */
app.get('/auth/challenge', (req, res) => {
  const publicKey = req.query.publicKey as string
  if (!publicKey || !publicKey.startsWith('G') || publicKey.length !== 56) {
    return res.status(400).json({ error: 'Invalid Stellar public key' })
  }
  const challenge = generateAuthChallenge(publicKey)
  challenges.set(publicKey, { challenge, expiresAt: Date.now() + 5 * 60 * 1000 })
  return res.json({ challenge })
})

/**
 * POST /auth/verify
 * Body: { publicKey, signature }
 * Verifies the wallet signature and returns a JWT.
 */
app.post('/auth/verify', (req, res) => {
  const { publicKey, signature } = req.body as { publicKey: string; signature: string }

  if (!publicKey || !signature) {
    return res.status(400).json({ error: 'publicKey and signature are required' })
  }

  const stored = challenges.get(publicKey)
  if (!stored || Date.now() > stored.expiresAt) {
    return res.status(401).json({ error: 'Challenge expired or not found. Request a new one.' })
  }

  const valid = verifyWalletSignature(publicKey, stored.challenge, signature)
  if (!valid) {
    return res.status(401).json({ error: 'Invalid signature' })
  }

  challenges.delete(publicKey)

  const token = jwt.sign(
    { sub: publicKey, iss: 'stellarlearn', aud: 'stellarlearn-api' },
    JWT_SECRET,
    { expiresIn: '24h' }
  )

  return res.json({ token, publicKey })
})

/**
 * GET /auth/me
 * Returns the decoded JWT payload (requires Authorization: Bearer <token>).
 */
app.get('/auth/me', (req, res) => {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' })
  }
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET)
    return res.json(payload)
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
})

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'service-auth' }))

app.listen(PORT, () => console.log(`service-auth listening on :${PORT}`))

export { app }
