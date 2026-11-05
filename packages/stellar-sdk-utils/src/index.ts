import {
  Networks,
  Transaction,
  Keypair,
  StrKey,
  xdr,
  Address,
  Contract,
  nativeToScVal,
  scValToNative,
  Operation,
  TransactionBuilder,
  Account,
  rpc,
  Horizon,
} from '@stellar/stellar-sdk'

export type StellarNetwork = 'testnet' | 'mainnet' | 'local'

export const NETWORK_PASSPHRASES: Record<StellarNetwork, string> = {
  testnet: Networks.TESTNET,
  mainnet: Networks.PUBLIC,
  local: Networks.STANDALONE,
}

export const HORIZON_URLS: Record<StellarNetwork, string> = {
  testnet: 'https://horizon-testnet.stellar.org',
  mainnet: 'https://horizon.stellar.org',
  local: 'http://localhost:8000',
}

export const SOROBAN_RPC_URLS: Record<StellarNetwork, string> = {
  testnet: 'https://soroban-testnet.stellar.org:443',
  mainnet: 'https://soroban-mainnet.stellar.org:443',
  local: 'http://localhost:8000',
}

export const STROOPS_PER_XLM = 10_000_000n
export const LEARN_DECIMALS = 7
export const STROOPS_PER_LEARN = 10_000_000n

/**
 * Validate whether a string is a valid Stellar Ed25519 public key (starts with G).
 */
export function isValidStellarPublicKey(key: string): boolean {
  if (typeof key !== 'string' || key.length !== 56 || !key.startsWith('G')) {
    return false
  }
  return StrKey.isValidEd25519PublicKey(key)
}

/**
 * Validate whether a string is a valid Soroban contract ID (starts with C).
 */
export function isValidContractId(id: string): boolean {
  if (typeof id !== 'string' || id.length !== 56 || !id.startsWith('C')) {
    return false
  }
  return StrKey.isValidContract(id)
}

/**
 * Convert stroops (10^-7 XLM) to a human-readable decimal XLM string.
 */
export function stroopsToXlm(stroops: bigint | number | string): string {
  const bigStroops = typeof stroops === 'bigint' ? stroops : BigInt(Math.trunc(Number(stroops)))
  const negative = bigStroops < 0n
  const abs = negative ? -bigStroops : bigStroops
  const whole = abs / STROOPS_PER_XLM
  const frac = (abs % STROOPS_PER_XLM).toString().padStart(7, '0').replace(/0+$/, '')
  const sign = negative ? '-' : ''
  return frac.length > 0 ? `${sign}${whole}.${frac}` : `${sign}${whole}`
}

/**
 * Convert an XLM amount to stroops (bigint).
 */
export function xlmToStroops(xlm: string | number): bigint {
  const parts = String(xlm).trim().split('.')
  if (parts.length > 2) throw new Error(`Invalid XLM amount: ${xlm}`)
  const wholePart = parts[0] || '0'
  const fracPart = (parts[1] || '').slice(0, 7).padEnd(7, '0')
  const negative = wholePart.startsWith('-')
  const cleanWhole = negative ? wholePart.slice(1) : wholePart
  const stroops = BigInt(cleanWhole) * STROOPS_PER_XLM + BigInt(fracPart)
  return negative ? -stroops : stroops
}

/**
 * Format LEARN token stroops (7 decimals) to a decimal string.
 */
export function formatLearnAmount(amount: bigint | number | string): string {
  return stroopsToXlm(amount)
}

/**
 * Parse a decimal LEARN string into stroops (7 decimals).
 */
export function parseLearnAmount(amount: string | number): bigint {
  return xlmToStroops(amount)
}

/**
 * Shorten a Stellar address/contract id for display (e.g. GABC...XYZ1).
 */
export function truncateAddress(address: string, start = 6, end = 6): string {
  if (!address || typeof address !== 'string') return ''
  if (address.length <= start + end) return address
  return `${address.slice(0, start)}…${address.slice(-end)}`
}

/**
 * Verify a Stellar wallet signature.
 * The learner signs a challenge string with their Freighter wallet;
 * we verify the signature matches their public key.
 */
