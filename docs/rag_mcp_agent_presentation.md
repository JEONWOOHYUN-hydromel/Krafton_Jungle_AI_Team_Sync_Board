# RAG, MCP, Agent 구현 설명 자료

내일 팀원들에게 설명할 때는 CRUD와 로그인은 이미 익숙한 부분이므로 짧게 넘기고, AI 쪽은 아래 순서로 설명하면 된다.

1. RAG: 우리 서비스 데이터로 답변하게 만드는 검색 + 생성 구조
2. MCP: GitHub, Notion 같은 외부 기능을 AI가 호출할 수 있는 tool 형태로 감싼 구조
3. Agent: RAG와 MCP tool을 조합해서 "오늘 할 일"과 "팀 현황"을 정리하는 실행 흐름

주의할 점:

- 현재 브랜치에는 RAG 구현이 포함되어 있다.
- MCP/Agent 구현은 `3cbd03b Add MCP tools for AI agents` 커밋 기준 코드에 들어 있었다.
- 그래서 발표할 때는 "RAG는 현재 브랜치에서 바로 확인 가능하고, MCP/Agent는 별도 커밋에서 구현한 구조"라고 말하면 안전하다.

---

## 1. 전체 구조 한 번에 보기

서비스 전체를 아주 단순하게 그리면 이렇게 볼 수 있다.

```text
Frontend
  |
  | 1. 문서 동기화 요청
  |    POST /ai/sync-documents
  v
FastAPI Backend
  |
  | 2. Notion 문서 + 게시판 글 수집
  | 3. 문서를 chunk로 자름
  | 4. OpenAI Embedding API로 벡터 생성
  v
PostgreSQL + pgvector
  |
  | 5. 질문이 들어오면 질문도 embedding으로 변환
  | 6. document_embeddings에서 가까운 chunk 검색
  v
OpenAI Responses API
  |
  | 7. 검색된 근거 chunk만 넣고 답변 생성
  v
Frontend
```

MCP/Agent까지 포함하면 이렇게 확장된다.

```text
Agent
  |
  |-- 게시판 DB 조회
  |-- RAG 검색 호출
  |-- MCP tool 호출
        |-- GitHub issue 조회
        |-- GitHub PR 조회
        |-- 최근 commit 조회
        |-- Notion 문서 검색
  |
  v
LLM에게 agent state 전달
  |
  v
오늘 브리핑 / 팀 요약 JSON 생성
```

---

## 2. CRUD와 로그인은 어디까지 설명하면 되나

CRUD와 로그인은 자세히 설명하지 않아도 된다. 발표에서는 이렇게만 말하면 충분하다.

- 로그인은 JWT 토큰 기반이다.
- AI API도 일반 게시글 API처럼 `Authorization: Bearer <token>`을 요구한다.
- RAG나 Agent는 로그인한 사용자를 기준으로 실행된다.
- 게시판 글은 RAG의 검색 대상에도 들어간다.

핵심은 "로그인/CRUD는 기반 기능이고, AI 기능은 그 위에 올라간다"는 점이다.

---

## 3. RAG를 왜 만들었나

LLM은 기본적으로 우리 팀의 Notion 문서나 게시판 글을 모른다. 그냥 질문만 보내면 모델은 일반적인 답변을 하거나 추측할 수 있다.

그래서 RAG를 붙였다.

RAG는 Retrieval-Augmented Generation의 약자다. 쉽게 말하면:

```text
답변하기 전에 먼저 관련 문서를 검색하고,
검색된 문서 조각을 근거로만 답변하게 만드는 방식
```

우리 서비스에서는 RAG가 다음 데이터를 본다.

- Notion 문서
- 게시판 posts

현재 구현 기준으로 GitHub issue, PR, commit은 RAG embedding 대상은 아니다. GitHub 데이터는 AI 브리핑이나 Agent에서 별도로 조회한다.

---

## 4. RAG DB 구조

관련 SQL은 `backend/sql/005_create_rag_tables.sql`에 있다.

핵심 테이블은 두 개다.

