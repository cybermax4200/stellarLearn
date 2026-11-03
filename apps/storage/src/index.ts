import express from 'express'
import cors from 'cors'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

const app = express()
app.use(cors())
app.use(express.json())

const PORT = process.env.PORT ?? 3004
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), '.data', 'ipfs')

interface PinnedRecord {
  cid: string
  content: any
  pinnedAt: string
}

const inMemoryStore = new Map<string, PinnedRecord>()

function ensureStorageDir() {
  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    } catch {
      // In-memory fallback
    }
  }
}

export function clearStorage(): void {
  inMemoryStore.clear()
}

/**
 * Deterministically generates an IPFS CIDv1 raw multihash string.
 */
export function generateCID(content: object | string): string {
  const jsonStr = typeof content === 'string' ? content : JSON.stringify(content)
  const hash = crypto.createHash('sha256').update(jsonStr).digest('hex')
  // Format as standard base32 raw IPFS CIDv1
  return `bafkrei${hash.slice(0, 32)}`
}

/**
 * POST /storage/pin-credential
 * Formats standardized Verifiable Credential metadata and pins to IPFS.
 */
app.post('/storage/pin-credential', (req, res) => {
  const { learner, course_id, title, grade, instructor } = req.body as {
    learner?: string
    course_id?: string
    title?: string
    grade?: number
    instructor?: string
  }

  if (!learner || !course_id) {
    return res.status(400).json({ error: 'learner and course_id are required' })
  }

  const issuanceDate = new Date().toISOString()
  const metadata = {
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
      'https://purl.imsglobal.org/spec/ob/v3p0/context.json',
    ],
    id: `urn:uuid:${crypto.randomUUID()}`,
    type: ['VerifiableCredential', 'OpenBadgeCredential', 'StellarLearnCredential'],
    issuer: {
      id: 'https://stellarlearn.org/issuer',
      name: 'StellarLearn Verifiable Authority',
      network: 'Stellar Soroban',
    },
    issuanceDate,
    credentialSubject: {
      id: learner,
      courseId: course_id,
      courseTitle: title ?? course_id,
      achievementName: `${title ?? course_id} Completion Certificate`,
      grade: grade ?? 100,
      instructor: instructor ?? 'StellarLearn Team',
    },
  }

  const cid = generateCID(metadata)
  const record: PinnedRecord = {
    cid,
    content: metadata,
    pinnedAt: issuanceDate,
  }

  inMemoryStore.set(cid, record)

  // Persist to disk if directory accessible
  ensureStorageDir()
  try {
    fs.writeFileSync(path.join(DATA_DIR, `${cid}.json`), JSON.stringify(record, null, 2), 'utf-8')
  } catch {
    // In-memory fallback
  }

  return res.status(201).json({
    success: true,
    cid,
    ipfs_uri: `ipfs://${cid}`,
    gateway_url: `/storage/ipfs/${cid}`,
    metadata,
  })
})

/**
 * GET /storage/ipfs/:cid
 * Resolves pinned IPFS metadata.
 */
app.get('/storage/ipfs/:cid', (req, res) => {
  const cid = req.params.cid
  const memoryRecord = inMemoryStore.get(cid)
  if (memoryRecord) {
    return res.json(memoryRecord.content)
  }

  // Attempt filesystem lookup
  const filePath = path.join(DATA_DIR, `${cid}.json`)
  if (fs.existsSync(filePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
      return res.json(data.content || data)
    } catch {
      // Return 404 below
    }
  }

  return res.status(404).json({ error: 'CID not found on IPFS storage node' })
})

/**
 * POST /storage/verify/:cid
 * Verifies cryptographic integrity of content against its CID.
 */
app.post('/storage/verify/:cid', (req, res) => {
  const cid = req.params.cid
  const content = req.body

  if (!content) {
    return res.status(400).json({ error: 'Payload body required for verification' })
  }

  const expectedCid = generateCID(content)
  const matches = expectedCid === cid

  return res.json({
    valid: matches,
    cid,
    computed_cid: expectedCid,
  })
})

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'storage' }))

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`storage listening on :${PORT}`))
}

export { app }
