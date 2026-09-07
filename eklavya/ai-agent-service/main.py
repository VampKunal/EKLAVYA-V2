import asyncio
import json
import time
from fastapi import FastAPI, HTTPException, BackgroundTasks, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from contextlib import asynccontextmanager

from prometheus_fastapi_instrumentator import Instrumentator
from prometheus_client import Counter, Histogram, Gauge

from services.redis_cache import redis_cache
from services.rabbitmq import rabbitmq_publisher
from services.langsmith_client import push_crag_eval_example, log_run_feedback
from services.guardrails import check_input_guardrails
from services.semantic_cache import semantic_cache_manager
from services.ingestion import ingest_pdf_document
from evaluation.ragas_eval import run_ragas_evaluation, RagasTestCase

from graphs.crag_graph import crag_app
from graphs.quiz_remediation_graph import quiz_remediation_app
from graphs.curriculum_graph import curriculum_app
from graphs.study_session_graph import study_session_app
from graphs.essay_grader_graph import essay_grader_app
from worker import start_worker

# --- Prometheus Custom Operational & Business Metrics ---
from prometheus_client import REGISTRY

def get_or_create_counter(name, documentation):
    if name in REGISTRY._names_to_collectors:
        return REGISTRY._names_to_collectors[name]
    return Counter(name, documentation)

def get_or_create_histogram(name, documentation, labelnames=()):
    if name in REGISTRY._names_to_collectors:
        return REGISTRY._names_to_collectors[name]
    return Histogram(name, documentation, labelnames=labelnames)

CRAG_HALLUCINATION_COUNTER = get_or_create_counter("crag_hallucinations_total", "Total hallucination warning flags raised by CRAG agent")
CRAG_WEB_SEARCH_COUNTER = get_or_create_counter("crag_web_searches_total", "Total times Tavily web search tool fallback was triggered")
CRAG_EXACT_CACHE_HIT_COUNTER = get_or_create_counter("crag_exact_cache_hits_total", "Total Redis exact query cache hits")
CRAG_SEMANTIC_CACHE_HIT_COUNTER = get_or_create_counter("crag_semantic_cache_hits_total", "Total semantic vector similarity cache hits")
GUARDRAIL_BLOCKED_COUNTER = get_or_create_counter("crag_guardrail_blocked_total", "Total adversarial prompt injection or toxic queries blocked")
AGENT_LATENCY_HISTOGRAM = get_or_create_histogram("agent_execution_latency_seconds", "Execution latency of AI agent graphs in seconds", labelnames=["agent_name"])

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
    title="Eklavya AI — LangGraph & Production LLMOps Microservice",
    version="2.5.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Instrument FastAPI with Prometheus metrics endpoint /metrics
Instrumentator().instrument(app).expose(app, endpoint="/metrics")

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

class FeedbackRequest(BaseModel):
    runId: str
    score: float
    comment: Optional[str] = ""
    userId: Optional[str] = "anonymous"

class RagasEvalRequest(BaseModel):
    testCases: List[RagasTestCase]

@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "Eklavya LangGraph & Production LLMOps Microservice",
        "version": "2.5.0",
        "features": [
            "Hybrid CRAG with Cross-Encoder",
            "LLM Security Guardrails",
            "Semantic Similarity Cache",
            "Prometheus & Grafana Observability",
            "RAGAS Offline Evaluation",
            "Server-Sent Events (SSE) Agent Streaming",
            "LangSmith Human Feedback Loop",
            "PDF Vector Ingestion Pipeline"
        ],
        "graphs": ["CRAG", "QuizRemediation", "CurriculumRoadmap", "StatefulStudySession", "EssayGrader"]
    }

