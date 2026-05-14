# ADR 001 — Stellar / Soroban for Smart Contracts

**Date:** 2026-05-14  
**Status:** Accepted

## Context

The platform needs smart contracts for credential issuance, token rewards, course access gating, and governance. The main candidates were Ethereum/EVM, Solana, and Stellar/Soroban.

## Decision

Use Stellar with Soroban smart contracts (Rust).

Key reasons:
- Transaction finality in under 6 seconds vs. ~12s on Ethereum
- Fee per operation ~0.00001 XLM, making micro-reward disbursements economically viable at scale
- Native asset support simplifies the `LEARN` token and XLM payment flows
- Rust + Soroban SDK provides memory safety and a deterministic execution environment
- Stellar's built-in DEX and anchor network support borderless payments without bridging

## Consequences

- Contributors working on contracts must know Rust and the Soroban SDK
- The platform is coupled to Stellar's ecosystem (Freighter/Albedo wallets, Horizon API)
- EVM tooling (Hardhat, Foundry, MetaMask) does not apply here
