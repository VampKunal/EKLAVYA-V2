+-# 🎓 Eklavya AI — Intelligent Learning Platform with LangGraph & Microservices

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![LangGraph](https://img.shields.io/badge/LangGraph-Python-blue?style=flat-square&logo=python)](https://python.langchain.com/docs/langgraph)
[![LangSmith](https://img.shields.io/badge/LangSmith-Observability-orange?style=flat-square&logo=langchain)](https://smith.langchain.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green?style=flat-square&logo=mongodb)](https://www.mongodb.com/)
[![Qdrant](https://img.shields.io/badge/Qdrant-VectorDB-red?style=flat-square&logo=qdrant)](https://qdrant.tech/)
[![Redis](https://img.shields.io/badge/Redis-Persistence-red?style=flat-square&logo=redis)](https://upstash.com/)
[![RabbitMQ](https://img.shields.io/badge/RabbitMQ-Broker-FF6600?style=flat-square&logo=rabbitmq)](https://www.rabbitmq.com/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker)](https://www.docker.com/)

> **Eklavya AI** is a production-grade, microservice-powered intelligent learning platform. It combines a Next.js App Router gateway (featuring a modern orange-themed UI design system) with an autonomous **FastAPI LangGraph Microservice** executing 5 specialized AI agent graphs: Hybrid Corrective RAG (CRAG) with local Cross-Encoder re-ranking, Adaptive Quiz Misconception Loops, Autonomous Curriculum Planning, Stateful Multi-Turn Study Sessions, and Multi-Dimensional Essay Grading — backed by Redis state persistence, RabbitMQ asynchronous database write-behind pipelines, LangSmith observability, and full Docker Compose orchestration.

---

## 🌟 Key Features & AI Agents

- **🤖 5 Specialized LangGraph Agents (`/ai-agent-service`)**: Independent FastAPI service running multi-node state graphs for complex agentic workflows:
  1. **🔍 Hybrid CRAG (Corrective RAG)**: Integrated local Cross-Encoder (`sentence-transformers`) document re-ranker with Smart-Bypass confidence logic, binary document grading, Tavily Web Search fallback, and hallucination scoring.
  2. **🔄 Adaptive Quiz Misconception Loop**: Diagnoses student wrong answers, identifies specific conceptual misconceptions, generates a 3-bullet micro-lesson, and generates live retry questions in real-time.
  3. **🗺️ Autonomous Curriculum Roadmap Agent**: Generates self-correcting 4-week personalized study plans that balance workload to prevent burnout.
  4. **💬 Stateful Multi-Turn Study Session Agent**: Interactive AI tutor maintaining persistent thread memory, tracking topics covered, calculating real-time comprehension scores, and supporting multi-tier state restoration.
  5. **📝 Multi-Dimensional Essay Grader**: Evaluates long-form student answers in parallel across Accuracy, Completeness (identifying missing key points), and Clarity with rubric feedback.
- **📊 LangSmith Telemetry & Observability**: Integrated evaluation tracing, run tags, automated dataset generation (`push_crag_eval_example`), and feedback logging.
- **⚡ Hybrid Smart-Bypass Reranking**: Utilizes `sentence-transformers` Cross-Encoder re-ranking with confidence score thresholds (>0.75) to bypass redundant LLM document evaluation calls, minimizing response latency and API cost.
- **🚀 RabbitMQ Write-Behind Ingestion Pipeline**: Asynchronously offloads heavy DB write operations (quiz attempt logging, study session persistence) to RabbitMQ queues consumed by a background Python worker (`worker.py`).
- **💾 Persistent State Checkpointing & Redis Multi-Tier Caching**: Multi-layer state restoration via LangGraph `MemorySaver` RAM checkpointer, Redis cache (`langgraph-checkpoint-redis`), and MongoDB persistent DB fallback.
- **🎨 Orange-Themed UI Overhaul**: Modern, polished Next.js interface with dark mode support, visual analytics dashboard, web speech dictation, micro-animations, and responsive glassmorphism aesthetic.
- **🐳 Full Docker Containerization**: Multi-container `docker-compose.yml` orchestrating Next.js, FastAPI Agent Service, Ingestion Worker, Redis, and RabbitMQ.

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    User([Student / User]) --> Frontend[Next.js App Gateway :3000]
    Frontend --> Proxy[src/proxy.ts Auth & Rate Limiter]
    
    Proxy -->|Streaming Chat| ChatRoute[Next.js API Route /api/chat]
    ChatRoute --> IntentRouter[Intent Router & Model Selector]
    
    Proxy -->|Agentic Workflows| AgentProxy[Next.js Agent Proxy /api/agents/*]
    AgentProxy --> FastAPI[FastAPI LangGraph Service :8000]
    
    FastAPI -->|Tracing & Datasets| LangSmith[LangSmith Telemetry & MLOps]
    
    FastAPI --> CRAGNode[1. Hybrid CRAG Graph]
    CRAGNode --> ReRanker[Cross-Encoder Re-Ranker: sentence-transformers]
    ReRanker --> SmartBypass{Score > 0.75?}
    SmartBypass -->|Yes| Synthesizer[Synthesize Response]
    SmartBypass -->|No| Grader{Doc Grader: Relevant?}
    Grader -->|No| Tavily[Tavily Web Search Tool Fallback]
    Grader -->|Yes| Synthesizer
    Tavily --> Synthesizer
    
    FastAPI --> RemediationNode[2. Adaptive Quiz Misconception Graph]
    FastAPI --> CurriculumNode[3. Curriculum Roadmap Graph]
    FastAPI --> StudySessionNode[4. Stateful Study Session Graph]
    FastAPI --> EssayGraderNode[5. Multi-Dimensional Essay Grader Graph]
    
    StudySessionNode <--> RedisCheckpointer[(Redis Cache & Checkpointer :6379)]
    
    FastAPI -->|Publish Async Log| RabbitMQ[(RabbitMQ Message Broker :5672)]
    RabbitMQ --> IngestionWorker[Python Worker worker.py]
    IngestionWorker --> MongoDB[(MongoDB Atlas Persistent DB)]
    
    Frontend <--> RedisCheckpointer
    CRAGNode <--> Qdrant[(Qdrant Vector DB)]
```

---

## 🛠️ Tech Stack & Microservices

| Service / Container | Tech Stack | Role & Purpose |
|---|---|---|
| **Web Frontend Gateway** | Next.js 14, React 18, Tailwind CSS (Orange Theme), NextAuth.js | UI components, Vercel AI SDK streaming chat, visual analytics, audio STT, and API gateway |
| **AI Agent Microservice** | FastAPI 0.110+, Python 3.11, LangGraph, LangChain, Pydantic v2 | Stateful multi-node AI graphs (CRAG, Quiz Misconception Loop, Curriculum Agent, Study Session, Essay Grader) |
| **Local Re-Ranker** | `sentence-transformers` (`ms-marco-MiniLM-L-6-v2`) | Local Cross-Encoder model for fast, accurate document score re-ranking in CRAG |
| **MLOps & Telemetry** | LangSmith Client API | Trace evaluation logging, agent run metadata tagging, automated dataset generation, and feedback metrics |
| **Ingestion Worker** | Python 3.11, `aio-pika`, `motor`, `pymongo` | Consumes RabbitMQ queues and asynchronously writes quiz results & study sessions to MongoDB |
| **Message Broker** | RabbitMQ 3.8 | Asynchronous write-behind queueing for quiz attempt logging & study session history |
| **State & Cache Tier** | Redis 7, Upstash Redis, `langgraph-checkpoint-redis` | Sub-5ms caching for CRAG, chat context, and persistent stateful thread checkpoints |
| **Vector DB** | Qdrant Cloud | Cosine similarity vector search with course-level metadata filters |
| **Primary Database** | MongoDB Atlas M0 | Persistent database for user profiles, courses, quiz attempts, and user progress |

---

## ⚡ Docker Quick Start

### 1. Configure Environment Variables
Copy `.env.example` to `.env.local` in the root directory, and verify `./ai-agent-service/.env`.

```bash
# Example essential variables in root .env.local / ai-agent-service/.env
OPENAI_API_KEY="your-openai-api-key"
GOOGLE_GENERATIVE_AI_API_KEY="your-gemini-api-key"
TAVILY_API_KEY="your-tavily-api-key"
LANGCHAIN_API_KEY="your-langsmith-api-key"
LANGCHAIN_TRACING_V2="true"
LANGCHAIN_PROJECT="eklavya-ai"
QDRANT_URL="http://localhost:6333"
RABBITMQ_URL="amqp://guest:guest@localhost:5672/"
MONGODB_URI="mongodb://localhost:27017/eklavya"
REDIS_URL="redis://localhost:6379"
```

### 2. Run Containerized Stack
```bash
docker-compose up --build
```

The stack will spin up:
- **Next.js Web UI**: `http://localhost:3000`
- **FastAPI LangGraph Docs**: `http://localhost:8000/docs`
- **RabbitMQ Management Dashboard**: `http://localhost:15672` (Login: `guest` / `guest`)
- **Redis Cache**: `localhost:6379`

---

## 🔗 LangGraph Agent API Endpoints

| Endpoint | Method | Input Payload | Output / Feature |
|---|---|---|---|
| `/api/v1/crag` | `POST` | `{ "question": "...", "courseId": "...", "userId": "..." }` | Hybrid CRAG with Cross-Encoder re-ranking, smart bypass, & Tavily web search fallback |
| `/api/v1/quiz/remediate` | `POST` | `{ "topic": "...", "questionText": "...", "userAnswer": "...", "correctAnswer": "..." }` | Misconception diagnosis, 3-bullet micro-lesson, & real-time retry question |
| `/api/v1/roadmap/generate` | `POST` | `{ "studentGoal": "...", "weakTopics": [...], "availableHoursPerWeek": 10 }` | Self-correcting 4-week personalized study roadmap |
| `/api/v1/session/message` | `POST` | `{ "threadId": "...", "topic": "...", "message": "...", "userId": "..." }` | Stateful multi-turn study session agent with state checkpointer & comprehension scoring |
| `/api/v1/session/{thread_id}/summary` | `GET` | — | Summary of stateful session history, topics covered, & comprehension score |
| `/api/v1/essay/grade` | `POST` | `{ "question": "...", "rubric": "...", "essay": "..." }` | Multi-dimensional essay evaluation across Accuracy, Completeness, & Clarity |
| `/api/v1/queue/quiz-attempt` | `POST` | `{ "userId": "...", "courseId": "...", "score": 80, ... }` | Asynchronously pushes quiz attempt payload to RabbitMQ ingestion pipeline |
| `/health` | `GET` | — | Microservice health check & active agent graph listing |

---

## 🚀 100% Free Production Deployment

You can deploy the complete Eklavya AI stack for **$0/month** using reliable free cloud services:

1. **Next.js Gateway**: Deploy on [Vercel](https://vercel.com) (Hobby Free Plan).
2. **FastAPI Agent Service + Embedded Ingestion Worker**: Deploy as a single free Web Service on [Render](https://render.com) or [Koyeb](https://koyeb.com). *(The RabbitMQ worker runs as an embedded `asyncio` task inside FastAPI startup lifespan to stay within single-service free limits)*.
3. **MongoDB**: Use [MongoDB Atlas M0 Free Tier](https://www.mongodb.com/cloud/atlas).
4. **Vector DB**: Use [Qdrant Cloud Free Tier](https://cloud.qdrant.io) (1GB Free).
5. **Cache & Persistence**: Use [Upstash Redis](https://upstash.com) (Serverless Free Tier).
6. **Message Broker**: Use [CloudAMQP](https://www.cloudamqp.com) (Little Lemur Free RabbitMQ).

---

## 📖 Deep Architecture & Study Guide

For an in-depth technical breakdown of every page's capabilities, Generative AI algorithms, trade-offs, and microservice mechanics, read:
👉 [**SYSTEM_ARCHITECTURE_AND_AI_LESSONS.md**](./SYSTEM_ARCHITECTURE_AND_AI_LESSONS.md)


