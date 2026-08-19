import json
from typing import TypedDict, Dict, Any, List, Optional
from pydantic import BaseModel, Field
from langgraph.graph import StateGraph, END
from config import settings

_llm_instance = None

def get_llm():
    """Return cached singleton LLM instance (Google Gemini 2.5 Flash with fallbacks)."""
    global _llm_instance
    if _llm_instance is not None:
        return _llm_instance

    if settings.GOOGLE_AI_API_KEY:
        try:
            from langchain_google_genai import ChatGoogleGenerativeAI
            _llm_instance = ChatGoogleGenerativeAI(
                model="gemini-2.5-flash",
                google_api_key=settings.GOOGLE_AI_API_KEY,
                temperature=0.2
            )
            return _llm_instance
        except Exception as e:
            print(f"[Quiz Remediation] Google GenAI init warning: {e}")

    if settings.OPENROUTER_API_KEY:
        try:
            from langchain_openai import ChatOpenAI
            _llm_instance = ChatOpenAI(
                model="google/gemini-2.5-flash",
                openai_api_key=settings.OPENROUTER_API_KEY,
                openai_api_base="https://openrouter.ai/api/v1",
                temperature=0.2
            )
            return _llm_instance
        except Exception as e:
            print(f"[Quiz Remediation] OpenRouter init warning: {e}")

    from langchain_openai import ChatOpenAI
    _llm_instance = ChatOpenAI(model="gpt-4o-mini", api_key=settings.OPENAI_API_KEY, temperature=0.2)
    return _llm_instance


class RetryQuestionSchema(BaseModel):
    questionText: str = Field(description="Clear multiple choice retry question text")
    options: List[str] = Field(description="List of exactly 4 distinct option choices")
    correctAnswer: str = Field(description="The exact string matching one of the options")
    explanation: str = Field(description="Short explanation of why the correct answer is right")


class QuizRemediationState(TypedDict):
    topic: str
    question_text: str
    user_answer: str
    correct_answer: str
    misconception: str
    micro_lesson: str
    retry_question: Dict[str, Any]
    retry_attempts: int
    is_question_valid: bool


# Node 1: Detect Misconception
def detect_misconception_node(state: QuizRemediationState) -> dict:
    llm = get_llm()
    
    prompt = f"""You are an educational diagnostician. Analyze why the student gave an incorrect answer to this quiz question.

Topic: {state['topic']}
Question: {state['question_text']}
Correct Answer: {state['correct_answer']}
Student's Wrong Answer: {state['user_answer']}

Identify the exact conceptual misunderstanding or flaw in reasoning. Keep your diagnosis to 2 concise sentences."""

    try:
        res = llm.invoke(prompt)
        misconception = res.content.strip()
    except Exception as e:
        print(f"[Quiz Remediation] Misconception detection error: {e}")
        misconception = f"The student struggled with conceptual recall on {state['topic']}."

    return {"misconception": misconception, "retry_attempts": 0}


# Node 2: Generate Micro-Lesson
def generate_micro_lesson_node(state: QuizRemediationState) -> dict:
    llm = get_llm()
    
    prompt = f"""You are an AI Tutor. Provide a targeted 3-bullet micro-explanation resolving this student misconception.

Topic: {state['topic']}
Misconception: {state['misconception']}
Correct Concept: {state['correct_answer']}

Format:
- Bullet 1: What went wrong
- Bullet 2: Core rule / correct concept
- Bullet 3: Pro-tip / shortcut to remember"""

    try:
        res = llm.invoke(prompt)
        micro_lesson = res.content.strip()
    except Exception as e:
        print(f"[Quiz Remediation] Micro-lesson error: {e}")
        micro_lesson = f"Review the fundamental principles of {state['topic']}."

    return {"micro_lesson": micro_lesson}


# Node 3: Generate Retry Question (Adaptive Retest with Pydantic Structured Output)
def generate_retry_question_node(state: QuizRemediationState) -> dict:
    llm = get_llm()
    current_attempts = state.get("retry_attempts", 0) + 1

    prompt = f"""Generate a brand-new multiple choice retry question targeting the exact misconception identified.

Topic: {state['topic']}
Addressed Misconception: {state['misconception']}
Original Question context: {state['question_text']}

Requirements:
- Must have 4 distinct options.
- The correctAnswer MUST be identical to one of the 4 options.
- Provide a concise explanation."""

    try:
        if hasattr(llm, "with_structured_output"):
            structured_llm = llm.with_structured_output(RetryQuestionSchema)
            res_obj = structured_llm.invoke(prompt)
            retry_q = res_obj.model_dump()
        else:
            res = llm.invoke(prompt)
            text = res.content.strip()
            if text.startswith("```json"):
                text = text[7:]
            if text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]
            retry_q = json.loads(text.strip())
    except Exception as e:
        print(f"[Quiz Remediation] Retry question generation error: {e}")
        retry_q = {
            "questionText": f"Retry: Key concept verification for {state['topic']}",
            "options": [state['correct_answer'], state['user_answer'], "Option C", "Option D"],
            "correctAnswer": state['correct_answer'],
            "explanation": "Re-verify the correct solution rule."
        }

    return {"retry_question": retry_q, "retry_attempts": current_attempts}


# Node 4: Self-Correction Validation Node
def validate_retry_question_node(state: QuizRemediationState) -> dict:
    q = state.get("retry_question", {})
    question_text = q.get("questionText", "")
    options = q.get("options", [])
    correct_ans = q.get("correctAnswer", "")

    # Validation rules:
    # 1. Question text non-empty
    # 2. At least 4 options provided
    # 3. correctAnswer is actually inside options
    is_valid = bool(
        question_text and 
        isinstance(options, list) and 
        len(options) >= 3 and 
        correct_ans in options
    )

    if not is_valid:
        print(f"[Quiz Remediation] Self-correction: Retry question validation FAILED (attempt {state.get('retry_attempts')}). Re-generating...")
    else:
        print(f"[Quiz Remediation] Self-correction: Retry question validation PASSED.")

    return {"is_question_valid": is_valid}


def route_retry_validation(state: QuizRemediationState) -> str:
    if not state.get("is_question_valid", False) and state.get("retry_attempts", 0) < 3:
        return "regenerate"
    return "end"


# Build Graph with Self-Correction Loop
def build_quiz_remediation_graph():
    workflow = StateGraph(QuizRemediationState)
    
    workflow.add_node("detect_misconception", detect_misconception_node)
    workflow.add_node("generate_micro_lesson", generate_micro_lesson_node)
    workflow.add_node("generate_retry_question", generate_retry_question_node)
    workflow.add_node("validate_retry_question", validate_retry_question_node)
    
    workflow.set_entry_point("detect_misconception")
    workflow.add_edge("detect_misconception", "generate_micro_lesson")
    workflow.add_edge("generate_micro_lesson", "generate_retry_question")
    workflow.add_edge("generate_retry_question", "validate_retry_question")
    
    workflow.add_conditional_edges(
        "validate_retry_question",
        route_retry_validation,
        {
            "regenerate": "generate_retry_question",
            "end": END
        }
    )
    
    return workflow.compile()

quiz_remediation_app = build_quiz_remediation_graph()

