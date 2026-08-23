import math
from typing import List, TypedDict, Optional
from pydantic import BaseModel, Field
from langgraph.graph import StateGraph, END
from tavily import TavilyClient
from config import settings

_llm_instance = None
_embeddings_instance = None
_cross_encoder_instance = None


def get_llm():
    """Return cached singleton LLM instance."""
    global _llm_instance
    if _llm_instance is not None:
        return _llm_instance

    if settings.OPENROUTER_API_KEY:
        try:
            from langchain_openai import ChatOpenAI
            _llm_instance = ChatOpenAI(
                model="google/gemini-2.5-flash",
                openai_api_key=settings.OPENROUTER_API_KEY,
                openai_api_base="https://openrouter.ai/api/v1",
                temperature=0.1,
                max_tokens=1000
            )
            return _llm_instance
        except Exception as e:
            print(f"[CRAG Graph] OpenRouter init warning: {e}")

    if settings.OPENAI_API_KEY:
        try:
            from langchain_openai import ChatOpenAI
            _llm_instance = ChatOpenAI(model="gpt-4o-mini", api_key=settings.OPENAI_API_KEY, temperature=0.1)
            return _llm_instance
        except Exception as e:
            print(f"[CRAG Graph] OpenAI init warning: {e}")

    if settings.GOOGLE_AI_API_KEY:
        try:
            from langchain_google_genai import ChatGoogleGenerativeAI
            _llm_instance = ChatGoogleGenerativeAI(
                model="gemini-3.6-flash",
                google_api_key=settings.GOOGLE_AI_API_KEY,
                temperature=0.1
            )
            return _llm_instance
        except Exception as e:
            print(f"[CRAG Graph] Google GenAI init warning: {e}")

    from langchain_openai import ChatOpenAI
    _llm_instance = ChatOpenAI(model="gpt-4o-mini", api_key=settings.OPENAI_API_KEY, temperature=0.1)
    return _llm_instance


def get_embeddings():
    """Return cached singleton embeddings model."""
    global _embeddings_instance
    if _embeddings_instance is not None:
        return _embeddings_instance

    if settings.OPENAI_API_KEY:
        try:
            from langchain_openai import OpenAIEmbeddings
            _embeddings_instance = OpenAIEmbeddings(openai_api_key=settings.OPENAI_API_KEY)
            return _embeddings_instance
        except Exception as e:
            print(f"[CRAG Graph] OpenAI Embeddings warning: {e}")

    if settings.GOOGLE_AI_API_KEY:
        try:
            from langchain_google_genai import GoogleGenerativeAIEmbeddings
            _embeddings_instance = GoogleGenerativeAIEmbeddings(
                model="models/embedding-001",
                google_api_key=settings.GOOGLE_AI_API_KEY
            )
            return _embeddings_instance
        except Exception as e:
            print(f"[CRAG Graph] Google Embeddings warning: {e}")

    return None


def get_cross_encoder():
    """Return cached singleton CrossEncoder model."""
    global _cross_encoder_instance
    if _cross_encoder_instance is not None:
        return _cross_encoder_instance

    try:
        from sentence_transformers import CrossEncoder
        _cross_encoder_instance = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")
        print("[CRAG Graph] Successfully loaded CrossEncoder model: 'cross-encoder/ms-marco-MiniLM-L-6-v2'")
        return _cross_encoder_instance
    except Exception as e:
        print(f"[CRAG Graph] CrossEncoder init warning/skipped ({e}). Falling back to similarity scores.")
        return None


def sigmoid(x: float) -> float:
    """Map raw CrossEncoder logit scores to standard 0.0 - 1.0 probability range."""
    return 1.0 / (1.0 + math.exp(-x))


def extract_text(content) -> str:
    """Safely extracts string content from LLM response (handles string, dicts, and list blocks)."""
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        parts = []
        for block in content:
            if isinstance(block, dict) and block.get("type") == "text":
                parts.append(block.get("text", ""))
            elif isinstance(block, str):
                parts.append(block)
        return "".join(parts).strip()
    return str(content).strip()


