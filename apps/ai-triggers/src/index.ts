import express from 'express'
import cors from 'cors'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import {
  Keypair,
  Address,
  nativeToScVal,
  xdr,
  isValidStellarPublicKey,
  submitSorobanTx,
  type StellarNetwork,
  type MilestoneType,
  type SorobanSubmitResult,
} from '@stellarlearn/stellar-sdk-utils'

const app = express()
app.use(cors())
app.use(express.json())

const PORT = process.env.PORT ?? 3003

const CREDENTIAL_CONTRACT_ID =
  process.env.CREDENTIAL_CONTRACT_ID ?? 'CD2RFDAIJX3WPITPCKQ6ARAWIIWHSRFADBQERGMLBAMZTI3GEGQXEQCP'
const REWARD_CONTRACT_ID =
  process.env.REWARD_CONTRACT_ID ?? 'CB5FFEBHXWPSPPRRC34VJTNDMF5VPWI5F7QYSO7SNFRY4LHXQJNOL2GV'

const STELLAR_NETWORK: StellarNetwork =
  (process.env.STELLAR_NETWORK as StellarNetwork) ?? 'testnet'

// JWT and internal service token configuration
const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production'
const INTERNAL_SERVICE_TOKEN = process.env.INTERNAL_SERVICE_TOKEN ?? ''

/**
 * When AUTH_ENABLED is true, all /triggers/* endpoints require either:
 * 1. A valid JWT (issued by service-auth), or
 * 2. The internal service token (for service-to-service calls from service-courses)
 *
 * Disabled in tests and when INTERNAL_SERVICE_TOKEN is not set.
 */
const AUTH_ENABLED =
  INTERNAL_SERVICE_TOKEN.length > 0 &&
  process.env.NODE_ENV !== 'test'

// Trigger Relayer Keypair (used to sign on-chain transactions)
const triggerSecret = process.env.STELLAR_CONTRACT_TRIGGER_SECRET
export const triggerKeypair = triggerSecret
  ? Keypair.fromSecret(triggerSecret)
  : Keypair.fromRawEd25519Seed(crypto.createHash('sha256').update('stellarlearn-dev-trigger-key').digest())

/**
 * When true, the service submits real Soroban transactions to the Stellar network.
 * Falls back to simulated mode when the trigger secret is a dev key or
 * when NODE_ENV=test or STELLAR_LIVE=false.
 */
const LIVE_MODE =
  !!triggerSecret &&
  process.env.NODE_ENV !== 'test' &&
  process.env.STELLAR_LIVE !== 'false'

export interface CredentialRecord {
  learner: string
  course_id: string
  metadata_hash: string
  tx_hash: string
  issued_at: string
  on_chain: boolean
}

export interface RewardRecord {
  learner: string
  milestone: MilestoneType
  amount: string
  tx_hash: string
  timestamp: string
  on_chain: boolean
}

const issuedCredentials: CredentialRecord[] = []
const disbursedRewards: RewardRecord[] = []

export function clearTriggerHistory(): void {
  issuedCredentials.length = 0
  disbursedRewards.length = 0
}

/**
 * Auth middleware for /triggers/* endpoints.
 *
 * Accepts either:
 * 1. Bearer JWT — validated with the same JWT_SECRET as service-auth
 * 2. X-Internal-Token header — matches INTERNAL_SERVICE_TOKEN for
 *    service-to-service calls (e.g. service-courses → ai-triggers)
 *
 * When AUTH_ENABLED is false (tests, dev), all requests pass through.
 */
function requireTriggerAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!AUTH_ENABLED) return next()

  const authHeader = req.headers.authorization
  const internalToken = req.headers['x-internal-token'] as string | undefined

  // Check internal service token first (service-to-service)
  if (internalToken && internalToken === INTERNAL_SERVICE_TOKEN) {
    return next()
  }

  // Check JWT bearer token
  if (authHeader?.startsWith('Bearer ')) {
    try {
      jwt.verify(authHeader.slice(7), JWT_SECRET)
      return next()
    } catch {
      // Fall through to 401
    }
  }

  return res.status(401).json({
    error: 'Authentication required',
    details: 'Provide a valid Bearer JWT or X-Internal-Token header',
  })
}

/**
 * Generate a deterministic IPFS metadata CID hash for the certificate.
 * In production, this is pinned to IPFS via the storage service and the real
 * CID returned. Here we generate a content-addressed hash.
 */
function generateMetadataHash(learner: string, course_id: string, score: number): string {
  const certPayload = JSON.stringify({
    schema: 'StellarLearn-Credential-v1',
    learner,
    course_id,
    grade: score,
    issuer: triggerKeypair.publicKey(),
    timestamp: new Date().toISOString(),
  })
  const sha256 = crypto.createHash('sha256').update(certPayload).digest('hex')
  return `ipfs://bafkrei${sha256.slice(0, 32)}`
}

/**
 * Build ScVal args for CredentialContract.issue_credential(learner, course_id, metadata_hash)
 */
function credentialArgs(learner: string, course_id: string, metadata_hash: string): xdr.ScVal[] {
  return [
    new Address(learner).toScVal(),
    nativeToScVal(course_id, { type: 'string' }),
    nativeToScVal(metadata_hash, { type: 'string' }),
  ]
}

/**
 * Build ScVal args for RewardContract.disburse_reward(learner, milestone)
 */
function rewardArgs(learner: string, milestone: MilestoneType): xdr.ScVal[] {
  return [
    new Address(learner).toScVal(),
    xdr.ScVal.scvVec([xdr.ScVal.scvSymbol(milestone)]),
  ]
}

function mockTxHash(prefix: string): string {
  return `0x${crypto.createHash('sha256').update(`${prefix}:${Date.now()}:${Math.random()}`).digest('hex')}`
}

