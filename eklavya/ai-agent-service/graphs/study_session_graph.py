from typing import TypedDict, List, Dict, Any, Optional
from pydantic import BaseModel, Field
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from config import settings

_llm_instance = None

def get_llm():
    """Return cached singleton LLM instance."""
    global _llm_instance
    if _llm_instance is not None:
        return _llm_instance

    if settings.OPENROUTER_API_KEY:
        try:
            from langchain_openai import ChatOpenAI
            _llm_instance = ChatOpenAI(
                model="google/gemini-2.5-flash",
                openai_api_key=settings.OPENROUTER_API_KEY,
                openai_api_base="https://openrouter.ai/api/v1",
                temperature=0.3,
                max_tokens=1000
            )
            return _llm_instance
        except Exception as e:
            print(f"[Study Session] OpenRouter warning: {e}")

    if settings.OPENAI_API_KEY:
        try:
            from langchain_openai import ChatOpenAI
            _llm_instance = ChatOpenAI(model="gpt-4o-mini", api_key=settings.OPENAI_API_KEY, temperature=0.3)
            return _llm_instance
        except Exception as e:
            print(f"[Study Session] OpenAI init warning: {e}")

    if settings.GOOGLE_AI_API_KEY:
        try:
            from langchain_google_genai import ChatGoogleGenerativeAI
            _llm_instance = ChatGoogleGenerativeAI(
                model="gemini-3.6-flash",
                google_api_key=settings.GOOGLE_AI_API_KEY,
                temperature=0.3
            )
            return _llm_instance
        except Exception as e:
            print(f"[Study Session] Google GenAI warning: {e}")

    from langchain_openai import ChatOpenAI
    _llm_instance = ChatOpenAI(model="gpt-4o-mini", api_key=settings.OPENAI_API_KEY, temperature=0.3)
    return _llm_instance


def extract_text(content) -> str:
    """Safely extracts string content from LLM response (handles string, dicts, and list blocks)."""
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        parts = []
        for block in content:
            if isinstance(block, dict) and block.get("type") == "text":
                parts.append(block.get("text", ""))
            elif isinstance(block, str):
                parts.append(block)
        return "".join(parts).strip()
    return str(content).strip()


class ComprehensionAssessmentSchema(BaseModel):
    score: int = Field(description="Comprehension score from 0 to 100 based on student engagement and understanding")
    topic_extracted: str = Field(description="Primary topic covered in this turn")
    perceived_difficulty: str = Field(description="EASY, MODERATE, or HARD")


# State Definition
class StudySessionState(TypedDict):
    session_id: str
    main_topic: str
    chat_history: List[Dict[str, str]]  # list of {"role": "user"|"assistant", "content": "..."}
    topics_covered: List[str]
    comprehension_score: int
    latest_answer: str
    followup_question: str


# Node 1: Process Question and Answer
def process_question_node(state: StudySessionState) -> dict:
    llm = get_llm()
    history = state.get("chat_history", [])
    topic = state.get("main_topic", "General Study")
    latest_msg = history[-1]["content"] if history else "Hello"

    formatted_history = "\n".join([f"{m['role'].upper()}: {m['content']}" for m in history[:-1]])

    prompt = f"""You are Eklavya AI, an expert interactive tutor conducting an adaptive study session.

Main Study Subject: {topic}

Session Conversation History:
{formatted_history if formatted_history else "Session started."}

Student Input: {latest_msg}

Provide a clear, engaging, and educational response to help the student learn:"""

    try:
        res = llm.invoke(prompt)
        answer = extract_text(res.content)
    except Exception as e:
        print(f"[Study Session] Answer generation error: {e}")
        answer = f"I am ready to help you with {topic}. What specific questions do you have?"

    return {"latest_answer": answer}


# Node 2: Assess Comprehension & Track Topics
def assess_comprehension_node(state: StudySessionState) -> dict:
    llm = get_llm()
    history = state.get("chat_history", [])
    latest_answer = state.get("latest_answer", "")
    topics_covered = list(state.get("topics_covered", []))

    prompt = f"""Assess the student's learning progress based on the recent exchange:

Latest Exchange:
Student: {history[-1]['content'] if history else ''}
Tutor: {latest_answer}"""

    current_score = state.get("comprehension_score", 70)
    try:
        if hasattr(llm, "with_structured_output"):
            structured_llm = llm.with_structured_output(ComprehensionAssessmentSchema)
            res_obj = structured_llm.invoke(prompt)
            score = res_obj.score
            new_topic = res_obj.topic_extracted
        else:
            score = current_score
            new_topic = state.get("main_topic", "General")

        if new_topic and new_topic not in topics_covered:
            topics_covered.append(new_topic)
    except Exception as e:
        print(f"[Study Session] Assessment error: {e}")
        score = current_score

    return {
        "comprehension_score": score,
        "topics_covered": topics_covered
    }


# Node 3: Generate Proactive Follow-Up Checkpoint Question
def generate_followup_node(state: StudySessionState) -> dict:
    llm = get_llm()
    answer = state.get("latest_answer", "")
    topic = state.get("main_topic", "")

    prompt = f"""Based on your explanation below, generate ONE short, engaging follow-up comprehension question to check if the student understood.

Explanation:
{answer}

Short Follow-Up Question:"""

    try:
        res = llm.invoke(prompt)
        followup = extract_text(res.content)
    except Exception as e:
        followup = f"Does this explanation of {topic} make sense to you?"

    return {"followup_question": followup}


# Build Graph with Persistent Checkpointer (RedisSaver with MemorySaver fallback)
def get_checkpointer():
    redis_url = getattr(settings, "REDIS_URL", "") or "redis://localhost:6379"
    try:
        from langgraph.checkpoint.redis import RedisSaver
        saver = RedisSaver(redis_url=redis_url)
        print(f"[Study Session Graph] Persistent RedisSaver checkpointer initialized with: {redis_url}")
        return saver
    except Exception as e:
        print(f"[Study Session Graph] RedisSaver checkpointer initialization skipped ({e}). Falling back to MemorySaver.")
        return MemorySaver()

checkpointer_instance = get_checkpointer()

def build_study_session_graph():
    workflow = StateGraph(StudySessionState)

    workflow.add_node("process_question", process_question_node)
    workflow.add_node("assess_comprehension", assess_comprehension_node)
    workflow.add_node("generate_followup", generate_followup_node)

    workflow.set_entry_point("process_question")
    workflow.add_edge("process_question", "assess_comprehension")
    workflow.add_edge("assess_comprehension", "generate_followup")
    workflow.add_edge("generate_followup", END)

    return workflow.compile(checkpointer=checkpointer_instance)

study_session_app = build_study_session_graph()
