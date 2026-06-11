import os
from typing import Any

import requests
from dotenv import load_dotenv

load_dotenv()

NOTION_API_BASE_URL = "https://api.notion.com/v1"


class NotionConfigError(Exception):
    pass


class NotionAPIError(Exception):
    def __init__(self, status_code: int, message: str):
        self.status_code = status_code
        self.message = message
        super().__init__(message)


def get_notion_config() -> dict[str, str | None]:
    api_key = os.getenv("NOTION_API_KEY")
    notion_version = os.getenv("NOTION_VERSION", "2022-06-28")
    database_id = os.getenv("NOTION_DATABASE_ID")
    page_id = os.getenv("NOTION_PAGE_ID")

    if not api_key:
        raise NotionConfigError("NOTION_API_KEY must be set")

    if not database_id and not page_id:
        raise NotionConfigError(
            "Either NOTION_DATABASE_ID or NOTION_PAGE_ID must be set"
        )

    return {
        "api_key": api_key,
        "notion_version": notion_version,
        "database_id": database_id,
        "page_id": page_id,
    }


def notion_headers() -> dict[str, str]:
    config = get_notion_config()

    return {
        "Authorization": f"Bearer {config['api_key']}",
        "Notion-Version": config["notion_version"] or "2022-06-28",
        "Content-Type": "application/json",
    }


def request_notion(
    method: str,
    path: str,
    json_body: dict[str, Any] | None = None,
    params: dict[str, Any] | None = None,
) -> Any:
    url = f"{NOTION_API_BASE_URL}{path}"

    try:
        response = requests.request(
            method=method,
            url=url,
            headers=notion_headers(),
            json=json_body,
            params=params,
            timeout=10,
        )
    except requests.RequestException as exc:
        raise NotionAPIError(502, f"Notion request failed: {exc}") from exc

    if response.status_code >= 400:
        try:
            error_data = response.json()
            message = error_data.get("message", response.text)
        except ValueError:
            message = response.text

        raise NotionAPIError(response.status_code, message)

    return response.json()


def extract_plain_text(rich_text_items: list[dict[str, Any]] | None) -> str:
    if not rich_text_items:
        return ""

    return "".join(item.get("plain_text", "") for item in rich_text_items)


def extract_title_from_page(page: dict[str, Any]) -> str:
    properties = page.get("properties", {})

    for property_value in properties.values():
        if property_value.get("type") == "title":
            title_items = property_value.get("title", [])
            title = extract_plain_text(title_items)

            if title:
                return title

    return "Untitled"


def block_to_text(block: dict[str, Any]) -> str:
    block_type = block.get("type")
    block_value = block.get(block_type, {})

    if block_type in {
        "paragraph",
        "heading_1",
        "heading_2",
        "heading_3",
        "bulleted_list_item",
        "numbered_list_item",
        "quote",
        "callout",
        "toggle",
    }:
        return extract_plain_text(block_value.get("rich_text", []))

    if block_type == "to_do":
        checked = block_value.get("checked", False)
        prefix = "[x]" if checked else "[ ]"
        text = extract_plain_text(block_value.get("rich_text", []))
        return f"{prefix} {text}"

    if block_type == "child_page":
        return block_value.get("title", "")

    if block_type == "code":
        return extract_plain_text(block_value.get("rich_text", []))

    return ""


def retrieve_page(page_id: str) -> dict[str, Any]:
    return request_notion("GET", f"/pages/{page_id}")


def list_block_children(block_id: str, page_size: int = 100) -> list[dict[str, Any]]:
    results = []
    start_cursor = None

    while True:
        params: dict[str, Any] = {
            "page_size": page_size,
        }

        if start_cursor:
            params["start_cursor"] = start_cursor

        data = request_notion(
            "GET",
            f"/blocks/{block_id}/children",
            params=params,
        )

        results.extend(data.get("results", []))

        if not data.get("has_more"):
            break

        start_cursor = data.get("next_cursor")

    return results


def get_page_content(page_id: str) -> str:
    blocks = list_block_children(page_id)
    lines = []

    for block in blocks:
        text = block_to_text(block)

        if text:
            lines.append(text)

    return "\n".join(lines)


def list_docs_from_database(
    page_size: int = 20,
    start_cursor: str | None = None,
) -> dict[str, Any]:
    config = get_notion_config()
    database_id = config["database_id"]

    if not database_id:
        raise NotionConfigError("NOTION_DATABASE_ID must be set")

    body: dict[str, Any] = {
        "page_size": page_size,
        "sorts": [
            {
                "timestamp": "last_edited_time",
                "direction": "descending",
            }
        ],
    }

    if start_cursor:
        body["start_cursor"] = start_cursor

    data = request_notion(
        "POST",
        f"/databases/{database_id}/query",
        json_body=body,
    )

    docs = []

    for page in data.get("results", []):
        docs.append(
            {
                "page_id": page["id"],
                "title": extract_title_from_page(page),
                "url": page.get("url"),
                "last_edited_time": page.get("last_edited_time"),
            }
        )

    return {
        "items": docs,
        "next_cursor": data.get("next_cursor"),
        "has_more": data.get("has_more", False),
    }


def list_docs_from_page() -> dict[str, Any]:
    config = get_notion_config()
    page_id = config["page_id"]

    if not page_id:
        raise NotionConfigError("NOTION_PAGE_ID must be set")

    blocks = list_block_children(page_id)
    docs = []

    for block in blocks:
        if block.get("type") != "child_page":
            continue

        child_page = block.get("child_page", {})

        docs.append(
            {
                "page_id": block["id"],
                "title": child_page.get("title", "Untitled"),
                "url": None,
                "last_edited_time": block.get("last_edited_time"),
            }
        )

    return {
        "items": docs,
        "next_cursor": None,
        "has_more": False,
    }


def list_notion_docs(
    page_size: int = 20,
    start_cursor: str | None = None,
) -> dict[str, Any]:
    config = get_notion_config()

    if config["database_id"]:
        return list_docs_from_database(
            page_size=page_size,
            start_cursor=start_cursor,
        )

    return list_docs_from_page()


def get_notion_doc_detail(page_id: str) -> dict[str, Any]:
    page = retrieve_page(page_id)
    content = get_page_content(page_id)

    return {
        "page_id": page["id"],
        "title": extract_title_from_page(page),
        "url": page.get("url"),
        "last_edited_time": page.get("last_edited_time"),
        "content": content,
    }