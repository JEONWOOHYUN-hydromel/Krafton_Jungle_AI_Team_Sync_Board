from fastapi import APIRouter, HTTPException, Query

from app.services.notion_service import (
    NotionAPIError,
    NotionConfigError,
    get_notion_doc_detail,
    list_notion_docs,
)

router = APIRouter(
    prefix="/integrations/notion",
    tags=["Notion Integration"],
)


@router.get("/docs")
def get_notion_docs(
    page_size: int = Query(default=20, ge=1, le=100),
    start_cursor: str | None = None,
):
    try:
        return list_notion_docs(
            page_size=page_size,
            start_cursor=start_cursor,
        )
    except NotionConfigError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    except NotionAPIError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)


@router.get("/docs/{page_id}")
def get_notion_doc(page_id: str):
    try:
        return get_notion_doc_detail(page_id)
    except NotionConfigError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    except NotionAPIError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)