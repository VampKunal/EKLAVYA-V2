from typing import List, TypedDict, Optional
from langgraph.graph import StateGraph, END
from tavily import TavilyClient
from config import settings

def get_llm():
    """Return Google Gemini (gemini-2.5-flash) if key is present, else OpenRouter / OpenAI fallback."""
    if settings.GOOGLE_AI_API_KEY:
        try:
            from langchain_google_genai import ChatGoogleGenerativeAI
            return ChatGoogleGenerativeAI(
                model="gemini-2.5-flash",
                google_api_key=settings.GOOGLE_AI_API_KEY,
                temperature=0.1
            )
        except Exception as e:
            print(f"[CRAG Graph] Google GenAI init warning: {e}")

    if settings.OPENROUTER_API_KEY:
        try:
            from langchain_openai import ChatOpenAI
            return ChatOpenAI(
                model="google/gemini-2.5-flash",
                openai_api_key=settings.OPENROUTER_API_KEY,
                openai_api_base="https://openrouter.ai/api/v1",
                temperature=0.1
            )
        except Exception as e:
            print(f"[CRAG Graph] OpenRouter init warning: {e}")

    from langchain_openai import ChatOpenAI
    return ChatOpenAI(model="gpt-4o-mini", api_key=settings.OPENAI_API_KEY, temperature=0.1)

def get_embeddings():
    """Return embeddings model for vector search if available."""
    if settings.GOOGLE_AI_API_KEY:
        try:
            from langchain_google_genai import GoogleGenerativeAIEmbeddings
            return GoogleGenerativeAIEmbeddings(
                model="text-embedding-004",
                google_api_key=settings.GOOGLE_AI_API_KEY
            )
        except Exception as e:
            print(f"[CRAG Graph] Google Embeddings warning: {e}")

    if settings.OPENAI_API_KEY:
        try:
            from langchain_openai import OpenAIEmbeddings
            return OpenAIEmbeddings(openai_api_key=settings.OPENAI_API_KEY)
        except Exception as e:
            print(f"[CRAG Graph] OpenAI Embeddings warning: {e}")
            
    return None

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

# Node 2: Document Relevance Grader
def grade_documents_node(state: CRAGState) -> dict:
    question = state["question"]
    documents = state.get("documents", [])
    
    if not documents:
        return {"is_relevant": False, "web_search_needed": True}
        
    llm = get_llm()
    context_str = "\n\n".join(documents)
    
    prompt = f"""You are a strict relevance grader. Determine if the following documents contain sufficient relevant information to accurately answer the student's question.

Question: {question}

Documents:
{context_str}

Respond with EXACTLY 'YES' if relevant or 'NO' if irrelevant/insufficient."""

    try:
        res = llm.invoke(prompt)
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
        answer = res.content
    except Exception as e:
        answer = f"I apologize, but I encountered an error generating an answer: {str(e)}"
        
    return {"final_answer": answer}

# Node 5: Hallucination & Fact Check Node
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
{answer}

Respond with EXACTLY 'PASSED' if the answer is accurate and grounded, or 'FAILED' if it introduces fabricated facts."""

    try:
        res = llm.invoke(prompt)
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

