# Eklavya AI — Intelligent Learning Platform

Eklavya AI is a next-generation learning platform powered by artificial intelligence. It offers personalized courses, real-time AI doubt resolution via RAG (Retrieval-Augmented Generation), adaptive quizzes, and deep analytics to track student progress and mastery.

## Features

- **Adaptive AI Tutor:** An intelligent chat interface powered by multiple LLM models with context injection and intent orchestration.
- **RAG-based Document Understanding:** Upload PDFs and notes; the AI seamlessly retrieves relevant context using Vector Search (Qdrant).
- **Personalized Quizzes:** The system dynamically generates quizzes tailored to weak spots to reinforce retention.
- **Comprehensive Analytics:** Track streaks, mastery, accuracy trends, and weak topics through a beautiful dashboard.
- **Premium UI:** Glassmorphism, animations, dark mode, and seamless loading states with Next.js App Router.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Database:** MongoDB Atlas (Mongoose)
- **Authentication:** NextAuth.js
- **Styling:** Tailwind CSS + Radix UI Primitives
- **AI/LLM:** Vercel AI SDK, OpenAI, Anthropic, Google Generative AI
- **Vector DB:** Qdrant Cloud
- **Caching & Rate Limiting:** Redis (Upstash)

## Local Development Setup

### 1. Prerequisites

- Node.js (v18+)
- MongoDB Atlas cluster
- Upstash Redis instance
- Qdrant Cloud instance
- AI Provider API Keys (OpenAI, Gemini, Anthropic)

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Variables

Create a `.env.local` file in the root directory and add the following keys:

```env
# MongoDB Connection
MONGODB_URI="mongodb+srv://<user>:<password>@cluster.mongodb.net/eklavya?retryWrites=true&w=majority"

# NextAuth (Authentication)
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-a-secure-secret"

# AI Provider Keys
OPENAI_API_KEY="sk-..."
GOOGLE_AI_API_KEY="AI..."
ANTHROPIC_API_KEY="sk-ant-..."

# Qdrant (Vector Database)
QDRANT_URL="https://<cluster>.qdrant.tech"
QDRANT_API_KEY="..."

# Upstash Redis (Caching & Rate Limiting)
UPSTASH_REDIS_REST_URL="https://<endpoint>.upstash.io"
UPSTASH_REDIS_REST_TOKEN="..."
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to explore Eklavya AI.

## Caching Strategy (Redis)

Eklavya utilizes **Upstash Redis** for robust, cross-environment caching to optimize LLM interactions and reduce database hits.
The `UserDashboardContext` is cached natively via Upstash to provide rapid context injection for intent-aware queries without straining MongoDB or being constrained by memory limitations in serverless environments.

## Deployment

The application is optimized for deployment on Vercel. Be sure to configure all environment variables via the Vercel Dashboard prior to deploying.

---

Built with passion for transforming education.
