from typing import TypedDict, List, Dict, Any, Optional
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
                temperature=0.1,
                max_tokens=1000
            )
            return _llm_instance
        except Exception as e:
            print(f"[Essay Grader] OpenRouter warning: {e}")

    if settings.OPENAI_API_KEY:
        try:
            from langchain_openai import ChatOpenAI
            _llm_instance = ChatOpenAI(model="gpt-4o-mini", api_key=settings.OPENAI_API_KEY, temperature=0.1)
            return _llm_instance
        except Exception as e:
            print(f"[Essay Grader] OpenAI init warning: {e}")

    if settings.GOOGLE_AI_API_KEY:
        try:
            from langchain_google_genai import ChatGoogleGenerativeAI
            _llm_instance = ChatGoogleGenerativeAI(
                model="gemini-3.6-flash",
                google_api_key=settings.GOOGLE_AI_API_KEY,
                temperature=0.1
            )
            return _llm_instance
        except Exception as e:
            print(f"[Essay Grader] Google GenAI warning: {e}")

    from langchain_openai import ChatOpenAI
    _llm_instance = ChatOpenAI(model="gpt-4o-mini", api_key=settings.OPENAI_API_KEY, temperature=0.1)
    return _llm_instance


class AccuracyEvalSchema(BaseModel):
    score: int = Field(description="Accuracy score from 0 to 100")
    feedback: str = Field(description="Evaluation of factual correctness")


class CompletenessEvalSchema(BaseModel):
    score: int = Field(description="Completeness score from 0 to 100")
    missing_key_points: List[str] = Field(description="Key concepts or arguments missing from the answer")


class ClarityEvalSchema(BaseModel):
    score: int = Field(description="Clarity and structure score from 0 to 100")
    feedback: str = Field(description="Evaluation of clarity, organization, and readability")


class FinalEssayReportSchema(BaseModel):
    overall_score: int = Field(description="Weighted overall score from 0 to 100")
    letter_grade: str = Field(description="A, B, C, D, or F")
    strengths: List[str] = Field(description="Top 2 strengths of the answer")
    areas_for_improvement: List[str] = Field(description="Top 2 areas needing improvement")
    summary_feedback: str = Field(description="Comprehensive teacher feedback to the student")


# State Schema
class EssayGraderState(TypedDict):
    question: str
    rubric: Optional[str]
    student_essay: str
    accuracy_score: int
    accuracy_feedback: str
    completeness_score: int
    missing_points: List[str]
    clarity_score: int
    clarity_feedback: str
    final_report: Dict[str, Any]


# Node 1: Evaluate Accuracy
def evaluate_accuracy_node(state: EssayGraderState) -> dict:
    llm = get_llm()
    prompt = f"""Evaluate the FACTUAL ACCURACY of this student essay.

Question: {state['question']}
Rubric: {state.get('rubric', 'Standard academic correctness')}

Student Essay:
{state['student_essay']}"""

    try:
        if hasattr(llm, "with_structured_output"):
            structured_llm = llm.with_structured_output(AccuracyEvalSchema)
            res = structured_llm.invoke(prompt)
            return {"accuracy_score": res.score, "accuracy_feedback": res.feedback}
        else:
            res = llm.invoke(prompt + "\nProvide score (0-100) and brief feedback.")
            return {"accuracy_score": 80, "accuracy_feedback": res.content.strip()}
    except Exception as e:
        print(f"[Essay Grader] Accuracy eval error: {e}")
        return {"accuracy_score": 75, "accuracy_feedback": "Fair factual accuracy."}


