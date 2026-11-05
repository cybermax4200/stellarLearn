from fastapi import FastAPI
from pydantic import BaseModel
from services.bkt import (
    ConceptState,
    update_mastery,
    recommend_next,
    CONCEPT_GRAPH,
)
from services.state_store import get_learner_state, set_learner_state, clear_all_learner_states, _in_memory
from dataclasses import asdict

app = FastAPI(title="StellarLearn AI Adaptive Engine", version="0.1.0")

# Backward-compatible reference for tests (points to in-memory fallback dict)
learner_states = _in_memory

from typing import Optional

class RecommendRequest(BaseModel):
    learner_id: str
    completed_modules: list[str] = []
    performance_scores: dict[str, float] = {}
    course_id: Optional[str] = None


class UpdateMasteryRequest(BaseModel):
    learner_id: str
    concept_id: str
    correct: bool


@app.get("/health")
def health():
    return {"status": "ok", "service": "ai-adaptive"}


@app.post("/recommend")
def recommend(req: RecommendRequest):
    """Return the next recommended module for a learner."""
    result = recommend_next(
        req.performance_scores,
        req.completed_modules,
        course_id=req.course_id,
    )
    if result is None:
        return {"message": "All concepts complete — ready for credential!", "module_id": None}
    return result


@app.get("/mastery/{learner_id}")
def get_mastery(learner_id: str):
    """Return all concept mastery scores for a learner."""
    states = get_learner_state(learner_id)
    return {
        "learner_id": learner_id,
        "mastery": {
            concept: {
                "p_mastery": state["p_mastery"] if isinstance(state, dict) else state.p_mastery,
                "attempts": state["attempts"] if isinstance(state, dict) else state.attempts,
            }
            for concept, state in states.items()
        },
        "concepts_available": list(CONCEPT_GRAPH.keys()),
    }


@app.post("/mastery/update")
def update(req: UpdateMasteryRequest):
    """Update mastery after a learner answers a question."""
    states = get_learner_state(req.learner_id)

    current_raw = states.get(req.concept_id)
    if current_raw is None:
        current = ConceptState(concept_id=req.concept_id)
    elif isinstance(current_raw, ConceptState):
        current = current_raw
    else:
        # Reconstruct from dict (loaded from Redis)
        current = ConceptState(concept_id=req.concept_id, **current_raw)

    updated = update_mastery(current, req.correct)

    # Store as dict for JSON serialization (Redis), or as ConceptState for in-memory
    if _in_memory is not states or not _in_memory:
        # Redis mode: store as dict
        states[req.concept_id] = asdict(updated)
    else:
        # In-memory mode: store ConceptState directly
        states[req.concept_id] = updated

    set_learner_state(req.learner_id, states)

    return {
        "concept_id": req.concept_id,
        "p_mastery": updated.p_mastery,
        "attempts": updated.attempts,
    }