export function verifyWalletSignature(
  publicKey: string,
  challenge: string,
  signatureBase64: string
): boolean {
  try {
    if (!isValidStellarPublicKey(publicKey)) return false
    const keypair = Keypair.fromPublicKey(publicKey)
    const data = Buffer.from(challenge, 'utf8')
    const signature = Buffer.from(signatureBase64, 'base64')
    return keypair.verify(data, signature)
  } catch {
    return false
  }
}

/**
 * Generate a random challenge string for wallet authentication.
 */
export function generateAuthChallenge(publicKey: string): string {
  const nonce = Math.random().toString(36).slice(2)
  const ts = Date.now()
  return `stellarlearn:auth:${publicKey}:${ts}:${nonce}`
}

// ==========================================
// Soroban Smart Contract Invocation Helpers
// ==========================================

export interface ContractInvocationParams {
  contractId: string
  method: string
  args: xdr.ScVal[]
}

/**
 * Build an invokeContractFunction operation for a Soroban contract.
 */
export function buildInvokeContractOp(params: ContractInvocationParams): xdr.Operation {
  return Operation.invokeContractFunction({
    contract: params.contractId,
    function: params.method,
    args: params.args,
  })
}

/**
 * Build operation to invoke CredentialContract.issue_credential(learner, course_id, metadata_hash)
 */
export function buildIssueCredentialOp(
  contractId: string,
  learnerPublicKey: string,
  courseId: string,
  metadataHash: string
): xdr.Operation {
  return buildInvokeContractOp({
    contractId,
    method: 'issue_credential',
    args: [
      new Address(learnerPublicKey).toScVal(),
      nativeToScVal(courseId, { type: 'string' }),
      nativeToScVal(metadataHash, { type: 'string' }),
    ],
  })
}

export type MilestoneType = 'ModuleComplete' | 'CourseComplete' | 'AssessmentPassed' | 'StreakBonus'

/**
 * Build operation to invoke RewardContract.disburse_reward(learner, milestone)
 */
export function buildDisburseRewardOp(
  contractId: string,
  learnerPublicKey: string,
  milestone: MilestoneType
): xdr.Operation {
  const milestoneScVal = xdr.ScVal.scvVec([xdr.ScVal.scvSymbol(milestone)])
  return buildInvokeContractOp({
    contractId,
    method: 'disburse_reward',
    args: [
      new Address(learnerPublicKey).toScVal(),
      milestoneScVal,
    ],
  })
}

/**
 * Build operation to invoke CourseAccessContract.unlock_module(learner, course_id, module_id, prior_score)
 */
export function buildUnlockModuleOp(
  contractId: string,
  learnerPublicKey: string,
  courseId: string,
  moduleId: number,
  priorScore: number
): xdr.Operation {
  return buildInvokeContractOp({
    contractId,
    method: 'unlock_module',
    args: [
      new Address(learnerPublicKey).toScVal(),
      nativeToScVal(courseId, { type: 'string' }),
      nativeToScVal(moduleId, { type: 'u32' }),
      nativeToScVal(priorScore, { type: 'u32' }),
    ],
  })
}

/**
 * Build a complete Soroban transaction ready for signing.
 */
export function buildSorobanTx(params: {
  sourceAccount: Account
  networkPassphrase: string
  contractId: string
  method: string
  args: xdr.ScVal[]
  baseFee?: string
}): Transaction {
  const op = buildInvokeContractOp({
    contractId: params.contractId,
    method: params.method,
    args: params.args,
  })

  return new TransactionBuilder(params.sourceAccount, {
    fee: params.baseFee ?? '100000',
    networkPassphrase: params.networkPassphrase,
  })
    .addOperation(op)
    .setTimeout(30)
    .build()
}

// ==========================================
// Real Soroban Transaction Submission
// ==========================================

export interface SorobanSubmitResult {
  success: boolean
  txHash: string
  status: string
  error?: string
  raw?: unknown
}

