import asyncio
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from contextlib import asynccontextmanager

from services.redis_cache import redis_cache
from services.rabbitmq import rabbitmq_publisher
from services.langsmith_client import push_crag_eval_example, log_run_feedback
from graphs.crag_graph import crag_app
from graphs.quiz_remediation_graph import quiz_remediation_app
from graphs.curriculum_graph import curriculum_app
from graphs.study_session_graph import study_session_app
from graphs.essay_grader_graph import essay_grader_app
from worker import start_worker

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[FastAPI Service] Starting up...")
    await redis_cache.connect()
    await rabbitmq_publisher.connect()
    
    # Start background RabbitMQ ingestion worker inside the same process/container
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
    title="Eklavya AI — LangGraph & LangSmith Microservice",
    version="2.0.0",
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
    chatHistory: Optional[List[Dict[str, Any]]] = []
    userId: Optional[str] = "anonymous"

class QuizRemediationRequest(BaseModel):
    topic: str
    questionText: str
    userAnswer: str
    correctAnswer: str
    userId: Optional[str] = "anonymous"

class CurriculumRequest(BaseModel):
    studentGoal: str
    weakTopics: Optional[List[str]] = []
    availableHoursPerWeek: Optional[int] = 10
    userId: Optional[str] = "anonymous"

class StudySessionMessageRequest(BaseModel):
    threadId: str
    topic: Optional[str] = "General Computer Science"
    message: str
    userId: Optional[str] = "anonymous"

class EssayGradeRequest(BaseModel):
    question: str
    rubric: Optional[str] = "Evaluate accuracy, completeness, and clarity."
    essay: str
    userId: Optional[str] = "anonymous"

class PublishQuizAttemptRequest(BaseModel):
    userId: str
    courseId: str
    topic: Optional[str] = ""
    score: int
    questions: List[Dict[str, Any]]
    timeTaken: Optional[int] = 0

@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "Eklavya LangGraph & LangSmith Microservice",
        "graphs": ["CRAG", "QuizRemediation", "CurriculumRoadmap", "StatefulStudySession", "EssayGrader"]
    }

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
        "chat_history": req.chatHistory or [],
        "documents": [],
        "is_relevant": False,
        "web_search_needed": False,
        "final_answer": "",
        "hallucination_score": ""
    }
    
    try:
        config = {
            "tags": ["CRAG", f"course:{req.courseId}", f"user:{req.userId}"],
            "metadata": {"user_id": req.userId, "course_id": req.courseId}
        }
        final_state = await asyncio.to_thread(crag_app.invoke, initial_state, config=config)
        
        answer = final_state.get("final_answer", "")
        web_searched = final_state.get("web_search_needed", False)
        docs_used = len(final_state.get("documents", []))
        hallucination_score = final_state.get("hallucination_score", "PASSED")

        response_payload = {
            "answer": answer,
            "webSearchUsed": web_searched,
            "documentsUsed": docs_used,
            "hallucinationScore": hallucination_score
        }
        await redis_cache.set(cache_key, response_payload, ttl=1800)

        # Auto-populate LangSmith Dataset if high quality passed run
        if hallucination_score == "PASSED" and answer:
            asyncio.create_task(asyncio.to_thread(push_crag_eval_example, req.question, answer, docs_used))

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
        config = {
            "tags": ["QuizRemediation", f"topic:{req.topic}", f"user:{req.userId}"],
            "metadata": {"user_id": req.userId, "topic": req.topic}
        }
        final_state = await asyncio.to_thread(quiz_remediation_app.invoke, initial_state, config=config)
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
        config = {
            "tags": ["Curriculum", f"user:{req.userId}"],
            "metadata": {"user_id": req.userId}
        }
        final_state = await asyncio.to_thread(curriculum_app.invoke, initial_state, config=config)
        roadmap = final_state.get("final_roadmap") or final_state.get("roadmap_draft")
        return {"roadmap": roadmap}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Curriculum error: {str(e)}")

