import os
import uuid
from typing import Optional
import anthropic
from services.rag import retrieve_relevant_knowledge
from services.session_store import (
    get_session,
    set_session,
    delete_session,
    clear_all_sessions,
)

CLAUDE_MODEL = os.getenv("CLAUDE_MODEL", "claude-sonnet-4-20250514")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

SYSTEM_PROMPT_TEMPLATE = """You are an expert AI tutor for StellarLearn, an educational platform focused on the Stellar blockchain ecosystem.

You are currently tutoring a learner on the course: **{course_context}**.

Relevant Curriculum Knowledge:
{knowledge_context}

Your role:
- Answer questions clearly and accurately, scoped to the course material
- Use concrete examples and analogies
- Ask Socratic follow-up questions to deepen understanding
- If a question is outside the course scope, gently redirect to relevant material
- Keep responses concise but complete
"""

# Re-export session helpers for backward compatibility with tests
sessions = None  # replaced by session_store; kept for test compatibility


def _get_sessions_dict() -> dict:
    """Return the in-memory session dict for backward compatibility with tests."""
    from services.session_store import _in_memory
    return _in_memory


class AITutor:
    def __init__(self, course_context: str, session_id: Optional[str] = None):
        self.course_context = course_context
        self.session_id = session_id or str(uuid.uuid4())
        self.mock_mode = (
            os.getenv("USE_MOCK_AI", "false").lower() in ("true", "1")
            or os.getenv("ANTHROPIC_API_KEY", "") in ("mock", "test")
            or not os.getenv("ANTHROPIC_API_KEY")
        )

        if not self.mock_mode and ANTHROPIC_API_KEY:
            self.client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        else:
            self.client = None

        # Initialize session if it doesn't exist
        existing = get_session(self.session_id)
        if not existing:
            set_session(self.session_id, [])

    def ask(self, question: str) -> str:
        history = get_session(self.session_id)
        history.append({"role": "user", "content": question})

        knowledge = retrieve_relevant_knowledge(question, self.course_context)
        knowledge_snippet = (
            f"Topic: {knowledge['title']}\n{knowledge['snippet']}"
            if knowledge
            else "General Stellar Blockchain Concepts"
        )

        if self.mock_mode or not self.client:
            # Grounded educational mock answer enriched with RAG knowledge
            answer = (
                f"As your StellarLearn tutor for '{self.course_context}': "
                f"Regarding '{question}', {knowledge_snippet} "
                f"How would you apply this to your current learning module?"
            )
        else:
            prompt = SYSTEM_PROMPT_TEMPLATE.format(
                course_context=self.course_context,
                knowledge_context=knowledge_snippet,
            )
            response = self.client.messages.create(
                model=CLAUDE_MODEL,
                max_tokens=1024,
                system=prompt,
                messages=history,
            )
            answer = response.content[0].text

        history.append({"role": "assistant", "content": answer})
        set_session(self.session_id, history)

        return answer

    def clear(self):
        delete_session(self.session_id)
