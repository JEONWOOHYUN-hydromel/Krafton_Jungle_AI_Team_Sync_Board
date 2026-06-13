import json
import os
from typing import Any

import requests
from dotenv import load_dotenv

load_dotenv()

OPENAI_API_URL = "https://api.openai.com/v1/responses"
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")


class AIServiceError(Exception):
    pass


TODAY_BRIEFING_SCHEMA = {
    "type": "object",
    "properties": {
        "summary": {"type": "string"},
        "priority_tasks": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "source": {"type": "string"},
                    "priority": {"type": "string"},
                    "reason": {"type": "string"},
                },
                "required": ["title", "source", "priority", "reason"],
                "additionalProperties": False,
            },
        },
        "github_summary": {"type": "string"},
        "notion_references": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "reason": {"type": "string"},
                },
                "required": ["title", "reason"],
                "additionalProperties": False,
            },
        },
        "blockers": {
            "type": "array",
            "items": {"type": "string"},
        },
        "next_action": {"type": "string"},
        "data_warnings": {
            "type": "array",
            "items": {"type": "string"},
        },
    },
    "required": [
        "summary",
        "priority_tasks",
        "github_summary",
        "notion_references",
        "blockers",
        "next_action",
        "data_warnings",
    ],
    "additionalProperties": False,
}


TEAM_SUMMARY_SCHEMA = {
    "type": "object",
    "properties": {
        "summary": {"type": "string"},
        "by_area": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "area": {"type": "string"},
                    "progress": {"type": "string"},
                    "risk": {"type": "string"},
                },
                "required": ["area", "progress", "risk"],
                "additionalProperties": False,
            },
        },
        "blockers": {
            "type": "array",
            "items": {"type": "string"},
        },
        "recommended_actions": {
            "type": "array",
            "items": {"type": "string"},
        },
        "github_summary": {"type": "string"},
        "notion_summary": {"type": "string"},
        "data_warnings": {
            "type": "array",
            "items": {"type": "string"},
        },
    },
    "required": [
        "summary",
        "by_area",
        "blockers",
        "recommended_actions",
        "github_summary",
        "notion_summary",
        "data_warnings",
    ],
    "additionalProperties": False,
}


def extract_response_text(response_data: dict[str, Any]) -> str:
    for output_item in response_data.get("output", []):
        if output_item.get("type") != "message":
            continue

        for content_item in output_item.get("content", []):
            if content_item.get("type") == "output_text":
                return content_item.get("text", "")

    raise AIServiceError("OpenAI response did not contain output_text")