```sql
CREATE TABLE IF NOT EXISTS notion_documents (
    id SERIAL PRIMARY KEY,
    notion_page_id VARCHAR(100) NOT NULL UNIQUE,
    title TEXT NOT NULL,
    url TEXT,
    content TEXT NOT NULL DEFAULT '',
    last_edited_time TIMESTAMP,
    last_synced_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

`notion_documents`는 Notion에서 가져온 원문 문서를 저장한다.

```sql
CREATE TABLE IF NOT EXISTS document_embeddings (
    id SERIAL PRIMARY KEY,
    source_type VARCHAR(30) NOT NULL,
    source_id VARCHAR(100) NOT NULL,
    source_title TEXT,
    source_url TEXT,
    chunk_index INTEGER NOT NULL,
    chunk_text TEXT NOT NULL,
    embedding vector(1536) NOT NULL,
    metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

`document_embeddings`는 실제 검색에 쓰이는 테이블이다.

중요한 컬럼:

- `source_type`: `notion`인지 `post`인지 구분한다.
- `source_id`: Notion page id 또는 게시글 id다.
- `chunk_text`: 잘게 나눈 문서 조각이다.
- `embedding`: OpenAI embedding 결과 벡터다.
- `metadata_json`: 문서의 부가 정보를 저장한다.

검색 속도를 위해 pgvector 인덱스도 만든다.

```sql
CREATE INDEX IF NOT EXISTS idx_document_embeddings_embedding_cosine
ON document_embeddings
USING hnsw (embedding vector_cosine_ops);
```

발표 멘트:

> "문서 전체를 한 번에 LLM에 넣지 않고, 문서를 작은 chunk로 나눈 다음 각 chunk를 숫자 벡터로 저장했습니다. 질문도 같은 방식으로 벡터화해서 가장 비슷한 chunk를 찾습니다."

---

## 5. RAG 동기화 흐름

프론트에서는 `frontend/src/pages/RagPage.jsx`에서 동기화 버튼을 누른다.

```jsx
const data = await syncDocuments({
  notion_limit: 10,
  post_limit: 50,
})
```

API 호출 코드는 `frontend/src/api/ragApi.js`에 있다.

```js
export async function syncDocuments(syncData) {
  const response = await fetch(`${API_BASE_URL}/ai/sync-documents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(syncData),
  })

  return response.json()
}
```

백엔드 라우터는 `backend/app/routers/ai.py`의 `/ai/sync-documents`다.

```python
@router.post("/sync-documents")
def sync_documents(
    request: SyncDocumentsRequest,
    current_user: dict = Depends(get_current_user),
):
    return sync_all_documents(
        notion_limit=request.notion_limit,
        post_limit=request.post_limit,
    )
```

실제 동기화는 `backend/app/services/rag_service.py`의 `sync_all_documents()`에서 시작한다.

```python
def sync_all_documents(
    notion_limit: int = 20,
    post_limit: int = 100,
) -> dict[str, Any]:
    result["notion"] = sync_notion_documents(limit=notion_limit)
    result["posts"] = sync_board_posts(limit=post_limit)
```

즉 한 번의 동기화 요청으로 두 종류의 데이터를 같이 처리한다.

```text
/ai/sync-documents
  -> sync_all_documents()
      -> sync_notion_documents()
      -> sync_board_posts()
```

---

## 6. Notion 문서 수집

Notion 연동 코드는 `backend/app/services/notion_service.py`에 있다.

Notion 문서 목록은 이렇게 가져온다.

```python
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
```

Notion 문서 상세는 page 정보를 가져오고, block children을 텍스트로 바꿔서 만든다.

```python
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
```

이렇게 가져온 문서는 `rag_service.py`에서 DB에 upsert한다.

```python
def upsert_notion_document(cur, doc: dict[str, Any]):
    cur.execute(
        """
        INSERT INTO notion_documents (
            notion_page_id,
            title,
            url,
            content,
            last_edited_time,
            last_synced_at,
            updated_at
        )
        VALUES (%s, %s, %s, %s, %s, NOW(), NOW())
        ON CONFLICT (notion_page_id)
        DO UPDATE SET
            title = EXCLUDED.title,
            url = EXCLUDED.url,
            content = EXCLUDED.content,
            last_edited_time = EXCLUDED.last_edited_time,
            last_synced_at = NOW(),
            updated_at = NOW()
        RETURNING id
        """
    )
```

발표 멘트:

> "Notion API에서 문서 목록을 가져오고, 각 페이지의 block을 plain text로 변환했습니다. 같은 문서가 다시 동기화되면 중복 insert가 아니라 upsert로 최신 내용만 갱신합니다."

---

## 7. 게시판 글도 RAG에 넣은 이유

RAG가 Notion만 보면 공식 문서는 잘 답하지만, 실제 팀원이 오늘 어떤 작업을 했는지는 모른다.

그래서 게시판 posts도 RAG source로 넣었다.

`backend/app/services/rag_service.py`:

```python
def fetch_board_posts(limit: int = 100) -> list[dict[str, Any]]:
    cur.execute(
        """
        SELECT
            id,
            user_id,
            type,
            title,
            content,
            status,
            priority,
            due_date,
            created_at,
            updated_at
        FROM posts
        WHERE type IN ('daily_log', 'task', 'blocker', 'discussion')
        ORDER BY updated_at DESC
        LIMIT %s
        """
    )