# Endpoint 1: Corrective RAG (CRAG) Agent (Guardrails + Exact Cache + Semantic Cache + Prometheus Metrics)
@app.post("/api/v1/crag")
async def run_crag_agent(req: CRAGRequest):
    start_time = time.time()
    
    # 1. Security Guardrails Check (Prompt Injection & Harmful Intent Defense)
    guardrail_res = check_input_guardrails(req.question)
    if not guardrail_res.is_safe:
        GUARDRAIL_BLOCKED_COUNTER.inc()
        return {
            "answer": f"⚠️ Query Blocked by Safety Guardrails: {guardrail_res.reason}",
            "webSearchUsed": False,
            "documentsUsed": 0,
            "hallucinationScore": "GUARDRAIL_BLOCKED",
            "evalMethod": f"SECURITY_GUARDRAIL ({guardrail_res.violation_type})",
            "topRerankScore": 0.0,
            "guardrailBlocked": True,
            "guardrailReason": guardrail_res.reason
        }

    # 2. Check Exact Key Redis Cache
    cache_key = f"crag:{req.courseId}:{req.question}"
    cached_res = await redis_cache.get(cache_key)
    if cached_res:
        CRAG_EXACT_CACHE_HIT_COUNTER.inc()
        print(f"[FastAPI] Returning Redis exact cached CRAG response for key: {cache_key}")
        return cached_res

    # 3. Check Semantic Cache (Vector similarity lookup)
    sem_cached = await semantic_cache_manager.get_cached_response(req.question, req.courseId or "")
    if sem_cached:
        CRAG_SEMANTIC_CACHE_HIT_COUNTER.inc()
        return sem_cached

    # 4. Execute LangGraph CRAG Execution
    initial_state = {
        "question": req.question,
        "course_id": req.courseId,
        "chat_history": req.chatHistory or [],
        "documents": [],
        "raw_doc_scores": [],
        "top_rerank_score": 0.0,
        "eval_method": "",
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
        
        duration = time.time() - start_time
        AGENT_LATENCY_HISTOGRAM.labels(agent_name="CRAG").observe(duration)

        answer = final_state.get("final_answer", "")
        web_searched = final_state.get("web_search_needed", False)
        docs_used = len(final_state.get("documents", []))
        hallucination_score = final_state.get("hallucination_score", "PASSED")
        eval_method = final_state.get("eval_method", "UNKNOWN")
        top_score = round(final_state.get("top_rerank_score", 0.0), 4)

        if web_searched:
            CRAG_WEB_SEARCH_COUNTER.inc()
        if hallucination_score != "PASSED":
            CRAG_HALLUCINATION_COUNTER.inc()

        response_payload = {
            "answer": answer,
            "webSearchUsed": web_searched,
            "documentsUsed": docs_used,
            "hallucinationScore": hallucination_score,
            "evalMethod": eval_method,
            "topRerankScore": top_score,
            "executionTimeMs": round(duration * 1000, 2)
        }

        # Cache exact key in Redis (TTL: 30 minutes)
        await redis_cache.set(cache_key, response_payload, ttl=1800)

        # Store in Semantic Cache
        await semantic_cache_manager.store_response(req.question, req.courseId or "", response_payload)

        # Auto-populate LangSmith Dataset if high quality passed run
        if hallucination_score == "PASSED" and answer:
            asyncio.create_task(asyncio.to_thread(push_crag_eval_example, req.question, answer, docs_used))

        return response_payload
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CRAG execution error: {str(e)}")

# Endpoint 2: Server-Sent Events (SSE) Token Streaming CRAG Endpoint
@app.post("/api/v1/crag/stream")
async def stream_crag_agent(req: CRAGRequest):
    # Security Guardrails check
    guardrail_res = check_input_guardrails(req.question)
    if not guardrail_res.is_safe:
        GUARDRAIL_BLOCKED_COUNTER.inc()
        async def guardrail_stream():
            yield f"data: {json.dumps({'error': True, 'chunk': f'⚠️ Blocked by Guardrails: {guardrail_res.reason}'})}\n\n"
            yield "data: [DONE]\n\n"
        return StreamingResponse(guardrail_stream(), media_type="text/event-stream")

    initial_state = {
        "question": req.question,
        "course_id": req.courseId,
        "chat_history": req.chatHistory or [],
        "documents": [],
        "raw_doc_scores": [],
        "top_rerank_score": 0.0,
        "eval_method": "",
        "is_relevant": False,
        "web_search_needed": False,
        "final_answer": "",
        "hallucination_score": ""
    }

    config = {
        "tags": ["CRAG_Stream", f"course:{req.courseId}", f"user:{req.userId}"],
        "metadata": {"user_id": req.userId, "course_id": req.courseId}
    }

    async def event_generator():
        start_t = time.time()
        try:
            # Stream events from LangGraph workflow
            final_ans = ""
            for event in crag_app.stream(initial_state, config=config):
                for node_name, state_chunk in event.items():
                    if node_name == "generate" and "final_answer" in state_chunk:
                        final_ans = state_chunk["final_answer"]
                        yield f"data: {json.dumps({'node': node_name, 'chunk': final_ans})}\n\n"
                    elif "documents" in state_chunk and node_name in ["retrieve", "rerank"]:
                        yield f"data: {json.dumps({'node': node_name, 'doc_count': len(state_chunk.get('documents', []))})}\n\n"
            
            dur = time.time() - start_t
            AGENT_LATENCY_HISTOGRAM.labels(agent_name="CRAG_Stream").observe(dur)
            yield f"data: {json.dumps({'done': True, 'final_answer': final_ans})}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as err:
            yield f"data: {json.dumps({'error': True, 'message': str(err)})}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

# Endpoint 3: LangSmith Human Feedback Endpoint
@app.post("/api/v1/feedback")
async def submit_user_feedback(req: FeedbackRequest):
    try:
        # 1. Log to LangSmith run telemetry
        log_run_feedback(req.runId, req.score, req.comment)
        
        # 2. Store in MongoDB for feedback analytics
        try:
            from motor.motor_asyncio import AsyncIOMotorClient
            from config import settings
            mongo_client = AsyncIOMotorClient(settings.MONGODB_URI)
            db = mongo_client.get_default_database()
            await db["agent_feedback"].insert_one({
                "runId": req.runId,
                "score": req.score,
                "comment": req.comment,
                "userId": req.userId,
                "createdAt": time.time()
            })
        except Exception as db_err:
            print(f"[Feedback API] Mongo log warning: {db_err}")

        return {"status": "success", "message": f"Feedback logged for run {req.runId}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Feedback logging error: {str(e)}")

# Endpoint 4: RAGAS Offline Quantitative Evaluation Endpoint
@app.post("/api/v1/eval/ragas")
async def run_ragas_eval_endpoint(req: RagasEvalRequest):
    try:
        report = run_ragas_evaluation(req.testCases)
        return report.model_dump()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"RAGAS evaluation failed: {str(e)}")

