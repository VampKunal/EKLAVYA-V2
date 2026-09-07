import math
from typing import Optional, Dict, Any, List
from graphs.crag_graph import get_embeddings
from services.redis_cache import redis_cache

def cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    """Calculate cosine similarity between two float vectors."""
    if not vec1 or not vec2 or len(vec1) != len(vec2):
        return 0.0
    dot_product = sum(a * b for a, b in zip(vec1, vec2))
    norm_a = math.sqrt(sum(a * a for a in vec1))
    norm_b = math.sqrt(sum(b * b for b in vec2))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot_product / (norm_a * norm_b)

class SemanticCacheManager:
    def __init__(self, similarity_threshold: float = 0.88):
        self.threshold = similarity_threshold
        # Local fallback in-memory cache if Redis vector store isn't available
        self._memory_cache: List[Dict[str, Any]] = []

    async def get_cached_response(self, question: str, course_id: str = "") -> Optional[Dict[str, Any]]:
        """
        Computes question embedding and searches semantic cache for similar query.
        Returns cached response dict if similarity >= threshold, else None.
        """
        embeddings_model = get_embeddings()
        if not embeddings_model:
            return None

        try:
            query_vec = embeddings_model.embed_query(question)
        except Exception as e:
            print(f"[Semantic Cache] Query embedding error: {e}")
            return None

        # 1. Search in-memory semantic cache pool
        best_match = None
        highest_score = 0.0

        for entry in self._memory_cache:
            if entry.get("course_id") == course_id:
                score = cosine_similarity(query_vec, entry["vector"])
                if score > highest_score:
                    highest_score = score
                    best_match = entry

        if highest_score >= self.threshold and best_match:
            print(f"[Semantic Cache] HIT! Similarity: {highest_score:.4f} >= {self.threshold} for query: '{question}' (Matched: '{best_match['question']}')")
            res_payload = dict(best_match["payload"])
            res_payload["semanticCacheHit"] = True
            res_payload["matchedQuestion"] = best_match["question"]
            res_payload["similarityScore"] = round(highest_score, 4)
            return res_payload

        # 2. Search Redis list if available
        try:
            cached_entries = await redis_cache.get(f"semcache_entries:{course_id}")
            if cached_entries and isinstance(cached_entries, list):
                for entry in cached_entries:
                    score = cosine_similarity(query_vec, entry.get("vector", []))
                    if score > highest_score:
                        highest_score = score
                        best_match = entry
                
                if highest_score >= self.threshold and best_match:
                    print(f"[Semantic Cache Redis] HIT! Similarity: {highest_score:.4f} for query: '{question}'")
                    res_payload = dict(best_match["payload"])
                    res_payload["semanticCacheHit"] = True
                    res_payload["matchedQuestion"] = best_match.get("question", "")
                    res_payload["similarityScore"] = round(highest_score, 4)
                    return res_payload
        except Exception as redis_err:
            print(f"[Semantic Cache] Redis check warning: {redis_err}")

        print(f"[Semantic Cache] MISS! Highest score: {highest_score:.4f} < {self.threshold} for query: '{question}'")
        return None

    async def store_response(self, question: str, course_id: str, payload: Dict[str, Any]):
        """Caches question vector and payload for future semantic lookups."""
        embeddings_model = get_embeddings()
        if not embeddings_model:
            return

        try:
            query_vec = embeddings_model.embed_query(question)
            entry = {
                "question": question,
                "course_id": course_id,
                "vector": query_vec,
                "payload": payload
            }
            # Store in memory
            self._memory_cache.append(entry)
            if len(self._memory_cache) > 100:  # Keep pool capped
                self._memory_cache.pop(0)

            # Store in Redis
            try:
                existing = await redis_cache.get(f"semcache_entries:{course_id}") or []
                if isinstance(existing, list):
                    existing.append({"question": question, "vector": query_vec, "payload": payload})
                    if len(existing) > 50:
                        existing = existing[-50:]
                    await redis_cache.set(f"semcache_entries:{course_id}", existing, ttl=86400)
            except Exception as r_err:
                print(f"[Semantic Cache] Redis store warning: {r_err}")
        except Exception as e:
            print(f"[Semantic Cache] Store error: {e}")

semantic_cache_manager = SemanticCacheManager(similarity_threshold=0.85)
