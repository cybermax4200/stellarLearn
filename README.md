# 🎓 StellarLearn — AI-Powered Learning Management System on Stellar Network

> **Education reimagined.** A decentralised, AI-driven platform that combines adaptive learning, verifiable credentials, and token-based incentives — all anchored on the Stellar blockchain.

[![Build Status](https://img.shields.io/github/actions/workflow/status/stellarlearn/stellarlearn/ci-node.yml?label=frontend&style=flat-square)](https://github.com/stellarlearn/stellarlearn/actions)
[![Rust CI](https://img.shields.io/github/actions/workflow/status/stellarlearn/stellarlearn/ci-rust.yml?label=contracts&style=flat-square)](https://github.com/stellarlearn/stellarlearn/actions)
[![Python CI](https://img.shields.io/github/actions/workflow/status/stellarlearn/stellarlearn/ci-python.yml?label=ai-services&style=flat-square)](https://github.com/stellarlearn/stellarlearn/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](./LICENSE)
[![Stellar Network](https://img.shields.io/badge/Stellar-Soroban-blue?style=flat-square&logo=stellar)](https://stellar.org)
[![Powered by Claude](https://img.shields.io/badge/AI-Claude%20API-blueviolet?style=flat-square)](https://anthropic.com)


---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [How It Works](#how-it-works)
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
- [Security & Trust](#security--trust)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Variables](#environment-variables)
  - [Running Locally](#running-locally)
- [Developer Experience](#developer-experience)
- [Deployment](#deployment)
- [CI/CD](#cicd)
- [API Reference](#api-reference)
- [Smart Contract Deployment](#smart-contract-deployment)
- [Testing](#testing)
- [Roadmap](#roadmap)
- [Community & Support](#community--support)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

StellarLearn is a next-generation Learning Management System (LMS) that merges artificial intelligence with blockchain technology to deliver personalised, trustless, and transparent education at scale.

**The problem with education today is not access — it's trust and incentive.** Learners complete courses and receive certificates that live in a PDF on their desktop, easily forged and impossible to verify without contacting the issuing institution. Instructors have no way to prove their content quality. Platforms hold all the power over records that belong to learners.

StellarLearn flips this model entirely:

- 🧠 **AI adapts to you** — your learning path evolves in real time based on what you know and where you struggle
- ⛓️ **Credentials live on-chain** — issued as NFTs to your Stellar wallet, verifiable by anyone, owned by you forever
- 🪙 **You earn as you learn** — `LEARN` tokens are automatically disbursed by smart contracts when you hit milestones
- 🌍 **No borders, no gatekeepers** — XLM payments mean anyone, anywhere can access and pay for education

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
| 🪙 Token Rewards | `LEARN` token incentive system for course completion | `contracts/reward` |
| ⚡ Soroban Contracts | Smart contracts auto-grade, disburse tokens, unlock content | `contracts/` |
| 🔐 Decentralised Records | IPFS-stored data with on-chain content hashes | `apps/storage` |
| 🪪 DID / Wallet Login | Stellar wallets as SSO with decentralised identity | `apps/service-auth` |
| 📊 Performance Analytics | AI-driven predictions to flag at-risk learners | `apps/ai-analytics` |
| 🌍 Borderless Payments | XLM settlement for fees, payouts, and scholarships | `contracts/reward` |

---

## How It Works

Here's the complete learner journey from first visit to verified credential:

```
1. 🪪  CONNECT WALLET
       Learner connects their Freighter or Albedo Stellar wallet.
       service-auth issues a JWT scoped to their Stellar public key.
       No username. No password. No platform lock-in.

2. 🗺️  GET YOUR LEARNING PATH
       ai-adaptive analyses any prior performance data and builds
       a personalised module sequence using knowledge tracing models.
       First-time learners get a smart onboarding assessment.

3. 📚  LEARN & INTERACT
       Learner works through AI-generated content: videos, quizzes,
       flashcards, and summaries — all produced or curated by ai-content.
       The AI tutor (ai-tutor) is available 24/7 for questions.

4. 📈  REAL-TIME ADAPTATION
       After every assessment, ai-adaptive re-scores concept mastery
       and re-routes the path. Struggling with a concept? You get
       targeted remediation. Excelling? You unlock advanced modules faster.

5. ✅  MILESTONE CONFIRMED
       service-courses emits a completion event. ai-adaptive validates
       the score threshold. ai-triggers signs and submits a Stellar
       transaction — all within seconds.

6. 🏆  ON-CHAIN CREDENTIAL MINTED
       CredentialContract mints an NFT to the learner's Stellar wallet.
       Metadata (name, course, grade, date, instructor) is pinned to IPFS.
       The content hash (CID) is embedded in the NFT — tamper-proof forever.

7. 🪙  LEARN TOKENS DISBURSED
       RewardContract automatically sends LEARN tokens to the learner's
       wallet. Tokens can be used for premium courses, governance votes,
       or exchanged for XLM.
```

> 💡 **Steps 5–7 happen automatically via smart contracts.** No admin approval, no manual processing, no waiting. The platform cannot withhold a credential or reward that the contract has determined is earned.

---

## Monorepo Structure

The entire platform lives in a single repository, managed as an npm/pnpm workspace. Each `apps/` directory is an independently deployable service; `packages/` contains shared libraries consumed across services.

> Legend: ✅ implemented · 🚧 planned

```
stellarlearn/
│
├── apps/
│   ├── app-learner/           # ✅ Next.js learner portal
│   ├── app-instructor/        # 🚧 Next.js instructor studio
│   ├── app-admin/             # 🚧 Next.js admin panel
│   ├── api-gateway/           # 🚧 GraphQL/REST gateway
│   ├── service-auth/          # ✅ Stellar DID, Freighter wallet SSO
│   ├── service-courses/       # ✅ Course catalogue, enrolment, progress
│   ├── service-notifications/ # 🚧 Email, push, and in-app notifications
│   ├── ai-adaptive/           # ✅ Adaptive learning engine (Python / FastAPI)
│   ├── ai-tutor/              # ✅ AI tutor & chatbot (Claude API)
│   ├── ai-content/            # 🚧 Content generation service
│   ├── ai-analytics/          # 🚧 Performance analytics & risk prediction
│   ├── ai-triggers/           # 🚧 AI → blockchain bridge
│   └── storage/               # 🚧 IPFS integration & CDN proxy
│
├── contracts/
│   ├── credential/            # ✅ CredentialContract (Rust / Soroban)
│   ├── reward/                # ✅ RewardContract
│   ├── access/                # ✅ CourseAccessContract
│   ├── governance/            # ✅ GovernanceContract
│   └── Makefile               # ✅ build / deploy / test all contracts
│
├── packages/
│   ├── ui-kit/                # ✅ Shared React component library
│   └── stellar-sdk-utils/     # ✅ Shared Stellar SDK helpers (JS + Python)
│
├── infra/                     # 🚧 Kubernetes manifests, Terraform, Helm charts
├── docs/                      # ✅ Architecture docs, ADRs, API specs
├── .github/                   # ✅ GitHub Actions workflows, PR/issue templates
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

Three independent Next.js applications share a common `packages/ui-kit` component library:

- **`app-learner`** — the primary learner-facing portal. Displays the personalised learning path, course catalogue, progress dashboard, achievement badges, and an integrated XLM wallet view showing token balances and credential NFTs. Communicates with `api-gateway` over GraphQL.
- **`app-instructor`** — the instructor studio. Provides a drag-and-drop course builder, AI-assisted content creation tools (backed by `ai-content`), a submission grading interface, and real-time cohort analytics powered by `ai-analytics`.
- **`app-admin`** — the platform control panel. Manages users, configures tokenomics parameters, monitors on-chain transactions, and surfaces governance proposals from `GovernanceContract`.
- **`packages/ui-kit`** — the shared design system: Tailwind-based components, Stellar wallet connectors (Freighter, Albedo), form primitives, and common React hooks. Versioned independently and consumed by all three apps via workspace symlinks.

### AI Services Layer

Five Python/FastAPI microservices, each independently deployable and horizontally scalable:

- **`ai-adaptive`** — the brain of the platform. Continuously analyses learner performance data and re-routes the learning path to focus on weak areas using Bayesian Knowledge Tracing (BKT) or Deep Knowledge Tracing (DKT) models. Exposes a `/recommend` endpoint consumed by `service-courses` after every assessment submission.
- **`ai-tutor`** — an LLM-backed conversational assistant powered by the Anthropic Claude API. Maintains per-session conversation history in Redis, uses a course-specific system prompt injected at session start, and can escalate to a human instructor queue when its confidence score falls below a threshold.
- **`ai-content`** — takes raw instructor materials (PDFs, URLs, plain text) and produces structured learning content: multiple-choice quizzes, flashcard decks, chapter summaries, and supplementary reading modules. Instructors review and approve generated content before it goes live.
- **`ai-analytics`** — a predictive risk model that flags at-risk learners before they drop out. Surfaces actionable insights to instructors (e.g. "Learner X has not logged in for 5 days and scored below 60% on the last two assessments"). Feeds data to `app-instructor` dashboards.
- **`ai-triggers`** — the critical bridge between the AI layer and the Stellar blockchain. Listens for milestone completion events from `service-courses`, validates them against `ai-adaptive` scores, then signs and submits Stellar transactions to invoke `CredentialContract` and `RewardContract`. This service holds the platform's contract-trigger keypair and must be treated as a high-security component.

### Stellar Network Layer

All trust, ownership, and incentive logic lives in `contracts/`:

- **Credential NFTs** — course completion certificates issued as non-fungible tokens directly to the learner's Stellar wallet. Verifiable by anyone by querying the Stellar ledger with the learner's public key — no platform involvement required.
- **Token Rewards** — a custom Stellar asset (`LEARN` token) disbursed automatically by `RewardContract` upon milestone completion. The contract enforces disbursement rules; the platform cannot override them.
- **Soroban Smart Contracts** — Rust-based contracts handling automated grading thresholds, content unlocking, token disbursement, and refund logic. Deployed to the Stellar network and invoked by `ai-triggers`.
- **Decentralised Student Records** — course content stored on IPFS; content hashes anchored on-chain. Learner-owned and tamper-proof — even if the StellarLearn platform shuts down, credentials remain verifiable.
- **Stellar Consensus Protocol (SCP)** — Federated Byzantine Agreement provides transaction finality in under 6 seconds at approximately 0.00001 XLM per operation, making micro-reward disbursements economically viable at scale.

### Off-Chain Storage

`apps/storage` is a thin service that abstracts IPFS pinning and CDN proxying:

- **IPFS** (via Pinata) for decentralised, content-addressed storage of course materials, credential metadata, and learner records.
- **Cloudflare R2** as a CDN layer for low-latency video streaming and static asset delivery.
- Only the **content hash (CID)** is ever recorded on the Stellar ledger — keeping on-chain storage costs minimal while preserving verifiability.

---

## Tech Stack

| Layer | Technology | Package(s) |
|---|---|---|
| Frontend | Next.js 14, React, TailwindCSS, Framer Motion | `apps/app-*`, `packages/ui-kit` |
| API Gateway | Node.js, GraphQL (Yoga), REST | `apps/api-gateway` |
| Auth | Stellar DID, Freighter Wallet, Albedo, JWT | `apps/service-auth` |
| AI Services | Python 3.11, FastAPI, Anthropic Claude API, scikit-learn, LangChain | `apps/ai-*` |
| Blockchain | Stellar Network, Soroban (Rust), Stellar SDK (JS + Python) | `contracts/`, `packages/stellar-sdk-utils` |
| Storage | IPFS (Pinata), Cloudflare R2, Node.js proxy | `apps/storage` |
| Database | PostgreSQL (off-chain state), Redis (caching + sessions) | `apps/service-courses`, `apps/service-auth` |
| DevOps | Docker, Kubernetes, Helm, Terraform, GitHub Actions | `infra/` |
| Monitoring | Prometheus, Grafana, Stellar Expert | planned |


---

## Smart Contracts (Soroban)

All contracts live in `contracts/`, written in Rust using the Soroban SDK. Each contract is in its own subdirectory with independent build and test configuration.

```
contracts/
├── credential/     # CredentialContract
├── reward/         # RewardContract
├── access/         # CourseAccessContract
├── governance/     # GovernanceContract
└── Makefile        # build / deploy / test all contracts
```

### `CredentialContract`

Issues a non-fungible credential token to a learner's Stellar wallet upon course completion. The credential is permanently associated with the learner's public key and cannot be transferred or revoked.

```rust
pub fn issue_credential(
    env: Env,
    learner: Address,
    course_id: String,
    metadata_hash: String, // IPFS CID of the credential metadata
) -> Result<(), Error>
```

### `RewardContract`

Disburses `LEARN` tokens to a learner when a milestone event is submitted by `ai-triggers`. Disbursement rules (amounts per milestone type, daily caps, cooldown periods) are configurable by governance and cannot be overridden by the platform.

```rust
pub fn disburse_reward(
    env: Env,
    learner: Address,
    milestone: MilestoneType,
    amount: i128,
) -> Result<(), Error>
```

### `CourseAccessContract`

Unlocks the next module for a learner once prerequisite conditions (score threshold, prior completion) are met. Prevents learners from skipping ahead and ensures content is gated correctly without any centralised gatekeeper.

```rust
pub fn unlock_module(
    env: Env,
    learner: Address,
    course_id: String,
    module_id: u32,
) -> Result<bool, Error>
```

### `GovernanceContract`

Allows `LEARN` token holders to vote on platform parameters — reward rates, course whitelisting, fee structures. Proposals require a minimum token stake to submit; votes are weighted by token balance at snapshot time.

```rust
pub fn submit_proposal(env: Env, proposer: Address, proposal: Proposal) -> Result<u64, Error>
pub fn cast_vote(env: Env, voter: Address, proposal_id: u64, vote: VoteType) -> Result<(), Error>
pub fn execute_proposal(env: Env, proposal_id: u64) -> Result<(), Error>
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

### Vesting Schedule

| Allocation | Amount | Cliff | Vesting |
|---|---|---|---|
| Learner Rewards | 40,000,000 | None | Released per milestone via contract |
| Instructor Incentives | 30,000,000 | None | Released on course enrolment thresholds |
| Ecosystem Fund | 20,000,000 | 6 months | 24-month linear vesting |
| Team | 10,000,000 | 12 months | 36-month linear vesting |

### Token Flow

```
  ┌─────────────┐    enrol / pay     ┌──────────────────┐
  │   Learner   │ ─────────────────► │  CourseAccess    │
  │  (wallet)   │                    │  Contract        │
  └──────┬──────┘                    └──────────────────┘
         │ completes milestone
         ▼
  ┌─────────────────┐   disburse     ┌──────────────────┐
  │  ai-triggers    │ ─────────────► │  RewardContract  │ ──► LEARN tokens → Learner
  │  (bridge svc)   │                └──────────────────┘
  └─────────────────┘   mint NFT     ┌──────────────────┐
         │              ──────────►  │ CredentialContr. │ ──► NFT → Learner wallet
         │                           └──────────────────┘
         │
  ┌──────▼──────┐   course revenue   ┌──────────────────┐
  │  Instructor │ ◄───────────────── │  Platform fee    │
  │  (wallet)   │                    │  split (70/30)   │
  └─────────────┘                    └──────────────────┘
```

### `XLM` (Native Stellar)

Used for transaction fees (~0.00001 XLM per operation), course fee payments, instructor payouts, cross-border settlements, and minimum account reserves. The near-zero fee structure makes micro-reward disbursements economically viable at any scale.

---

## AI Components

### 🧠 Adaptive Learning Engine (`apps/ai-adaptive`)

Uses a knowledge tracing model (Bayesian Knowledge Tracing or Deep Knowledge Tracing) to estimate the probability a learner has mastered each concept, then routes them to the most impactful next activity. The engine continuously updates its model after every interaction — not just after formal assessments.

```python
from services.adaptive import AdaptiveEngine

engine = AdaptiveEngine(learner_id="abc123")
next_module = engine.recommend_next(
    completed_modules=["intro-blockchain", "stellar-basics"],
    performance_scores={"intro-blockchain": 0.91, "stellar-basics": 0.62}
)
# Returns: {"module_id": "soroban-intro", "reason": "low mastery on stellar-basics prerequisites"}
```

**Key behaviours:**
- Learners who score above 85% on a concept can skip ahead to advanced modules
- Learners who score below 60% are routed to remediation content before progressing
- The engine tracks concept dependencies — mastering "Stellar basics" unlocks "Soroban intro"

### 💬 AI Tutor (`apps/ai-tutor`)

Backed by the Anthropic Claude API with a course-specific system prompt injected at session start. Maintains per-session conversation history in Redis and can escalate to a human instructor queue when its confidence score falls below a configurable threshold.

```python
from services.tutor import AITutor

tutor = AITutor(course_context="stellar-smart-contracts")
response = tutor.ask("What is the difference between Soroban and Ethereum's EVM?")
# Streams a detailed, course-contextualised explanation
```

**Key behaviours:**
- System prompt is scoped to the active course — the tutor only answers questions relevant to the material
- Conversation history is stored per session in Redis with a configurable TTL
- Low-confidence responses trigger an escalation flag visible to the instructor dashboard

### 📝 Content Generator (`apps/ai-content`)

Accepts raw instructor materials (PDFs, URLs, plain text) and produces structured learning content ready for review. Instructors approve or edit generated content before it goes live — the AI accelerates creation, humans maintain quality control.

```python
from services.content import ContentGenerator

gen = ContentGenerator()
quiz = gen.generate_quiz(
    source="path/to/lecture-notes.pdf",
    num_questions=10,
    difficulty="intermediate"
)
summary = gen.generate_summary(source="https://docs.stellar.org/soroban")
flashcards = gen.generate_flashcards(source="path/to/lecture-notes.pdf", count=20)
```

### 📊 Analytics Engine (`apps/ai-analytics`)

A predictive risk model trained on historical learner behaviour data. Flags at-risk learners before they drop out, giving instructors time to intervene. Surfaces actionable insights rather than raw metrics.

**Risk signals monitored:**
- Login frequency drop-off
- Assessment score trajectory (declining over last N attempts)
- Time-on-task anomalies
- Forum/discussion participation decline
- Incomplete module streaks


---

## Credential System

The credential pipeline is fully automated and trustless — no human approval step, no waiting, no platform gatekeeping.

```
  service-courses          ai-adaptive           ai-triggers
       │                       │                      │
       │  completion event     │                      │
       │──────────────────────►│                      │
       │                       │  score ≥ threshold?  │
       │                       │─────────────────────►│
       │                       │                      │  sign + submit tx
       │                       │                      │──────────────────►  Stellar Network
       │                       │                      │                         │
       │                       │                      │◄──────────────────  tx confirmed
       │                       │                      │
       │                       │              CredentialContract mints NFT → learner wallet
       │                       │              RewardContract disburses LEARN → learner wallet
```

**What gets stored where:**

| Data | Location | Why |
|---|---|---|
| Credential metadata (name, course, grade, date) | IPFS (Pinata) | Decentralised, content-addressed |
| IPFS CID (content hash) | Stellar ledger (NFT) | Tamper-proof, on-chain anchor |
| Learner's public key → credential mapping | Stellar ledger | Publicly verifiable |
| Raw course content, videos | Cloudflare R2 | Low-latency CDN delivery |

**Verification by a third party (employer, institution):**

```bash
# Query the Stellar ledger for all credentials issued to a learner
stellar contract invoke \
  --id $CREDENTIAL_CONTRACT_ID \
  --network mainnet \
  -- get_credentials \
  --learner GLEARNER_PUBLIC_KEY_HERE
```

Credentials are **learner-owned**: they live in the learner's Stellar wallet and cannot be revoked, modified, or deleted by the platform.

---

## Security & Trust

> ⚠️ **`ai-triggers` is a high-security service.** It holds the contract-trigger keypair and is the only service authorised to invoke `CredentialContract` and `RewardContract`. Treat its secrets with the same care as a production signing key.

### Key Management

- The contract-trigger keypair (`STELLAR_CONTRACT_TRIGGER_SECRET`) is stored as a GitHub Actions secret and injected at deploy time — never committed to the repository
- In production, secrets are managed via Kubernetes Secrets + a secrets manager (e.g. AWS Secrets Manager or HashiCorp Vault)
- Each service has the minimum set of secrets it needs — no service has access to another service's credentials

### Soroban Contract Security

- All contracts are written in Rust with the Soroban SDK — memory-safe by default
- Contract logic is deterministic and auditable — anyone can read the source in `contracts/`
- Disbursement rules (reward amounts, caps, cooldowns) are enforced by the contract, not by application code — the platform cannot override them
- Contracts are deployed with a fixed admin key; governance changes require a `GovernanceContract` vote

### Authentication Model

- **No passwords.** Authentication is based on Stellar wallet signatures (Freighter / Albedo)
- `service-auth` verifies the wallet signature and issues a short-lived JWT scoped to the learner's Stellar public key
- JWTs are stateless and validated at the `api-gateway` — no session state in the auth service
- All API endpoints require a valid JWT; `ai-triggers` additionally requires an internal service token

### IPFS Content Integrity

- Every piece of course content uploaded to IPFS produces a deterministic CID
- The CID is stored on-chain in the credential NFT — if the content is tampered with, the CID changes and the on-chain record no longer matches
- Pinata is used for reliable pinning; the `storage` service maintains a local pin registry as a fallback

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

# Contract Addresses (populated after first deploy — see Smart Contract Deployment)
CREDENTIAL_CONTRACT_ID=CD2RFDAIJX3WPITPCKQ6ARAWIIWHSRFADBQERGMLBAMZTI3GEGQXEQCP
REWARD_CONTRACT_ID=CB5FFEBHXWPSPPRRC34VJTNDMF5VPWI5F7QYSO7SNFRY4LHXQJNOL2GV
ACCESS_CONTRACT_ID=CBKQPQDR2O63SHKYYZ3RSVMODJKH7SLOGDMYQIXESAULNXHCMKYWA3YR
GOVERNANCE_CONTRACT_ID=CDGDF6CDCOR3WESE6F3RECXDV4N5GDFI5KFS7Q4NYG7FXKUQY65KE4HS

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

> 💡 Each `apps/` service also has its own `.env.example` for service-specific overrides. The root `.env` covers all shared variables.

### Running Locally

```bash
# 1. Install all JS/TS dependencies across the workspace
npm install

# 2. Start the full stack (all services + databases)
docker-compose up --build

# Or start individual services for faster iteration:

# Frontend learner app  →  http://localhost:3000
npm run dev --workspace=apps/app-learner

# AI tutor service      →  http://localhost:8001
cd apps/ai-tutor && pip install -r requirements.txt && uvicorn main:app --reload --port 8001

# AI adaptive engine    →  http://localhost:8002
cd apps/ai-adaptive && pip install -r requirements.txt && uvicorn main:app --reload --port 8002

# Stellar local testnet (for contract development)
stellar network start local
```

---

## Developer Experience

### Workspace Scripts

From the repo root:

```bash
npm run dev          # Start all Node.js services in watch mode
npm run build        # Build all packages and apps
npm run test         # Run all test suites
npm run lint         # Lint all packages (ESLint + Ruff for Python)
npm run typecheck    # TypeScript type-check across all apps
```

### Shared Configuration

All shared tooling config lives in `packages/` and is extended by each app:

| Config | Location | Used by |
|---|---|---|
| TypeScript base config | `packages/tsconfig/` | All TS apps |
| ESLint base config | `packages/eslint-config/` | All JS/TS apps |
| Prettier config | `.prettierrc` (root) | All apps |
| Tailwind preset | `packages/ui-kit/tailwind.config.ts` | All frontend apps |

### Hot Reload

- **Frontend apps** — Next.js Fast Refresh works out of the box. Changes to `packages/ui-kit` are picked up immediately via workspace symlinks.
- **Node.js services** — `nodemon` watches for changes and restarts automatically.
- **Python services** — `uvicorn --reload` watches for file changes.
- **Contracts** — run `cargo watch -x test` in `contracts/` for continuous test feedback during Rust development.

### Local Stellar Testnet Tips

```bash
# Start a local Stellar network (Soroban-enabled)
stellar network start local

# Fund a test account
stellar keys generate --global test-account
stellar keys fund test-account --network local

# Check account balance
stellar account show test-account --network local

# Reset local network state (useful when contracts get into a bad state)
stellar network stop local && stellar network start local
```

---

## Deployment

### Local (Docker Compose)

```bash
docker-compose up --build
```

All services, PostgreSQL, and Redis start in a single command. Service ports are mapped as defined in `docker-compose.yml`.

### Production (Kubernetes + Helm)

Each service has a Helm chart in `infra/helm/`. Deploy a single service:

```bash
helm upgrade --install ai-tutor infra/helm/ai-tutor \
  --namespace stellarlearn \
  --set image.tag=v1.2.0 \
  --set env.ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY
```

Deploy the full platform:

```bash
# Apply all Helm charts
helmfile --file infra/helmfile.yaml apply
```

### Environment Promotion

```
local (docker-compose)
        │
        ▼
  testnet (Stellar testnet + staging k8s namespace)
        │  tagged release: v1.0.0-rc1
        ▼
  mainnet (Stellar mainnet + production k8s namespace)
           tagged release: v1.0.0
```

> ⚠️ **Mainnet contract deployments are irreversible.** Always deploy to testnet first, run the full e2e test suite (`make test-e2e`), and get a second pair of eyes on the contract addresses before promoting to mainnet.

### Secrets Management

- **Local** — `.env` file (never committed; `.env.example` is the template)
- **CI/CD** — GitHub Actions secrets, scoped per environment (`testnet`, `mainnet`)
- **Production** — Kubernetes Secrets backed by a secrets manager; rotated on a schedule defined in `infra/`

---

## CI/CD

GitHub Actions workflows live in `.github/workflows/`. All workflows are triggered on push and PR to `develop` and `main`.

| Workflow | Trigger | Scope | Status |
|---|---|---|---|
| `ci-node.yml` | Push / PR | `apps/app-*`, `apps/api-gateway`, `packages/ui-kit` | ✅ |
| `ci-python.yml` | Push / PR | `apps/ai-*`, `apps/storage` | ✅ |
| `ci-rust.yml` | Push / PR | `contracts/` | ✅ |
| `deploy-service.yml` | Release tag (`v*`) | All services → production | 🚧 |
| `deploy-contracts.yml` | Release tag on `contracts/` | Contracts → testnet or mainnet | 🚧 |
| `notify-slack.yml` | Post-deploy | All repos | 🚧 |

### Contract Deploy Pipeline

When a release tag is pushed:

1. All Soroban contracts are built (`make build`)
2. Tags matching `v*-rc*` deploy to **testnet**; tags matching `v*` (no `-rc`) deploy to **mainnet**
3. Contract addresses are written back to GitHub Actions environment secrets
4. Downstream services are redeployed via `workflow_dispatch` with the new contract IDs

---

## API Reference

Full API specs will live in `docs/api/` — not yet written. Contributions welcome.

- `docs/api/openapi.yaml` — REST API spec (all services) — 🚧 planned
- `docs/api/schema.graphql` — GraphQL schema (api-gateway) — 🚧 planned
- `docs/api/stellar-events.md` — on-chain event schemas — 🚧 planned

### AI Services Endpoints

The following endpoints are implemented for services that exist. Endpoints for 🚧 planned services are listed for reference.

| Service | Endpoint | Method | Description | Status |
|---|---|---|---|---|
| `ai-adaptive` | `/recommend` | POST | Get next recommended module for a learner | ✅ |
| `ai-adaptive` | `/mastery` | GET | Get concept mastery scores for a learner | ✅ |
| `ai-tutor` | `/ask` | POST | Send a message to the AI tutor | ✅ |
| `ai-tutor` | `/session` | DELETE | Clear session history | ✅ |
| `ai-content` | `/quiz` | POST | Generate a quiz from source material | 🚧 |
| `ai-content` | `/summary` | POST | Generate a summary from source material | 🚧 |
| `ai-content` | `/flashcards` | POST | Generate flashcards from source material | 🚧 |
| `ai-analytics` | `/risk` | GET | Get at-risk learner predictions for a course | 🚧 |
| `ai-triggers` | `/complete` | POST | Trigger on-chain milestone (internal use only) | 🚧 |

---

## Smart Contract Deployment

```bash
cd contracts

# Build all contracts
make build

# Deploy all contracts to testnet
make deploy-testnet

# Deploy a single contract manually
stellar contract deploy \
  --wasm credential/target/wasm32-unknown-unknown/release/credential_contract.wasm \
  --source SXXXXXXXXXXXXXXX \
  --network testnet

# Invoke a contract function
stellar contract invoke \
  --id $CREDENTIAL_CONTRACT_ID \
  --source SXXXXXXXXXXXXXXX \
  --network testnet \
  -- issue_credential \
  --learner GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX \
  --course_id "stellar-smart-contracts-101" \
  --metadata_hash "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco"
```

> 💡 After deploying contracts for the first time, copy the contract IDs into your `.env` file (or GitHub Actions secrets for CI/CD).

---

## Testing

```bash
# Run all tests from the workspace root
npm run test

# Per-service:
npm run test --workspace=apps/service-auth     # Jest integration tests
cd apps/ai-tutor    && pytest                  # Pytest unit + integration
cd apps/ai-adaptive && pytest --cov            # With coverage report
cd contracts        && cargo test              # Rust unit tests (all contracts)
cd contracts        && make test-e2e           # Soroban testnet e2e tests
```

**Test coverage targets:**

| Layer | Target |
|---|---|
| Smart contracts | 100% (all execution paths) |
| AI services | ≥ 80% line coverage |
| API gateway | ≥ 75% line coverage |
| Frontend apps | ≥ 60% component coverage |

---

## Roadmap

- [x] Architecture design and monorepo structure
- [x] Soroban smart contracts — all 4 contracts implemented and tested
- [x] GitHub Actions CI/CD workflows (Node, Python, Rust)
- [x] `service-auth` — Stellar wallet SSO, JWT issuance
- [x] `service-courses` — course catalogue, enrolment, progress
- [x] `ai-adaptive` engine v1 (BKT model)
- [x] `ai-tutor` — Claude API integration
- [x] `packages/ui-kit` — shared component library scaffolded
- [x] `packages/stellar-sdk-utils` — shared Stellar SDK helpers
- [x] Contributor docs — `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, issue templates, ADRs
- [ ] `app-learner` MVP — complete learner portal UI
- [ ] `app-instructor` — instructor studio
- [ ] `app-admin` — admin panel
- [ ] `api-gateway` — GraphQL/REST gateway
- [ ] `ai-content` — content generation service
- [ ] `ai-analytics` — risk prediction model
- [ ] `ai-triggers` — AI → blockchain bridge
- [ ] `storage` — IPFS integration & CDN proxy
- [ ] Credential NFT issuance on testnet (end-to-end)
- [ ] `LEARN` token deployment and reward system
- [ ] `infra/` — Helm charts, Terraform, Kubernetes manifests
- [ ] API specs (`docs/api/`)
- [ ] Governance contract DAO tooling
- [ ] Mobile app (React Native — `apps/app-mobile`)
- [ ] Mainnet launch
- [ ] Multi-language support
- [ ] Third-party LMS data import (SCORM/xAPI compatibility)
- [ ] Deep Knowledge Tracing (DKT) model upgrade for `ai-adaptive`

---

## Community & Support

| Channel | Link |
|---|---|
| 💬 Discord | [discord.gg/stellarlearn](#) *(coming soon)* |
| 📖 Documentation | [`docs/`](./docs/) |
| 🐛 Bug Reports | [GitHub Issues](https://github.com/stellarlearn/stellarlearn/issues) |
| 💡 Feature Requests | [GitHub Discussions](https://github.com/stellarlearn/stellarlearn/discussions) |
| 🔐 Security Vulnerabilities | Email `security@stellarlearn.io` — do not open a public issue |

---

## Contributing

We welcome contributions of all sizes — from fixing a typo to building a new AI model. Here's how to get involved:

### 🌱 Good First Issues

Look for issues tagged [`good first issue`](https://github.com/stellarlearn/stellarlearn/issues?q=is%3Aopen+label%3A%22good+first+issue%22) — these are scoped, well-documented tasks ideal for first-time contributors.

### Workflow

1. Fork the repo and clone your fork
2. Create a branch from `develop` following the naming convention below
3. Make your changes, write tests, and ensure `npm run test` passes
4. Open a PR targeting `develop` — fill in the PR template

### Branch Conventions

```
main          → production (protected, release-only)
develop       → integration branch — all PRs target this
feature/*     → new features
fix/*         → bug fixes
chore/*       → maintenance, dependency updates
release/*     → release preparation
```

### PR Checklist

- [ ] Tests added or updated for the change
- [ ] `npm run lint` passes with no errors
- [ ] `npm run typecheck` passes (for TS changes)
- [ ] Relevant docs updated (if adding a new endpoint, update `docs/api/`)
- [ ] No secrets or credentials committed

### Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](./CODE_OF_CONDUCT.md). By participating, you agree to uphold a welcoming and respectful environment for everyone.

---

## License

This project is licensed under the MIT License. See [LICENSE](./LICENSE) for details.

---

<div align="center">
  Built on <a href="https://stellar.org">Stellar</a> · Powered by AI · Owned by learners<br/><br/>
</div>