def call_llm_json(
    *,
    system_prompt: str,
    user_prompt: str,
    schema_name: str,
    schema: dict[str, Any],
) -> dict[str, Any]:
    if not OPENAI_API_KEY:
        raise AIServiceError("OPENAI_API_KEY is not set")

    payload = {
        "model": OPENAI_MODEL,
        "input": [
            {
                "role": "system",
                "content": system_prompt,
            },
            {
                "role": "user",
                "content": user_prompt,
            },
        ],
        "text": {
            "format": {
                "type": "json_schema",
                "name": schema_name,
                "schema": schema,
                "strict": True,
            }
        },
    }

    try:
        response = requests.post(
            OPENAI_API_URL,
            headers={
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=30,
        )
    except requests.RequestException as exc:
        raise AIServiceError(f"LLM request failed: {exc}") from exc

    if response.status_code >= 400:
        raise AIServiceError(
            f"LLM request failed: {response.status_code} {response.text}"
        )

    response_data = response.json()
    output_text = extract_response_text(response_data)

    try:
        return json.loads(output_text)
    except json.JSONDecodeError as exc:
        raise AIServiceError("LLM response was not valid JSON") from exc


def build_today_prompt(context: dict[str, Any]) -> str:
    return f"""
아래 데이터는 AI Team Sync Board의 현재 사용자 작업 정보다.

목표:
- 오늘 우선 처리할 작업을 요약한다.
- 게시판 작업 로그, GitHub 진행 상황, Notion 문서 제목을 함께 참고한다.
- 사용자가 바로 실행할 수 있는 next_action을 제안한다.

응답은 반드시 지정된 JSON Schema를 따라라.

데이터:
{json.dumps(context, ensure_ascii=False, default=str)}
""".strip()


def build_team_prompt(context: dict[str, Any]) -> str:
    return f"""
아래 데이터는 AI Team Sync Board의 팀 전체 진행 상황 정보다.

목표:
- 팀 전체 진행 상황을 요약한다.
- backend/frontend/ai/docs/github 등 영역별 진행 상황과 위험 요소를 정리한다.
- 막힌 점과 다음 액션을 제안한다.

응답은 반드시 지정된 JSON Schema를 따라라.

데이터:
{json.dumps(context, ensure_ascii=False, default=str)}
""".strip()


def generate_today_briefing(context: dict[str, Any]) -> dict[str, Any]:
    return call_llm_json(
        system_prompt=(
            "너는 팀 프로젝트 관리 보조 AI다. "
            "게시판 작업 로그, GitHub 진행 상황, Notion 문서를 근거로 "
            "오늘 할 일을 한국어로 간결하게 요약한다."
        ),
        user_prompt=build_today_prompt(context),
        schema_name="today_briefing",
        schema=TODAY_BRIEFING_SCHEMA,
    )


def generate_team_summary(context: dict[str, Any]) -> dict[str, Any]:
    return call_llm_json(
        system_prompt=(
            "너는 팀 프로젝트 관리 보조 AI다. "
            "팀 전체 작업 로그, GitHub 진행 상황, Notion 문서 목록을 근거로 "
            "팀 진행 상황과 병목, 다음 액션을 한국어로 요약한다."
        ),
        user_prompt=build_team_prompt(context),
        schema_name="team_summary",
        schema=TEAM_SUMMARY_SCHEMA,
    )


def fallback_today_briefing(
    context: dict[str, Any],
    reason: str,
) -> dict[str, Any]:
    board_items = context.get("board_items", [])
    blockers = [
        item.get("title", "")
        for item in board_items
        if item.get("type") == "blocker"
    ]

    priority_tasks = []

    for item in board_items[:5]:
        priority_tasks.append(
            {
                "title": item.get("title", "제목 없음"),
                "source": "board",
                "priority": item.get("priority", "medium"),
                "reason": f"게시판 상태가 {item.get('status', 'unknown')}입니다.",
            }
        )

    return {
        "summary": "LLM 호출에 실패해서 게시판 데이터 기반의 기본 요약을 반환합니다.",
        "priority_tasks": priority_tasks,
        "github_summary": f"GitHub issue {len(context.get('github_issues', []))}개, PR {len(context.get('github_prs', []))}개, commit {len(context.get('recent_commits', []))}개가 수집되었습니다.",
        "notion_references": [
            {
                "title": doc.get("title", "제목 없음"),
                "reason": "Notion 문서 목록에서 수집된 참고 문서입니다.",
            }
            for doc in context.get("notion_docs", [])[:5]
        ],
        "blockers": blockers,
        "next_action": "우선 high priority 또는 blocked 상태의 게시글을 확인하세요.",
        "data_warnings": context.get("warnings", []) + [reason],
    }


def fallback_team_summary(
    context: dict[str, Any],
    reason: str,
) -> dict[str, Any]:
    board_items = context.get("board_items", [])
    blockers = [
        item.get("title", "")
        for item in board_items
        if item.get("type") == "blocker"
    ]

    return {
        "summary": "LLM 호출에 실패해서 수집 데이터 개수 기반의 기본 팀 요약을 반환합니다.",
        "by_area": [
            {
                "area": "board",
                "progress": f"게시판 작업 로그 {len(board_items)}개가 수집되었습니다.",
                "risk": "blocked 상태의 작업을 먼저 확인해야 합니다.",
            },
            {
                "area": "github",
                "progress": f"open issue {len(context.get('github_issues', []))}개, open PR {len(context.get('github_prs', []))}개, recent commit {len(context.get('recent_commits', []))}개가 수집되었습니다.",
                "risk": "열린 PR과 미해결 issue가 병목인지 확인해야 합니다.",
            },
            {
                "area": "notion",
                "progress": f"Notion 문서 {len(context.get('notion_docs', []))}개가 수집되었습니다.",
                "risk": "최근 변경된 정책 문서가 코드에 반영되었는지 확인해야 합니다.",
            },
        ],
        "blockers": blockers,
        "recommended_actions": [
            "blocked 게시글을 먼저 확인하세요.",
            "open PR 리뷰 상태를 확인하세요.",
            "Notion 문서와 실제 구현 상태가 일치하는지 확인하세요.",
        ],
        "github_summary": "GitHub 데이터는 수집되었지만 LLM 요약은 실패했습니다.",
        "notion_summary": "Notion 문서 목록은 수집되었지만 LLM 요약은 실패했습니다.",
        "data_warnings": context.get("warnings", []) + [reason],
    }