/**
 * Submit a Soroban contract invocation transaction to the Stellar network.
 *
 * Steps:
 * 1. Load the source account from Horizon
 * 2. Build the transaction with the contract invocation operation
 * 3. Simulate via Soroban RPC
 * 4. Prepare (attach footprint + resource fees)
 * 5. Sign with the provided keypair
 * 6. Submit to Soroban RPC
 * 7. Poll for confirmation
 */
export async function submitSorobanTx(params: {
  network: StellarNetwork
  contractId: string
  method: string
  args: xdr.ScVal[]
  sourceKeypair: Keypair
  baseFee?: string
  timeoutSeconds?: number
}): Promise<SorobanSubmitResult> {
  const {
    network,
    contractId,
    method,
    args,
    sourceKeypair,
    baseFee = '100000',
    timeoutSeconds = 30,
  } = params

  const networkPassphrase = NETWORK_PASSPHRASES[network]
  const horizonUrl = HORIZON_URLS[network]
  const sorobanRpcUrl = SOROBAN_RPC_URLS[network]

  const sorobanServer = new rpc.Server(sorobanRpcUrl)
  const horizonServer = new Horizon.Server(horizonUrl)

  // 1. Load the source account
  const sourceAccount = await horizonServer.loadAccount(sourceKeypair.publicKey())

  // 2. Build the transaction with the contract invocation
  const op = buildInvokeContractOp({ contractId, method, args })
  const tx = new TransactionBuilder(sourceAccount, {
    fee: baseFee,
    networkPassphrase,
  })
    .addOperation(op)
    .setTimeout(timeoutSeconds)
    .build()

  // 3. Simulate the transaction
  const simulated = await sorobanServer.simulateTransaction(tx)

  if (rpc.Api.isSimulationError(simulated)) {
    return {
      success: false,
      txHash: '',
      status: 'simulation_error',
      error: simulated.error,
      raw: simulated,
    }
  }

  // 4. Prepare the transaction (simulate + attach footprint + resource fees)
  const preparedTx = await sorobanServer.prepareTransaction(tx)

  // 5. Sign the transaction
  preparedTx.sign(sourceKeypair)

  // 6. Submit the transaction
  const sendResponse = await sorobanServer.sendTransaction(preparedTx)

  if (sendResponse.status === 'ERROR') {
    return {
      success: false,
      txHash: sendResponse.hash,
      status: 'submit_error',
      error: sendResponse.errorResult?.toString(),
      raw: sendResponse,
    }
  }

  // 7. Poll for transaction confirmation via getTransaction
  const maxAttempts = 15
  let pollStatus: rpc.Api.GetTransactionStatus = rpc.Api.GetTransactionStatus.NOT_FOUND
  let pollRaw: rpc.Api.GetTransactionResponse | undefined

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    pollRaw = await sorobanServer.getTransaction(sendResponse.hash)
    pollStatus = pollRaw.status
    if (pollStatus === rpc.Api.GetTransactionStatus.SUCCESS || pollStatus === rpc.Api.GetTransactionStatus.FAILED) break
  }

  return {
    success: pollStatus === rpc.Api.GetTransactionStatus.SUCCESS,
    txHash: sendResponse.hash,
    status: pollStatus,
    raw: pollRaw,
  }
}

// ==========================================
// Read-only Soroban contract query (simulation only, no submission)
// ==========================================

export interface SorobanQueryResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Query a Soroban contract function without submitting a transaction.
 * This uses simulation only — no signing or submission required.
 * Returns the deserialized return value of the contract function.
 *
 * Example: querySorobanContract({ network: 'testnet', contractId, method: 'get_credentials', args: [...] })
 */