# Endpoint 5: PDF Ingestion & Vector Embedding Pipeline Endpoint
@app.post("/api/v1/ingest/pdf")
async def ingest_pdf_file(file: UploadFile = File(...), courseId: str = Form(...)):
    try:
        contents = await file.read()
        filename = file.filename or "uploaded.pdf"
        res = ingest_pdf_document(contents, course_id=courseId, filename=filename)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF Ingestion error: {str(e)}")

# Endpoint 6: Adaptive Quiz Misconception Remediation Agent
@app.post("/api/v1/quiz/remediate")
async def run_quiz_remediation(req: QuizRemediationRequest):
    start_t = time.time()
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
        AGENT_LATENCY_HISTOGRAM.labels(agent_name="QuizRemediation").observe(time.time() - start_t)
        return {
            "misconception": final_state.get("misconception"),
            "microLesson": final_state.get("micro_lesson"),
            "retryQuestion": final_state.get("retry_question")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Remediation error: {str(e)}")

# Endpoint 7: Curriculum Agent
@app.post("/api/v1/roadmap/generate")
async def run_curriculum_agent(req: CurriculumRequest):
    start_t = time.time()
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
        AGENT_LATENCY_HISTOGRAM.labels(agent_name="Curriculum").observe(time.time() - start_t)
        roadmap = final_state.get("final_roadmap") or final_state.get("roadmap_draft")
        return {"roadmap": roadmap}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Curriculum error: {str(e)}")

async def get_or_restore_session_state(thread_id: str) -> dict:
    thread_config = {"configurable": {"thread_id": thread_id}}
    state = study_session_app.get_state(thread_config)
    if state and state.values:
        return state.values
    
    # 1. Check Redis Cache
    cached = await redis_cache.get(f"session:{thread_id}")
    if cached and isinstance(cached, dict):
        study_session_app.update_state(thread_config, {
            "main_topic": cached.get("main_topic", "General"),
            "chat_history": cached.get("chat_history", []),
            "topics_covered": cached.get("topics_covered", []),
            "comprehension_score": cached.get("comprehension_score", 70)
        })
        return cached

    # 2. Check MongoDB Fallback
    try:
        from motor.motor_asyncio import AsyncIOMotorClient
        from config import settings
        mongo_client = AsyncIOMotorClient(settings.MONGODB_URI)
        try:
            db = mongo_client.get_default_database()
        except Exception:
            db = mongo_client.get_database("eklavya")
            
        session_doc = await db["studysessions"].find_one({"threadId": thread_id})
        if session_doc:
            session_doc.pop("_id", None)
            study_session_app.update_state(thread_config, {
                "main_topic": session_doc.get("main_topic", "General"),
                "chat_history": session_doc.get("chat_history", []),
                "topics_covered": session_doc.get("topics_covered", []),
                "comprehension_score": session_doc.get("comprehension_score", 70)
            })
            await redis_cache.set(f"session:{thread_id}", session_doc, ttl=86400)
            return session_doc
    except Exception as e:
        print(f"[FastAPI] MongoDB state restoration fallback skipped: {e}")

    return {}

# Endpoint 8: Stateful Multi-turn Study Session Agent
@app.post("/api/v1/session/message")
async def send_session_message(req: StudySessionMessageRequest):
    start_t = time.time()
    thread_config = {"configurable": {"thread_id": req.threadId}}

    try:
        session_values = await get_or_restore_session_state(req.threadId)
        history = list(session_values.get("chat_history", []))
        history.append({"role": "user", "content": req.message})

        input_state = {
            "session_id": req.threadId,
            "main_topic": req.topic or session_values.get("main_topic", "General Computer Science"),
            "chat_history": history,
            "topics_covered": session_values.get("topics_covered", []),
            "comprehension_score": session_values.get("comprehension_score", 70),
            "latest_answer": "",
            "followup_question": ""
        }

        exec_config = {
            "configurable": {"thread_id": req.threadId},
            "tags": ["StatefulStudySession", f"thread:{req.threadId}", f"user:{req.userId}"],
            "metadata": {"user_id": req.userId, "thread_id": req.threadId}
        }

        final_state = await asyncio.to_thread(study_session_app.invoke, input_state, config=exec_config)
        AGENT_LATENCY_HISTOGRAM.labels(agent_name="StatefulStudySession").observe(time.time() - start_t)
        
        latest_ans = final_state.get("latest_answer", "")
        followup_q = final_state.get("followup_question", "")
        topics_cov = final_state.get("topics_covered", [])
        score = final_state.get("comprehension_score", 70)

        updated_history = history + [{"role": "assistant", "content": latest_ans}]
        
        study_session_app.update_state(thread_config, {
            "chat_history": updated_history,
            "topics_covered": topics_cov,
            "comprehension_score": score,
            "main_topic": req.topic
        })

        session_payload = {
            "threadId": req.threadId,
            "userId": req.userId,
            "main_topic": req.topic,
            "chat_history": updated_history,
            "topics_covered": topics_cov,
            "comprehension_score": score,
            "latest_answer": latest_ans,
            "followup_question": followup_q
        }

        await redis_cache.set(f"session:{req.threadId}", session_payload, ttl=86400)
        await rabbitmq_publisher.publish("study_sessions_queue", session_payload)

        return {
            "threadId": req.threadId,
            "answer": latest_ans,
            "followupQuestion": followup_q,
            "comprehensionScore": score,
            "topicsCovered": topics_cov
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Study Session error: {str(e)}")

@app.get("/api/v1/session/{thread_id}/summary")
async def get_session_summary(thread_id: str):
    try:
        session_values = await get_or_restore_session_state(thread_id)
        if not session_values:
            return {"threadId": thread_id, "status": "not_found", "message": "No active session found for this thread ID."}

        return {
            "threadId": thread_id,
            "topic": session_values.get("main_topic") or session_values.get("topic"),
            "messagesCount": len(session_values.get("chat_history", [])),
            "topicsCovered": session_values.get("topics_covered", []),
            "comprehensionScore": session_values.get("comprehension_score", 70)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching session summary: {str(e)}")

# Endpoint 9: Multi-Dimensional Essay & Long-Answer Grader Agent
@app.post("/api/v1/essay/grade")
async def grade_essay(req: EssayGradeRequest):
    start_t = time.time()
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
        AGENT_LATENCY_HISTOGRAM.labels(agent_name="EssayGrader").observe(time.time() - start_t)
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

# Endpoint 10: Async Quiz Attempt Ingestion via RabbitMQ
@app.post("/api/v1/queue/quiz-attempt")
async def queue_quiz_attempt(req: PublishQuizAttemptRequest):
    payload = req.model_dump()
    await rabbitmq_publisher.publish("quiz_attempts_queue", payload)
    return {"status": "queued", "message": "Quiz attempt sent to RabbitMQ ingestion pipeline"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
