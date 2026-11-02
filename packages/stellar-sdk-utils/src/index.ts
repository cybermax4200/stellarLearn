import { Networks, Transaction, Keypair, StrKey } from '@stellar/stellar-sdk'

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

export { Networks, Transaction, Keypair, StrKey }
