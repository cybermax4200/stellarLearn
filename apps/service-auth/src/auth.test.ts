import { describe, it, expect } from 'vitest'
import { generateAuthChallenge, verifyWalletSignature } from '@stellarlearn/stellar-sdk-utils'
import { Keypair } from '@stellar/stellar-sdk'

describe('auth challenge', () => {
  it('generates a challenge containing the public key', () => {
    const kp = Keypair.random()
    const challenge = generateAuthChallenge(kp.publicKey())
    expect(challenge).toContain(kp.publicKey())
    expect(challenge).toContain('stellarlearn:auth:')
  })

  it('verifies a valid signature', () => {
    const kp = Keypair.random()
    const challenge = generateAuthChallenge(kp.publicKey())
    const sig = kp.sign(Buffer.from(challenge, 'utf8'))
    const valid = verifyWalletSignature(kp.publicKey(), challenge, sig.toString('base64'))
    expect(valid).toBe(true)
  })

  it('rejects an invalid signature', () => {
    const kp = Keypair.random()
    const challenge = generateAuthChallenge(kp.publicKey())
    const valid = verifyWalletSignature(kp.publicKey(), challenge, 'badsig==')
    expect(valid).toBe(false)
  })
})
