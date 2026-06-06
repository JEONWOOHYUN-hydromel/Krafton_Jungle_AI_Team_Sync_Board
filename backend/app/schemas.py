from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel

class DBHealthResponse(BaseModel):
    status: str
    db: str
    result: int

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