```

게시글은 RAG용 문장으로 바꾼다.

```python
def build_post_document_text(post: dict[str, Any]) -> str:
    return f"""
게시글 ID: {post["id"]}
제목: {post["title"]}
타입: {post["type"]}
상태: {post["status"]}
우선순위: {post["priority"]}
마감일: {post.get("due_date")}
내용:
{post["content"]}
""".strip()
```

그 다음 `source_type="post"`로 embedding을 저장한다.

```python
insert_embedding_chunk(
    cur,
    source_type="post",
    source_id=source_id,
    source_title=source_title,
    source_url=source_url,
    chunk_index=chunk_index,
    chunk_text_value=chunk,
    metadata={
        "post_type": post["type"],
        "status": post["status"],
        "priority": post["priority"],
        "updated_at": str(post["updated_at"]),
    },
)
```

발표 멘트:

> "Notion은 공식 문서 역할이고, posts는 실제 작업 로그 역할입니다. 그래서 RAG가 문서 지식과 현재 진행 상황을 같이 참고할 수 있습니다."

---

## 8. Chunking과 Embedding

문서를 통째로 embedding하지 않고 chunk로 나누는 이유:

- 긴 문서는 검색 정확도가 떨어질 수 있다.
- LLM context에 전체 문서를 넣으면 비용이 커진다.
- 작은 chunk 단위로 검색해야 질문과 더 정확히 맞는 부분을 찾을 수 있다.

`backend/app/services/rag_service.py`:

```python
def chunk_text(text: str, chunk_size: int = 900, overlap: int = 150) -> list[str]:
    cleaned_text = " ".join(text.split())

    chunks = []
    start = 0

    while start < len(cleaned_text):
        end = start + chunk_size
        chunk = cleaned_text[start:end].strip()

        if chunk:
            chunks.append(chunk)

        if end >= len(cleaned_text):
            break

        start = end - overlap

    return chunks
