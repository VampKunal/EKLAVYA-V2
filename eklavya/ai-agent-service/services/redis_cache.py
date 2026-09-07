import json
import requests
from config import settings

class UpstashRedisCache:
    """Upstash Redis REST & URL Client supporting REST API and standard Redis URL connections."""
    def __init__(self):
        self.rest_url = settings.UPSTASH_REDIS_REST_URL.rstrip('/')
        self.rest_token = settings.UPSTASH_REDIS_REST_TOKEN
        self.redis_client = None

    async def connect(self):
        if self.rest_url and self.rest_token:
            print(f"[RedisCache] Configured with Upstash Redis REST endpoint: {self.rest_url[:30]}...")
            return

        if settings.REDIS_URL:
            try:
                import redis.asyncio as redis
                self.redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
                await self.redis_client.ping()
                print("[RedisCache] Connected to standard Redis URL successfully")
            except Exception as e:
                print(f"[RedisCache] Warning: Could not connect to Redis URL: {e}")
                self.redis_client = None

    async def get(self, key: str):
        if self.rest_url and self.rest_token:
            try:
                url = f"{self.rest_url}/get/{key}"
                headers = {"Authorization": f"Bearer {self.rest_token}"}
                res = requests.get(url, headers=headers, timeout=5)
                if res.status_code == 200:
                    data = res.json()
                    val = data.get("result")
                    return json.loads(val) if val else None
            except Exception as e:
                print(f"[RedisCache] Upstash REST GET error: {e}")
                return None

        if self.redis_client:
            try:
                val = await self.redis_client.get(key)
                return json.loads(val) if val else None
            except Exception as e:
                print(f"[RedisCache] Standard Redis GET error: {e}")

        return None

    async def set(self, key: str, value: dict, ttl: int = 3600):
        val_str = json.dumps(value)
        if self.rest_url and self.rest_token:
            try:
                url = f"{self.rest_url}/set/{key}/{val_str}?EX={ttl}"
                headers = {"Authorization": f"Bearer {self.rest_token}"}
                requests.post(url, headers=headers, timeout=5)
                return
            except Exception as e:
                print(f"[RedisCache] Upstash REST SET error: {e}")
                return

        if self.redis_client:
            try:
                await self.redis_client.set(key, val_str, ex=ttl)
            except Exception as e:
                print(f"[RedisCache] Standard Redis SET error: {e}")

redis_cache = UpstashRedisCache()
