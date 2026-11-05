"""
Redis-backed session store with in-memory fallback.

When REDIS_URL is set and Redis is reachable, session data is stored in Redis
with a configurable TTL. Otherwise, falls back to in-memory dicts for local dev
and tests.
"""

import os
import json
import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)

REDIS_URL = os.getenv("REDIS_URL", "")
SESSION_TTL = int(os.getenv("SESSION_TTL", "86400"))  # 24 hours default

_redis_client = None
_use_redis = False
_in_memory: dict[str, Any] = {}

if REDIS_URL:
    try:
        import redis

        _redis_client = redis.from_url(REDIS_URL, decode_responses=True)
        _redis_client.ping()
        _use_redis = True
        logger.info("Redis session store connected: %s", REDIS_URL)
    except Exception as e:
        logger.warning("Redis unavailable, using in-memory sessions: %s", e)
        _redis_client = None
        _use_redis = False


def get_session(session_id: str) -> list[dict]:
    """Get conversation history for a session."""
    if _use_redis and _redis_client:
        raw = _redis_client.get(f"tutor:session:{session_id}")
        if raw:
            return json.loads(raw)
        return []
    return _in_memory.get(session_id, [])


def set_session(session_id: str, messages: list[dict]) -> None:
    """Set conversation history for a session with TTL."""
    trimmed = messages[-20:]  # keep last 20 turns
    if _use_redis and _redis_client:
        _redis_client.setex(
            f"tutor:session:{session_id}", SESSION_TTL, json.dumps(trimmed)
        )
    else:
        _in_memory[session_id] = trimmed


def delete_session(session_id: str) -> None:
    """Delete a session."""
    if _use_redis and _redis_client:
        _redis_client.delete(f"tutor:session:{session_id}")
    else:
        _in_memory.pop(session_id, None)


def get_all_sessions() -> dict[str, list[dict]]:
    """Get all sessions (for testing/debugging)."""
    if _use_redis and _redis_client:
        keys = _redis_client.keys("tutor:session:*")
        result = {}
        for key in keys:
            session_id = key.replace("tutor:session:", "")
            result[session_id] = json.loads(_redis_client.get(key) or "[]")
        return result
    return dict(_in_memory)


def clear_all_sessions() -> None:
    """Clear all sessions (for testing)."""
    if _use_redis and _redis_client:
        keys = _redis_client.keys("tutor:session:*")
        if keys:
            _redis_client.delete(*keys)
    else:
        _in_memory.clear()
