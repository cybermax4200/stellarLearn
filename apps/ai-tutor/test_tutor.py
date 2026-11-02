import pytest
from pathlib import Path
import sys
import importlib.util
from fastapi.testclient import TestClient

tutor_dir = Path(__file__).resolve().parent
if str(tutor_dir) not in sys.path:
    sys.path.insert(0, str(tutor_dir))

spec = importlib.util.spec_from_file_location("ai_tutor_app_main", tutor_dir / "main.py")
ai_tutor_mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ai_tutor_mod)

app = ai_tutor_mod.app
sessions = ai_tutor_mod.sessions
client = TestClient(app)


@pytest.fixture(autouse=True)
def clean_sessions():
    sessions.clear()
    yield
    sessions.clear()


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "ai-tutor"}


def test_ask_question_creates_session_and_answers():
    payload = {
        "question": "What is the Stellar Consensus Protocol?",
        "course_context": "Stellar Fundamentals",
    }
    response = client.post("/ask", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "answer" in data
    assert "Stellar Consensus Protocol" in data["answer"] or "StellarLearn" in data["answer"]
    assert "session_id" in data
    assert len(data["session_id"]) > 0


def test_ask_maintains_conversation_history():
    payload1 = {
        "question": "What is an account in Stellar?",
        "course_context": "Stellar Fundamentals",
    }
    res1 = client.post("/ask", json=payload1)
    session_id = res1.json()["session_id"]

    payload2 = {
        "question": "How are accounts created?",
        "course_context": "Stellar Fundamentals",
        "session_id": session_id,
    }
    res2 = client.post("/ask", json=payload2)
    assert res2.status_code == 200

    history_res = client.get(f"/session/{session_id}")
    assert history_res.status_code == 200
    history = history_res.json()
    assert history["session_id"] == session_id
    assert history["count"] == 4  # 2 user queries + 2 assistant responses


def test_clear_session():
    payload = {
        "question": "Hello",
        "course_context": "Stellar Fundamentals",
    }
    res = client.post("/ask", json=payload)
    session_id = res.json()["session_id"]

    del_res = client.delete(f"/session/{session_id}")
    assert del_res.status_code == 200

    history_res = client.get(f"/session/{session_id}")
    assert history_res.json()["count"] == 0