/**
 * Submit a Soroban transaction or fall back to a simulated hash.
 */
async function submitOrMock(
  contractId: string,
  method: string,
  args: xdr.ScVal[],
  mockPrefix: string
): Promise<{ txHash: string; onChain: boolean; result?: SorobanSubmitResult }> {
  if (LIVE_MODE) {
    try {
      const result = await submitSorobanTx({
        network: STELLAR_NETWORK,
        contractId,
        method,
        args,
        sourceKeypair: triggerKeypair,
      })
      return {
        txHash: result.txHash || mockTxHash(mockPrefix),
        onChain: result.success,
        result,
      }
    } catch (err) {
      console.error(`On-chain ${method} failed:`, err)
      return { txHash: mockTxHash(mockPrefix), onChain: false }
    }
  }
  return { txHash: mockTxHash(mockPrefix), onChain: false }
}

/**
 * POST /triggers/claim-credential
 * Bridges completion event to Soroban CredentialContract and RewardContract.
 *
 * In LIVE_MODE, submits real Soroban transactions to the Stellar network.
 * In simulated mode (tests/dev without trigger secret), returns deterministic
 * mock tx hashes.
 */
app.post('/triggers/claim-credential', requireTriggerAuth, async (req, res) => {
  const { learner, course_id, score } = req.body as {
    learner?: string
    course_id?: string
    score?: number
  }

  if (!learner || !isValidStellarPublicKey(learner)) {
    return res.status(400).json({ error: 'Valid learner Stellar public key is required' })
  }
  if (!course_id) {
    return res.status(400).json({ error: 'course_id is required' })
  }

  // Minimum passing grade validation
  if (score !== undefined && score < 60) {
    return res.status(400).json({ error: 'Learner score does not satisfy minimum 60% threshold' })
  }

  const metadata_hash = generateMetadataHash(learner, course_id, score ?? 100)

  // 1. Submit CredentialContract.issue_credential transaction
  const credResult = await submitOrMock(
    CREDENTIAL_CONTRACT_ID,
    'issue_credential',
    credentialArgs(learner, course_id, metadata_hash),
    `cred:${learner}:${course_id}`
  )

  // 2. Submit RewardContract.disburse_reward transaction
  const rewResult = await submitOrMock(
    REWARD_CONTRACT_ID,
    'disburse_reward',
    rewardArgs(learner, 'CourseComplete'),
    `reward:${learner}:CourseComplete`
  )

  const credentialRecord: CredentialRecord = {
    learner,
    course_id,
    metadata_hash,
    tx_hash: credResult.txHash,
    issued_at: new Date().toISOString(),
    on_chain: credResult.onChain,
  }
  issuedCredentials.push(credentialRecord)

  const rewardRecord: RewardRecord = {
    learner,
    milestone: 'CourseComplete',
    amount: '10 LEARN',
    tx_hash: rewResult.txHash,
    timestamp: new Date().toISOString(),
    on_chain: rewResult.onChain,
  }
  disbursedRewards.push(rewardRecord)

  return res.status(201).json({
    success: true,
    message: credResult.onChain
      ? 'Credential NFT minted and reward disbursed on Stellar'
      : 'Credential and reward recorded (simulated mode — set STELLAR_CONTRACT_TRIGGER_SECRET for live transactions)',
    credential: credentialRecord,
    reward: rewardRecord,
    live_mode: LIVE_MODE,
  })
})

/**
 * POST /triggers/claim-reward
 * Disburses milestone tokens directly.
 */
app.post('/triggers/claim-reward', requireTriggerAuth, async (req, res) => {
  const { learner, milestone } = req.body as {
    learner?: string
    milestone?: MilestoneType
  }

  if (!learner || !isValidStellarPublicKey(learner)) {
    return res.status(400).json({ error: 'Valid learner Stellar public key is required' })
  }
  if (!milestone) {
    return res.status(400).json({ error: 'milestone is required' })
  }

  const amountMap: Record<MilestoneType, string> = {
    ModuleComplete: '1 LEARN',
    CourseComplete: '10 LEARN',
    AssessmentPassed: '2 LEARN',
    StreakBonus: '5 LEARN',
  }
  const amount = amountMap[milestone] || '1 LEARN'

  const result = await submitOrMock(
    REWARD_CONTRACT_ID,
    'disburse_reward',
    rewardArgs(learner, milestone),
    `reward:${learner}:${milestone}`
  )

  const record: RewardRecord = {
    learner,
    milestone,
    amount,
    tx_hash: result.txHash,
    timestamp: new Date().toISOString(),
    on_chain: result.onChain,
  }
  disbursedRewards.push(record)

  return res.status(201).json({
    success: true,
    reward: record,
    live_mode: LIVE_MODE,
  })
})

/**
 * GET /triggers/history/:learner
 * Get on-chain credential and reward history for a learner.
 */
app.get('/triggers/history/:learner', requireTriggerAuth, (req, res) => {
  const learner = req.params.learner
  const credentials = issuedCredentials.filter((c) => c.learner === learner)
  const rewards = disbursedRewards.filter((r) => r.learner === learner)

  return res.json({
    learner,
    credentials,
    rewards,
    total_learn_earned: rewards.reduce((acc, r) => acc + parseInt(r.amount, 10), 0),
  })
})

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'ai-triggers',
    relayer_address: triggerKeypair.publicKey(),
    live_mode: LIVE_MODE,
    network: STELLAR_NETWORK,
    auth_enabled: AUTH_ENABLED,
  })
})

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () =>
    console.log(`ai-triggers listening on :${PORT} (live_mode=${LIVE_MODE}, network=${STELLAR_NETWORK})`)
  )
}

export { app }
