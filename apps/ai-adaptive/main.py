from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from services.bkt import (
    ConceptState,
    update_mastery,
    recommend_next,
    CONCEPT_GRAPH,
)

app = FastAPI(title="StellarLearn AI Adaptive Engine", version="0.1.0")

# In-memory learner state (use Redis/PostgreSQL in production)
learner_states: dict[str, dict[str, ConceptState]] = {}


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
    states = learner_states.get(learner_id, {})
    return {
        "learner_id": learner_id,
        "mastery": {
            concept: {
                "p_mastery": state.p_mastery,
                "attempts": state.attempts,
            }
            for concept, state in states.items()
        },
        "concepts_available": list(CONCEPT_GRAPH.keys()),
    }


@app.post("/mastery/update")
def update(req: UpdateMasteryRequest):
    """Update mastery after a learner answers a question."""
    if req.learner_id not in learner_states:
        learner_states[req.learner_id] = {}

    states = learner_states[req.learner_id]
    current = states.get(req.concept_id, ConceptState(concept_id=req.concept_id))
    updated = update_mastery(current, req.correct)
    states[req.concept_id] = updated

    return {
        "concept_id": req.concept_id,
        "p_mastery": updated.p_mastery,
        "attempts": updated.attempts,
    }
