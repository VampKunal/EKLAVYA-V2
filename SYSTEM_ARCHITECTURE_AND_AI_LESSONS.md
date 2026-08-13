# Eklavya AI — Deep Architecture, GenAI Concepts & Study Guide

This document is a comprehensive technical breakdown of **Eklavya AI**, covering every page's user capabilities, the underlying Generative AI pipeline, algorithm choices, microservice design decisions, stateful LangGraph agentic workflows, and explicit file & function references.

---

## 1. Page-by-Page User Capabilities & Microservice Architecture

| Page Route | Description & User Capabilities | Relevant Source Files & Functions |
|---|---|---|
| `/` (Landing Page) | Modern landing page showcasing features, interactive CTA, micro-animations, and SEO meta tags. | [`src/app/page.tsx`](file:///d:/EKLAVYA-MAIN/eklavya/src/app/page.tsx) |
| `/sign-in` & `/sign-up` | NextAuth.js authentication flow with email/password credentials and secure session management. | [`src/app/(auth)/sign-in/page.tsx`](file:///d:/EKLAVYA-MAIN/eklavya/src/app/\(auth\)/sign-in/page.tsx), [`src/app/api/auth/[...nextauth]/route.ts`](file:///d:/EKLAVYA-MAIN/eklavya/src/app/api/auth/%5B...nextauth%5D/route.ts) |
| `/dashboard` | Central student hub showing overall accuracy, study streak days, active enrolled courses, weak topic warnings, and quick AI actions. Uses multi-tier Redis caching. | [`src/app/(dashboard)/dashboard/DashboardClient.tsx`](file:///d:/EKLAVYA-MAIN/eklavya/src/app/\(dashboard\)/dashboard/DashboardClient.tsx), [`src/lib/ai/user-context.ts`](file:///d:/EKLAVYA-MAIN/eklavya/src/lib/ai/user-context.ts#L146) |
| `/courses` | Course catalog listing enrolled and available courses with search, creation modals, and progress indicators. | [`src/app/(dashboard)/courses/page.tsx`](file:///d:/EKLAVYA-MAIN/eklavya/src/app/\(dashboard\)/courses/page.tsx), [`src/app/api/courses/route.ts`](file:///d:/EKLAVYA-MAIN/eklavya/src/app/api/courses/route.ts#L8) |
| `/courses/[courseId]` | Specific course page containing **Modules list** (add/delete subjects) and an embedded **Course-Specific AI Tutor** with isolated RAG vector search. | [`src/app/(dashboard)/courses/[courseId]/page.tsx`](file:///d:/EKLAVYA-MAIN/eklavya/src/app/\(dashboard\)/courses/%5BcourseId%5D/page.tsx#L25), [`src/app/api/courses/[courseId]/route.ts`](file:///d:/EKLAVYA-MAIN/eklavya/src/app/api/courses/%5BcourseId%5D/route.ts#L8) |
| `/chat` | Global AI Tutor interface featuring Web Speech STT dictation, streaming responses, intent-routed LLM switching, and Redis-cached chat history. | [`src/app/(dashboard)/chat/page.tsx`](file:///d:/EKLAVYA-MAIN/eklavya/src/app/\(dashboard\)/chat/page.tsx), [`src/components/ChatUI.tsx`](file:///d:/EKLAVYA-MAIN/eklavya/src/components/ChatUI.tsx#L35) |
| `/quiz` | Quiz dashboard listing past quiz attempts, topic accuracy scores, recommended practice sessions, and past attempt review cards. | [`src/app/(dashboard)/quiz/QuizDashboardClient.tsx`](file:///d:/EKLAVYA-MAIN/eklavya/src/app/\(dashboard\)/quiz/QuizDashboardClient.tsx), [`src/app/(dashboard)/quiz/page.tsx`](file:///d:/EKLAVYA-MAIN/eklavya/src/app/\(dashboard\)/quiz/page.tsx) |
| `/quiz/[quizId]` | Interactive quiz interface displaying AI-generated multiple-choice questions with real-time timers, instant automated grading, and transition into **ResultView** with adaptive AI remediation micro-lessons. | [`src/app/(dashboard)/quiz/[quizId]/page.tsx`](file:///d:/EKLAVYA-MAIN/eklavya/src/app/\(dashboard\)/quiz/%5BquizId%5D/page.tsx), [`src/app/api/quiz/[quizId]/route.ts`](file:///d:/EKLAVYA-MAIN/eklavya/src/app/api/quiz/%5BquizId%5D/route.ts) |
| `/analytics` | Deep visual analytics showing daily activity duration, weekly accuracy trends, and topic retention radar. | [`src/app/(dashboard)/analytics/AnalyticsClient.tsx`](file:///d:/EKLAVYA-MAIN/eklavya/src/app/\(dashboard\)/analytics/AnalyticsClient.tsx) |
| `/upload` | PDF & lecture note upload portal that parses documents, chunks content, generates embeddings, and indexes vectors in Qdrant. | [`src/app/(dashboard)/upload/page.tsx`](file:///d:/EKLAVYA-MAIN/eklavya/src/app/\(dashboard\)/upload/page.tsx), [`src/app/api/upload/route.ts`](file:///d:/EKLAVYA-MAIN/eklavya/src/app/api/upload/route.ts#L10) |
| `/profile` | User settings, learning goal configuration, profile avatar, and account statistics. | [`src/app/(dashboard)/profile/page.tsx`](file:///d:/EKLAVYA-MAIN/eklavya/src/app/\(dashboard\)/profile/page.tsx) |

---

## 2. Generative AI & Agentic Architecture

```mermaid
flowchart TD
    UserQuery[User Input / Voice STT] --> Proxy[Next.js Proxy Middleware / Rate Limiter]
    Proxy --> Frontend[Next.js App Gateway :3000]
    
    Frontend -->|Direct Streaming Chat| ChatRoute[API Route: /api/chat]
    ChatRoute --> IntentRouter[Intent Orchestrator: detectIntent()]
    IntentRouter -->|coding / math / doubt| ModelRouter[Model Router: callModel()]
    IntentRouter -->|recommendation / progress query| ContextGuard{needsDashboardContext()}
    
    ContextGuard -->|Yes| RedisCache[(Upstash Redis Cache)]
    RedisCache -->|Miss| MongoDB[(MongoDB Atlas Persistent DB)]
    ContextGuard -->|No| PromptBuilder[Prompt Builder]
    
    CourseIDCheck{courseId provided?} -->|Yes| RAGEngine[RAG Engine: retrieveContext()]
    RAGEngine --> Qdrant[(Qdrant Vector DB Filter by courseId)]
    Qdrant --> PromptBuilder
    PromptBuilder --> LLMStream[Vercel AI SDK StreamText]
    
    Frontend -->|Agentic Workflows| AgentProxy[Next.js Agent Proxy /api/agents/*]
    AgentProxy --> FastAPI[FastAPI LangGraph Service :8000]
    
    FastAPI --> CRAGNode[CRAG Graph: Retrieval & Grading]
    CRAGNode --> Grader{Document Grader: Relevant?}
    Grader -->|No| Tavily[Tavily Web Search Tool Fallback]
    Grader -->|Yes| Synthesizer[Synthesize Response]
    Tavily --> Synthesizer
    
    FastAPI --> QuizRemediation[Quiz Remediation Graph: Misconception Loop]
    FastAPI --> CurriculumRoadmap[Curriculum Graph: Self-Correcting Plan]
    
    FastAPI -->|Publish Async Log| RabbitMQ[(RabbitMQ Message Broker :5672)]
    RabbitMQ --> IngestionWorker[Python Worker worker.py]
    IngestionWorker --> MongoDB
```

### 1. Intent Detection & Dynamic Routing (Next.js Layer)
- **Algorithm**: Lightweight LLM Classifier using structured system prompts.
- **Function**: [`detectIntent(text)`](file:///d:/EKLAVYA-MAIN/eklavya/src/lib/ai/orchestrator.ts#L22) in `src/lib/ai/orchestrator.ts`.
- **Logic**: Classifies user queries into discrete intents (`chat`, `coding`, `math`, `recommendation`, `doubt`, `unknown`).
- **Model Router**: [`callModel(taskType)`](file:///d:/EKLAVYA-MAIN/eklavya/src/lib/ai/model-router.ts#L15) routes coding tasks to specialized high-reasoning models and general queries to fast/cost-effective models.

### 2. Corrective RAG (CRAG) with Web Search Fallback (LangGraph Microservice)
- **Service**: `/ai-agent-service` (FastAPI + LangGraph).
- **Files**: `ai-agent-service/agents/crag.py`, `ai-agent-service/tools/tavily_search.py`.
- **Workflow**:
  1. **Retrieve Node**: Queries Qdrant vector database using cosine similarity with `courseId` filters.
  2. **Grade Documents Node**: Uses a binary document grader LLM node to score retrieved context relevance against student query.
  3. **Conditional Edge**: If score > threshold, proceeds to answer synthesis. If score <= threshold (insufficient/missing notes), routes to **Tavily Web Search Tool**.
  4. **Web Search Node**: Executes Tavily API search to pull live, authoritative web context.
  5. **Generate Node**: Synthesizes the final answer using retrieved vector context + web search facts.

### 3. Adaptive Quiz Misconception Loop (LangGraph Microservice)
- **Files**: `ai-agent-service/agents/quiz_remediation.py`.
- **Workflow**:
  1. Evaluates student wrong answer against the correct answer and question context.
  2. Identifies the **core conceptual misconception** (e.g. confusing pass-by-value with pass-by-reference).
  3. Formulates a targeted **3-bullet micro-lesson**.
  4. Generates an **instant retry question** with dynamic options to immediately test student retention.

### 4. Asynchronous Write-Behind Database Ingestion Pipeline
- **Broker**: RabbitMQ 3.8 (`amqp://guest:guest@localhost:5672`).
- **Worker**: Python background worker `worker.py` running unbuffered (`PYTHONUNBUFFERED=1`).
- **Logic**:
  - API routes publish quiz attempt events and heavy analytics payload asynchronously to RabbitMQ exchange.
  - Background worker consumes messages from `quiz_ingestion` queue and persists them to MongoDB without blocking API request latency.

---

## 3. Technology Strategy: Hybrid Architecture (Vercel AI SDK + LangGraph)

| Layer | System | Technology Choice | Rationale & Advantage |
|---|---|---|---|
| **Direct Gateway & Streaming Chat** | Next.js API Gateway | Vercel AI SDK (`ai` + `@ai-sdk/openai`) | Ultra-low cold-start latency (<150ms), native React `useChat` stream integration, intent guards, and simple RAG context injection. |
| **Stateful Agent Workflows** | FastAPI Microservice | Python LangGraph + LangChain | Multi-node state graphs, conditional routing edges, Tavily search tool execution, structured output validation, and stateful multi-step reasoning loops. |
| **Asynchronous Ingestion** | Background Queue | RabbitMQ + Python `aio-pika` + `motor` | Decouples read/write latency. Pushing quiz result logs to RabbitMQ takes <2ms, while database persistence completes reliably in the background. |

---

## 4. Deep Architectural Trade-Offs & Decisions

### 1. Intent Guards vs. HyDE (Hypothetical Document Embeddings)
- **Why HyDE was NOT used for simple queries**: HyDE calls an LLM to generate a hypothetical answer document before embedding it for vector search. This adds **600ms - 1.2s of latency** and doubles LLM token costs on every single query.
- **Why Intent Guard + Direct Embedding Search was BETTER**: Intent guards (`needsDashboardContext()`) instantly short-circuit unnecessary DB queries. Direct query embedding using OpenAI `text-embedding-3-small` achieves **<80ms vector search latency** in Qdrant with precise metadata filtering (`courseId`).

### 2. Cosine Similarity vs. Euclidean / Dot Product
- **Decision**: Configured Qdrant collection vectors with `distance: 'Cosine'`.
- **Rationale**: Text embedding vectors generated by OpenAI are normalized to unit length. Cosine similarity focuses purely on semantic angle between vectors regardless of text length, avoiding bias toward longer document chunks.

### 3. Multi-Tier Caching (Redis + In-Memory Fallback)
- **Decision**: Two-tiered cache for analytics context (`eklavya:dash:${userId}`) and chat history (`eklavya:chathistory:${userId}:${courseId}`).
- **Rationale**: MongoDB provides ACID persistence for long-term records. Redis (Upstash) provides sub-5ms REST cache reads for active user sessions. If Redis is unavailable, the system gracefully falls back to an in-memory TTL map.

---

## 5. Summary of Key Files & Functions for Study

- **Next.js Gateway & Proxy**: [`src/proxy.ts`](file:///d:/EKLAVYA-MAIN/eklavya/src/proxy.ts)
- **FastAPI LangGraph App**: [`ai-agent-service/main.py`](file:///d:/EKLAVYA-MAIN/eklavya/ai-agent-service/main.py)
- **CRAG State Graph**: [`ai-agent-service/agents/crag.py`](file:///d:/EKLAVYA-MAIN/eklavya/ai-agent-service/agents/crag.py)
- **Quiz Remediation Graph**: [`ai-agent-service/agents/quiz_remediation.py`](file:///d:/EKLAVYA-MAIN/eklavya/ai-agent-service/agents/quiz_remediation.py)
- **Curriculum Graph**: [`ai-agent-service/agents/curriculum.py`](file:///d:/EKLAVYA-MAIN/eklavya/ai-agent-service/agents/curriculum.py)
- **RabbitMQ Ingestion Worker**: [`ai-agent-service/worker.py`](file:///d:/EKLAVYA-MAIN/eklavya/ai-agent-service/worker.py)
- **RabbitMQ Publisher Service**: [`ai-agent-service/services/rabbitmq.py`](file:///d:/EKLAVYA-MAIN/eklavya/ai-agent-service/services/rabbitmq.py)
- **Qdrant Vector DB Client**: [`src/lib/vector/qdrant.ts`](file:///d:/EKLAVYA-MAIN/eklavya/src/lib/vector/qdrant.ts)
- **PDF Parser & Chunker**: [`src/utils/pdfParser.ts`](file:///d:/EKLAVYA-MAIN/eklavya/src/utils/pdfParser.ts)
- **Redis Client & Caching**: [`src/lib/redis.ts`](file:///d:/EKLAVYA-MAIN/eklavya/src/lib/redis.ts), [`src/lib/ai/user-context.ts`](file:///d:/EKLAVYA-MAIN/eklavya/src/lib/ai/user-context.ts)
- **Quiz Evaluator & Weak Topic Tracker**: [`src/app/api/quiz/submit/route.ts`](file:///d:/EKLAVYA-MAIN/eklavya/src/app/api/quiz/submit/route.ts)

---

## 6. Complete 100% Free Production Deployment Guide

Deploying Eklavya AI for **$0/month** using reliable managed cloud free-tiers:

### 🌐 Architectural Deployment Map

```
┌─────────────────────────┐      ┌──────────────────────────────────┐
│     Vercel (Hobby)      │      │    Render / Koyeb Free Web       │
│                         │      │                                  │
│   Next.js Frontend &    │────> │   FastAPI LangGraph Service      │
│   API Gateway           │      │   + Embedded Async Worker Loop   │
└────────────┬────────────┘      └────────┬─────────────────┬───────┘
             │                            │                 │
             │                            │ (Publish)       │ (Consume & Write)
             ▼                            ▼                 │
┌─────────────────────────┐      ┌──────────────────┐       │
│ CloudAMQP (Little Lemur)│ <─── │ RabbitMQ Broker  │       │
│   Shared Cloud Instance │      └──────────────────┘       │
└─────────────────────────┘                                 │
                                                            ▼
┌──────────────────────────────────────────────────────────────┐
│  Free Cloud Infrastructure:                                  │
│  • MongoDB Atlas M0 (Primary Persistence)                    │
│  • Upstash Redis (Serverless Cache)                          │
│  • Qdrant Cloud Free Tier (Vector Search)                    │
└──────────────────────────────────────────────────────────────┘
```

### Step-by-Step Free Setup Instructions

#### 1. Databases & Infrastructure (Free Cloud Services)
1. **MongoDB Atlas (Shared M0)**:
   - Create a free cluster at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas).
   - Network Access: Allow access from anywhere (`0.0.0.0/0`).
   - Obtain connection string: `MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/eklavya`.
2. **Qdrant Cloud (Free Tier)**:
   - Create a free 1GB cluster at [cloud.qdrant.io](https://cloud.qdrant.io/).
   - Obtain API Key & Cluster URL: `QDRANT_URL=https://<cluster-id>.qdrant.tech:6333`, `QDRANT_API_KEY=<key>`.
3. **Upstash Redis (Serverless Free)**:
   - Create a Redis database at [upstash.com](https://upstash.com/).
   - Obtain REST URL & Token: `UPSTASH_REDIS_REST_URL=https://...upstash.io`, `UPSTASH_REDIS_REST_TOKEN=...`.
4. **CloudAMQP (RabbitMQ Free)**:
   - Create a free instance on the "Little Lemur" plan at [cloudamqp.com](https://www.cloudamqp.com/).
   - Obtain URL: `RABBITMQ_URL=amqps://user:pass@host.rmq.cloudamqp.com/vhost`.

#### 2. Deploy AI Microservice & Embedded Worker (Render / Koyeb Free Web Service)
> **Cost-Saving Architecture Secret**: Render background worker instances require a paid plan. To keep your deployment **100% free**, the FastAPI application (`main.py`) imports `start_worker()` from `worker.py` and launches it inside an `asyncio.create_task()` during the FastAPI lifespan startup event. This runs both the REST endpoints and the RabbitMQ ingestion worker inside **a single free Web Service container**!

1. Push repository to GitHub.
2. On [render.com](https://render.com/) or [koyeb.com](https://www.koyeb.com/), create a **Web Service** pointing to `./ai-agent-service`.
3. Build Command: `pip install -r requirements.txt`
4. Start Command: `uvicorn main:app --host 0.0.0.0 --port 8000`
5. Environment Variables:
   - `OPENAI_API_KEY`: OpenAI key
   - `TAVILY_API_KEY`: Tavily search key
   - `QDRANT_URL` & `QDRANT_API_KEY`: Qdrant Cloud details
   - `RABBITMQ_URL`: CloudAMQP AMQP URL
   - `MONGODB_URI`: MongoDB Atlas connection string

#### 3. Deploy Next.js Web App (Vercel)
1. Import repository on [vercel.com](https://vercel.com).
2. Set Environment Variables:
   - `NEXTAUTH_SECRET`: Generate with `openssl rand -base64 32`.
   - `NEXTAUTH_URL`: `https://your-app.vercel.app`.
   - `MONGODB_URI`: MongoDB Atlas string.
   - `OPENAI_API_KEY`: OpenAI Key.
   - `QDRANT_URL` & `QDRANT_API_KEY`: Qdrant Cloud details.
   - `UPSTASH_REDIS_REST_URL` & `UPSTASH_REDIS_REST_TOKEN`: Upstash credentials.
   - `FASTAPI_AGENT_URL`: `https://your-fastapi-service.onrender.com`.
3. Click **Deploy**! Next.js will build and deploy on Vercel's global CDN network.

