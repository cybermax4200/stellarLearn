import { describe, it, expect } from 'vitest'
import {
  isValidStellarPublicKey,
  isValidContractId,
  stroopsToXlm,
  xlmToStroops,
  formatLearnAmount,
  parseLearnAmount,
  truncateAddress,
  generateAuthChallenge,
  verifyWalletSignature,
  Keypair,
  NETWORK_PASSPHRASES,
  HORIZON_URLS,
} from './index'

describe('stellar-sdk-utils', () => {
  describe('network configuration', () => {
    it('provides correct network passphrases and horizon URLs', () => {
      expect(NETWORK_PASSPHRASES.testnet).toBe('Test SDF Network ; September 2015')
      expect(NETWORK_PASSPHRASES.mainnet).toBe('Public Global Stellar Network ; September 2015')
      expect(HORIZON_URLS.testnet).toBe('https://horizon-testnet.stellar.org')
    })
  })

  describe('address validation', () => {
    it('validates genuine ed25519 public keys', () => {
      const kp = Keypair.random()
      expect(isValidStellarPublicKey(kp.publicKey())).toBe(true)
    })

    it('rejects malformed public keys', () => {
      expect(isValidStellarPublicKey('G12345')).toBe(false)
      expect(isValidStellarPublicKey('invalid')).toBe(false)
      expect(isValidStellarPublicKey('')).toBe(false)
      expect(isValidStellarPublicKey('SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX')).toBe(false)
    })

    it('validates soroban contract ids', () => {
      // Valid StrKey Contract ID with checksum
      expect(isValidContractId('CB5FFEBHXWPSPPRRC34VJTNDMF5VPWI5F7QYSO7SNFRY4LHXQJNOL2GV')).toBe(true)
      expect(isValidContractId('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')).toBe(false)
      expect(isValidContractId('not-a-contract')).toBe(false)
    })

    it('truncates addresses properly', () => {
      const kp = Keypair.random()
      const pk = kp.publicKey()
      const truncated = truncateAddress(pk, 4, 4)
      expect(truncated).toBe(`${pk.slice(0, 4)}…${pk.slice(-4)}`)
      expect(truncateAddress('short', 10, 10)).toBe('short')
      expect(truncateAddress('')).toBe('')
    })
  })

  describe('currency and amount formatting', () => {
    it('converts stroops to decimal XLM correctly', () => {
      expect(stroopsToXlm(10_000_000n)).toBe('1')
      expect(stroopsToXlm(15_500_000n)).toBe('1.55')
      expect(stroopsToXlm(100n)).toBe('0.00001')
      expect(stroopsToXlm(0n)).toBe('0')
      expect(stroopsToXlm(-10_000_000n)).toBe('-1')
    })

    it('converts decimal XLM to stroops correctly', () => {
      expect(xlmToStroops('1')).toBe(10_000_000n)
      expect(xlmToStroops('1.55')).toBe(15_500_000n)
      expect(xlmToStroops('0.00001')).toBe(100n)
      expect(xlmToStroops('0')).toBe(0n)
      expect(xlmToStroops('-5.25')).toBe(-52_500_000n)
    })

    it('formats and parses LEARN amounts (7 decimals)', () => {
      expect(formatLearnAmount(50_000_000n)).toBe('5')
      expect(parseLearnAmount('5')).toBe(50_000_000n)
      expect(parseLearnAmount('12.345')).toBe(123_450_000n)
    })
  })

  describe('auth signature lifecycle', () => {
    it('generates a formatted challenge containing public key and nonce', () => {
      const kp = Keypair.random()
      const pk = kp.publicKey()
      const challenge = generateAuthChallenge(pk)

      expect(challenge.startsWith(`stellarlearn:auth:${pk}:`)).toBe(true)
      const parts = challenge.split(':')
      expect(parts.length).toBe(5)
      expect(Number(parts[3])).toBeGreaterThan(0)
    })

    it('verifies a valid wallet signature', () => {
      const kp = Keypair.random()
      const challenge = generateAuthChallenge(kp.publicKey())
      const sig = kp.sign(Buffer.from(challenge, 'utf8'))
      const valid = verifyWalletSignature(kp.publicKey(), challenge, sig.toString('base64'))
      expect(valid).toBe(true)
    })

    it('rejects tampered challenge or signature', () => {
      const kp = Keypair.random()
      const challenge = generateAuthChallenge(kp.publicKey())
      const sig = kp.sign(Buffer.from(challenge, 'utf8'))

      // Tampered challenge
      expect(verifyWalletSignature(kp.publicKey(), challenge + '-tampered', sig.toString('base64'))).toBe(false)
      // Invalid signature
      expect(verifyWalletSignature(kp.publicKey(), challenge, 'aW52YWxpZA==')).toBe(false)
      // Invalid public key
      expect(verifyWalletSignature('invalid-pk', challenge, sig.toString('base64'))).toBe(false)
    })
  })

  describe('soroban contract invocation helpers', () => {
    const mockContractId = 'CD2RFDAIJX3WPITPCKQ6ARAWIIWHSRFADBQERGMLBAMZTI3GEGQXEQCP'
    const kp = Keypair.random()

    it('builds a valid issue_credential contract operation', async () => {
      const { buildIssueCredentialOp } = await import('./index')
      const op = buildIssueCredentialOp(
        mockContractId,
        kp.publicKey(),
        'stellar-fundamentals',
        'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco'
      )
      expect(op).toBeDefined()
      expect(op.toXDR).toBeTypeOf('function')
      const xdrBase64 = op.toXDR('base64')
      expect(xdrBase64.length).toBeGreaterThan(0)
    })

    it('builds a valid disburse_reward contract operation', async () => {
      const { buildDisburseRewardOp } = await import('./index')
      const op = buildDisburseRewardOp(mockContractId, kp.publicKey(), 'CourseComplete')
      expect(op).toBeDefined()
      expect(op.toXDR('base64').length).toBeGreaterThan(0)
    })

    it('builds a valid unlock_module contract operation', async () => {
      const { buildUnlockModuleOp } = await import('./index')
      const op = buildUnlockModuleOp(mockContractId, kp.publicKey(), 'stellar-fundamentals', 2, 85)
      expect(op).toBeDefined()
      expect(op.toXDR('base64').length).toBeGreaterThan(0)
    })

    it('constructs a full signed Soroban transaction', async () => {
      const { buildSorobanTx, Account, nativeToScVal } = await import('./index')
      const account = new Account(kp.publicKey(), '100')
      const tx = buildSorobanTx({
        sourceAccount: account,
        networkPassphrase: 'Test SDF Network ; September 2015',
        contractId: mockContractId,
        method: 'ping',
        args: [nativeToScVal('pong', { type: 'string' })],
      })
      expect(tx.operations.length).toBe(1)
      expect(tx.fee).toBe('100000')
    })
  })
})
