# 🎓 StellarLearn — AI-Powered Learning Management System on Stellar Network

> A decentralised, AI-driven education platform that combines adaptive learning, verifiable credentials, and token-based incentives — all anchored on the Stellar blockchain.

**Repository:** [`github.com/stellarlearn/stellarlearn`](https://github.com/stellarlearn/stellarlearn)

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Monorepo Structure](#monorepo-structure)
- [Architecture](#architecture)
  - [Frontend Layer](#frontend-layer)
  - [AI Services Layer](#ai-services-layer)
  - [Stellar Network Layer](#stellar-network-layer)
  - [Off-Chain Storage](#off-chain-storage)
- [Tech Stack](#tech-stack)
- [Smart Contracts (Soroban)](#smart-contracts-soroban)
- [Tokenomics](#tokenomics)
- [AI Components](#ai-components)
- [Credential System](#credential-system)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Variables](#environment-variables)
  - [Running Locally](#running-locally)
- [CI/CD](#cicd)
- [API Reference](#api-reference)
- [Smart Contract Deployment](#smart-contract-deployment)
- [Testing](#testing)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

StellarLearn is a next-generation Learning Management System (LMS) that merges artificial intelligence with blockchain technology to deliver personalised, trustless, and transparent education at scale.

Traditional LMS platforms suffer from:
- Static, one-size-fits-all content delivery
- Centralised, easily falsifiable credentials
- No learner ownership of records or achievements
- Zero incentive mechanisms to drive engagement

StellarLearn solves all of these by pairing an **adaptive AI engine** with **Soroban smart contracts** on the Stellar network — creating a platform where learning paths adapt in real time, credentials are immutably issued on-chain, and learners are rewarded with XLM-based tokens for every milestone they hit.

---

## Key Features

| Feature | Description | Package |
|---|---|---|
| 🤖 Adaptive AI Engine | Personalised learning paths that evolve with each learner | `apps/ai-adaptive` |
| 💬 AI Tutor / Chatbot | NLP-powered 24/7 assistant for Q&A and mentoring | `apps/ai-tutor` |
| 📝 Content Generator | AI-created quizzes, summaries, and course modules | `apps/ai-content` |
| 🏆 Credential NFTs | Tamper-proof certificates issued as NFTs on Stellar | `contracts/credential` |
| 🪙 Token Rewards | XLM-based incentive system for course completion | `contracts/reward` |
| ⚡ Soroban Contracts | Smart contracts auto-grade, disburse tokens, unlock content | `contracts/` |
| 🔐 Decentralised Records | IPFS-stored data with on-chain content hashes | `apps/storage` |
| 🪪 DID / Wallet Login | Stellar wallets as SSO with decentralised identity | `apps/service-auth` |
| 📊 Performance Analytics | AI-driven predictions to flag at-risk learners | `apps/ai-analytics` |
| 🌍 Borderless Payments | XLM settlement for fees, payouts, and scholarships | `contracts/reward` |

---

## Monorepo Structure

```
stellarlearn/
│
├── apps/
│   ├── app-learner/           # Next.js learner portal
│   ├── app-instructor/        # Next.js instructor studio
│   ├── app-admin/             # Next.js admin panel
│   ├── api-gateway/           # GraphQL/REST gateway
│   ├── service-auth/          # Stellar DID, Freighter wallet SSO
│   ├── service-courses/       # Course catalogue, enrolment, progress
│   ├── service-notifications/ # Email, push, and in-app notifications
│   ├── ai-adaptive/           # Adaptive learning engine (Python / FastAPI)
│   ├── ai-tutor/              # AI tutor & chatbot (Claude API)
│   ├── ai-content/            # Content generation service
│   ├── ai-analytics/          # Performance analytics & risk prediction
│   ├── ai-triggers/           # AI → blockchain bridge
│   └── storage/               # IPFS integration & CDN proxy
│
├── contracts/
│   ├── credential/            # CredentialContract (Rust / Soroban)
│   ├── reward/                # RewardContract
│   ├── access/                # CourseAccessContract
│   ├── governance/            # GovernanceContract
│   └── Makefile               # build / deploy / test all contracts
│
├── packages/
│   ├── ui-kit/                # Shared React component library
│   └── stellar-sdk-utils/     # Shared Stellar SDK helpers (JS + Python)
│
├── infra/                     # Kubernetes manifests, Terraform, Helm charts
├── docs/                      # Architecture docs, ADRs, API specs
├── .github/                   # GitHub Actions workflows, PR/issue templates
├── docker-compose.yml
└── package.json               # Workspace root (npm/pnpm workspaces)
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          FRONTEND LAYER                                 │
│  ┌──────────────────┐  ┌───────────────────┐  ┌──────────────────────┐ │
│  │ app-learner      │  │ app-instructor    │  │ app-admin            │ │
│  │ (Next.js)        │  │ (Next.js)         │  │ (Next.js)            │ │
│  └──────────────────┘  └───────────────────┘  └──────────────────────┘ │
│                    shared: packages/ui-kit                              │
└────────────────────────────┬────────────────────────────────────────────┘
                             │ GraphQL / REST
                    ┌────────▼────────┐
                    │  api-gateway    │
                    │  (GraphQL/REST) │
                    └────────┬────────┘
            ┌────────────────┼────────────────────┐
            │                │                    │
┌───────────▼──┐   ┌─────────▼──────┐   ┌─────────▼────────┐
│ service-auth │   │service-courses │   │service-notif...  │
└──────────────┘   └────────────────┘   └──────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────────────┐
│                        AI SERVICES LAYER                                │
│  ┌──────────────┐  ┌────────────┐  ┌────────────┐  ┌─────────────────┐ │
│  │ ai-adaptive  │  │ ai-tutor   │  │ ai-content │  │ ai-analytics    │ │
│  └──────────────┘  └────────────┘  └────────────┘  └─────────────────┘ │
│                         ┌───────────────┐                               │
│                         │  ai-triggers  │ ← fires on milestone events   │
│                         └───────┬───────┘                               │
└─────────────────────────────────┼───────────────────────────────────────┘
                                  │ Stellar SDK / Horizon API
┌─────────────────────────────────▼───────────────────────────────────────┐
│                      STELLAR NETWORK LAYER                              │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                      contracts/ (Rust / Soroban)                 │   │
│  │  CredentialContract · RewardContract · AccessContract · Govern.  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│             Stellar Consensus Protocol — <6s finality, ~0.00001 XLM     │
└─────────────────────────────────────────────────────────────────────────┘
              │                                        │
   ┌──────────▼──────────┐               ┌────────────▼────────────────┐
   │  apps/storage       │               │  apps/service-auth          │
   │  (IPFS / CDN proxy) │               │  (Stellar DID / Freighter)  │
   └─────────────────────┘               └─────────────────────────────┘
```

### Frontend Layer

Three Next.js applications sharing `packages/ui-kit`:

- **`app-learner`** — course catalogue, personalised learning path, progress dashboard, achievement badges, and an integrated XLM wallet to view token balances and credential NFTs.
- **`app-instructor`** — course builder, AI-assisted content creation tools, submission grading interface, and real-time analytics on learner cohorts.
- **`app-admin`** — user management, tokenomics configuration, governance settings, and on-chain transaction monitoring.
- **`ui-kit`** — shared design system: Tailwind-based components, Stellar wallet connectors, and common hooks.

### AI Services Layer

Five Python/FastAPI microservices under `apps/`:

- **`ai-adaptive`** — continuously analyses learner performance data and re-routes the learning path using Bayesian or Deep Knowledge Tracing models.
- **`ai-tutor`** — LLM-backed conversational assistant (Anthropic Claude API) with per-session conversation history and human escalation.
- **`ai-content`** — takes raw instructor materials (PDFs, URLs, notes) and produces quizzes, flashcards, summaries, and supplementary modules.
- **`ai-analytics`** — predictive model that flags at-risk learners before dropout.
- **`ai-triggers`** — bridge between AI events and the Stellar blockchain. Signs and submits Stellar transactions when milestones are confirmed.

### Stellar Network Layer

All trust, ownership, and incentive logic lives in `contracts/`:

- **Credential NFTs** — course completion certificates as non-fungible tokens, verifiable directly on the Stellar ledger.
- **Token Rewards** — `LEARN` token disbursed automatically upon milestone completion.
- **Soroban Smart Contracts** — Rust-based contracts handling grading thresholds, content unlocking, token disbursement, and refund logic.
- **Decentralised Student Records** — course content on IPFS; content hashes anchored on-chain. Learner-owned, tamper-proof.
- **Stellar Consensus Protocol (SCP)** — transaction finality in under 6 seconds at ~0.00001 XLM per operation.

### Off-Chain Storage

`apps/storage` abstracts IPFS pinning and CDN proxying:

- **IPFS** (via Pinata) for decentralised, content-addressed storage of course materials.
- **Cloud CDN** (Cloudflare R2) for low-latency video streaming.
- Only the **content hash (CID)** is recorded on the Stellar ledger.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, React, TailwindCSS, Framer Motion |
| API Gateway | Node.js, GraphQL (Yoga), REST |
| Auth | Stellar DID, Freighter Wallet, Albedo, JWT |
| AI Services | Python 3.11, FastAPI, Anthropic Claude API, scikit-learn, LangChain |
| Blockchain | Stellar Network, Soroban (Rust), Stellar SDK (JS + Python) |
| Storage | IPFS (Pinata), Cloudflare R2, Node.js proxy |
| Database | PostgreSQL (off-chain state), Redis (caching) |
| DevOps | Docker, Kubernetes, Helm, Terraform, GitHub Actions |
| Monitoring | Prometheus, Grafana, Stellar Expert |

---

## Smart Contracts (Soroban)

All contracts live in `contracts/`, written in Rust using the Soroban SDK.

### `CredentialContract`

Issues a non-fungible credential token to a learner's Stellar wallet upon course completion.

```rust
pub fn issue_credential(
    env: Env,
    learner: Address,
    course_id: String,
    metadata_hash: String, // IPFS CID of the credential metadata
) -> Result<(), Error>
```

### `RewardContract`

Disburses `LEARN` tokens to a learner when a milestone event is submitted by `ai-triggers`.

```rust
pub fn disburse_reward(
    env: Env,
    learner: Address,
    milestone: MilestoneType,
    amount: i128,
) -> Result<(), Error>
```

### `CourseAccessContract`

Unlocks the next module once prerequisite conditions (score threshold, prior completion) are met.

```rust
pub fn unlock_module(
    env: Env,
    learner: Address,
    course_id: String,
    module_id: u32,
) -> Result<bool, Error>
```

### `GovernanceContract`

Allows `LEARN` token holders to vote on platform parameters — reward rates, course whitelisting, fee structures.

```rust
pub fn submit_proposal(env: Env, proposer: Address, proposal: Proposal) -> Result<u64, Error>
pub fn cast_vote(env: Env, voter: Address, proposal_id: u64, vote: VoteType) -> Result<(), Error>
```

---

## Tokenomics

### `LEARN` Token (Platform Token)

| Parameter | Value |
|---|---|
| Token type | Stellar Asset (custom) |
| Total supply | 100,000,000 LEARN |
| Distribution | 40% learner rewards · 30% instructor incentives · 20% ecosystem fund · 10% team |
| Utility | Course access, governance voting, premium features |
| Earning | Complete courses, pass assessments, participate in discussions |
| Redemption | Unlock paid courses, exchange for XLM, vote on governance proposals |

### `XLM` (Native Stellar)

Used for transaction fees, course fee payments, instructor payouts, cross-border settlements, and minimum account reserves.

---

## AI Components

### Adaptive Learning Engine (`apps/ai-adaptive`)

Uses a knowledge tracing model (Bayesian Knowledge Tracing or Deep Knowledge Tracing) to estimate concept mastery and route learners to the most impactful next activity.

```python
from services.adaptive import AdaptiveEngine

engine = AdaptiveEngine(learner_id="abc123")
next_module = engine.recommend_next(
    completed_modules=["intro-blockchain", "stellar-basics"],
    performance_scores={"intro-blockchain": 0.91, "stellar-basics": 0.62}
)
```

### AI Tutor (`apps/ai-tutor`)

Backed by the Anthropic Claude API with a course-specific system prompt. Maintains per-session conversation history and can escalate to human instructors when confidence is low.

```python
from services.tutor import AITutor

tutor = AITutor(course_context="stellar-smart-contracts")
response = tutor.ask("What is the difference between Soroban and Ethereum's EVM?")
```

### Content Generator (`apps/ai-content`)

Accepts raw materials (PDFs, URLs, plain text) and produces structured learning content.

```python
from services.content import ContentGenerator

gen = ContentGenerator()
quiz = gen.generate_quiz(
    source="path/to/lecture-notes.pdf",
    num_questions=10,
    difficulty="intermediate"
)
```

---

## Credential System

1. Learner completes a course → `service-courses` emits a completion event
2. `ai-adaptive` confirms the completion score meets the threshold
3. `ai-triggers` signs and submits a Stellar transaction
4. `CredentialContract` mints an NFT to the learner's Stellar wallet
5. Credential metadata (name, course, grade, date, instructor) is stored on IPFS; the CID is embedded in the NFT
6. Any third party verifies by querying the Stellar ledger with the learner's public key — no platform involvement required

Credentials are **learner-owned**: they live in the learner's Stellar wallet and cannot be revoked by the platform.

---

## Getting Started

### Prerequisites

- Node.js v18+
- Python 3.11+
- Rust (latest stable)
- Stellar CLI: `cargo install --locked stellar-cli --features opt`
- Docker & Docker Compose
- A Stellar testnet account (funded via [Friendbot](https://friendbot.stellar.org))

### Environment Variables

Copy the root `.env.example` and fill in the values:

```bash
cp .env.example .env
```

```env
# Stellar Network
STELLAR_NETWORK=testnet
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
STELLAR_CONTRACT_TRIGGER_SECRET=SXXXXXXXXXXXXXXX

# Contract Addresses (set after deployment)
CREDENTIAL_CONTRACT_ID=CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
REWARD_CONTRACT_ID=CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
ACCESS_CONTRACT_ID=CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
GOVERNANCE_CONTRACT_ID=CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Storage
IPFS_API_KEY=your_pinata_api_key
IPFS_API_SECRET=your_pinata_api_secret

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/stellarlearn
REDIS_URL=redis://localhost:6379

# AI
ANTHROPIC_API_KEY=your_anthropic_api_key
CLAUDE_MODEL=claude-sonnet-4-20250514

# Auth
JWT_SECRET=your_jwt_secret
FREIGHTER_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
```

### Running Locally

```bash
# Install all dependencies
npm install

# Start the full stack
docker-compose up --build

# Or start individual services:

# Frontend learner app (http://localhost:3000)
npm run dev --workspace=apps/app-learner

# API gateway (http://localhost:4000)
npm run dev --workspace=apps/api-gateway

# AI tutor service (http://localhost:8001)
cd apps/ai-tutor && pip install -r requirements.txt && uvicorn main:app --reload --port 8001

# Stellar local testnet (for contract development)
stellar network start local
```

---

## CI/CD

GitHub Actions workflows live in `.github/workflows/`:

| Workflow | Trigger | Scope |
|---|---|---|
| `ci-node.yml` | Push / PR | `apps/app-*`, `apps/api-gateway`, `packages/ui-kit` |
| `ci-python.yml` | Push / PR | `apps/ai-*`, `apps/storage` |
| `ci-rust.yml` | Push / PR | `contracts/` |
| `deploy-service.yml` | Release tag | All services |
| `deploy-contracts.yml` | Release tag | `contracts/` only |

### Contract Deploy

On a new release tag, `deploy-contracts.yml` automatically:

1. Builds all Soroban contracts
2. Deploys to testnet (on `v*-rc*` tags) or mainnet (on `v*` tags)
3. Updates contract address secrets in the repo environment

---

## API Reference

Full API specs live in `docs/api/`:

- `docs/api/openapi.yaml` — REST API spec
- `docs/api/schema.graphql` — GraphQL schema
- `docs/api/stellar-events.md` — on-chain event schemas

### AI Services Endpoints

| Service | Endpoint | Method | Description |
|---|---|---|---|
| `ai-adaptive` | `/recommend` | POST | Get next recommended module |
| `ai-tutor` | `/ask` | POST | Send a message to the AI tutor |
| `ai-content` | `/quiz` | POST | Generate a quiz from source material |
| `ai-content` | `/summary` | POST | Generate a summary from source material |
| `ai-analytics` | `/risk` | GET | Get at-risk learner predictions |
| `ai-triggers` | `/complete` | POST | Trigger on-chain milestone |

---

## Smart Contract Deployment

```bash
cd contracts

# Build all contracts
make build

# Deploy to testnet
make deploy-testnet

# Deploy a single contract
stellar contract deploy \
  --wasm credential/target/wasm32-unknown-unknown/release/credential_contract.wasm \
  --source SXXXXXXXXXXXXXXX \
  --network testnet

# Invoke a contract function
stellar contract invoke \
  --id CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX \
  --source SXXXXXXXXXXXXXXX \
  --network testnet \
  -- issue_credential \
  --learner GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX \
  --course_id "stellar-smart-contracts-101" \
  --metadata_hash "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco"
```

---

## Testing

```bash
# Run all tests
npm run test

# Per-service:
npm run test --workspace=apps/app-learner      # Vitest unit tests
npm run test --workspace=apps/api-gateway      # Jest integration tests
cd apps/ai-tutor   && pytest                   # Pytest unit + integration
cd apps/ai-adaptive && pytest --cov            # With coverage
cd contracts       && cargo test               # Rust unit tests
cd contracts       && make test-e2e            # Soroban testnet e2e tests
```

---

## Roadmap

- [x] Architecture design and monorepo structure
- [x] Soroban smart contract specifications
- [x] GitHub Actions CI/CD workflows
- [ ] `ui-kit` v1 — shared design system
- [ ] MVP frontend apps (`app-learner`, `app-instructor`)
- [ ] `api-gateway` and `service-courses` v1
- [ ] `ai-adaptive` engine v1
- [ ] `ai-tutor` — Claude API integration
- [ ] Credential NFT issuance on testnet (`contracts` v1)
- [ ] `LEARN` token deployment and reward system
- [ ] IPFS-based student records (`storage` service)
- [ ] Governance contract and DAO tooling
- [ ] Mobile app (React Native — `apps/app-mobile`)
- [ ] Mainnet launch
- [ ] Multi-language support
- [ ] Third-party LMS data import (SCORM/xAPI compatibility)

---

## Contributing

1. Fork the repo and create a branch from `develop`
2. Follow the branch conventions below
3. Open a PR targeting `develop` — cross-reference any related issues

**Branch conventions:**

```
main          → production
develop       → integration branch (all PRs target this)
feature/*     → new features
fix/*         → bug fixes
chore/*       → maintenance
release/*     → release preparation
```

---

## License

This project is licensed under the MIT License. See [LICENSE](./LICENSE) for details.

---

<div align="center">
  Built on <a href="https://stellar.org">Stellar</a> · Powered by AI · Owned by learners<br/>
  <a href="https://github.com/stellarlearn/stellarlearn">github.com/stellarlearn/stellarlearn</a>
</div>
