import pytest
from services.bkt import ConceptState, update_mastery, recommend_next


def test_mastery_increases_on_correct():
    state = ConceptState(concept_id="stellar-basics", p_mastery=0.3)
    updated = update_mastery(state, correct=True)
    assert updated.p_mastery > 0.3
    assert updated.attempts == 1


def test_mastery_decreases_on_incorrect():
    state = ConceptState(concept_id="stellar-basics", p_mastery=0.8)
    updated = update_mastery(state, correct=False)
    assert updated.p_mastery < 0.8


def test_recommend_next_returns_first_concept_for_new_learner():
    result = recommend_next({}, [])
    assert result is not None
    assert result["module_id"] == "intro-blockchain"


def test_recommend_remediation_when_prereq_weak():
    result = recommend_next(
        mastery_scores={"intro-blockchain": 0.4},
        completed_modules=[],
    )
    assert result is not None
    assert result["type"] == "remediation" or result["module_id"] == "intro-blockchain"


def test_recommend_none_when_all_complete():
    all_concepts = ["intro-blockchain", "stellar-basics", "soroban-intro", "soroban-advanced", "defi-basics", "defi-advanced"]
    result = recommend_next({c: 0.9 for c in all_concepts}, all_concepts)
    assert result is None
