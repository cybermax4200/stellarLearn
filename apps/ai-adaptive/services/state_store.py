"""
Redis-backed learner state store with in-memory fallback.

When REDIS_URL is set and Redis is reachable, learner mastery states are
stored in Redis. Otherwise, falls back to in-memory dicts for local dev
and tests.
"""

import os
import json
import logging
from typing import Any

logger = logging.getLogger(__name__)

REDIS_URL = os.getenv("REDIS_URL", "")
SESSION_TTL = int(os.getenv("MASTERY_TTL", "604800"))  # 7 days default

_redis_client = None
_use_redis = False
_in_memory: dict[str, dict[str, Any]] = {}

if REDIS_URL:
    try:
        import redis

        _redis_client = redis.from_url(REDIS_URL, decode_responses=True)
        _redis_client.ping()
        _use_redis = True
        logger.info("Redis learner store connected: %s", REDIS_URL)
    except Exception as e:
        logger.warning("Redis unavailable, using in-memory learner states: %s", e)
        _redis_client = None
        _use_redis = False


def get_learner_state(learner_id: str) -> dict[str, Any]:
    """Get all concept states for a learner."""
    if _use_redis and _redis_client:
        raw = _redis_client.get(f"adaptive:learner:{learner_id}")
        if raw:
            return json.loads(raw)
        return {}
    return _in_memory.get(learner_id, {})


def set_learner_state(learner_id: str, states: dict[str, Any]) -> None:
    """Set concept states for a learner with TTL."""
    if _use_redis and _redis_client:
        _redis_client.setex(
            f"adaptive:learner:{learner_id}", SESSION_TTL, json.dumps(states)
        )
    else:
        _in_memory[learner_id] = states


def delete_learner_state(learner_id: str) -> None:
    """Delete a learner's state."""
    if _use_redis and _redis_client:
        _redis_client.delete(f"adaptive:learner:{learner_id}")
    else:
        _in_memory.pop(learner_id, None)


def clear_all_learner_states() -> None:
    """Clear all learner states (for testing)."""
    if _use_redis and _redis_client:
        keys = _redis_client.keys("adaptive:learner:*")
        if keys:
            _redis_client.delete(*keys)
    else:
        _in_memory.clear()
