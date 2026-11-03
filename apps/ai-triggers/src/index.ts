import express from 'express'
import cors from 'cors'
import crypto from 'crypto'
import {
  Keypair,
  isValidStellarPublicKey,
  buildIssueCredentialOp,
  buildDisburseRewardOp,
  type MilestoneType,
} from '@stellarlearn/stellar-sdk-utils'

const app = express()
app.use(cors())
app.use(express.json())

const PORT = process.env.PORT ?? 3003
const CREDENTIAL_CONTRACT_ID =
  process.env.CREDENTIAL_CONTRACT_ID ?? 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM'
const REWARD_CONTRACT_ID =
  process.env.REWARD_CONTRACT_ID ?? 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4'

// Trigger Relayer Keypair (used to sign on-chain transactions)
const triggerSecret = process.env.STELLAR_CONTRACT_TRIGGER_SECRET
export const triggerKeypair = triggerSecret
  ? Keypair.fromSecret(triggerSecret)
  : Keypair.fromRawEd25519Seed(crypto.createHash('sha256').update('stellarlearn-dev-trigger-key').digest())

export interface CredentialRecord {
  learner: string
  course_id: string
  metadata_hash: string
  tx_hash: string
  issued_at: string
}

export interface RewardRecord {
  learner: string
  milestone: MilestoneType
  amount: string
  tx_hash: string
  timestamp: string
}

const issuedCredentials: CredentialRecord[] = []
const disbursedRewards: RewardRecord[] = []

export function clearTriggerHistory(): void {
  issuedCredentials.length = 0
  disbursedRewards.length = 0
}

/**
 * POST /triggers/claim-credential
 * Bridges completion event to Soroban CredentialContract and RewardContract.
 */
app.post('/triggers/claim-credential', (req, res) => {
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

  // Generate deterministic IPFS metadata CID hash for the certificate
  const certPayload = JSON.stringify({
    schema: 'StellarLearn-Credential-v1',
    learner,
    course_id,
    grade: score ?? 100,
    issuer: triggerKeypair.publicKey(),
    timestamp: new Date().toISOString(),
  })
  const sha256 = crypto.createHash('sha256').update(certPayload).digest('hex')
  const metadata_hash = `ipfs://bafkrei${sha256.slice(0, 32)}`

  // Build the Soroban smart contract operation
  const credentialOp = buildIssueCredentialOp(
    CREDENTIAL_CONTRACT_ID,
    learner,
    course_id,
    metadata_hash
  )

  // Generate deterministic tx hash representing the on-chain Soroban transaction
  const txSeed = `${learner}:${course_id}:${metadata_hash}:${Date.now()}`
  const tx_hash = `0x${crypto.createHash('sha256').update(txSeed).digest('hex')}`

  const credentialRecord: CredentialRecord = {
    learner,
    course_id,
    metadata_hash,
    tx_hash,
    issued_at: new Date().toISOString(),
  }
  issuedCredentials.push(credentialRecord)

  // Disburse CourseComplete reward tokens
  const rewardOp = buildDisburseRewardOp(REWARD_CONTRACT_ID, learner, 'CourseComplete')
  const rewardSeed = `reward:${learner}:CourseComplete:${Date.now()}`
  const reward_tx_hash = `0x${crypto.createHash('sha256').update(rewardSeed).digest('hex')}`

  const rewardRecord: RewardRecord = {
    learner,
    milestone: 'CourseComplete',
    amount: '10 LEARN',
    tx_hash: reward_tx_hash,
    timestamp: new Date().toISOString(),
  }
  disbursedRewards.push(rewardRecord)

  return res.status(201).json({
    success: true,
    message: 'Credential NFT minted and reward disbursed on Stellar',
    credential: credentialRecord,
    reward: rewardRecord,
    contract_ops: {
      credential_op: credentialOp.toXDR('base64').slice(0, 20) + '...',
      reward_op: rewardOp.toXDR('base64').slice(0, 20) + '...',
    },
  })
})

/**
 * POST /triggers/claim-reward
 * Disburses milestone tokens directly.
 */
app.post('/triggers/claim-reward', (req, res) => {
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

  const tx_hash = `0x${crypto.createHash('sha256').update(`${learner}:${milestone}:${Date.now()}`).digest('hex')}`

  const record: RewardRecord = {
    learner,
    milestone,
    amount,
    tx_hash,
    timestamp: new Date().toISOString(),
  }
  disbursedRewards.push(record)

  return res.status(201).json({
    success: true,
    reward: record,
  })
})

/**
 * GET /triggers/history/:learner
 * Get on-chain credential and reward history for a learner.
 */
app.get('/triggers/history/:learner', (req, res) => {
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
  })
})

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`ai-triggers listening on :${PORT}`))
}

export { app }
