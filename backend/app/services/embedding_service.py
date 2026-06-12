import os
from typing import Any

import requests
from dotenv import load_dotenv

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")
EMBEDDING_DIMENSIONS = int(os.getenv("EMBEDDING_DIMENSIONS", "1536"))
OPENAI_EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings"


class EmbeddingServiceError(Exception):
    pass


def create_embedding(text: str) -> list[float]:
    if not OPENAI_API_KEY:
        raise EmbeddingServiceError("OPENAI_API_KEY is not set")

    cleaned_text = text.strip()

    if not cleaned_text:
        raise EmbeddingServiceError("Cannot embed empty text")

    payload: dict[str, Any] = {
        "model": EMBEDDING_MODEL,
        "input": cleaned_text,
    }

    if EMBEDDING_DIMENSIONS:
        payload["dimensions"] = EMBEDDING_DIMENSIONS

    try:
        response = requests.post(
            OPENAI_EMBEDDINGS_URL,
            headers={
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=30,
        )
    except requests.RequestException as exc:
        raise EmbeddingServiceError(f"Embedding request failed: {exc}") from exc

    if response.status_code >= 400:
        raise EmbeddingServiceError(
            f"Embedding request failed: {response.status_code} {response.text}"
        )

    data = response.json()
    embedding = data["data"][0]["embedding"]

    if len(embedding) != EMBEDDING_DIMENSIONS:
        raise EmbeddingServiceError(
            f"Embedding dimension mismatch: expected {EMBEDDING_DIMENSIONS}, got {len(embedding)}"
        )

    return embedding


def vector_to_pgvector(embedding: list[float]) -> str:
    return "[" + ",".join(str(value) for value in embedding) + "]"