from fastapi import APIRouter, HTTPException, Query

from app.services.github_service import (
    GitHubAPIError,
    GitHubConfigError,
    list_github_issues,
    list_github_pull_requests,
    list_recent_commits,
)

router = APIRouter(
    prefix="/integrations/github",
    tags=["GitHub Integration"],
)


@router.get("/issues")
def get_github_issues(
    state: str = Query(default="open", pattern="^(open|closed|all)$"),
    assignee: str | None = None,
    labels: str | None = None,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
):
    try:
        return list_github_issues(
            state=state,
            assignee=assignee,
            labels=labels,
            page=page,
            per_page=per_page,
        )
    except GitHubConfigError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    except GitHubAPIError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)


@router.get("/pulls")
def get_github_pull_requests(
    state: str = Query(default="open", pattern="^(open|closed|all)$"),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
):
    try:
        return list_github_pull_requests(
            state=state,
            page=page,
            per_page=per_page,
        )
    except GitHubConfigError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    except GitHubAPIError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)


@router.get("/commits")
def get_github_commits(
    sha: str | None = None,
    since: str | None = None,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
):
    try:
        return list_recent_commits(
            sha=sha,
            since=since,
            page=page,
            per_page=per_page,
        )
    except GitHubConfigError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    except GitHubAPIError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)