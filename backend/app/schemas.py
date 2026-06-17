from datetime import date, datetime
from typing import Optional, Literal

from pydantic import BaseModel, Field

class DBHealthResponse(BaseModel):
    status: str
    db: str
    result: int


class PostCreate(BaseModel):
    title: str
    content: str
    type: Literal[
        "daily_log",
        "task",
        "blocker",
        "discussion",
        "retrospective",
    ] = "task"
    status: Literal[
        "todo",
        "in_progress",
        "done",
        "blocked",
    ] = "todo"
    priority: Literal[
        "low",
        "medium",
        "high",
    ] = "medium"
    due_date: Optional[date] = None
    tags: list[str] = Field(default_factory=list)


class PostUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    type: Optional[
        Literal[
            "daily_log",
            "task",
            "blocker",
            "discussion",
            "retrospective",
        ]
    ] = None
    status: Optional[
        Literal[
            "todo",
            "in_progress",
            "done",
            "blocked",
        ]
    ] = None
    priority: Optional[
        Literal[
            "low",
            "medium",
            "high",
        ]
    ] = None
    due_date: Optional[date] = None
    tags: Optional[list[str]] = None


class PostRead(BaseModel):
    id: int
    user_id: Optional[int] = None
    title: str
    content: str
    type: str
    status: str
    priority: str
    due_date: Optional[date] = None
    created_at: datetime
    updated_at: datetime
    tags: list[str] = Field(default_factory=list)


class PostListResponse(BaseModel):
    items: list[PostRead]
    total: int
    page: int
    size: int
    total_pages: int

# authentication schemas
class SignupRequest(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=4, max_length=100)
    nickname: str = Field(min_length=1, max_length=100)
    github_username: Optional[str] = Field(default=None, max_length=100)


class UserRead(BaseModel):
    id: int
    email: str
    nickname: str
    github_username: Optional[str] = None
    role: str
    created_at: datetime


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=4, max_length=100)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str


class CommentCreate(BaseModel):
    content: str = Field(min_length=1)


class CommentRead(BaseModel):
    id: int
    post_id: int
    user_id: Optional[int] = None
    content: str
    created_at: datetime
    updated_at: datetime

class CommentUpdate(BaseModel):
    content: Optional[str] = Field(default=None, min_length=1)


class AskDocsRequest(BaseModel):
    question: str = Field(min_length=1)
    top_k: int = 5


class SyncDocumentsRequest(BaseModel):
    notion_limit: int = 20
    post_limit: int = 100
    github_issue_limit: int = 20
    github_pr_limit: int = 20
    github_commit_limit: int = 20