class DocumentRelevanceSchema(BaseModel):
    is_relevant: bool = Field(description="True if documents contain sufficient relevant context to answer the question, False otherwise.")
    reason: Optional[str] = Field(default="", description="Brief rationale for the relevance score")


class HallucinationEvaluationSchema(BaseModel):
    is_grounded: bool = Field(description="True if the generated answer is grounded in retrieved context, False if fabricated.")
    score: str = Field(description="PASSED or FAILED")


# State Schema
class CRAGState(TypedDict):
    question: str
    course_id: str
    chat_history: Optional[List[dict]]
    documents: List[str]
    raw_doc_scores: Optional[List[float]]
    top_rerank_score: Optional[float]
    eval_method: Optional[str]
    is_relevant: bool
    web_search_needed: bool
    final_answer: str
    hallucination_score: str


# Node 1: Vector Search Retrieval from Qdrant using Embeddings (Broader Pool: limit=10)
def retrieve_node(state: CRAGState) -> dict:
    question = state["question"]
    course_id = state.get("course_id", "")
    
    print(f"[CRAG Graph] Vector similarity search for course: '{course_id}', query: '{question}'")
    docs = []
    scores = []
    
    try:
        from qdrant_client import QdrantClient
        client = QdrantClient(url=settings.QDRANT_URL, api_key=settings.QDRANT_API_KEY if settings.QDRANT_API_KEY else None)
        
        # Build filter if course_id provided
        filter_params = None
        if course_id:
            from qdrant_client.http import models as rest_models
            filter_params = rest_models.Filter(
                must=[
                    rest_models.FieldCondition(
                        key="courseId",
                        match=rest_models.MatchValue(value=course_id)
                    )
                ]
            )
        
        embeddings = get_embeddings()
        if embeddings:
            try:
                query_vector = embeddings.embed_query(question)
                search_result = client.search(
                    collection_name=settings.QDRANT_COLLECTION,
                    query_vector=query_vector,
                    query_filter=filter_params,
                    limit=10  # Broad candidate pool for reranker
                )
                docs = [p.payload.get("text", "") for p in search_result if p.payload and "text" in p.payload]
                scores = [float(p.score) if hasattr(p, "score") and p.score is not None else 0.5 for p in search_result if p.payload and "text" in p.payload]
            except Exception as emb_err:
                print(f"[CRAG Graph] Embedding query failed: {emb_err}, falling back to Qdrant payload scroll.")
                search_result = client.scroll(
                    collection_name=settings.QDRANT_COLLECTION,
                    scroll_filter=filter_params,
                    limit=10
                )
                points, _ = search_result
                docs = [p.payload.get("text", "") for p in points if p.payload and "text" in p.payload]
                scores = [0.5] * len(docs)
        else:
            # Fallback to payload scroll if embeddings unavailable
            search_result = client.scroll(
                collection_name=settings.QDRANT_COLLECTION,
                scroll_filter=filter_params,
                limit=10
            )
            points, _ = search_result
            docs = [p.payload.get("text", "") for p in points if p.payload and "text" in p.payload]
            scores = [0.5] * len(docs)
    except Exception as e:
        print(f"[CRAG Graph] Vector retrieval error: {e}")
        docs = []
        scores = []

    return {"documents": docs, "raw_doc_scores": scores}


# Node 2: Cross-Encoder Re-ranking Node
def rerank_node(state: CRAGState) -> dict:
    question = state["question"]
    documents = state.get("documents", [])
    raw_scores = state.get("raw_doc_scores", [])
    
    if not documents:
        return {"documents": [], "top_rerank_score": 0.0}
        
    cross_encoder = get_cross_encoder()
    scored_docs = []
    
    if cross_encoder:
        try:
            pairs = [[question, doc] for doc in documents]
            logits = cross_encoder.predict(pairs)
            processed_scores = [sigmoid(float(s)) for s in logits]
            scored_docs = list(zip(documents, processed_scores))
            max_s = max(processed_scores) if processed_scores else 0.0
            print(f"[CRAG Graph] CrossEncoder reranked {len(documents)} docs. Max score: {max_s:.4f}")
        except Exception as ce_err:
            print(f"[CRAG Graph] CrossEncoder execution error: {ce_err}, falling back to vector scores.")
            scored_docs = list(zip(documents, raw_scores if raw_scores else [0.5]*len(documents)))
    else:
        scored_docs = list(zip(documents, raw_scores if raw_scores else [0.5]*len(documents)))
        
    # Sort docs descending by score
    scored_docs.sort(key=lambda x: x[1], reverse=True)
    
    # Pick Top 4 re-ranked documents
    top_4_docs = [doc for doc, score in scored_docs[:4]]
    top_score = scored_docs[0][1] if scored_docs else 0.0
    
    return {
        "documents": top_4_docs,
        "top_rerank_score": top_score
    }