```

여기서 `overlap=150`을 둔 이유는 chunk 경계에서 문맥이 끊기는 문제를 줄이기 위해서다.

Embedding 생성은 `backend/app/services/embedding_service.py`에서 한다.

```python
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")
EMBEDDING_DIMENSIONS = int(os.getenv("EMBEDDING_DIMENSIONS", "1536"))
```

```python
def create_embedding(text: str) -> list[float]:
    payload = {
        "model": EMBEDDING_MODEL,
        "input": cleaned_text,
        "dimensions": EMBEDDING_DIMENSIONS,
    }

    response = requests.post(
        OPENAI_EMBEDDINGS_URL,
        headers={
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=30,
    )

    embedding = data["data"][0]["embedding"]
    return embedding
```

pgvector에 넣기 위해 Python list를 문자열 형태로 바꾼다.

```python
def vector_to_pgvector(embedding: list[float]) -> str:
    return "[" + ",".join(str(value) for value in embedding) + "]"
```

발표 멘트:

> "Embedding은 텍스트를 의미가 담긴 숫자 배열로 바꾸는 과정입니다. 질문과 문서 chunk를 같은 모델로 embedding하면, 벡터 거리가 가까울수록 의미가 비슷하다고 볼 수 있습니다."

---

## 9. RAG 질문 흐름

프론트에서 질문하면 `frontend/src/api/ragApi.js`가 `/ai/ask-docs`를 호출한다.

```js
export async function askDocs(questionData) {
  const response = await fetch(`${API_BASE_URL}/ai/ask-docs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(questionData),
  })

  return response.json()
}
```

백엔드 라우터:

```python
@router.post("/ask-docs")
def ask_documents(
    request: AskDocsRequest,
    current_user: dict = Depends(get_current_user),
):
    question = request.question.strip()

    if not question:
        raise HTTPException(status_code=400, detail="Question is required")

    return ask_docs(
        question=question,
        top_k=request.top_k,
    )
```

핵심은 `ask_docs()`다.

```python
def ask_docs(question: str, top_k: int = 5) -> dict[str, Any]:
    references = search_similar_chunks(question=question, top_k=top_k)

    context_text = "\n\n".join(
        f"""
[reference {index + 1}]
source_type: {ref["source_type"]}
source_id: {ref["source_id"]}
source_title: {ref["source_title"]}
source_url: {ref["source_url"]}
similarity: {ref["similarity"]}
chunk:
{ref["chunk_text"]}
""".strip()
        for index, ref in enumerate(references)
    )
```

검색된 chunk를 `references`로 묶어서 LLM prompt에 넣는다.

```python
return call_llm_json(
    system_prompt=(
        "너는 AI Team Sync Board의 RAG 답변 도우미다. "
        "Notion 공식 문서와 게시판 작업 로그에서 검색된 근거만 사용해서 답한다."
    ),
    user_prompt=user_prompt,
    schema_name="rag_answer",
    schema=RAG_ANSWER_SCHEMA,
)
```

여기서 중요한 점은 "검색된 근거만 사용하라"는 제한을 둔 것이다.

---

## 10. Vector Search 쿼리

질문도 embedding으로 바꾼 뒤 `document_embeddings`에서 가장 가까운 chunk를 찾는다.

`backend/app/services/rag_service.py`:

```python
def search_similar_chunks(question: str, top_k: int = 5) -> list[dict[str, Any]]:
    query_embedding = create_embedding(question)
    query_vector = vector_to_pgvector(query_embedding)

    cur.execute(
        """
        SELECT
            id,
            source_type,
            source_id,
            source_title,
            source_url,
            chunk_index,
            chunk_text,
            1 - (embedding <=> %s::vector) AS similarity
        FROM document_embeddings
        ORDER BY embedding <=> %s::vector
        LIMIT %s
        """,
        (
            query_vector,
            query_vector,
            top_k,
        ),
    )
```

`embedding <=> query_vector`는 pgvector의 cosine distance 연산이다.

- 거리가 가까울수록 더 유사하다.
- `ORDER BY embedding <=> query_vector`로 가장 비슷한 chunk를 먼저 가져온다.
- `1 - distance`를 similarity로 보여준다.

발표 멘트:

> "RAG의 핵심은 이 SQL입니다. 질문을 벡터로 만들고, DB에 저장된 chunk 벡터와 비교해서 가장 가까운 top_k개를 가져옵니다."

---

## 11. 답변을 JSON Schema로 고정한 이유

RAG 답변 스키마는 `RAG_ANSWER_SCHEMA`로 정의했다.

```python
RAG_ANSWER_SCHEMA = {
    "type": "object",
    "properties": {
        "answer": {"type": "string"},
        "references": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "source_type": {"type": "string"},
                    "source_id": {"type": "string"},
                    "source_title": {"type": "string"},
                    "source_url": {"type": ["string", "null"]},
                    "reason": {"type": "string"},
                },
            },
        },
        "confidence": {"type": "string"},
        "warnings": {
            "type": "array",
            "items": {"type": "string"},
        },
    },
}
```

LLM이 자유 형식 텍스트만 주면 프론트에서 references를 예쁘게 보여주기 어렵다.

그래서 답변을 다음 형태로 고정했다.

```json
{
  "answer": "답변 본문",
  "references": [
    {
      "source_type": "notion",
      "source_id": "...",
      "source_title": "...",
      "source_url": "...",
      "reason": "왜 이 문서를 참고했는지"
    }
  ],
  "confidence": "high",
  "warnings": []
}
```

발표 멘트:

> "AI가 말은 잘하지만 화면에 안정적으로 보여주려면 응답 구조가 고정돼야 합니다. 그래서 OpenAI Responses API에 JSON Schema를 넘겨서 항상 같은 형태로 받게 했습니다."

---

## 12. RAG 예외 처리

OpenAI API가 실패할 수 있고, embedding 생성이 실패할 수도 있다. 그래서 fallback을 만들었다.

```python
def fallback_rag_answer(
    question: str,
    references: list[dict[str, Any]],
    reason: str,
) -> dict[str, Any]:
    if not references:
        return {
            "answer": "관련 문서를 찾지 못했습니다. 먼저 /ai/sync-documents를 실행해 문서와 게시글을 동기화하세요.",
            "references": [],
            "confidence": "low",
            "warnings": [reason],
        }
```

LLM 호출만 실패하고 검색 결과는 있으면, 검색된 reference라도 보여준다.

```python
return {
    "answer": "LLM 호출에 실패해서 검색된 reference 일부만 반환합니다.",
    "references": [...],
    "confidence": "low",
    "warnings": [reason],
}
```

발표 멘트:

> "AI API가 실패해도 화면이 완전히 깨지지 않도록 fallback을 넣었습니다. 최소한 검색된 reference는 확인할 수 있습니다."

---

## 13. MCP는 왜 필요했나

MCP는 Model Context Protocol이다. 쉽게 말하면 AI가 외부 기능을 직접 알 필요 없이, 정해진 tool 목록을 보고 호출할 수 있게 하는 규격이다.

우리 프로젝트에서 MCP를 붙인 이유는:

- GitHub issue, PR, commit 조회를 AI가 필요할 때 호출하게 하기 위해
- Notion 문서 검색을 tool로 만들기 위해
- tool 호출 결과와 실패 로그를 남기기 위해
- Agent가 API별 세부 구현을 몰라도 되게 하기 위해

RAG와 MCP의 차이는 이렇게 설명하면 쉽다.

```text
RAG
  - 이미 저장해 둔 문서 chunk를 검색한다.
  - "우리 DB 안의 지식 검색"에 가깝다.

MCP
  - GitHub, Notion 같은 외부 기능을 tool로 호출한다.
  - "필요한 행동 또는 조회를 실행"하는 쪽에 가깝다.
```

---

## 14. MCP 서버 구조

MCP 구현은 `3cbd03b` 커밋 기준으로 다음 파일에 있었다.

```text
backend/app/mcp_server/server.py
backend/app/mcp_server/tools/github_tools.py
backend/app/mcp_server/tools/notion_tools.py
backend/app/services/mcp_client.py
backend/app/routers/mcp.py
backend/sql/006_create_mcp_tool_logs.sql
```

`server.py`의 핵심은 tool registry다.

```python
TOOLS: dict[str, dict[str, Any]] = {
    "list_github_issues": {
        "description": "GitHub issue 목록을 조회합니다.",
        "inputSchema": {...},
        "handler": tool_list_github_issues,
    },
    "list_github_pull_requests": {
        "description": "GitHub Pull Request 목록을 조회합니다.",
        "inputSchema": {...},
        "handler": tool_list_github_pull_requests,
    },
    "list_recent_commits": {
        "description": "GitHub 최근 commit 목록을 조회합니다.",
        "inputSchema": {...},
        "handler": tool_list_recent_commits,
    },
    "search_notion_docs": {
        "description": "Notion 문서를 검색합니다.",
        "inputSchema": {...},
        "handler": tool_search_notion_docs,
    },
    "get_notion_page": {
        "description": "Notion page_id로 문서 상세 내용을 조회합니다.",
        "inputSchema": {...},
        "handler": tool_get_notion_page,
    },
}
```

발표 멘트:

> "여기서 tool registry는 메뉴판 같은 역할입니다. Agent는 GitHub API 주소를 직접 몰라도, list_github_issues라는 tool 이름과 인자만 알면 실행할 수 있습니다."

---

## 15. MCP JSON-RPC 처리

MCP 서버는 JSON-RPC 형태의 요청을 받는다.

`tools/list` 요청은 사용 가능한 tool 목록을 반환한다.

```python
if method == "tools/list":
    return jsonrpc_success(
        request_id=request_id,
        result=list_tools(),
    )
```

`tools/call` 요청은 tool 이름과 arguments를 받아 실제 handler를 실행한다.

```python
if method == "tools/call":
    tool_name = params.get("name")
    arguments = params.get("arguments") or {}

    result = call_tool(
        name=tool_name,
        arguments=arguments,
    )

    return jsonrpc_success(
        request_id=request_id,
        result=result,
    )
```

알 수 없는 method면 JSON-RPC 에러를 반환한다.

```python
return jsonrpc_error(
    request_id=request_id,
    code=-32601,
    message=f"Method not found: {method}",
)
```

발표 멘트:

> "MCP 서버는 크게 두 가지를 지원합니다. tool 목록을 알려주는 tools/list, 그리고 특정 tool을 실행하는 tools/call입니다."

---

## 16. MCP tool 구현

GitHub tool은 기존 `github_service.py` 함수를 감싼다.

`backend/app/mcp_server/tools/github_tools.py`:

```python
def tool_list_github_issues(
    state: str = "open",
    assignee: str | None = None,
    labels: str | None = None,
    page: int = 1,
    per_page: int = 20,
) -> dict[str, Any]:
    items = list_github_issues(
        state=state,
        assignee=assignee,
        labels=labels,
        page=page,
        per_page=per_page,
    )

    return {
        "items": items,
        "count": len(items),
    }
```

Notion tool은 동기화된 DB를 먼저 검색하고, 없으면 Notion API를 사용한다.

`backend/app/mcp_server/tools/notion_tools.py`:

```python
def tool_search_notion_docs(
    query: str = "",
    limit: int = 10,
) -> dict[str, Any]:
    query = query.strip()

    if query:
        synced_items = search_synced_notion_documents(
            query=query,
            limit=limit,
        )

        if synced_items:
            return {
                "items": synced_items,
                "count": len(synced_items),
                "source": "synced_db",
            }

    docs_response = list_notion_docs(page_size=limit)
    ...
```

발표 멘트:

> "tool은 최대한 작게 만들었습니다. 예를 들어 GitHub issue 조회 tool은 issue만 조회하고, PR 조회 tool은 PR만 조회합니다. 그래야 Agent가 어떤 tool을 왜 썼는지 추적하기 쉽습니다."

---

## 17. MCP Client와 로그

MCP client는 Agent나 FastAPI router가 MCP 서버를 쉽게 호출할 수 있게 해준다.

`backend/app/services/mcp_client.py`:

```python
def call_mcp_tool(
    *,
    name: str,
    arguments: dict[str, Any] | None = None,
    user_id: int | None = None,
) -> dict[str, Any]:
    response = handle_jsonrpc_request(
        {
            "jsonrpc": "2.0",
            "id": request_id,
            "method": "tools/call",
            "params": {
                "name": name,
                "arguments": arguments,
            },
        }
    )
```

성공하거나 실패하면 로그를 남긴다.

```python
log_tool_call(
    user_id=user_id,
    tool_name=name,
    arguments=arguments,
    success=True,
    result=result,
)
```

로그 테이블은 `backend/sql/006_create_mcp_tool_logs.sql`에 있었다.

```sql
CREATE TABLE IF NOT EXISTS mcp_tool_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    tool_name VARCHAR(100) NOT NULL,
    arguments_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    success BOOLEAN NOT NULL,
    error_message TEXT,
    result_preview TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

발표 멘트:

> "Agent가 어떤 tool을 어떤 인자로 호출했고 성공했는지 실패했는지 남겨야 디버깅할 수 있습니다. 그래서 MCP client 레벨에서 tool call 로그를 저장했습니다."

---

## 18. MCP API 라우터

MCP 기능을 직접 테스트할 수 있게 FastAPI 라우터도 있었다.

`backend/app/routers/mcp.py`:

```python
@router.get("/tools")
def get_tools(
    current_user: dict = Depends(get_current_user),
):
    return list_mcp_tools()
```

```python
@router.post("/tools/{tool_name}")
def call_tool(
    tool_name: str,
    arguments: dict[str, Any] = Body(default_factory=dict),
    current_user: dict = Depends(get_current_user),
):
    return call_mcp_tool(
        name=tool_name,
        arguments=arguments,
        user_id=current_user["id"],
    )
```

```python
@router.get("/logs")
def get_tool_logs(
    limit: int = Query(default=50, ge=1, le=200),
    current_user: dict = Depends(get_current_user),
):
    return get_mcp_tool_logs(limit=limit)
```

발표 멘트:

> "MCP는 Agent 내부에서만 쓰는 게 아니라, /mcp/tools로 목록을 보고 /mcp/tools/{tool_name}으로 직접 테스트할 수도 있게 했습니다."

---

## 19. Agent는 무엇을 하는가

여기서 Agent는 완전 자율 AI가 아니다.

우리 프로젝트의 Agent는 정해진 순서로 필요한 데이터를 모으고, 그 데이터를 LLM에게 정리하게 하는 실행기다.

쉽게 말하면:

```text
Agent = 데이터 수집 순서 + tool 호출 제한 + RAG 검색 + LLM 요약
```

Agent가 하는 일:

- 현재 사용자 또는 팀 전체 게시글을 DB에서 가져온다.
- GitHub issue, PR, commit을 MCP tool로 가져온다.
- Notion 문서 목록을 MCP tool로 가져온다.
- RAG에 질문해서 관련 문서 chunk를 가져온다.
- 이 모든 것을 agent state로 묶는다.
- LLM에게 state를 주고 정해진 JSON Schema로 요약하게 한다.

---

## 20. AgentToolRunner

`backend/app/services/agent_service.py`의 핵심 클래스는 `AgentToolRunner`다.

```python
MAX_AGENT_STEPS = 4
```

무한히 tool을 호출하지 않도록 최대 step을 제한했다.

```python
class AgentToolRunner:
    def __init__(self, user_id: int | None):
        self.user_id = user_id
        self.used_tools: set[str] = set()
        self.tool_logs: list[dict[str, Any]] = []
        self.warnings: list[str] = []
```

같은 tool 반복 호출도 막는다.

```python
def can_call_tool(self, tool_name: str) -> bool:
    if len(self.used_tools) >= MAX_AGENT_STEPS:
        self.warnings.append(
            f"max_steps={MAX_AGENT_STEPS} 제한으로 {tool_name} 호출을 건너뛰었습니다."
        )
        return False

    if tool_name in self.used_tools:
        self.warnings.append(
            f"같은 tool 반복 호출 방지로 {tool_name} 호출을 건너뛰었습니다."
        )
        return False

    return True
```

tool 호출은 MCP client를 통해 실행한다.

```python
result = call_mcp_tool(
    name=tool_name,
    arguments=arguments,
    user_id=self.user_id,
)
```

발표 멘트:

> "Agent가 멋대로 계속 tool을 호출하면 비용과 시간이 늘어나고 디버깅이 어려워집니다. 그래서 최대 호출 수와 중복 호출 방지를 넣었습니다."

---

## 21. Today Briefing Agent

오늘 브리핑 Agent는 로그인한 사용자 기준으로 실행된다.

`backend/app/services/agent_service.py`:

```python
def build_today_agent_state(current_user: dict[str, Any]) -> dict[str, Any]:
    runner = AgentToolRunner(user_id=current_user["id"])
    board_items = fetch_board_items_for_user(current_user["id"])
    github_username = current_user.get("github_username")
```

GitHub username이 있으면 담당 issue를 가져온다.

```python
github_issues_result = runner.call_tool(
    "list_github_issues",
    {
        "state": "open",
        "assignee": github_username,
        "per_page": 10,
    },
)
```

PR과 commit도 가져온다.

```python
github_prs_result = runner.call_tool(
    "list_github_pull_requests",
    {
        "state": "open",
        "per_page": 10,
    },
)

recent_commits_result = runner.call_tool(
    "list_recent_commits",
    {
        "per_page": 10,
    },
)
```

Notion 문서는 tool로 검색한다.

```python
notion_docs_result = runner.call_tool(
    "search_notion_docs",
    {
        "query": " ".join(item.get("title", "") for item in board_items[:5]),
        "limit": 10,
    },
)
```

그리고 RAG에도 질문한다.

```python
rag_question = make_rag_question_for_today(
    current_user=current_user,
    board_items=board_items,
)

rag_result = safe_ask_docs(
    question=rag_question,
    top_k=5,
    warnings=runner.warnings,
)
```

마지막으로 state를 만든다.

```python
state = {
    "agent_name": "today_briefing_agent",
    "date": str(date.today()),
    "user": {...},
    "board_items": board_items,
    "github_issues": github_issues_result.get("items", []),
    "github_prs": github_prs_result.get("items", []),
    "recent_commits": recent_commits_result.get("items", []),
    "notion_docs": notion_docs_result.get("items", []),
    "rag": rag_result,
    "blockers": extract_blockers(board_items),
    "tool_logs": runner.tool_logs,
    "warnings": runner.warnings + rag_result.get("warnings", []),
}
```

발표 멘트:

> "Today Agent는 한 명의 사용자를 위한 PM 비서입니다. 내 게시글, 내 GitHub issue, 열린 PR, 최근 commit, 관련 Notion/RAG 문서를 모아서 오늘 무엇을 해야 하는지 요약합니다."

---

## 22. Team Summary Agent

팀 요약 Agent는 사용자 한 명이 아니라 팀 전체를 본다.

```python
def build_team_agent_state(current_user: dict[str, Any]) -> dict[str, Any]:
    runner = AgentToolRunner(user_id=current_user["id"])
    board_items = fetch_board_items_for_team()
```

팀 기준 GitHub 데이터를 가져온다.

```python
github_issues_result = runner.call_tool(
    "list_github_issues",
    {
        "state": "open",
        "per_page": 20,
    },
)
```

팀 진행 상황과 관련된 RAG 질문을 만든다.

```python
rag_question = make_rag_question_for_team(board_items)

rag_result = safe_ask_docs(
    question=rag_question,
    top_k=8,
    warnings=runner.warnings,
)
```

이후 LLM에게 팀 요약 prompt를 보낸다.

```python
def run_team_summary_agent(current_user: dict[str, Any]) -> dict[str, Any]:
    state = build_team_agent_state(current_user)

    result = call_llm_json(
        system_prompt=(
            "너는 팀 프로젝트 관리 보조 AI Agent다. "
            "게시판, GitHub, Notion, RAG 검색 결과를 근거로 "
            "팀 진행 상황과 병목을 한국어로 요약한다."
        ),
        user_prompt=build_team_agent_prompt(state),
        schema_name="team_summary",
        schema=TEAM_SUMMARY_SCHEMA,
    )
```

발표 멘트:

> "Team Summary Agent는 팀 전체 PM 역할입니다. 게시판에서 팀 작업 흐름을 보고, GitHub에서 issue/PR/commit을 보고, RAG로 관련 문서를 찾아서 병목과 다음 액션을 요약합니다."

---

## 23. Agent API 연결

MCP/Agent 커밋에서는 기존 AI API가 직접 요약 함수가 아니라 Agent를 호출하도록 바뀌었다.

`backend/app/routers/ai.py`:

```python
@router.post("/today-briefing")
def create_today_briefing(current_user: dict = Depends(get_current_user)):
    return run_today_briefing_agent(current_user)
```

```python
@router.post("/team-summary")
def create_team_summary(current_user: dict = Depends(get_current_user)):
    return run_team_summary_agent(current_user)
```

현재 브랜치의 `today-briefing`, `team-summary`는 GitHub/Notion/게시판 데이터를 직접 모아 LLM에게 넘기는 방식이다. Agent 커밋에서는 그 수집 과정을 `AgentToolRunner`, MCP tool, RAG 조합으로 분리했다.

발표 멘트:

> "처음에는 API 안에서 직접 GitHub와 Notion을 조회했는데, Agent 구조에서는 이 부분을 tool 호출과 RAG 검색으로 분리했습니다. 이렇게 하면 나중에 tool이 늘어나도 Agent 흐름만 확장하면 됩니다."

---

## 24. RAG, MCP, Agent 관계 정리

세 개를 한 문장씩 정리하면:

```text
RAG
  저장된 문서와 게시글에서 관련 근거를 찾아 답변 품질을 높인다.

MCP
  GitHub, Notion 같은 외부 기능을 표준 tool 인터페이스로 감싼다.

Agent
  게시판 DB, RAG, MCP tool을 조합해서 목표에 맞는 결과를 만든다.
```

서로의 관계:

```text
Agent
  ├─ DB 직접 조회: 게시판 posts
  ├─ RAG 호출: 관련 문서 chunk 검색
  ├─ MCP 호출: GitHub/Notion tool 실행
  └─ LLM 호출: 최종 요약 생성
```

발표에서 이 그림을 꼭 보여주면 좋다.

---

## 25. 시연 순서 추천

시간이 5분 정도라면 이렇게 시연하면 된다.

1. 로그인한다.
2. `/rag` 페이지로 이동한다.
3. "문서 동기화 실행"을 누른다.
4. 동기화 결과에서 Notion 문서 수와 chunk 수를 보여준다.
5. 질문을 입력한다.
   - 예: "로그인 기능 구현할 때 참고해야 할 문서나 작업 로그 알려줘"
   - 예: "현재 blocker와 관련된 문서를 알려줘"
6. 답변과 references를 보여준다.
7. 설명한다.
   - "답변만 보여주는 것이 아니라 어떤 문서에서 근거를 찾았는지도 같이 보여줍니다."

MCP/Agent 커밋까지 시연한다면:

1. `/mcp/tools`로 tool 목록을 확인한다.
2. `list_github_issues` 같은 tool을 호출한다.
3. `/ai/today-briefing` 또는 `/ai/team-summary`를 호출한다.
4. 응답의 `agent_state.tool_logs`를 보여준다.
5. "Agent가 어떤 tool을 호출했는지 로그로 추적할 수 있습니다"라고 설명한다.

---

## 26. 예상 질문과 답변

### Q1. RAG는 Notion만 보나요?

아니다. 현재 RAG는 Notion 문서와 게시판 posts를 같이 본다.

```text
source_type = notion
source_type = post
```

다만 GitHub issue, PR, commit은 현재 RAG embedding 대상이 아니라 MCP/AI summary 쪽에서 따로 조회한다.

### Q2. 왜 GitHub는 RAG에 안 넣었나요?

GitHub 데이터는 자주 바뀐다. issue/PR/commit은 실시간성이 중요해서, 일단 MCP tool이나 GitHub API로 직접 조회하는 편이 더 단순하다.

나중에 오래 보관할 issue 본문이나 회고 데이터가 필요하면 GitHub도 `source_type="github_issue"` 같은 형태로 RAG에 넣을 수 있다.

### Q3. 왜 chunk를 나누나요?

긴 문서를 통째로 검색하면 질문과 정확히 맞는 부분을 찾기 어렵고, LLM에 넣는 비용도 커진다. 그래서 작은 chunk로 나눠 가장 관련 있는 부분만 넣는다.

### Q4. MCP랑 그냥 API 호출은 뭐가 다른가요?

그냥 API 호출은 백엔드 코드가 직접 `list_github_issues()`를 부르는 방식이다.

MCP는 tool 이름, 설명, input schema, handler를 registry에 등록한다. 그러면 Agent는 "어떤 외부 API인지"보다 "어떤 tool을 어떤 인자로 호출할지"에 집중할 수 있다.

### Q5. Agent가 마음대로 글을 쓰거나 수정하나요?

현재 구조는 read 중심이다. GitHub/Notion 조회 tool과 RAG 검색을 사용해 요약을 만든다. write tool은 구현하지 않았고, 만약 추가한다면 승인 절차가 필요하다.

### Q6. LLM이 틀린 말을 하면 어떻게 하나요?

RAG prompt에서 검색된 reference만 근거로 답하라고 제한했다. 그리고 응답에 `references`, `confidence`, `warnings`를 포함해서 사용자가 근거를 확인할 수 있게 했다.

### Q7. OpenAI API가 실패하면요?

fallback을 둬서 최소한 검색된 reference라도 반환한다. 완전히 실패하면 warnings에 실패 이유를 넣는다.

---

## 27. 발표용 1분 요약

마지막에 이렇게 정리하면 된다.

> 제가 구현한 AI 기능은 크게 RAG, MCP, Agent 세 부분입니다.
>
> RAG는 Notion 문서와 게시판 글을 chunk로 나누고 embedding으로 저장한 뒤, 질문과 의미가 가까운 chunk를 pgvector로 검색해서 그 근거만 LLM에게 넘기는 구조입니다.
>
> MCP는 GitHub issue, PR, commit, Notion 검색 같은 외부 기능을 tool로 감싸서 Agent가 표준화된 방식으로 호출할 수 있게 한 구조입니다.
>
> Agent는 게시판 DB, RAG 검색 결과, MCP tool 결과를 하나의 state로 모은 뒤 LLM에게 전달해서 오늘 브리핑이나 팀 요약을 생성합니다. 이때 tool 호출 수 제한, 중복 호출 방지, tool log 저장을 넣어서 추적 가능하게 만들었습니다.

---

## 28. 파일별 역할 정리

현재 브랜치 기준 RAG 관련 파일:

```text
backend/app/routers/ai.py
  /ai/sync-documents, /ai/ask-docs, /ai/today-briefing, /ai/team-summary

backend/app/services/rag_service.py
  문서 동기화, chunking, embedding 저장, vector search, RAG 답변 생성

backend/app/services/embedding_service.py
  OpenAI Embedding API 호출

backend/app/services/notion_service.py
  Notion 문서 목록/상세 조회

backend/sql/005_create_rag_tables.sql
  notion_documents, document_embeddings, pgvector index

frontend/src/pages/RagPage.jsx
  RAG 동기화/질문 UI

frontend/src/api/ragApi.js
  /ai/sync-documents, /ai/ask-docs 호출
```

MCP/Agent 커밋 기준 파일:

```text
backend/app/mcp_server/server.py
  MCP JSON-RPC 처리, tool registry

backend/app/mcp_server/tools/github_tools.py
  GitHub issue, PR, commit tool

backend/app/mcp_server/tools/notion_tools.py
  Notion search, page detail tool

backend/app/services/mcp_client.py
  MCP tool 호출, tool call 로그 저장

backend/app/routers/mcp.py
  /mcp/tools, /mcp/tools/{tool_name}, /mcp/logs

backend/app/services/agent_service.py
  today_briefing_agent, team_summary_agent

backend/sql/006_create_mcp_tool_logs.sql
  MCP tool call 로그 테이블
```

