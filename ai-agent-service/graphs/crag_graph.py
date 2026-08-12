from typing import List, TypedDict
from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from qdrant_client import QdrantClient
from tavily import TavilyClient
from config import settings

# State Schema
class CRAGState(TypedDict):
    question: str
    course_id: str
    documents: List[str]
    is_relevant: bool
    web_search_needed: bool
    final_answer: str

# Node 1: Vector Retrieval from Qdrant
def retrieve_node(state: CRAGState) -> dict:
    question = state["question"]
    course_id = state.get("course_id", "")
    
    print(f"[CRAG Graph] Retrieving documents for course: {course_id}, query: {question}")
    docs = []
    
    try:
        embeddings = OpenAIEmbeddings(api_key=settings.OPENAI_API_KEY, model="text-embedding-3-small")
        query_vector = embeddings.embed_query(question)
        
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
            
        search_result = client.search(
            collection_name=settings.QDRANT_COLLECTION,
            query_vector=query_vector,
            query_filter=filter_params,
            limit=4
        )
        
        docs = [hit.payload.get("text", "") for hit in search_result if hit.payload and "text" in hit.payload]
    except Exception as e:
        print(f"[CRAG Graph] Vector retrieval error: {e}")
        docs = []

    return {"documents": docs}

# Node 2: Document Relevance Grader
def grade_documents_node(state: CRAGState) -> dict:
    question = state["question"]
    documents = state["documents"]
    
    if not documents:
        return {"is_relevant": False, "web_search_needed": True}
        
    llm = ChatOpenAI(model="gpt-4o-mini", api_key=settings.OPENAI_API_KEY, temperature=0)
    context_str = "\n\n".join(documents)
    
    prompt = f"""You are a strict relevance grader. Determine if the following documents contain sufficient relevant information to accurately answer the student's question.

Question: {question}

Documents:
{context_str}

Respond with EXACTLY 'YES' if relevant or 'NO' if irrelevant/insufficient."""

    try:
        res = llm.invoke(prompt).content.strip().upper()
        is_rel = "YES" in res
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
    
    llm = ChatOpenAI(model="gpt-4o-mini", api_key=settings.OPENAI_API_KEY, temperature=0.3)
    context_str = "\n\n---\n\n".join(documents) if documents else "No external context found."
    
    prompt = f"""You are Eklavya AI, an expert AI tutor. Answer the student's question clearly and concisely.
{"Note: Supplemental information was retrieved via external search because course notes were incomplete." if web_searched else "Base your explanation primarily on the course materials provided."}

Student Question: {question}

Retrieved Context:
{context_str}

Answer:"""

    try:
        answer = llm.invoke(prompt).content
    except Exception as e:
        answer = f"I apologize, but I encountered an error generating an answer: {str(e)}"
        
    return {"final_answer": answer}

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
    workflow.add_edge("generate", END)
    
    return workflow.compile()

crag_app = build_crag_graph()