export async function querySorobanContract<T = unknown>(params: {
  network: StellarNetwork
  contractId: string
  method: string
  args: xdr.ScVal[]
  sourcePublicKey?: string
}): Promise<SorobanQueryResult<T>> {
  const { network, contractId, method, args, sourcePublicKey } = params

  const networkPassphrase = NETWORK_PASSPHRASES[network]
  const sorobanRpcUrl = SOROBAN_RPC_URLS[network]
  const horizonUrl = HORIZON_URLS[network]

  const sorobanServer = new rpc.Server(sorobanRpcUrl)
  const horizonServer = new Horizon.Server(horizonUrl)

  // Use a source account for the transaction (can be any account on the network)
  const sourceKey = sourcePublicKey ?? 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
  let sourceAccount: Account
  try {
    sourceAccount = await horizonServer.loadAccount(sourceKey)
  } catch {
    // Fallback: create a minimal account object if loadAccount fails
    sourceAccount = new Account(sourceKey, '0')
  }

  const op = buildInvokeContractOp({ contractId, method, args })
  const tx = new TransactionBuilder(sourceAccount, {
    fee: '100000',
    networkPassphrase,
  })
    .addOperation(op)
    .setTimeout(30)
    .build()

  const simulated = await sorobanServer.simulateTransaction(tx)

  if (rpc.Api.isSimulationError(simulated)) {
    return {
      success: false,
      error: typeof simulated.error === 'string' ? simulated.error : 'Simulation failed',
    }
  }

  if (!rpc.Api.isSimulationSuccess(simulated)) {
    return {
      success: false,
      error: 'Simulation returned unknown result',
    }
  }

  // Extract the return value from the simulation result
  const retval = simulated.result?.retval
  if (!retval) {
    return { success: true, data: undefined as T }
  }

  try {
    const native = scValToNative(retval) as T
    return { success: true, data: native }
  } catch {
    // If deserialization fails, return the raw XDR
    return { success: true, data: retval.toXDR('base64') as unknown as T }
  }
}

/**
 * Build ScVal args for CredentialContract.get_credentials(learner)
 */
export function buildGetCredentialsArgs(learnerPublicKey: string): xdr.ScVal[] {
  return [
    new Address(learnerPublicKey).toScVal(),
  ]
}

/**
 * Build ScVal args for CredentialContract.get_credential(learner, course_id)
 */
export function buildGetCredentialArgs(learnerPublicKey: string, courseId: string): xdr.ScVal[] {
  return [
    new Address(learnerPublicKey).toScVal(),
    nativeToScVal(courseId, { type: 'string' }),
  ]
}

// ==========================================
// Horizon payment verification
// ==========================================

/**
 * Verify that a learner has sent a specific XLM payment to a recipient address.
 * Searches recent transactions from the learner's account for a payment matching the amount.
 */
export async function verifyXlmPayment(params: {
  network: StellarNetwork
  senderPublicKey: string
  recipientPublicKey: string
  amountStroops: bigint
  withinSeconds?: number
}): Promise<{ verified: boolean; txHash?: string; error?: string }> {
  const { network, senderPublicKey, recipientPublicKey, amountStroops, withinSeconds = 300 } = params
  const horizonUrl = HORIZON_URLS[network]
  const server = new Horizon.Server(horizonUrl)

  // Convert stroops to decimal XLM string for comparison (Horizon returns decimal amounts)
  const expectedXlm = stroopsToXlm(amountStroops)

  try {
    const payments = await server
      .payments()
      .forAccount(senderPublicKey)
      .limit(20)
      .order('desc')
      .call()

    const cutoff = Date.now() - withinSeconds * 1000

    for (const payment of payments.records) {
      // Skip if too old
      if (new Date(payment.created_at).getTime() < cutoff) continue

      if (
        payment.type === 'payment' &&
        payment.from === senderPublicKey &&
        payment.to === recipientPublicKey &&
        payment.asset_type === 'native' &&
        // Compare with tolerance for decimal rounding
        Math.abs(Number(payment.amount) - Number(expectedXlm)) < 0.0000001
      ) {
        return { verified: true, txHash: payment.transaction_hash }
      }
    }

    return { verified: false, error: 'No matching payment found' }
  } catch (err) {
    return {
      verified: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

export {
  Networks,
  Transaction,
  Keypair,
  StrKey,
  xdr,
  Address,
  Contract,
  nativeToScVal,
  scValToNative,
  Operation,
  TransactionBuilder,
  Account,
  rpc,
  Horizon,
}