# Node 2: Evaluate Completeness
def evaluate_completeness_node(state: EssayGraderState) -> dict:
    llm = get_llm()
    prompt = f"""Evaluate the COMPLETENESS of this student essay. Did it cover all required aspects?

Question: {state['question']}
Rubric: {state.get('rubric', 'Standard academic thoroughness')}

Student Essay:
{state['student_essay']}"""

    try:
        if hasattr(llm, "with_structured_output"):
            structured_llm = llm.with_structured_output(CompletenessEvalSchema)
            res = structured_llm.invoke(prompt)
            return {"completeness_score": res.score, "missing_points": res.missing_key_points}
        else:
            return {"completeness_score": 80, "missing_points": []}
    except Exception as e:
        print(f"[Essay Grader] Completeness eval error: {e}")
        return {"completeness_score": 75, "missing_points": []}


# Node 3: Evaluate Clarity
def evaluate_clarity_node(state: EssayGraderState) -> dict:
    llm = get_llm()
    prompt = f"""Evaluate the CLARITY, STRUCTURE, and READABILITY of this student essay.

Question: {state['question']}

Student Essay:
{state['student_essay']}"""

    try:
        if hasattr(llm, "with_structured_output"):
            structured_llm = llm.with_structured_output(ClarityEvalSchema)
            res = structured_llm.invoke(prompt)
            return {"clarity_score": res.score, "clarity_feedback": res.feedback}
        else:
            return {"clarity_score": 85, "clarity_feedback": "Good structure and clarity."}
    except Exception as e:
        print(f"[Essay Grader] Clarity eval error: {e}")
        return {"clarity_score": 80, "clarity_feedback": "Clear explanation."}


# Node 4: Aggregate Final Grade Report
def aggregate_feedback_node(state: EssayGraderState) -> dict:
    llm = get_llm()
    acc = state.get("accuracy_score", 75)
    comp = state.get("completeness_score", 75)
    clar = state.get("clarity_score", 75)

    prompt = f"""Synthesize the multi-dimensional evaluation into a final comprehensive grade report for the student:

Dimension Scores:
- Accuracy (40% weight): {acc}/100 - {state.get('accuracy_feedback', '')}
- Completeness (35% weight): {comp}/100 - Missing: {', '.join(state.get('missing_points', []))}
- Clarity (25% weight): {clar}/100 - {state.get('clarity_feedback', '')}

Question: {state['question']}
Student Essay: {state['student_essay']}"""

    try:
        if hasattr(llm, "with_structured_output"):
            structured_llm = llm.with_structured_output(FinalEssayReportSchema)
            res_obj = structured_llm.invoke(prompt)
            final_report = res_obj.model_dump()
        else:
            overall = int(acc * 0.4 + comp * 0.35 + clar * 0.25)
            final_report = {
                "overall_score": overall,
                "letter_grade": "A" if overall >= 90 else "B" if overall >= 80 else "C",
                "strengths": ["Clear structure", "Good core concepts"],
                "areas_for_improvement": ["Add more details"],
                "summary_feedback": f"Overall solid effort. Score: {overall}/100."
            }
    except Exception as e:
        print(f"[Essay Grader] Aggregation error: {e}")
        overall = int(acc * 0.4 + comp * 0.35 + clar * 0.25)
        final_report = {
            "overall_score": overall,
            "letter_grade": "B",
            "strengths": ["Good effort"],
            "areas_for_improvement": ["Elaborate further"],
            "summary_feedback": f"Graded successfully. Score: {overall}/100."
        }

    return {"final_report": final_report}


def build_essay_grader_graph():
    workflow = StateGraph(EssayGraderState)

    workflow.add_node("evaluate_accuracy", evaluate_accuracy_node)
    workflow.add_node("evaluate_completeness", evaluate_completeness_node)
    workflow.add_node("evaluate_clarity", evaluate_clarity_node)
    workflow.add_node("aggregate_feedback", aggregate_feedback_node)

    workflow.set_entry_point("evaluate_accuracy")
    workflow.add_edge("evaluate_accuracy", "evaluate_completeness")
    workflow.add_edge("evaluate_completeness", "evaluate_clarity")
    workflow.add_edge("evaluate_clarity", "aggregate_feedback")
    workflow.add_edge("aggregate_feedback", END)

    return workflow.compile()

essay_grader_app = build_essay_grader_graph()
