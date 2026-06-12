import os

import psycopg
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, Header, HTTPException
from jwt import InvalidTokenError
from psycopg.rows import dict_row

from app.schemas import AskDocsRequest, SyncDocumentsRequest
from app.security import decode_access_token
from app.services.rag_service import ask_docs, sync_all_documents

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL is None:
    raise RuntimeError("DATABASE_URL is not set")

router = APIRouter(
    prefix="/ai",
    tags=["AI"],
)


def get_current_user(authorization: str | None = Header(default=None)):
    if authorization is None:
        raise HTTPException(
            status_code=401,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    scheme, _, token = authorization.partition(" ")

    if scheme.lower() != "bearer" or not token:
        raise HTTPException(
            status_code=401,
            detail="Invalid authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = decode_access_token(token)
    except InvalidTokenError:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")

    if user_id is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        user_id_int = int(user_id)
    except ValueError:
        raise HTTPException(
            status_code=401,
            detail="Invalid token subject",
            headers={"WWW-Authenticate": "Bearer"},
        )

    with psycopg.connect(DATABASE_URL, row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    id,
                    email,
                    nickname,
                    github_username,
                    role,
                    created_at
                FROM users
                WHERE id = %s
                """,
                (user_id_int,),
            )
            user = cur.fetchone()

    if user is None:
        raise HTTPException(
            status_code=401,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


@router.post("/sync-documents")
def sync_documents(
    request: SyncDocumentsRequest,
    current_user: dict = Depends(get_current_user),
):
    return sync_all_documents(
        notion_limit=request.notion_limit,
        post_limit=request.post_limit,
    )


@router.post("/ask-docs")
def ask_documents(
    request: AskDocsRequest,
    current_user: dict = Depends(get_current_user),
):
    question = request.question.strip()

    if not question:
        raise HTTPException(status_code=400, detail="Question is required")

    return ask_docs(
        question=question,
        top_k=request.top_k,
    )
