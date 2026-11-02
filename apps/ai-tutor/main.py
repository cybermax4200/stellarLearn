from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
from services.tutor import AITutor, sessions
import os

app = FastAPI(title="StellarLearn AI Tutor", version="0.1.0")


class AskRequest(BaseModel):
    question: str
    course_context: str
    session_id: Optional[str] = None


class AskResponse(BaseModel):
    answer: str
    session_id: str


@app.get("/health")
def health():
    return {"status": "ok", "service": "ai-tutor"}


@app.post("/ask", response_model=AskResponse)
def ask(req: AskRequest):
    """Send a question to the AI tutor. Supports online Claude API and offline test mode."""
    mock_mode = (
        os.getenv("USE_MOCK_AI", "false").lower() in ("true", "1")
        or os.getenv("ANTHROPIC_API_KEY", "") in ("mock", "test")
        or not os.getenv("ANTHROPIC_API_KEY")
    )

    if not os.getenv("ANTHROPIC_API_KEY") and not mock_mode:
        raise HTTPException(status_code=503, detail="ANTHROPIC_API_KEY not configured")

    tutor = AITutor(course_context=req.course_context, session_id=req.session_id)
    answer = tutor.ask(req.question)
    return AskResponse(answer=answer, session_id=tutor.session_id)


@app.delete("/session/{session_id}")
def clear_session(session_id: str):
    """Clear conversation history for a session."""
    sessions.pop(session_id, None)
    return {"message": "Session cleared", "session_id": session_id}


@app.get("/session/{session_id}")
def get_session(session_id: str):
    """Get conversation history for a session."""
    history = sessions.get(session_id, [])
    return {"session_id": session_id, "messages": history, "count": len(history)}
