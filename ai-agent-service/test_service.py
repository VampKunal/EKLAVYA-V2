import requests
import json

BASE_URL = "http://localhost:8000"

def test_health():
    print("\n--- 1. Testing Service Health ---")
    res = requests.get(f"{BASE_URL}/health")
    print(f"Status Code: {res.status_code}")
    print(f"Response: {res.json()}")

def test_quiz_remediation():
    print("\n--- 2. Testing Quiz Misconception Remediation Agent ---")
    payload = {
        "topic": "Python Data Structures",
        "questionText": "What does list.append([1, 2]) do?",
        "userAnswer": "It flattens the list and adds elements 1 and 2 individually",
        "correctAnswer": "It appends the inner list as a single nested element at the end of the list"
    }
    res = requests.post(f"{BASE_URL}/api/v1/quiz/remediate", json=payload)
    print(f"Status Code: {res.status_code}")
    print("Response payload:")
    print(json.dumps(res.json(), indent=2))

def test_crag():
    print("\n--- 3. Testing Corrective RAG (CRAG) Agent ---")
    payload = {
        "question": "What is the difference between append and extend in Python lists?",
        "courseId": "python-101",
        "chatHistory": [
            {"role": "user", "content": "I am working on python list methods."},
            {"role": "assistant", "content": "Sure! I can help you with list operations."}
        ]
    }
    res = requests.post(f"{BASE_URL}/api/v1/crag", json=payload)
    print(f"Status Code: {res.status_code}")
    print("Response payload:")
    print(json.dumps(res.json(), indent=2))

if __name__ == "__main__":
    try:
        test_health()
        test_quiz_remediation()
        test_crag()
    except Exception as e:
        print(f"Testing failed. Ensure FastAPI is running on port 8000: {e}")