# Node 3: Option 2 Hybrid Smart-Bypass Document Relevance Grader
def grade_documents_node(state: CRAGState) -> dict:
    question = state["question"]
    documents = state.get("documents", [])
    top_score = state.get("top_rerank_score", 0.0)
    
    if not documents:
        return {
            "is_relevant": False,
            "web_search_needed": True,
            "eval_method": "NO_DOCUMENTS"
        }
        
    # Smart Bypass Rule 1: High Confidence Match (>= 0.70)
    if top_score >= 0.70:
        print(f"[CRAG Graph] High confidence rerank score ({top_score:.4f} >= 0.70). Smart Bypass: RELEVANT (Bypassing LLM Eval).")
        return {
            "is_relevant": True,
            "web_search_needed": False,
            "eval_method": f"CROSS_ENCODER_HIGH_CONFIDENCE_BYPASS (Score: {top_score:.2f})"
        }
        
    # Smart Bypass Rule 2: Low Confidence Miss (< 0.30)
    if top_score < 0.30:
        print(f"[CRAG Graph] Low confidence rerank score ({top_score:.4f} < 0.30). Smart Bypass: IRRELEVANT (Triggering Web Search, Bypassing LLM Eval).")
        return {
            "is_relevant": False,
            "web_search_needed": True,
            "eval_method": f"CROSS_ENCODER_LOW_CONFIDENCE_BYPASS (Score: {top_score:.2f})"
        }
        
    # Smart Bypass Rule 3: Ambiguous Zone (0.30 <= top_score < 0.70) -> Fallback to LLM Evaluator
    print(f"[CRAG Graph] Ambiguous rerank score ({top_score:.4f}). Routing to LLM Relevance Evaluator...")
    llm = get_llm()
    context_str = "\n\n".join(documents)
    
    prompt = f"""You are a strict document relevance grader. Determine if the following retrieved context contains sufficient, relevant information to accurately answer the student's question.

Question: {question}

Documents:
{context_str}"""

    try:
        if hasattr(llm, "with_structured_output"):
            structured_llm = llm.with_structured_output(DocumentRelevanceSchema)
            res_obj = structured_llm.invoke(prompt)
            is_rel = res_obj.is_relevant
        else:
            res = llm.invoke(prompt + "\n\nRespond with EXACTLY 'YES' if relevant or 'NO' if irrelevant/insufficient.")
            text = res.content.strip().upper()
            is_rel = "YES" in text
        return {
            "is_relevant": is_rel,
            "web_search_needed": not is_rel,
            "eval_method": f"LLM_EVALUATOR_AMBIGUOUS_ZONE (Score: {top_score:.2f})"
        }
    except Exception as e:
        print(f"[CRAG Graph] LLM Grading error: {e}")
        return {
            "is_relevant": False,
            "web_search_needed": True,
            "eval_method": "LLM_EVALUATION_ERROR"
        }


# Node 4: Tavily Web Search Tool Fallback
def web_search_node(state: CRAGState) -> dict:
    question = state["question"]
    documents = state.get("documents", [])
    
    print(f"[CRAG Graph] Executing Web Search fallback for query: {question}")
    
    try:
        if settings.TAVILY_API_KEY:
            tavily = TavilyClient(api_key=settings.TAVILY_API_KEY)
            search_response = tavily.search(query=question, max_results=3)
            web_results = [r.get("content", "") for r in search_response.get("results", [])]
            documents.extend(web_results)
        else:
            print("[CRAG Graph] Tavily API key missing, skipping web search")
    except Exception as e:
        print(f"[CRAG Graph] Web search error: {e}")

    return {"documents": documents}


