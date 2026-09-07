import os
from typing import Optional, Dict, Any

_langsmith_client = None

def get_langsmith_client():
    """Returns a singleton instance of the LangSmith Client if API key is present."""
    global _langsmith_client
    if _langsmith_client is not None:
        return _langsmith_client

    api_key = os.getenv("LANGCHAIN_API_KEY")
    if api_key and api_key != "ls__...":
        try:
            from langsmith import Client
            _langsmith_client = Client(api_key=api_key)
            return _langsmith_client
        except Exception as e:
            print(f"[LangSmith Service] Client init error: {e}")
            return None
    return None


def push_crag_eval_example(question: str, answer: str, documents_used: int):
    """Auto-populates golden QA pairs to a LangSmith evaluation dataset."""
    client = get_langsmith_client()
    if not client:
        return

    dataset_name = "eklavya-crag-evals"
    try:
        # Create dataset if it doesn't exist yet
        if not client.has_dataset(dataset_name=dataset_name):
            client.create_dataset(
                dataset_name=dataset_name,
                description="Golden evaluation examples auto-captured from high-quality production CRAG responses."
            )

        client.create_example(
            inputs={"question": question, "documents_used": documents_used},
            outputs={"answer": answer},
            dataset_name=dataset_name
        )
        print(f"[LangSmith Service] Successfully pushed golden example to dataset '{dataset_name}'")
    except Exception as e:
        print(f"[LangSmith Service] Failed to push eval example: {e}")


def log_run_feedback(run_id: str, key: str, score: float, comment: Optional[str] = None):
    """Posts numeric evaluation score back to a specific LangSmith run trace."""
    client = get_langsmith_client()
    if not client or not run_id:
        return

    try:
        client.create_feedback(
            run_id=run_id,
            key=key,
            score=score,
            comment=comment
        )
        print(f"[LangSmith Service] Logged feedback '{key}'={score} for run {run_id}")
    except Exception as e:
        print(f"[LangSmith Service] Failed to log feedback: {e}")
