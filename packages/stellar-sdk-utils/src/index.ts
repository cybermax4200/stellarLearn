import { Networks, Transaction, Keypair } from '@stellar/stellar-sdk'

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

export { Networks, Transaction, Keypair }
