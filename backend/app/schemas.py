from pydantic import BaseModel

class DBHealthResponse(BaseModel):
    status: str
    db: str
    result: int