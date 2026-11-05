import express from 'express'
import cors from 'cors'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

const app = express()
app.use(cors())
app.use(express.json({ limit: '10mb' }))

const PORT = process.env.PORT ?? 3004
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), '.data', 'ipfs')

const PINATA_API_KEY = process.env.IPFS_API_KEY ?? ''
const PINATA_API_SECRET = process.env.IPFS_API_SECRET ?? ''

/**
 * When true, the service pins content to Pinata IPFS.
 * Falls back to local file storage when API keys are not configured.
 */
const PINATA_LIVE =
  PINATA_API_KEY.length > 0 &&
  PINATA_API_SECRET.length > 0 &&
  process.env.NODE_ENV !== 'test'

const PINATA_PIN_URL = 'https://api.pinata.cloud/pinning/pinJSONToIPFS'
const PINATA_GATEWAY = process.env.PINATA_GATEWAY ?? 'https://gateway.pinata.cloud'

interface PinnedRecord {
  cid: string
  content: any
  pinnedAt: string
  source: 'pinata' | 'local'
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
 * Deterministically generates an IPFS-like CIDv1 raw multihash string.
 * Used as a fallback when Pinata is not available, and for content integrity
 * verification.
 */
export function generateCID(content: object | string): string {
  const jsonStr = typeof content === 'string' ? content : JSON.stringify(content)
  const hash = crypto.createHash('sha256').update(jsonStr).digest('hex')
  // Format as standard base32 raw IPFS CIDv1
  return `bafkrei${hash.slice(0, 32)}`
}

/**
 * Pin JSON content to Pinata IPFS.
 * Returns the real IPFS CID from Pinata.
 */
async function pinToPinata(metadata: object): Promise<string> {
  const body = {
    pinataContent: metadata,
    pinataMetadata: {
      name: `stellarlearn-credential-${Date.now()}`,
      keyvalues: { app: 'stellarlearn' },
    },
  }

  const response = await fetch(PINATA_PIN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      pinata_api_key: PINATA_API_KEY,
      pinata_secret_api_key: PINATA_API_SECRET,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Pinata API error ${response.status}: ${errorText}`)
  }

  const data = (await response.json()) as { IpfsHash: string }
  return data.IpfsHash
}

/**
 * Fetch content from Pinata gateway by CID.
 */
async function fetchFromPinata(cid: string): Promise<Record<string, unknown> | null> {
  try {
    const response = await fetch(`${PINATA_GATEWAY}/ipfs/${cid}`)
    if (!response.ok) return null
    return (await response.json()) as Record<string, unknown>
  } catch {
    return null
  }
}

/**
 * POST /storage/pin-credential
 * Formats standardized Verifiable Credential metadata and pins to IPFS.
 *
 * When PINATA_API_KEY is set, pins to real Pinata IPFS and returns the
 * real CID. Otherwise falls back to local file storage with a
 * deterministic CID.
 */
app.post('/storage/pin-credential', async (req, res) => {
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

  let cid: string
  let source: 'pinata' | 'local'

  if (PINATA_LIVE) {
    try {
      cid = await pinToPinata(metadata)
      source = 'pinata'
    } catch (err) {
      console.error('Pinata pinning failed, falling back to local:', err)
      cid = generateCID(metadata)
      source = 'local'
    }
  } else {
    cid = generateCID(metadata)
    source = 'local'
  }

  const record: PinnedRecord = {
    cid,
    content: metadata,
    pinnedAt: issuanceDate,
    source,
  }

  inMemoryStore.set(cid, record)

  // Always persist to local disk as a fallback cache
  if (source === 'local') {
    ensureStorageDir()
    try {
      fs.writeFileSync(path.join(DATA_DIR, `${cid}.json`), JSON.stringify(record, null, 2), 'utf-8')
    } catch {
      // In-memory fallback
    }
  }

  return res.status(201).json({
    success: true,
    cid,
    ipfs_uri: `ipfs://${cid}`,
    gateway_url: source === 'pinata' ? `${PINATA_GATEWAY}/ipfs/${cid}` : `/storage/ipfs/${cid}`,
    pinned_to: source,
    metadata,
  })
})

/**
 * GET /storage/ipfs/:cid
 * Resolves pinned IPFS metadata.
 *
 * Checks local store first, then Pinata gateway, then local filesystem.
 */
app.get('/storage/ipfs/:cid', async (req, res) => {
  const cid = req.params.cid

  // 1. Check in-memory store
  const memoryRecord = inMemoryStore.get(cid)
  if (memoryRecord) {
    return res.json(memoryRecord.content)
  }

  // 2. Check local filesystem
  const filePath = path.join(DATA_DIR, `${cid}.json`)
  if (fs.existsSync(filePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
      return res.json(data.content || data)
    } catch {
      // Fall through to Pinata
    }
  }

  // 3. Try Pinata gateway if live
  if (PINATA_LIVE) {
    const pinataContent = await fetchFromPinata(cid)
    if (pinataContent) {
      return res.json(pinataContent)
    }
  }

  return res.status(404).json({ error: 'CID not found on IPFS storage node' })
})

/**
 * POST /storage/verify/:cid
 * Verifies cryptographic integrity of content against its CID.
 * Only valid for locally-generated CIDs (Pinata CIDs use real IPFS hashing).
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
    note: matches ? 'Content hash matches CID' : 'CID does not match content (may be a Pinata-pinned CID with different hashing)',
  })
})

app.get('/health', (_req, res) =>
  res.json({
    status: 'ok',
    service: 'storage',
    pinata_live: PINATA_LIVE,
  })
)

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () =>
    console.log(`storage listening on :${PORT} (pinata_live=${PINATA_LIVE})`)
  )
}

export { app }
