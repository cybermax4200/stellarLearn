# Contributing to StellarLearn

Thanks for your interest in contributing! This document covers everything you need to get started.

## Before You Start

- Check [open issues](https://github.com/stellarlearn/stellarlearn/issues) to avoid duplicating work
- For significant changes, open an issue first to discuss the approach
- Issues tagged [`good first issue`](https://github.com/stellarlearn/stellarlearn/issues?q=is%3Aopen+label%3A%22good+first+issue%22) are a great starting point

## Setup

```bash
git clone https://github.com/stellarlearn/stellarlearn.git
cd stellarlearn
cp .env.example .env          # fill in your values
npm install
docker-compose up --build     # starts all services + databases
```

See the [Getting Started](./README.md#getting-started) section in the README for full prerequisites.

## Workflow

1. Fork the repo and clone your fork
2. Branch from `develop` using the naming convention below
3. Make your changes and write tests
4. Ensure CI passes locally before pushing:

```bash
npm run lint
npm run typecheck
npm run test

# For contract changes:
cd contracts && cargo test

# For Python service changes:
cd apps/<service> && pytest
```

5. Open a PR targeting `develop` and fill in the PR template

## Branch Naming

| Type | Pattern | Example |
|---|---|---|
| Feature | `feature/<short-description>` | `feature/ai-tutor-escalation` |
| Bug fix | `fix/<short-description>` | `fix/reward-contract-overflow` |
| Maintenance | `chore/<short-description>` | `chore/update-soroban-sdk` |
| Release prep | `release/<version>` | `release/v1.0.0` |

`main` is protected — all changes go through `develop` first.

## PR Checklist

- [ ] Tests added or updated
- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes (TypeScript changes)
- [ ] Relevant docs updated (new endpoint → update `docs/api/`)
- [ ] No secrets or credentials committed

## Project Areas

| Area | Location | Language |
|---|---|---|
| Learner frontend | `apps/app-learner` | TypeScript / Next.js |
| Auth service | `apps/service-auth` | TypeScript / Node.js |
| Courses service | `apps/service-courses` | TypeScript / Node.js |
| Adaptive engine | `apps/ai-adaptive` | Python / FastAPI |
| AI tutor | `apps/ai-tutor` | Python / FastAPI |
| Soroban contracts | `contracts/` | Rust |
| Shared UI | `packages/ui-kit` | TypeScript / React |
| Stellar SDK utils | `packages/stellar-sdk-utils` | TypeScript |

## Commit Style

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(ai-tutor): add confidence-score escalation
fix(reward-contract): prevent double disbursement on retry
chore(deps): bump soroban-sdk to 21.0.0
docs(api): document /recommend endpoint params
```

## Security Issues

**Do not open a public issue for security vulnerabilities.** Email `security@stellarlearn.io` instead.

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](./CODE_OF_CONDUCT.md). By participating you agree to uphold it.
