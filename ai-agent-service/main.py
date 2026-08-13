from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from contextlib import asynccontextmanager

from services.redis_cache import redis_cache
from services.rabbitmq import rabbitmq_publisher
from graphs.crag_graph import crag_app
from graphs.quiz_remediation_graph import quiz_remediation_app
from graphs.curriculum_graph import curriculum_app
from worker import start_worker

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[FastAPI Service] Starting up...")
    await redis_cache.connect()
    await rabbitmq_publisher.connect()
    
    # Start background RabbitMQ ingestion worker inside the same process/container
    # (Enables 100% free deployment on single Web Service providers like Render or Koyeb)
    worker_task = None
    try:
        worker_task = asyncio.create_task(start_worker())
        print("[FastAPI Service] Background RabbitMQ worker started successfully.")
    except Exception as e:
        print(f"[FastAPI Service] Could not start embedded worker: {e}")

    yield
    print("[FastAPI Service] Shutting down...")
    if worker_task:
        worker_task.cancel()

app = FastAPI(
    title="Eklavya AI — LangGraph Agent Microservice",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request Models
class CRAGRequest(BaseModel):
    question: str
    courseId: Optional[str] = ""

class QuizRemediationRequest(BaseModel):
    topic: str
    questionText: str
    userAnswer: str
    correctAnswer: str

class CurriculumRequest(BaseModel):
    studentGoal: str
    weakTopics: Optional[List[str]] = []
    availableHoursPerWeek: Optional[int] = 10

class PublishQuizAttemptRequest(BaseModel):
    userId: str
    courseId: str
    topic: Optional[str] = ""
    score: int
    questions: List[Dict[str, Any]]
    timeTaken: Optional[int] = 0

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "Eklavya LangGraph Microservice"}

# Endpoint 1: Corrective RAG (CRAG) Agent
@app.post("/api/v1/crag")
async def run_crag_agent(req: CRAGRequest):
    cache_key = f"crag:{req.courseId}:{req.question}"
    cached_res = await redis_cache.get(cache_key)
    if cached_res:
        print(f"[FastAPI] Returning Redis cached CRAG response for key: {cache_key}")
        return cached_res
        
    initial_state = {
        "question": req.question,
        "course_id": req.courseId,
        "documents": [],
        "is_relevant": False,
        "web_search_needed": False,
        "final_answer": ""
    }
    
    try:
        final_state = crag_app.invoke(initial_state)
        response_payload = {
            "answer": final_state.get("final_answer", ""),
            "webSearchUsed": final_state.get("web_search_needed", False),
            "documentsUsed": len(final_state.get("documents", []))
        }
        await redis_cache.set(cache_key, response_payload, ttl=1800)
        return response_payload
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CRAG execution error: {str(e)}")

# Endpoint 2: Adaptive Quiz Misconception Remediation Agent
@app.post("/api/v1/quiz/remediate")
async def run_quiz_remediation(req: QuizRemediationRequest):
    initial_state = {
        "topic": req.topic,
        "question_text": req.questionText,
        "user_answer": req.userAnswer,
        "correct_answer": req.correctAnswer,
        "misconception": "",
        "micro_lesson": "",
        "retry_question": {}
    }
    
    try:
        final_state = quiz_remediation_app.invoke(initial_state)
        return {
            "misconception": final_state.get("misconception"),
            "microLesson": final_state.get("micro_lesson"),
            "retryQuestion": final_state.get("retry_question")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Remediation error: {str(e)}")

# Endpoint 3: Curriculum Agent
@app.post("/api/v1/roadmap/generate")
async def run_curriculum_agent(req: CurriculumRequest):
    initial_state = {
        "student_goal": req.studentGoal,
        "weak_topics": req.weakTopics,
        "available_hours_per_week": req.availableHoursPerWeek,
        "roadmap_draft": {},
        "validation_status": "",
        "final_roadmap": {}
    }
    
    try:
        final_state = curriculum_app.invoke(initial_state)
        roadmap = final_state.get("final_roadmap") or final_state.get("roadmap_draft")
        return {"roadmap": roadmap}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Curriculum error: {str(e)}")

# Endpoint 4: Async Quiz Attempt Ingestion via RabbitMQ
@app.post("/api/v1/queue/quiz-attempt")
async def queue_quiz_attempt(req: PublishQuizAttemptRequest):
    payload = req.model_dump()
    await rabbitmq_publisher.publish("quiz_attempts_queue", payload)
    return {"status": "queued", "message": "Quiz attempt sent to RabbitMQ ingestion pipeline"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
