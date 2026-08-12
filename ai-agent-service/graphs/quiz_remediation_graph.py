import json
from typing import TypedDict, Dict, Any
from langgraph.graph import StateGraph, END
from config import settings

def get_llm():
    """Return Google Gemini 1.5 Flash (free tier eligible, active non-deprecated model) if key is present, else OpenAI."""
    if settings.GOOGLE_AI_API_KEY:
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(
            model="gemini-1.5-flash",
            google_api_key=settings.GOOGLE_AI_API_KEY,
            temperature=0.2
        )
    else:
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(model="gpt-4o-mini", api_key=settings.OPENAI_API_KEY, temperature=0.2)

class QuizRemediationState(TypedDict):
    topic: str
    question_text: str
    user_answer: str
    correct_answer: str
    misconception: str
    micro_lesson: str
    retry_question: Dict[str, Any]

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

    return {"misconception": misconception}

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

# Node 3: Generate Retry Question (Adaptive Retest)
def generate_retry_question_node(state: QuizRemediationState) -> dict:
    llm = get_llm()
    
    prompt = f"""Generate a brand-new multiple choice retry question targeting the exact misconception identified.

Topic: {state['topic']}
Addressed Misconception: {state['misconception']}

Respond strictly in valid JSON format matching this schema without any conversational intro:
{{
  "questionText": "string",
  "options": ["string", "string", "string", "string"],
  "correctAnswer": "string",
  "explanation": "string"
}}"""

    try:
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
        print(f"[Quiz Remediation] Retry question parsing error: {e}")
        retry_q = {
            "questionText": f"Retry: Key concept verification for {state['topic']}",
            "options": [state['correct_answer'], state['user_answer'], "Option C", "Option D"],
            "correctAnswer": state['correct_answer'],
            "explanation": "Re-verify the correct solution rule."
        }

    return {"retry_question": retry_q}

# Build Graph
def build_quiz_remediation_graph():
    workflow = StateGraph(QuizRemediationState)
    
    workflow.add_node("detect_misconception", detect_misconception_node)
    workflow.add_node("generate_micro_lesson", generate_micro_lesson_node)
    workflow.add_node("generate_retry_question", generate_retry_question_node)
    
    workflow.set_entry_point("detect_misconception")
    workflow.add_edge("detect_misconception", "generate_micro_lesson")
    workflow.add_edge("generate_micro_lesson", "generate_retry_question")
    workflow.add_edge("generate_retry_question", END)
    
    return workflow.compile()

quiz_remediation_app = build_quiz_remediation_graph()