# Node 5: Synthesis & Generation
def generate_node(state: CRAGState) -> dict:
    question = state["question"]
    documents = state.get("documents", [])
    web_searched = state.get("web_search_needed", False)
    chat_history = state.get("chat_history", [])
    
    llm = get_llm()
    context_str = "\n\n---\n\n".join(documents) if documents else "No external context found."
    
    history_str = ""
    if chat_history:
        formatted_turns = [f"{msg.get('role', 'user')}: {msg.get('content', '')}" for msg in chat_history[-4:]]
        history_str = "Recent Conversation History:\n" + "\n".join(formatted_turns) + "\n\n"
    
    prompt = f"""You are Eklavya AI, an expert AI tutor. Answer the student's question clearly and concisely.
{"Note: Supplemental information was retrieved via external search because course notes were incomplete." if web_searched else "Base your explanation primarily on the course materials provided."}

{history_str}Student Question: {question}

Retrieved Context:
{context_str}

Answer:"""

    try:
        res = llm.invoke(prompt)
        answer = extract_text(res.content)
    except Exception as e:
        answer = f"I apologize, but I encountered an error generating an answer: {str(e)}"
        
    return {"final_answer": answer}


# Node 6: Hallucination & Fact Check Node (Pydantic Structured Output)
def hallucination_check_node(state: CRAGState) -> dict:
    answer = state.get("final_answer", "")
    documents = state.get("documents", [])
    
    if not documents or not answer:
        return {"hallucination_score": "PASSED"}
        
    llm = get_llm()
    context_str = "\n\n".join(documents[:3])
    
    prompt = f"""You are a strict hallucination guardrail evaluator. Verify if the generated answer is grounded in the retrieved facts or standard domain principles.

Retrieved Context:
{context_str}

Generated Answer:
{answer}"""

    try:
        if hasattr(llm, "with_structured_output"):
            structured_llm = llm.with_structured_output(HallucinationEvaluationSchema)
            res_obj = structured_llm.invoke(prompt)
            score = "PASSED" if res_obj.is_grounded else "WARNING_HALLUCINATION_SUSPECTED"
        else:
            res = llm.invoke(prompt + "\n\nRespond with EXACTLY 'PASSED' if accurate and grounded, or 'FAILED' if fabricated.")
            score = "PASSED" if "PASSED" in res.content.strip().upper() else "WARNING_HALLUCINATION_SUSPECTED"
    except Exception as e:
        score = "PASSED"
        
    return {"hallucination_score": score}


# Router Decision
def decide_route(state: CRAGState) -> str:
    if state.get("web_search_needed"):
        return "web_search"
    return "generate"


# Build Graph (Option 2: Vector Search -> Cross-Encoder Reranker -> Hybrid Smart Bypass / LLM Evaluator -> Web Search / Generator)
def build_crag_graph():
    workflow = StateGraph(CRAGState)
    
    workflow.add_node("retrieve", retrieve_node)
    workflow.add_node("rerank", rerank_node)
    workflow.add_node("grade_documents", grade_documents_node)
    workflow.add_node("web_search", web_search_node)
    workflow.add_node("generate", generate_node)
    workflow.add_node("hallucination_check", hallucination_check_node)
    
    workflow.set_entry_point("retrieve")
    workflow.add_edge("retrieve", "rerank")
    workflow.add_edge("rerank", "grade_documents")
    workflow.add_conditional_edges(
        "grade_documents",
        decide_route,
        {
            "web_search": "web_search",
            "generate": "generate"
        }
    )
    workflow.add_edge("web_search", "generate")
    workflow.add_edge("generate", "hallucination_check")
    workflow.add_edge("hallucination_check", END)
    
    return workflow.compile()


crag_app = build_crag_graph()
