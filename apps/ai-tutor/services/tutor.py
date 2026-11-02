import os
import uuid
from typing import Optional
import anthropic

CLAUDE_MODEL = os.getenv("CLAUDE_MODEL", "claude-sonnet-4-20250514")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

SYSTEM_PROMPT_TEMPLATE = """You are an expert AI tutor for StellarLearn, an educational platform focused on the Stellar blockchain ecosystem.

You are currently tutoring a learner on the course: **{course_context}**.

Your role:
- Answer questions clearly and accurately, scoped to the course material
- Use concrete examples and analogies
- Ask Socratic follow-up questions to deepen understanding
- If a question is outside the course scope, gently redirect to relevant material
- Keep responses concise but complete

Course context: {course_context}
"""

# In-memory session store (use Redis in production)
sessions: dict[str, list[dict]] = {}


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

        if self.session_id not in sessions:
            sessions[self.session_id] = []

    def ask(self, question: str) -> str:
        history = sessions[self.session_id]
        history.append({"role": "user", "content": question})

        if self.mock_mode or not self.client:
            # Deterministic, grounded mock answer for offline/dev/test environments
            answer = (
                f"As your StellarLearn tutor for '{self.course_context}': "
                f"Regarding '{question}', Stellar uses the Stellar Consensus Protocol (SCP) and "
                f"Soroban smart contracts for high-throughput, low-latency execution. "
                f"How would you apply this to your current learning module?"
            )
        else:
            response = self.client.messages.create(
                model=CLAUDE_MODEL,
                max_tokens=1024,
                system=SYSTEM_PROMPT_TEMPLATE.format(course_context=self.course_context),
                messages=history,
            )
            answer = response.content[0].text

        history.append({"role": "assistant", "content": answer})
        sessions[self.session_id] = history[-20:]  # keep last 20 turns

        return answer

    def clear(self):
        sessions.pop(self.session_id, None)
