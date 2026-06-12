import os
from typing import Any

import psycopg
from dotenv import load_dotenv
from psycopg.rows import dict_row
from psycopg.types.json import Json

from app.services.ai_service import AIServiceError, call_llm_json
from app.services.embedding_service import (
    EmbeddingServiceError,
    create_embedding,
    vector_to_pgvector,
)
from app.services.notion_service import get_notion_doc_detail, list_notion_docs

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL is None:
    raise RuntimeError("DATABASE_URL is not set")


RAG_ANSWER_SCHEMA = {
    "type": "object",
    "properties": {
        "answer": {"type": "string"},
        "references": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "source_type": {"type": "string"},
                    "source_id": {"type": "string"},
                    "source_title": {"type": "string"},
                    "source_url": {"type": ["string", "null"]},
                    "reason": {"type": "string"},
                },
                "required": [
                    "source_type",
                    "source_id",
                    "source_title",
                    "source_url",
                    "reason",
                ],
                "additionalProperties": False,
            },
        },
        "confidence": {"type": "string"},
        "warnings": {
            "type": "array",
            "items": {"type": "string"},
        },
    },
    "required": ["answer", "references", "confidence", "warnings"],
    "additionalProperties": False,
}


class RagServiceError(Exception):
    pass


def chunk_text(text: str, chunk_size: int = 900, overlap: int = 150) -> list[str]:
    cleaned_text = " ".join(text.split())

    if not cleaned_text:
        return []

    chunks = []
    start = 0

    while start < len(cleaned_text):
        end = start + chunk_size
        chunk = cleaned_text[start:end].strip()

        if chunk:
            chunks.append(chunk)

        if end >= len(cleaned_text):
            break

        start = end - overlap

    return chunks


def delete_embeddings_for_source(
    cur,
    source_type: str,
    source_id: str,
):
    cur.execute(
        """
        DELETE FROM document_embeddings
        WHERE source_type = %s
        AND source_id = %s
        """,
        (source_type, source_id),
    )


def insert_embedding_chunk(
    cur,
    *,
    source_type: str,
    source_id: str,
    source_title: str,
    source_url: str | None,
    chunk_index: int,
    chunk_text_value: str,
    metadata: dict[str, Any],
):
    embedding = create_embedding(chunk_text_value)
    embedding_text = vector_to_pgvector(embedding)

    cur.execute(
        """
        INSERT INTO document_embeddings (
            source_type,
            source_id,
            source_title,
            source_url,
            chunk_index,
            chunk_text,
            embedding,
            metadata_json
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s::vector, %s)
        """,
        (
            source_type,
            source_id,
            source_title,
            source_url,
            chunk_index,
            chunk_text_value,
            embedding_text,
            Json(metadata),
        ),
    )


def upsert_notion_document(cur, doc: dict[str, Any]):
    cur.execute(
        """
        INSERT INTO notion_documents (
            notion_page_id,
            title,
            url,
            content,
            last_edited_time,
            last_synced_at,
            updated_at
        )
        VALUES (%s, %s, %s, %s, %s, NOW(), NOW())
        ON CONFLICT (notion_page_id)
        DO UPDATE SET
            title = EXCLUDED.title,
            url = EXCLUDED.url,
            content = EXCLUDED.content,
            last_edited_time = EXCLUDED.last_edited_time,
            last_synced_at = NOW(),
            updated_at = NOW()
        RETURNING id
        """,
        (
            doc["page_id"],
            doc["title"],
            doc.get("url"),
            doc.get("content", ""),
            doc.get("last_edited_time"),
        ),
    )

    return cur.fetchone()


