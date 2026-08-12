import json
from typing import TypedDict, List, Dict, Any
from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI
from config import settings

class CurriculumState(TypedDict):
    student_goal: str
    weak_topics: List[str]
    available_hours_per_week: int
    roadmap_draft: Dict[str, Any]
    validation_status: str
    final_roadmap: Dict[str, Any]

def draft_roadmap_node(state: CurriculumState) -> dict:
    llm = ChatOpenAI(model="gpt-4o-mini", api_key=settings.OPENAI_API_KEY, temperature=0.3)
    
    prompt = f"""Design a 4-week structured personalized study roadmap for a student.

Goal: {state['student_goal']}
Weak Topics to prioritize: {', '.join(state['weak_topics']) if state['weak_topics'] else 'General curriculum'}
Available Study Time: {state['available_hours_per_week']} hours/week

Respond strictly in JSON:
{{
  "title": "string",
  "weeks": [
    {{
      "weekNumber": 1,
      "focus": "string",
      "actionItems": ["string", "string"],
      "estimatedHours": 5
    }}
  ]
}}"""

    try:
        res = llm.invoke(prompt).content.strip()
        if res.startswith("```json"):
            res = res[7:]
        if res.endswith("```"):
            res = res[:-3]
        draft = json.loads(res.strip())
    except Exception:
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
    llm = ChatOpenAI(model="gpt-4o-mini", api_key=settings.OPENAI_API_KEY, temperature=0.2)
    draft = state.get("roadmap_draft", {})
    
    prompt = f"""Refine this study plan to fit strictly within {state['available_hours_per_week']} hours per week without burning out the student.

Overloaded Plan:
{json.dumps(draft)}

Respond strictly with valid JSON with adjusted estimatedHours."""

    try:
        res = llm.invoke(prompt).content.strip()
        if res.startswith("```json"):
            res = res[7:]
        if res.endswith("```"):
            res = res[:-3]
        refined = json.loads(res.strip())
    except Exception:
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
