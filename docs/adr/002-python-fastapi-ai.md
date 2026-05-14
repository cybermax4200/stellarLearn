# ADR 002 — Python / FastAPI for AI Services

**Date:** 2026-05-14  
**Status:** Accepted

## Context

The AI layer (adaptive engine, tutor, content generation, analytics, blockchain bridge) needs a runtime. Options were Node.js, Python, and Go.

## Decision

Use Python 3.11 with FastAPI for all AI microservices.

Key reasons:
- Python is the de-facto standard for ML/AI libraries (scikit-learn, PyTorch, LangChain)
- FastAPI provides async support, automatic OpenAPI docs, and Pydantic validation with minimal boilerplate
- The Anthropic Python SDK is first-class and well-maintained
- Each service is independently deployable — language choice per service is isolated

## Consequences

- Python services run separately from the Node.js services; contributors need both runtimes locally (or use Docker Compose)
- Type safety relies on Pydantic models rather than a compiler — stricter validation discipline is required
- `uvicorn --reload` is used for local development hot-reload
