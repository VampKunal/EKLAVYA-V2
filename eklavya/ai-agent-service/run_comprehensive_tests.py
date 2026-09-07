import sys
import uuid
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from graphs.quiz_remediation_graph import quiz_remediation_app
from graphs.crag_graph import crag_app
from graphs.curriculum_graph import curriculum_app
from graphs.study_session_graph import study_session_app
from graphs.essay_grader_graph import essay_grader_app
from services.langsmith_client import push_crag_eval_example


def test_quiz_remediation():
    print("\n==========================================")
    print("--- 1. TESTING QUIZ REMEDIATION GRAPH ---")
    print("==========================================")
    sample_input = {
        "topic": "Python Data Structures",
        "question_text": "Is a tuple mutable in Python?",
        "user_answer": "Yes, tuples can be modified after creation.",
        "correct_answer": "No, tuples are immutable sequences.",
        "misconception": "",
        "micro_lesson": "",
        "retry_question": {}
    }
    res = quiz_remediation_app.invoke(
        sample_input,
        config={"tags": ["TestRun", "QuizRemediation"], "metadata": {"test": True}}
    )
    print("[OK] Misconception:", res.get("misconception"))
    print("[OK] Micro-Lesson:\n", res.get("micro_lesson"))
    print("[OK] Retry Question:", res.get("retry_question", {}).get("questionText"))
    print("[OK] Options:", res.get("retry_question", {}).get("options"))
    print("[OK] Correct Answer:", res.get("retry_question", {}).get("correctAnswer"))


def test_crag():
    print("\n==========================================")
    print("--- 2. TESTING CORRECTIVE RAG (CRAG) GRAPH ---")
    print("==========================================")
    sample_input = {
        "question": "What is Python list comprehension?",
        "course_id": "course-py-101",
        "chat_history": [],
        "documents": [],
        "is_relevant": False,
        "web_search_needed": False,
        "final_answer": "",
        "hallucination_score": ""
    }
    res = crag_app.invoke(
        sample_input,
        config={"tags": ["TestRun", "CRAG"], "metadata": {"test": True}}
    )
    print("[OK] Web Search Used:", res.get("web_search_needed"))
    print("[OK] Hallucination Score:", res.get("hallucination_score"))
    print("[OK] Answer Snippet:", res.get("final_answer")[:180], "...")


def test_curriculum():
    print("\n==========================================")
    print("--- 3. TESTING CURRICULUM ROADMAP GRAPH ---")
    print("==========================================")
    sample_input = {
        "student_goal": "Master Machine Learning and Neural Networks",
        "weak_topics": ["Linear Algebra", "Backpropagation"],
        "available_hours_per_week": 12,
        "roadmap_draft": {},
        "validation_status": "",
        "final_roadmap": {}
    }
    res = curriculum_app.invoke(
        sample_input,
        config={"tags": ["TestRun", "Curriculum"], "metadata": {"test": True}}
    )
    roadmap = res.get("final_roadmap") or res.get("roadmap_draft")
    print("[OK] Title:", roadmap.get("title"))
    print("[OK] Weekly Plan Count:", len(roadmap.get("weeklyPlan", [])))