def sync_notion_documents(limit: int = 20) -> dict[str, Any]:
    docs_response = list_notion_docs(page_size=limit)
    docs = docs_response.get("items", [])

    synced_documents = 0
    synced_chunks = 0
    warnings = []

    with psycopg.connect(DATABASE_URL, row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            for doc_summary in docs:
                try:
                    doc_detail = get_notion_doc_detail(doc_summary["page_id"])
                    content = doc_detail.get("content", "")

                    upsert_notion_document(cur, doc_detail)

                    source_id = doc_detail["page_id"]
                    source_title = doc_detail["title"]
                    source_url = doc_detail.get("url")

                    delete_embeddings_for_source(
                        cur,
                        source_type="notion",
                        source_id=source_id,
                    )

                    chunks = chunk_text(content)

                    for chunk_index, chunk in enumerate(chunks):
                        insert_embedding_chunk(
                            cur,
                            source_type="notion",
                            source_id=source_id,
                            source_title=source_title,
                            source_url=source_url,
                            chunk_index=chunk_index,
                            chunk_text_value=chunk,
                            metadata={
                                "last_edited_time": doc_detail.get("last_edited_time"),
                            },
                        )
                        synced_chunks += 1

                    synced_documents += 1

                except Exception as exc:
                    warnings.append(
                        f"Notion 문서 sync 실패: {doc_summary.get('title', 'Untitled')} - {exc}"
                    )

    return {
        "synced_documents": synced_documents,
        "synced_chunks": synced_chunks,
        "warnings": warnings,
    }


def build_post_document_text(post: dict[str, Any]) -> str:
    return f"""
게시글 ID: {post["id"]}
제목: {post["title"]}
타입: {post["type"]}
상태: {post["status"]}
우선순위: {post["priority"]}
마감일: {post.get("due_date")}
내용:
{post["content"]}
""".strip()


def fetch_board_posts(limit: int = 100) -> list[dict[str, Any]]:
    with psycopg.connect(DATABASE_URL, row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    id,
                    user_id,
                    type,
                    title,
                    content,
                    status,
                    priority,
                    due_date,
                    created_at,
                    updated_at
                FROM posts
                WHERE type IN ('daily_log', 'task', 'blocker', 'discussion')
                ORDER BY updated_at DESC
                LIMIT %s
                """,
                (limit,),
            )

            return cur.fetchall()


def sync_board_posts(limit: int = 100) -> dict[str, Any]:
    posts = fetch_board_posts(limit=limit)

    synced_documents = 0
    synced_chunks = 0
    warnings = []

    with psycopg.connect(DATABASE_URL, row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            for post in posts:
                try:
                    source_id = str(post["id"])
                    source_title = post["title"]
                    source_url = f"/posts/{post['id']}"
                    document_text = build_post_document_text(post)

                    delete_embeddings_for_source(
                        cur,
                        source_type="post",
                        source_id=source_id,
                    )

                    chunks = chunk_text(document_text)

                    for chunk_index, chunk in enumerate(chunks):
                        insert_embedding_chunk(
                            cur,
                            source_type="post",
                            source_id=source_id,
                            source_title=source_title,
                            source_url=source_url,
                            chunk_index=chunk_index,
                            chunk_text_value=chunk,
                            metadata={
                                "post_type": post["type"],
                                "status": post["status"],
                                "priority": post["priority"],
                                "updated_at": str(post["updated_at"]),
                            },
                        )
                        synced_chunks += 1

                    synced_documents += 1

                except Exception as exc:
                    warnings.append(
                        f"게시글 sync 실패: #{post.get('id')} {post.get('title')} - {exc}"
                    )

    return {
        "synced_documents": synced_documents,
        "synced_chunks": synced_chunks,
        "warnings": warnings,
    }


def sync_all_documents(
    notion_limit: int = 20,
    post_limit: int = 100,
) -> dict[str, Any]:
    result = {
        "notion": {
            "synced_documents": 0,
            "synced_chunks": 0,
            "warnings": [],
        },
        "posts": {
            "synced_documents": 0,
            "synced_chunks": 0,
            "warnings": [],
        },
    }

    try:
        result["notion"] = sync_notion_documents(limit=notion_limit)
    except Exception as exc:
        result["notion"]["warnings"].append(f"Notion 전체 sync 실패: {exc}")

    try:
        result["posts"] = sync_board_posts(limit=post_limit)
    except Exception as exc:
        result["posts"]["warnings"].append(f"게시판 전체 sync 실패: {exc}")

    return {
        "synced_documents": (
            result["notion"]["synced_documents"]
            + result["posts"]["synced_documents"]
        ),
        "synced_chunks": (
            result["notion"]["synced_chunks"]
            + result["posts"]["synced_chunks"]
        ),
        "details": result,
    }


def search_similar_chunks(question: str, top_k: int = 5) -> list[dict[str, Any]]:
    try:
        query_embedding = create_embedding(question)
    except EmbeddingServiceError as exc:
        raise RagServiceError(str(exc)) from exc

    query_vector = vector_to_pgvector(query_embedding)

    with psycopg.connect(DATABASE_URL, row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    id,
                    source_type,
                    source_id,
                    source_title,
                    source_url,
                    chunk_index,
                    chunk_text,
                    1 - (embedding <=> %s::vector) AS similarity
                FROM document_embeddings
                ORDER BY embedding <=> %s::vector
                LIMIT %s
                """,
                (
                    query_vector,
                    query_vector,
                    top_k,
                ),
            )

            return cur.fetchall()


def fallback_rag_answer(
    question: str,
    references: list[dict[str, Any]],
    reason: str,
) -> dict[str, Any]:
    if not references:
        return {
            "answer": "관련 문서를 찾지 못했습니다. 먼저 /ai/sync-documents를 실행해 문서와 게시글을 동기화하세요.",
            "references": [],
            "confidence": "low",
            "warnings": [reason],
        }

    reference_text = "\n\n".join(
        f"[{index + 1}] {ref['source_title']}\n{ref['chunk_text'][:500]}"
        for index, ref in enumerate(references)
    )

    return {
        "answer": (
            "LLM 호출에 실패해서 검색된 reference 일부만 반환합니다.\n\n"
            f"질문: {question}\n\n"
            f"검색된 근거:\n{reference_text}"
        ),
        "references": [
            {
                "source_type": ref["source_type"],
                "source_id": ref["source_id"],
                "source_title": ref["source_title"],
                "source_url": ref["source_url"],
                "reason": f"유사도 {ref['similarity']:.3f}로 검색된 chunk입니다.",
            }
            for ref in references
        ],
        "confidence": "low",
        "warnings": [reason],
    }


def ask_docs(question: str, top_k: int = 5) -> dict[str, Any]:
    references = search_similar_chunks(question=question, top_k=top_k)

    context_text = "\n\n".join(
        f"""
[reference {index + 1}]
source_type: {ref["source_type"]}
source_id: {ref["source_id"]}
source_title: {ref["source_title"]}
source_url: {ref["source_url"]}
similarity: {ref["similarity"]}
chunk:
{ref["chunk_text"]}
""".strip()
        for index, ref in enumerate(references)
    )

    user_prompt = f"""
사용자 질문:
{question}

아래 reference만 근거로 한국어로 답변해라.
근거에 없는 내용은 추측하지 말고 모른다고 말해라.

references:
{context_text}
""".strip()

    try:
        return call_llm_json(
            system_prompt=(
                "너는 AI Team Sync Board의 RAG 답변 도우미다. "
                "Notion 공식 문서와 게시판 작업 로그에서 검색된 근거만 사용해서 답한다."
            ),
            user_prompt=user_prompt,
            schema_name="rag_answer",
            schema=RAG_ANSWER_SCHEMA,
        )
    except AIServiceError as exc:
        return fallback_rag_answer(
            question=question,
            references=references,
            reason=str(exc),
        )