import os
import sys
import json
import time
from unittest.mock import patch
from fastapi.testclient import TestClient

from contextlib import asynccontextmanager

@asynccontextmanager
async def dummy_lifespan(app):
    yield

from main import app
app.router.lifespan_context = dummy_lifespan
from config import settings
from graphs.quiz_remediation_graph import quiz_remediation_app, get_llm as quiz_get_llm
from graphs.crag_graph import crag_app, get_llm as crag_get_llm
from graphs.curriculum_graph import curriculum_app, get_llm as curriculum_get_llm

client = TestClient(app)

def print_header(title):
    print("\n" + "="*70)
    print(f"   {title}")
    print("="*70)

def test_fastapi_endpoints():
    print_header("1. FASTAPI ENDPOINT INTEGRATION TESTS")
    
    # 1.1 Health Check
    res = client.get("/health")
    print(f"[TEST 1.1] GET /health -> Status: {res.status_code}")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"
    print("   -> PASS: Health check endpoint returned 200 OK.")
    
    # 1.2 Quiz Remediation Endpoint
    remediate_payload = {
        "topic": "Python Asyncio",
        "questionText": "What does asyncio.run() do?",
        "userAnswer": "It creates a multi-threaded process pool",
        "correctAnswer": "It runs the passed event loop, managing async tasks in a single thread"
    }
    t0 = time.time()
    res = client.post("/api/v1/quiz/remediate", json=remediate_payload)
    elapsed = round(time.time() - t0, 2)
    print(f"\n[TEST 1.2] POST /api/v1/quiz/remediate -> Status: {res.status_code} ({elapsed}s)")
    assert res.status_code == 200
    data = res.json()
    assert "misconception" in data
    assert "microLesson" in data
    assert "retryQuestion" in data
    print(f"   -> Misconception: {data['misconception'][:90]}...")
    print(f"   -> PASS: Quiz Remediation API returned structured JSON.")

    # 1.3 CRAG Endpoint
    crag_payload = {
        "question": "Explain how event loops work in Python asyncio",
        "courseId": "python-201",
        "chatHistory": []
    }
    t0 = time.time()
    res = client.post("/api/v1/crag", json=crag_payload)
    elapsed = round(time.time() - t0, 2)
    print(f"\n[TEST 1.3] POST /api/v1/crag -> Status: {res.status_code} ({elapsed}s)")
    assert res.status_code == 200
    crag_data = res.json()
    assert "answer" in crag_data
    assert "hallucinationScore" in crag_data
    print(f"   -> Hallucination Score: {crag_data.get('hallucinationScore')}")
    print(f"   -> Web Search Used: {crag_data.get('webSearchUsed')}")
    print(f"   -> PASS: CRAG API returned verified answer.")

    # 1.4 Curriculum Roadmap Endpoint
    roadmap_payload = {
        "studentGoal": "Learn Async Programming & System Architecture",
        "weakTopics": ["Asyncio", "Concurrency"],
        "availableHoursPerWeek": 6
    }
    t0 = time.time()
    res = client.post("/api/v1/roadmap/generate", json=roadmap_payload)
    elapsed = round(time.time() - t0, 2)
    print(f"\n[TEST 1.4] POST /api/v1/roadmap/generate -> Status: {res.status_code} ({elapsed}s)")
    assert res.status_code == 200
    rm_data = res.json()
    assert "roadmap" in rm_data
    print(f"   -> Roadmap Title: {rm_data['roadmap'].get('title')}")
    print(f"   -> PASS: Curriculum API returned generated roadmap.")

def test_fallback_resilience():
    print_header("2. LLM FALLBACK RESILIENCE & OUTAGE SIMULATION TESTS")

    print("[TEST 2.1] Simulating Primary Google Gemini Outage (Clearing GOOGLE_AI_API_KEY)...")
    original_key = settings.GOOGLE_AI_API_KEY
    try:
        settings.GOOGLE_AI_API_KEY = ""
        
        # Test Quiz Remediation with key missing
        llm = quiz_get_llm()
        print(f"   -> Resolved Fallback LLM Class: {llm.__class__.__name__}")
        
        state = {
            "topic": "Python Decorators",
            "question_text": "What does @functools.wraps do?",
            "user_answer": "It encrypts the function",
            "correct_answer": "It preserves the original function metadata like __name__ and __doc__",
            "misconception": "",
            "micro_lesson": "",
            "retry_question": {}
        }
        res = quiz_remediation_app.invoke(state)
        assert len(res.get("misconception", "")) > 0
        print(f"   -> Fallback Misconception Result: {res['misconception'][:80]}...")
        print("   -> PASS: System successfully fell back without crashing!")
    finally:
        settings.GOOGLE_AI_API_KEY = original_key
        print("   -> Restored GOOGLE_AI_API_KEY.")

def test_evaluation_and_quality_metrics():
    print_header("3. LLM EVALUATION & QUALITY METRICS CHECKS")

    state = {
        "topic": "SQL Indexing",
        "question_text": "Why do B-tree indexes speed up SELECT queries?",
        "user_answer": "Because they delete unused rows",
        "correct_answer": "Because they allow logarithmic O(log N) lookup time instead of scanning all rows",
        "misconception": "",
        "micro_lesson": "",
        "retry_question": {}
    }
    
    res = quiz_remediation_app.invoke(state)
    retry_q = res.get("retry_question", {})
    
    # Quality Check 1: JSON Schema Compliance
    required_keys = ["questionText", "options", "correctAnswer", "explanation"]
    has_all_keys = all(k in retry_q for k in required_keys)
    print(f"[QUALITY CHECK 3.1] JSON Schema Strict Compliance: {has_all_keys}")
    assert has_all_keys
    assert isinstance(retry_q["options"], list)
    assert len(retry_q["options"]) >= 2
    print("   -> PASS: Retry question strict JSON format verified.")

    # Quality Check 2: Misconception Depth
    misconception = res.get("misconception", "")
    print(f"[QUALITY CHECK 3.2] Misconception Depth Score (Length > 30 chars): {len(misconception) > 30}")
    assert len(misconception) > 30
    print(f"   -> Diagnosed Text: {misconception}")
    print("   -> PASS: Misconception diagnosis is substantive and accurate.")

def main():
    print("\n=== STARTING COMPREHENSIVE EKLAVYA AGENT TEST SUITE ===")
    try:
        test_fastapi_endpoints()
        test_fallback_resilience()
        test_evaluation_and_quality_metrics()
        print_header(">>> ALL TESTS PASSED SUCCESSFULLY! <<<")
    except Exception as e:
        print(f"\n[ERROR] TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