def test_stateful_study_session():
    print("\n==========================================")
    print("--- 4. TESTING STATEFUL STUDY SESSION (MemorySaver Checkpointer) ---")
    print("==========================================")
    thread_id = f"test-thread-{uuid.uuid4().hex[:6]}"
    thread_config = {"configurable": {"thread_id": thread_id}}

    # Turn 1
    print(f"[Turn 1] Sending message for thread_id: {thread_id}")
    input_1 = {
        "session_id": thread_id,
        "main_topic": "Object Oriented Programming in Python",
        "chat_history": [{"role": "user", "content": "What is polymorphism in simple terms?"}],
        "topics_covered": [],
        "comprehension_score": 70,
        "latest_answer": "",
        "followup_question": ""
    }
    res1 = study_session_app.invoke(
        input_1,
        config={"configurable": {"thread_id": thread_id}, "tags": ["TestRun", "SessionTurn1"]}
    )
    # Update state history
    h1 = input_1["chat_history"] + [{"role": "assistant", "content": res1.get("latest_answer")}]
    study_session_app.update_state(thread_config, {"chat_history": h1})

    print("[OK] Turn 1 Answer Snippet:", res1.get("latest_answer")[:150], "...")
    print("[OK] Turn 1 Follow-up Question:", res1.get("followup_question"))

    # Turn 2 (Resuming the same thread!)
    print(f"\n[Turn 2] Resuming thread_id: {thread_id}")
    input_2 = {
        "session_id": thread_id,
        "main_topic": "Object Oriented Programming in Python",
        "chat_history": h1 + [{"role": "user", "content": "Can you give me a code example using method overriding?"}],
        "topics_covered": res1.get("topics_covered", []),
        "comprehension_score": res1.get("comprehension_score", 70),
        "latest_answer": "",
        "followup_question": ""
    }
    res2 = study_session_app.invoke(
        input_2,
        config={"configurable": {"thread_id": thread_id}, "tags": ["TestRun", "SessionTurn2"]}
    )
    print("[OK] Turn 2 Answer Snippet:", res2.get("latest_answer")[:150], "...")
    print("[OK] Topics Covered So Far:", res2.get("topics_covered"))

    # Fetch stored checkpoint state
    final_checkpoint = study_session_app.get_state(thread_config)
    print("[OK] Checkpointer Persisted Messages Count:", len(final_checkpoint.values.get("chat_history", [])))


def test_essay_grader():
    print("\n==========================================")
    print("--- 5. TESTING MULTI-DIMENSIONAL ESSAY GRADER GRAPH ---")
    print("==========================================")
    sample_input = {
        "question": "Explain how Garbage Collection works in Python.",
        "rubric": "Must mention reference counting, cyclical garbage collection, and gc module.",
        "student_essay": "Python uses reference counting as its primary memory management strategy. Every object has a reference count, and when it drops to zero, the object is immediately deallocated. However, reference counting alone cannot resolve cyclic references, such as two objects referencing each other. To solve this, Python includes a generational garbage collector (gc module) that detects and reclaims unreachable cycles.",
        "accuracy_score": 0,
        "accuracy_feedback": "",
        "completeness_score": 0,
        "missing_points": [],
        "clarity_score": 0,
        "clarity_feedback": "",
        "final_report": {}
    }
    res = essay_grader_app.invoke(
        sample_input,
        config={"tags": ["TestRun", "EssayGrader"], "metadata": {"test": True}}
    )
    print("[OK] Dimension Scores - Accuracy:", res.get("accuracy_score"), "| Completeness:", res.get("completeness_score"), "| Clarity:", res.get("clarity_score"))
    rep = res.get("final_report", {})
    print("[OK] Overall Score:", rep.get("overall_score"), "| Letter Grade:", rep.get("letter_grade"))
    print("[OK] Strengths:", rep.get("strengths"))
    print("[OK] Summary Feedback:", rep.get("summary_feedback"))


def test_langsmith_dataset_push():
    print("\n==========================================")
    print("--- 6. TESTING LANGSMITH EVAL DATASET AUTO-PUSH ---")
    print("==========================================")
    push_crag_eval_example(
        question="What is Python list comprehension?",
        answer="List comprehension provides a concise syntax to create lists based on existing iterables.",
        documents_used=2
    )


if __name__ == "__main__":
    import time
    print("=== STARTING EKLAVYA AI COMPREHENSIVE SUITE ===")
    test_quiz_remediation()
    time.sleep(3)
    test_crag()
    time.sleep(3)
    test_curriculum()
    time.sleep(3)
    test_stateful_study_session()
    time.sleep(3)
    test_essay_grader()
    time.sleep(3)
    test_langsmith_dataset_push()
    print("\n[SUCCESS] ALL 6 COMPREHENSIVE TESTS COMPLETED SUCCESSFULLY!")
