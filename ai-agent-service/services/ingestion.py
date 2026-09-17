import uuid
from typing import Dict, Any, List
from config import settings
from graphs.crag_graph import get_embeddings

def extract_text_from_pdf_bytes(pdf_bytes: bytes) -> str:
    """Extract text content from raw PDF file bytes using PyMuPDF (fitz), pypdf, or raw byte fallback."""
    try:
        import fitz  # PyMuPDF
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        text_parts = []
        for page_num in range(len(doc)):
            page = doc[page_num]
            text = page.get_text()
            if text:
                text_parts.append(text)
        if text_parts:
            return "\n\n".join(text_parts)
    except Exception as fitz_err:
        pass

    try:
        import io
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(pdf_bytes))
        text_parts = []
        for page in reader.pages:
            t = page.extract_text()
            if t:
                text_parts.append(t)
        if text_parts:
            return "\n\n".join(text_parts)
    except Exception as pypdf_err:
        pass

    # Fallback to ASCII/UTF-8 readable text extraction from raw PDF byte stream
    try:
        import re
        raw_str = pdf_bytes.decode("latin1", errors="ignore")
        # Extract readable text sequences from PDF streams
        text_blocks = re.findall(r'\((.*?)\)', raw_str)
        extracted = " ".join([b for b in text_blocks if len(b.strip()) > 3])
        if extracted and len(extracted.strip()) > 10:
            return extracted
        clean_printable = "".join([c if c.isprintable() or c in "\n\r\t" else " " for c in raw_str])
        return clean_printable.strip()
    except Exception as raw_err:
        raise ValueError(f"Failed to parse PDF bytes: {raw_err}")

def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
    """Splits text recursively into overlapping text chunks."""
    try:
        from langchain.text_splitter import RecursiveCharacterTextSplitter
        splitter = RecursiveCharacterTextSplitter(chunk_size=chunk_size, chunk_overlap=overlap)
        return splitter.split_text(text)
    except Exception:
        # Simple string fallback splitter
        chunks = []
        start = 0
        while start < len(text):
            end = start + chunk_size
            chunks.append(text[start:end])
            start += (chunk_size - overlap)
        return chunks

def ingest_pdf_document(pdf_bytes: bytes, course_id: str, filename: str = "document.pdf") -> Dict[str, Any]:
    """
    Parses PDF bytes, splits into chunks, generates vector embeddings,
    and upserts vector payloads to Qdrant collection with course_id metadata.
    """
    raw_text = extract_text_from_pdf_bytes(pdf_bytes)
    if not raw_text or len(raw_text.strip()) < 10:
        return {"status": "error", "message": "PDF text extraction produced insufficient text content.", "chunks_created": 0}

    chunks = chunk_text(raw_text, chunk_size=500, overlap=50)
    print(f"[PDF Ingestion] Successfully extracted text and created {len(chunks)} chunks for filename: '{filename}', courseId: '{course_id}'")

    embeddings_model = get_embeddings()
    if not embeddings_model:
        return {"status": "warning", "message": "Embeddings model unavailable. Chunks extracted but not vectorized.", "chunks_created": len(chunks)}

    try:
        vectors = embeddings_model.embed_documents(chunks)
    except Exception as emb_err:
        return {"status": "error", "message": f"Embedding generation failed: {emb_err}", "chunks_created": len(chunks)}

    # Upsert points to Qdrant
    try:
        from qdrant_client import QdrantClient
        from qdrant_client.http import models as rest_models
        
        client = QdrantClient(url=settings.QDRANT_URL, api_key=settings.QDRANT_API_KEY if settings.QDRANT_API_KEY else None)
        
        # Ensure collection exists
        try:
            collections = client.get_collections()
            collection_names = [c.name for c in collections.collections]
            if settings.QDRANT_COLLECTION not in collection_names:
                vector_size = len(vectors[0]) if vectors else 1536
                client.create_collection(
                    collection_name=settings.QDRANT_COLLECTION,
                    vectors_config=rest_models.VectorParams(size=vector_size, distance=rest_models.Distance.COSINE)
                )
                print(f"[PDF Ingestion] Created Qdrant collection '{settings.QDRANT_COLLECTION}' (size: {vector_size})")
        except Exception as col_err:
            print(f"[PDF Ingestion] Qdrant collection check warning: {col_err}")

        points = []
        for idx, (chunk, vec) in enumerate(zip(chunks, vectors)):
            point_id = str(uuid.uuid4())
            points.append(
                rest_models.PointStruct(
                    id=point_id,
                    vector=vec,
                    payload={
                        "text": chunk,
                        "courseId": course_id,
                        "filename": filename,
                        "chunkIndex": idx,
                        "source": "pdf_ingestion_service"
                    }
                )
            )

        client.upsert(
            collection_name=settings.QDRANT_COLLECTION,
            points=points
        )
        print(f"[PDF Ingestion] Successfully upserted {len(points)} vector points to Qdrant collection '{settings.QDRANT_COLLECTION}'")
        
        return {
            "status": "success",
            "message": f"Successfully ingested PDF '{filename}' into course '{course_id}'",
            "chunks_created": len(chunks),
            "vectors_upserted": len(points),
            "collection": settings.QDRANT_COLLECTION
        }
    except Exception as qdrant_err:
        print(f"[PDF Ingestion] Qdrant upsert warning: {qdrant_err}")
        return {
            "status": "partial_success",
            "message": f"Extracted {len(chunks)} chunks and vectorized them, but Qdrant upsert warned: {qdrant_err}",
            "chunks_created": len(chunks),
            "vectors_upserted": 0
        }
