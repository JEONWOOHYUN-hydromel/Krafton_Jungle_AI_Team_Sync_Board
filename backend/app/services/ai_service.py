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
