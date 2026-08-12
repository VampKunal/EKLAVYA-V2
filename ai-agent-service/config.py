import os
from pathlib import Path
from dotenv import load_dotenv

# 1. Load root .env.local first
root_env_local = Path(__file__).resolve().parent.parent / ".env.local"
if root_env_local.exists():
    load_dotenv(dotenv_path=root_env_local)

# 2. Load service specific .env
service_env = Path(__file__).resolve().parent / ".env"
if service_env.exists():
    load_dotenv(dotenv_path=service_env)

class Settings:
    GOOGLE_AI_API_KEY: str = (
        os.getenv("GOOGLE_GENERATIVE_AI_API_KEY") or 
        os.getenv("GOOGLE_AI_API_KEY") or 
        os.getenv("GEMINI_API_KEY") or ""
    )
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
    TAVILY_API_KEY: str = os.getenv("TAVILY_API_KEY", "")
    
    QDRANT_URL: str = os.getenv("QDRANT_URL", "http://localhost:6333")
    QDRANT_API_KEY: str = os.getenv("QDRANT_API_KEY", "")
    QDRANT_COLLECTION: str = os.getenv("QDRANT_COLLECTION", "eklavya_documents")
    
    UPSTASH_REDIS_REST_URL: str = os.getenv("UPSTASH_REDIS_REST_URL") or os.getenv("UPSTASH_REDIS_URL") or ""
    UPSTASH_REDIS_REST_TOKEN: str = os.getenv("UPSTASH_REDIS_REST_TOKEN") or os.getenv("UPSTASH_REDIS_TOKEN") or ""
    REDIS_URL: str = os.getenv("REDIS_URL", "")
    
    RABBITMQ_URL: str = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/")
    MONGODB_URI: str = os.getenv("MONGODB_URI", "mongodb://localhost:27017/eklavya")

settings = Settings()
