import os
from typing import Any

import psycopg
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, Header, HTTPException
from jwt import InvalidTokenError
from psycopg.rows import dict_row
from app.schemas import AskDocsRequest, SyncDocumentsRequest
from app.services.rag_service import ask_docs, sync_all_documents

from app.security import decode_access_token
from app.services.ai_service import (
    AIServiceError,
    fallback_team_summary,
    fallback_today_briefing,
    generate_team_summary,
    generate_today_briefing,
)
from app.services.github_service import (
    list_github_issues,
    list_github_pull_requests,
    list_recent_commits,
)
from app.services.notion_service import list_notion_docs

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


def fetch_board_items_for_user(user_id: int) -> list[dict[str, Any]]:
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
                WHERE user_id = %s
                AND type IN ('task', 'daily_log', 'blocker')
                ORDER BY updated_at DESC
                LIMIT 20
                """,
                (user_id,),
            )
            return cur.fetchall()


def fetch_board_items_for_team() -> list[dict[str, Any]]:
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
                WHERE type IN ('task', 'daily_log', 'blocker')
                ORDER BY updated_at DESC
                LIMIT 40
                """
            )
            return cur.fetchall()


def safe_external_call(label: str, fn, warnings: list[str], default):
    try:
        return fn()
    except Exception as exc:
        warnings.append(f"{label} 조회 실패: {exc}")
        return default


def collect_today_context(current_user: dict[str, Any]) -> dict[str, Any]:
    warnings = []
    github_username = current_user.get("github_username")

    board_items = fetch_board_items_for_user(current_user["id"])

    github_issues = []

    if github_username:
        github_issues = safe_external_call(
            "GitHub assigned issues",
            lambda: list_github_issues(
                state="open",
                assignee=github_username,
                page=1,
                per_page=10,
            ),
            warnings,
            [],
        )
    else:
        warnings.append("현재 사용자에게 github_username이 설정되어 있지 않습니다.")

    github_prs = safe_external_call(
        "GitHub pull requests",
        lambda: list_github_pull_requests(
            state="open",
            page=1,
            per_page=10,
        ),
        warnings,
        [],
    )

    recent_commits = safe_external_call(
        "GitHub recent commits",
        lambda: list_recent_commits(
            page=1,
            per_page=10,
        ),
        warnings,
        [],
    )

    notion_docs_response = safe_external_call(
        "Notion docs",
        lambda: list_notion_docs(page_size=10),
        warnings,
        {"items": []},
    )

    return {
        "user": {
            "id": current_user["id"],
            "email": current_user["email"],
            "nickname": current_user["nickname"],
            "github_username": github_username,
        },
        "board_items": board_items,
        "github_issues": github_issues,
        "github_prs": github_prs,
        "recent_commits": recent_commits,
        "notion_docs": notion_docs_response.get("items", []),
        "warnings": warnings,
    }


def collect_team_context() -> dict[str, Any]:
    warnings = []

    board_items = fetch_board_items_for_team()

    github_issues = safe_external_call(
        "GitHub open issues",
        lambda: list_github_issues(
            state="open",
            page=1,
            per_page=20,
        ),
        warnings,
        [],
    )

    github_prs = safe_external_call(
        "GitHub open pull requests",
        lambda: list_github_pull_requests(
            state="open",
            page=1,
            per_page=20,
        ),
        warnings,
        [],
    )

    recent_commits = safe_external_call(
        "GitHub recent commits",
        lambda: list_recent_commits(
            page=1,
            per_page=20,
        ),
        warnings,
        [],
    )

    notion_docs_response = safe_external_call(
        "Notion docs",
        lambda: list_notion_docs(page_size=20),
        warnings,
        {"items": []},
    )

    return {
        "board_items": board_items,
        "github_issues": github_issues,
        "github_prs": github_prs,
        "recent_commits": recent_commits,
        "notion_docs": notion_docs_response.get("items", []),
        "warnings": warnings,
    }


@router.post("/today-briefing")
def create_today_briefing(current_user: dict = Depends(get_current_user)):
    context = collect_today_context(current_user)

    try:
        result = generate_today_briefing(context)
    except AIServiceError as exc:
        result = fallback_today_briefing(context, reason=str(exc))

    return result


@router.post("/team-summary")
def create_team_summary(current_user: dict = Depends(get_current_user)):
    context = collect_team_context()

    try:
        result = generate_team_summary(context)
    except AIServiceError as exc:
        result = fallback_team_summary(context, reason=str(exc))

    return result


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