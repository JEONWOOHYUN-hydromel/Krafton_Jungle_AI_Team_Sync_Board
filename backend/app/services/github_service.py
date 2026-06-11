import os
from typing import Any

import requests
from dotenv import load_dotenv

load_dotenv()

GITHUB_API_BASE_URL = "https://api.github.com"


class GitHubConfigError(Exception):
    pass


class GitHubAPIError(Exception):
    def __init__(self, status_code: int, message: str):
        self.status_code = status_code
        self.message = message
        super().__init__(message)


def get_github_config() -> dict[str, str | None]:
    owner = os.getenv("GITHUB_OWNER")
    repo = os.getenv("GITHUB_REPO")
    token = os.getenv("GITHUB_TOKEN")
    api_version = os.getenv("GITHUB_API_VERSION", "2022-11-28")

    if not owner or not repo:
        raise GitHubConfigError("GITHUB_OWNER and GITHUB_REPO must be set")

    return {
        "owner": owner,
        "repo": repo,
        "token": token,
        "api_version": api_version,
    }


def github_headers() -> dict[str, str]:
    config = get_github_config()

    headers = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": config["api_version"] or "2022-11-28",
        "User-Agent": "AI-Team-Sync-Board",
    }

    if config["token"]:
        headers["Authorization"] = f"Bearer {config['token']}"

    return headers


def request_github(path: str, params: dict[str, Any] | None = None) -> Any:
    url = f"{GITHUB_API_BASE_URL}{path}"

    try:
        response = requests.get(
            url,
            headers=github_headers(),
            params=params,
            timeout=10,
        )
    except requests.RequestException as exc:
        raise GitHubAPIError(502, f"GitHub request failed: {exc}") from exc

    if response.status_code >= 400:
        try:
            error_data = response.json()
            message = error_data.get("message", response.text)
        except ValueError:
            message = response.text

        if response.status_code == 403:
            remaining = response.headers.get("X-RateLimit-Remaining")
            reset = response.headers.get("X-RateLimit-Reset")

            if remaining == "0":
                message = f"GitHub API rate limit exceeded. reset={reset}"

        raise GitHubAPIError(response.status_code, message)

    return response.json()


def list_github_issues(
    state: str = "open",
    assignee: str | None = None,
    labels: str | None = None,
    page: int = 1,
    per_page: int = 20,
) -> list[dict[str, Any]]:
    config = get_github_config()

    params: dict[str, Any] = {
        "state": state,
        "page": page,
        "per_page": per_page,
        "sort": "updated",
        "direction": "desc",
    }

    if assignee:
        params["assignee"] = assignee

    if labels:
        params["labels"] = labels

    data = request_github(
        f"/repos/{config['owner']}/{config['repo']}/issues",
        params=params,
    )

    # GitHub Issues API는 PR도 issue 형태로 같이 반환할 수 있어서 pull_request가 있는 항목은 제외한다.
    issues = [item for item in data if "pull_request" not in item]

    return [
        {
            "number": issue["number"],
            "title": issue["title"],
            "state": issue["state"],
            "url": issue["html_url"],
            "user": issue["user"]["login"] if issue.get("user") else None,
            "assignees": [
                assignee["login"] for assignee in issue.get("assignees", [])
            ],
            "labels": [label["name"] for label in issue.get("labels", [])],
            "created_at": issue.get("created_at"),
            "updated_at": issue.get("updated_at"),
        }
        for issue in issues
    ]


def list_github_pull_requests(
    state: str = "open",
    page: int = 1,
    per_page: int = 20,
) -> list[dict[str, Any]]:
    config = get_github_config()

    data = request_github(
        f"/repos/{config['owner']}/{config['repo']}/pulls",
        params={
            "state": state,
            "page": page,
            "per_page": per_page,
            "sort": "updated",
            "direction": "desc",
        },
    )

    return [
        {
            "number": pull["number"],
            "title": pull["title"],
            "state": pull["state"],
            "url": pull["html_url"],
            "user": pull["user"]["login"] if pull.get("user") else None,
            "created_at": pull.get("created_at"),
            "updated_at": pull.get("updated_at"),
            "draft": pull.get("draft", False),
        }
        for pull in data
    ]


def list_recent_commits(
    sha: str | None = None,
    since: str | None = None,
    page: int = 1,
    per_page: int = 20,
) -> list[dict[str, Any]]:
    config = get_github_config()

    params: dict[str, Any] = {
        "page": page,
        "per_page": per_page,
    }

    if sha:
        params["sha"] = sha

    if since:
        params["since"] = since

    data = request_github(
        f"/repos/{config['owner']}/{config['repo']}/commits",
        params=params,
    )

    return [
        {
            "sha": commit["sha"][:7],
            "full_sha": commit["sha"],
            "message": commit["commit"]["message"],
            "author": (
                commit["author"]["login"]
                if commit.get("author")
                else commit["commit"]["author"].get("name")
            ),
            "url": commit["html_url"],
            "date": commit["commit"]["author"].get("date"),
        }
        for commit in data
    ]