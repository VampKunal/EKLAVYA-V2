import json
from typing import TypedDict, List, Dict, Any
from pydantic import BaseModel, Field
from langgraph.graph import StateGraph, END
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
            print(f"[Curriculum Agent] OpenRouter init warning: {e}")

    if settings.OPENAI_API_KEY:
        try:
            from langchain_openai import ChatOpenAI
            _llm_instance = ChatOpenAI(model="gpt-4o-mini", api_key=settings.OPENAI_API_KEY, temperature=0.3)
            return _llm_instance
        except Exception as e:
            print(f"[Curriculum Agent] OpenAI init warning: {e}")

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
            print(f"[Curriculum Agent] Google GenAI init warning: {e}")

    from langchain_openai import ChatOpenAI
    _llm_instance = ChatOpenAI(model="gpt-4o-mini", api_key=settings.OPENAI_API_KEY, temperature=0.3)
    return _llm_instance


class WeekPlanSchema(BaseModel):
    weekNumber: int = Field(description="Week number 1 to 4")
    focus: str = Field(description="Main topic or focus for the week")
    actionItems: List[str] = Field(description="Actionable tasks for the week")
    estimatedHours: int = Field(description="Estimated study hours for this week")


class CurriculumRoadmapSchema(BaseModel):
    title: str = Field(description="Overall title of the study roadmap")
    weeks: List[WeekPlanSchema] = Field(description="List of exactly 4 weekly learning modules")


class CurriculumState(TypedDict):
    student_goal: str
    weak_topics: List[str]
    available_hours_per_week: int
    roadmap_draft: Dict[str, Any]
    validation_status: str
    final_roadmap: Dict[str, Any]


def draft_roadmap_node(state: CurriculumState) -> dict:
    llm = get_llm()
    
    prompt = f"""Design a 4-week structured personalized study roadmap for a student.

Goal: {state['student_goal']}
Weak Topics to prioritize: {', '.join(state['weak_topics']) if state['weak_topics'] else 'General curriculum'}
Available Study Time: {state['available_hours_per_week']} hours/week"""

    try:
        if hasattr(llm, "with_structured_output"):
            structured_llm = llm.with_structured_output(CurriculumRoadmapSchema)
            res_obj = structured_llm.invoke(prompt)
            draft = res_obj.model_dump()
        else:
            res = llm.invoke(prompt)
            text = res.content.strip()
            if text.startswith("```json"):
                text = text[7:]
            if text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]
            draft = json.loads(text.strip())
    except Exception as e:
        print(f"[Curriculum Agent] Draft parsing error: {e}")
        draft = {"title": "Standard Learning Roadmap", "weeks": []}

    return {"roadmap_draft": draft}


def validate_roadmap_node(state: CurriculumState) -> dict:
    draft = state.get("roadmap_draft", {})
    weeks = draft.get("weeks", [])
    
    total_hours = sum(w.get("estimatedHours", 0) for w in weeks)
    allowed = state["available_hours_per_week"] * 4
    
    if total_hours > allowed:
        return {"validation_status": "OVERLOADED"}
    return {"validation_status": "VALID"}


def refine_roadmap_node(state: CurriculumState) -> dict:
    llm = get_llm()
    draft = state.get("roadmap_draft", {})
    
    prompt = f"""Refine this study plan to fit strictly within {state['available_hours_per_week']} hours per week without burning out the student.

Overloaded Plan:
{json.dumps(draft)}"""

    try:
        if hasattr(llm, "with_structured_output"):
            structured_llm = llm.with_structured_output(CurriculumRoadmapSchema)
            res_obj = structured_llm.invoke(prompt)
            refined = res_obj.model_dump()
        else:
            res = llm.invoke(prompt)
            text = res.content.strip()
            if text.startswith("```json"):
                text = text[7:]
            if text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]
            refined = json.loads(text.strip())
    except Exception as e:
        print(f"[Curriculum Agent] Refine parsing error: {e}")
        refined = draft

    return {"final_roadmap": refined}


def route_validation(state: CurriculumState) -> str:
    if state.get("validation_status") == "OVERLOADED":
        return "refine"
    return "pass"


def build_curriculum_graph():
    workflow = StateGraph(CurriculumState)
    
    workflow.add_node("draft_roadmap", draft_roadmap_node)
    workflow.add_node("validate_roadmap", validate_roadmap_node)
    workflow.add_node("refine_roadmap", refine_roadmap_node)
    
    workflow.set_entry_point("draft_roadmap")
    workflow.add_edge("draft_roadmap", "validate_roadmap")
    workflow.add_conditional_edges(
        "validate_roadmap",
        route_validation,
        {
            "refine": "refine_roadmap",
            "pass": END
        }
    )
    workflow.add_edge("refine_roadmap", END)
    
    return workflow.compile()

curriculum_app = build_curriculum_graph()

