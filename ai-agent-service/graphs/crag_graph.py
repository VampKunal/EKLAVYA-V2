from typing import List, TypedDict, Optional
from pydantic import BaseModel, Field
from langgraph.graph import StateGraph, END
from tavily import TavilyClient
from config import settings

_llm_instance = None
_embeddings_instance = None

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
    is_relevant: bool
    web_search_needed: bool
    final_answer: str
    hallucination_score: str

# Node 1: Vector Search Retrieval from Qdrant using Embeddings
def retrieve_node(state: CRAGState) -> dict:
    question = state["question"]
    course_id = state.get("course_id", "")
    
    print(f"[CRAG Graph] Vector similarity search for course: '{course_id}', query: '{question}'")
    docs = []
    
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
                    limit=4
                )
                docs = [p.payload.get("text", "") for p in search_result if p.payload and "text" in p.payload]
            except Exception as emb_err:
                print(f"[CRAG Graph] Embedding query failed: {emb_err}, falling back to Qdrant payload scroll.")
                search_result = client.scroll(
                    collection_name=settings.QDRANT_COLLECTION,
                    scroll_filter=filter_params,
                    limit=4
                )
                points, _ = search_result
                docs = [p.payload.get("text", "") for p in points if p.payload and "text" in p.payload]
        else:
            # Fallback to payload scroll if embeddings unavailable
            search_result = client.scroll(
                collection_name=settings.QDRANT_COLLECTION,
                scroll_filter=filter_params,
                limit=4
            )
            points, _ = search_result
            docs = [p.payload.get("text", "") for p in points if p.payload and "text" in p.payload]
    except Exception as e:
        print(f"[CRAG Graph] Vector retrieval error: {e}")
        docs = []

    return {"documents": docs}

# Node 2: Document Relevance Grader (Pydantic Structured Output)
def grade_documents_node(state: CRAGState) -> dict:
    question = state["question"]
    documents = state.get("documents", [])
    
    if not documents:
        return {"is_relevant": False, "web_search_needed": True}
        
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
        return {"is_relevant": is_rel, "web_search_needed": not is_rel}
    except Exception as e:
        print(f"[CRAG Graph] Grading error: {e}")
        return {"is_relevant": False, "web_search_needed": True}

# Node 3: Tavily Web Search Tool Fallback
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

# Node 4: Synthesis & Generation
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

# Node 5: Hallucination & Fact Check Node (Pydantic Structured Output)
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

# Build Graph
def build_crag_graph():
    workflow = StateGraph(CRAGState)
    
    workflow.add_node("retrieve", retrieve_node)
    workflow.add_node("grade_documents", grade_documents_node)
    workflow.add_node("web_search", web_search_node)
    workflow.add_node("generate", generate_node)
    workflow.add_node("hallucination_check", hallucination_check_node)
    
    workflow.set_entry_point("retrieve")
    workflow.add_edge("retrieve", "grade_documents")
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


