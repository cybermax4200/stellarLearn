import pytest
from pathlib import Path
import sys
import importlib.util
from fastapi.testclient import TestClient

adaptive_dir = Path(__file__).resolve().parent
if str(adaptive_dir) not in sys.path:
    sys.path.insert(0, str(adaptive_dir))

from services.bkt import ConceptState, update_mastery, recommend_next

spec = importlib.util.spec_from_file_location("ai_adaptive_app_main", adaptive_dir / "main.py")
ai_adaptive_mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ai_adaptive_mod)

app = ai_adaptive_mod.app
learner_states = ai_adaptive_mod.learner_states

client = TestClient(app)


@pytest.fixture(autouse=True)
def clean_learner_states():
    learner_states.clear()
    yield
    learner_states.clear()


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


# --- FastAPI Endpoint Integration Tests ---

def test_api_health():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok", "service": "ai-adaptive"}


def test_api_recommend():
    res = client.post("/recommend", json={"learner_id": "test_learner", "completed_modules": []})
    assert res.status_code == 200
    data = res.json()
    assert "module_id" in data


def test_api_mastery_update_and_query():
    # Update mastery for a concept
    update_res = client.post(
        "/mastery/update",
        json={"learner_id": "learner_123", "concept_id": "stellar-basics", "correct": True},
    )
    assert update_res.status_code == 200
    update_data = update_res.json()
    assert update_data["concept_id"] == "stellar-basics"
    assert update_data["attempts"] == 1

    # Query mastery
    get_res = client.get("/mastery/learner_123")
    assert get_res.status_code == 200
    get_data = get_res.json()
    assert get_data["learner_id"] == "learner_123"
    assert "stellar-basics" in get_data["mastery"]
    assert get_data["mastery"]["stellar-basics"]["attempts"] == 1


def test_api_recommend_course_specific():
    res = client.post(
        "/recommend",
        json={
            "learner_id": "course_learner",
            "course_id": "soroban-smart-contracts",
            "completed_modules": ["soroban-intro"],
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["module_id"] == "rust-basics"
