"""
Bayesian Knowledge Tracing (BKT) — minimal implementation.

BKT models the probability a learner has mastered a concept using 4 parameters:
  p_init  — prior probability of knowing the concept
  p_learn — probability of learning after each attempt
  p_slip  — probability of answering incorrectly despite knowing
  p_guess — probability of answering correctly without knowing
"""

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class BKTParams:
    p_init: float = 0.3
    p_learn: float = 0.1
    p_slip: float = 0.1
    p_guess: float = 0.2


@dataclass
class ConceptState:
    concept_id: str
    p_mastery: float = 0.3
    attempts: int = 0
    params: BKTParams = field(default_factory=BKTParams)


def update_mastery(state: ConceptState, correct: bool) -> ConceptState:
    """Update mastery probability after one observation."""
    p = state.p_mastery
    params = state.params

    # Bayes update
    if correct:
        p_obs_given_know = 1 - params.p_slip
        p_obs_given_not = params.p_guess
    else:
        p_obs_given_know = params.p_slip
        p_obs_given_not = 1 - params.p_guess

    p_know_given_obs = (p_obs_given_know * p) / (
        p_obs_given_know * p + p_obs_given_not * (1 - p)
    )

    # Learning update
    new_p = p_know_given_obs + (1 - p_know_given_obs) * params.p_learn

    return ConceptState(
        concept_id=state.concept_id,
        p_mastery=round(new_p, 4),
        attempts=state.attempts + 1,
        params=params,
    )


# Concept dependency graph — mastering prerequisites unlocks next concepts
CONCEPT_GRAPH: dict[str, list[str]] = {
    "intro-blockchain": [],
    "stellar-basics": ["intro-blockchain"],
    "soroban-intro": ["stellar-basics"],
    "soroban-advanced": ["soroban-intro"],
    "defi-basics": ["stellar-basics"],
    "defi-advanced": ["defi-basics"],
}

MASTERY_THRESHOLD = 0.85
REMEDIATION_THRESHOLD = 0.60


def recommend_next(
    mastery_scores: dict[str, float],
    completed_modules: list[str],
) -> Optional[dict]:
    """
    Return the next recommended module based on mastery scores and concept graph.
    - Score > 0.85: skip ahead
    - Score < 0.60: remediation
    - Otherwise: next in sequence
    """
    for concept, prereqs in CONCEPT_GRAPH.items():
        if concept in completed_modules:
            continue
        # Check all prerequisites are mastered
        prereqs_met = all(mastery_scores.get(p, 0) >= MASTERY_THRESHOLD for p in prereqs)
        if not prereqs_met:
            # Find the weakest prerequisite for remediation
            weakest = min(prereqs, key=lambda p: mastery_scores.get(p, 0), default=None)
            if weakest:
                score = mastery_scores.get(weakest, 0)
                return {
                    "module_id": weakest,
                    "reason": f"remediation — mastery on '{weakest}' is {score:.0%}, below {REMEDIATION_THRESHOLD:.0%} threshold",
                    "type": "remediation",
                }
        else:
            current_score = mastery_scores.get(concept, 0)
            return {
                "module_id": concept,
                "reason": f"next concept in sequence (current mastery: {current_score:.0%})",
                "type": "next",
            }
    return None  # All concepts complete
