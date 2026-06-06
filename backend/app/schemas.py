from datetime import date, datetime
from typing import Optional, Literal

from pydantic import BaseModel

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

class PostRead(BaseModel):
    id: int
    title: str
    content: str
    type: str
    status: str
    priority: str
    due_date: Optional[date] = None
    created_at: datetime
    updated_at: datetime