# Endpoint 4: Stateful Multi-turn Study Session Agent (MemorySaver Checkpointer)
@app.post("/api/v1/session/message")
async def send_session_message(req: StudySessionMessageRequest):
    thread_config = {"configurable": {"thread_id": req.threadId}}

    try:
        # Retrieve existing state or initialize
        current_state = study_session_app.get_state(thread_config)
        history = list(current_state.values.get("chat_history", [])) if current_state.values else []
        history.append({"role": "user", "content": req.message})

        input_state = {
            "session_id": req.threadId,
            "main_topic": req.topic,
            "chat_history": history,
            "topics_covered": current_state.values.get("topics_covered", []) if current_state.values else [],
            "comprehension_score": current_state.values.get("comprehension_score", 70) if current_state.values else 70,
            "latest_answer": "",
            "followup_question": ""
        }

        exec_config = {
            "configurable": {"thread_id": req.threadId},
            "tags": ["StatefulStudySession", f"thread:{req.threadId}", f"user:{req.userId}"],
            "metadata": {"user_id": req.userId, "thread_id": req.threadId}
        }

        final_state = await asyncio.to_thread(study_session_app.invoke, input_state, config=exec_config)
        
        # Append assistant answer to stored history
        updated_history = history + [{"role": "assistant", "content": final_state.get("latest_answer", "")}]
        study_session_app.update_state(thread_config, {"chat_history": updated_history})

        return {
            "threadId": req.threadId,
            "answer": final_state.get("latest_answer"),
            "followupQuestion": final_state.get("followup_question"),
            "comprehensionScore": final_state.get("comprehension_score"),
            "topicsCovered": final_state.get("topics_covered")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Study Session error: {str(e)}")

@app.get("/api/v1/session/{thread_id}/summary")
async def get_session_summary(thread_id: str):
    thread_config = {"configurable": {"thread_id": thread_id}}
    try:
        state = study_session_app.get_state(thread_config)
        if not state or not state.values:
            return {"threadId": thread_id, "status": "not_found", "message": "No active session found for this thread ID."}

        return {
            "threadId": thread_id,
            "topic": state.values.get("main_topic"),
            "messagesCount": len(state.values.get("chat_history", [])),
            "topicsCovered": state.values.get("topics_covered", []),
            "comprehensionScore": state.values.get("comprehension_score", 70)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching session summary: {str(e)}")

# Endpoint 5: Multi-Dimensional Essay & Long-Answer Grader Agent
@app.post("/api/v1/essay/grade")
async def grade_essay(req: EssayGradeRequest):
    initial_state = {
        "question": req.question,
        "rubric": req.rubric,
        "student_essay": req.essay,
        "accuracy_score": 0,
        "accuracy_feedback": "",
        "completeness_score": 0,
        "missing_points": [],
        "clarity_score": 0,
        "clarity_feedback": "",
        "final_report": {}
    }

    try:
        config = {
            "tags": ["EssayGrader", f"user:{req.userId}"],
            "metadata": {"user_id": req.userId, "question": req.question}
        }
        final_state = await asyncio.to_thread(essay_grader_app.invoke, initial_state, config=config)
        return {
            "dimensionScores": {
                "accuracy": final_state.get("accuracy_score"),
                "completeness": final_state.get("completeness_score"),
                "clarity": final_state.get("clarity_score")
            },
            "gradeReport": final_state.get("final_report")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Essay grading error: {str(e)}")

# Endpoint 6: Async Quiz Attempt Ingestion via RabbitMQ
@app.post("/api/v1/queue/quiz-attempt")
async def queue_quiz_attempt(req: PublishQuizAttemptRequest):
    payload = req.model_dump()
    await rabbitmq_publisher.publish("quiz_attempts_queue", payload)
    return {"status": "queued", "message": "Quiz attempt sent to RabbitMQ ingestion pipeline"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

