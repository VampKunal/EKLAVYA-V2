import json
import os
import unittest
from graphs.quiz_remediation_graph import quiz_remediation_app
from graphs.crag_graph import crag_app
from graphs.curriculum_graph import curriculum_app

class TestEklavyaAgents(unittest.TestCase):

    def test_quiz_remediation_graph(self):
        print("\n--- 1. Testing Quiz Remediation Graph ---")
        state = {
            "topic": "Python Data Structures",
            "question_text": "What does list.append([1, 2]) do?",
            "user_answer": "It flattens the list and adds elements 1 and 2 individually",
            "correct_answer": "It appends the inner list as a single nested element",
            "misconception": "",
            "micro_lesson": "",
            "retry_question": {}
        }
        res = quiz_remediation_app.invoke(state)
        
        self.assertIn("misconception", res)
        self.assertIn("micro_lesson", res)
        self.assertIn("retry_question", res)
        self.assertTrue(len(res["misconception"]) > 0)
        self.assertIn("questionText", res["retry_question"])
        self.assertIn("correctAnswer", res["retry_question"])
        print("[SUCCESS] Quiz Remediation produced valid output.")
        print(f"Misconception sample: {res['misconception'][:80]}...")

    def test_curriculum_graph(self):
        print("\n--- 2. Testing Curriculum Graph ---")
        state = {
            "student_goal": "Master Python & Web Development",
            "weak_topics": ["Recursion", "Asyncio"],
            "available_hours_per_week": 8,
            "roadmap_draft": {},
            "validation_status": "",
            "final_roadmap": {}
        }
        res = curriculum_app.invoke(state)
        
        roadmap = res.get("final_roadmap") or res.get("roadmap_draft")
        self.assertIsNotNone(roadmap)
        self.assertIn("title", roadmap)
        print("[SUCCESS] Curriculum Graph produced valid roadmap.")
        print(f"Roadmap Title: {roadmap.get('title')}")

    def test_crag_graph(self):
        print("\n--- 3. Testing Corrective RAG (CRAG) Graph ---")
        state = {
            "question": "What is the difference between append and extend in Python?",
            "course_id": "python-101",
            "chat_history": [],
            "documents": [],
            "is_relevant": False,
            "web_search_needed": False,
            "final_answer": "",
            "hallucination_score": ""
        }
        res = crag_app.invoke(state)
        
        self.assertIn("final_answer", res)
        self.assertIn("hallucination_score", res)
        self.assertTrue(len(res["final_answer"]) > 0)
        print("[SUCCESS] CRAG Graph completed.")
        print(f"Hallucination Score: {res.get('hallucination_score')}")
        print(f"Web Search Used: {res.get('web_search_needed')}")

if __name__ == "__main__":
    unittest.main()
