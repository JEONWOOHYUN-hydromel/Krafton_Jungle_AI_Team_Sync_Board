# AI Team Sync Board 서비스 기획서

문서 버전: v0.1  
작성 목적: 개인 과제 기획 공유 및 구현 범위 합의  
프로젝트 유형: AI 응용 기술을 활용한 프로젝트 관리형 게시판

---

## 1. 프로젝트 개요

### 프로젝트명

**AI Team Sync Board**

### 한 줄 설명

**Notion의 공식 문서, GitHub의 개발 진행 상황, 게시판의 작업 로그를 AI Agent가 종합하여 개인별 오늘 할 일과 팀 전체 진행 상황을 요약해주는 AI 프로젝트 관리 게시판**

### 핵심 아이디어

팀 프로젝트를 진행할 때 정보는 보통 여러 도구에 흩어져 있습니다.

- Notion에는 기획서, 회의록, API 명세, 결정 사항이 있습니다.
- GitHub에는 코드, Issue, Pull Request, commit 기록이 있습니다.
- 개인의 실제 진행 상황, 막힌 점, 오늘 무엇을 하려 했는지는 별도 메모나 채팅에 흩어지거나 남지 않는 경우가 많습니다.

이 프로젝트는 이 문제를 해결하기 위해 **게시판을 팀원의 작업 로그 저장소로 사용**하고, AI가 Notion, GitHub, 게시판 데이터를 함께 분석해 **오늘 할 일과 팀 진행 상황을 요약**하는 서비스를 구현합니다.

---

## 2. 문제 정의

### 현재 팀 프로젝트 관리에서 생기는 문제

| 문제 | 설명 |
|---|---|
| 정보 분산 | Notion, GitHub, 채팅, 개인 메모에 정보가 나뉘어 있어 전체 상황 파악이 어렵습니다. |
| 진행 맥락 부족 | GitHub에는 코드 결과물은 남지만, 왜 막혔는지, 오늘 무엇을 시도했는지 같은 맥락은 잘 남지 않습니다. |
| 매일 확인 비용 증가 | 팀원이 Notion, GitHub, 회의록, Issue, PR을 매번 직접 확인해야 합니다. |
| 병목 파악 어려움 | 누가 어디서 막혔는지, 어떤 작업이 선행되어야 하는지 한눈에 보기 어렵습니다. |
| 문서 활용도 저하 | Notion 문서가 있어도 필요한 시점에 어떤 문서를 봐야 하는지 찾기 어렵습니다. |

### 해결 방향

이 프로젝트는 각 도구의 역할을 명확히 나눕니다.

| 도구 | 역할 |
|---|---|
| Notion | 공식 문서, 회의록, API 명세, ERD, 결정 사항 저장 |
| GitHub | 코드, Issue, Pull Request, commit, 리뷰 기록 저장 |
| 게시판 | Daily Log, Task, Blocker, Discussion 등 매일의 작업 맥락 저장 |
| AI Agent | 세 데이터 소스를 종합해 개인별 오늘 할 일과 팀 진행 상황 요약 |

---

## 3. 프로젝트 목표

### 기능적 목표

1. 팀원이 게시판에 작업 로그, 할 일, 막힌 점을 남길 수 있게 합니다.
2. 게시판에서 GitHub Issue, PR, commit 진행 상황을 확인할 수 있게 합니다.
3. 게시판에서 Notion 공식 문서를 조회하고 검색할 수 있게 합니다.
4. AI가 개인별 오늘 할 일을 요약해줍니다.
5. AI가 팀 전체 진행 상황, 병목, 다음 액션을 요약해줍니다.
6. RAG, MCP, Agent를 실제 서비스 흐름 안에서 자연스럽게 사용합니다.

### 학습/구현 목표

이번 과제의 요구사항에 맞춰 다음을 직접 구현합니다.

- React 기반 프론트엔드
- FastAPI 기반 백엔드
- PostgreSQL 기반 데이터베이스
- 게시판 CRUD, 댓글, 태그, 검색, 페이징
- Notion/GitHub 외부 API 연동
- RAG 기반 문서 검색
- MCP Server 기반 외부 도구 호출
- AI Agent 기반 작업 브리핑 생성

---

## 4. 주요 사용자

### 1차 사용자

**팀 프로젝트를 진행하는 개발 팀원**

주요 니즈:

- 오늘 내가 무엇을 해야 하는지 빠르게 알고 싶다.
- 다른 팀원이 어디까지 진행했는지 알고 싶다.
- GitHub와 Notion을 매번 따로 열지 않고 한 화면에서 보고 싶다.
- 막힌 점과 도움 요청을 남기고 싶다.

### 2차 사용자

**팀 리더 또는 프로젝트 진행 상황을 확인하는 사람**

주요 니즈:

- 전체 진행 상황을 빠르게 파악하고 싶다.
- 병목이 어디인지 알고 싶다.
- 누가 어떤 작업을 진행 중인지 보고 싶다.
- 오늘 우선순위가 무엇인지 확인하고 싶다.

---

## 5. 핵심 사용자 시나리오

### 시나리오 1. 개인 오늘 할 일 확인

1. 사용자가 로그인합니다.
2. 대시보드에서 **오늘 할 일 AI 요약** 버튼을 누릅니다.
3. AI Agent가 다음 정보를 조회합니다.
   - 사용자가 작성한 Daily Log, Task, Blocker
   - 사용자의 GitHub Issue, PR, commit
   - 관련 Notion 문서
4. AI가 오늘 우선순위, 참고 문서, 막힌 점, 다음 액션을 요약합니다.
5. 사용자는 게시판에서 바로 오늘의 작업 방향을 확인합니다.

예시 결과:

```json
{
  "summary": "오늘은 인증 기능 마무리와 게시글 권한 검사를 우선 처리하는 것이 좋습니다.",
  "priority_tasks": [
    {
      "title": "JWT 로그인 API 구현",
      "source": "GitHub Issue #12",
      "priority": "high",
      "reason": "프론트엔드 로그인 상태 연결의 선행 작업입니다."
    }
  ],
  "notion_references": [
    {
      "title": "로그인 정책 문서",
      "reason": "JWT 인증 구현 기준이 정리되어 있습니다."
    }
  ],
  "blockers": [
    "어제 Daily Log에 /auth/me 401 문제가 기록되어 있습니다."
  ],
  "next_action": "먼저 /auth/me API를 구현하고 React 로그인 상태 유지와 연결하세요."
}
```

---

### 시나리오 2. 팀 진행 상황 확인

1. 사용자가 대시보드에서 **팀 진행 상황 AI 요약** 버튼을 누릅니다.
2. AI Agent가 전체 게시판 작업 로그, GitHub Issue/PR/commit, Notion 회의록을 확인합니다.
3. AI가 팀 전체 진행 상황, 영역별 리스크, 병목, 추천 액션을 요약합니다.

예시 결과:

```json
{
  "summary": "현재 백엔드는 게시글 CRUD가 완료되었고 인증 기능을 구현 중입니다. 프론트엔드는 게시글 화면 구현이 진행 중이며 API 연결이 일부 남아 있습니다.",
  "by_area": [
    {
      "area": "backend",
      "progress": "게시글 CRUD 완료, JWT 로그인 구현 중",
      "risk": "인증 API가 늦어지면 댓글 권한 처리도 지연될 수 있습니다."
    },
    {
      "area": "frontend",
      "progress": "게시글 목록과 상세 UI 구현 중",
      "risk": "API 응답 형식 확정이 필요합니다."
    }
  ],
  "blockers": [
    "DB schema 변경 사항이 Notion에 아직 정리되지 않았습니다."
  ],
  "recommended_actions": [
    "auth API 응답 형식을 먼저 확정하세요.",
    "게시글과 댓글 권한 정책을 Notion에 업데이트하세요."
  ]
}
```

---

### 시나리오 3. 작업 로그 작성 및 협업

1. 팀원이 오늘의 작업 로그를 작성합니다.
2. 글 유형을 `Daily Log`, `Task`, `Blocker`, `Discussion` 중 선택합니다.
3. 상태, 우선순위, 태그, 마감일을 입력합니다.
4. 다른 팀원은 댓글로 피드백을 남깁니다.
5. 이후 AI가 이 작업 로그를 오늘 할 일 요약과 팀 진행 상황 요약의 근거 데이터로 사용합니다.

---

## 6. 게시판 CRUD의 역할

이 프로젝트에서 게시판 CRUD는 단순 게시판 요구사항을 채우기 위한 기능이 아닙니다.  
게시판은 **AI가 팀의 현재 상태를 이해하기 위한 핵심 데이터 입력 창구**입니다.

### 게시글 유형

| 유형 | 용도 |
|---|---|
| Daily Log | 오늘 한 일, 오늘 할 일, 막힌 점 기록 |
| Task | 개인 작업, 상태, 우선순위, 마감일 관리 |
| Blocker | 막힌 문제와 도움 요청 공유 |
| Discussion | 팀원들과 논의할 내용 작성 |
| Retrospective | 회고, 배운 점, 개선점 기록 |

### 게시판이 필요한 이유

GitHub에는 commit, PR, issue는 남지만 “오늘 무엇을 시도했는지”, “왜 막혔는지”, “아직 코드로 남기 전의 진행 상황”은 잘 남지 않습니다.  
Notion은 공식 문서와 결정 사항을 정리하는 공간이므로, 매일 변하는 개인 상태를 계속 기록하기에는 적합하지 않습니다.

따라서 게시판은 Notion과 GitHub 사이에서 **매일의 작업 맥락을 저장하는 공간**으로 동작합니다.

---

## 7. 기능 범위

### 7.1 필수 구현 범위

| 구분 | 기능 |
|---|---|
| 인증 | 회원가입, 로그인, JWT 인증 |
| 게시판 | 작업 로그 게시글 CRUD |
| 댓글 | 게시글별 댓글 작성/수정/삭제 |
| 태그 | 작업 분류 태그 입력/표시/필터 |
| 검색 | 제목/본문/태그/상태 기반 검색 |
| 페이징 | 게시글 목록 페이지네이션 |
| GitHub 연동 | Issue 조회, PR 조회 |
| Notion 연동 | 문서 목록 조회, 문서 상세 조회 |
| AI | 오늘 할 일 요약, 팀 진행 상황 요약 |

### 7.2 필수 이후 추천 구현 범위

| 구분 | 기능 |
|---|---|
| GitHub | 최근 commit 조회 및 요약 |
| RAG | Notion 문서와 게시판 로그 기반 질의응답 |
| 연결 | 게시글과 GitHub Issue URL 연결 |
| 연결 | 게시글과 Notion 문서 URL 연결 |
| AI | Daily Log 기반 개인 브리핑 고도화 |

### 7.3 시간 남으면 구현할 범위

| 구분 | 기능 |
|---|---|
| GitHub | 게시판 Task를 GitHub Issue로 생성 |
| Notion | AI 일일 리포트를 Notion에 저장 |
| 동기화 | GitHub Issue 상태 수동 동기화 |
| Notion | 문서 수동 sync 버튼 |
| AI | Blocker만 따로 모아 요약 |

### 7.4 이번 과제에서 제외할 범위

| 제외 항목 | 제외 이유 |
|---|---|
| Notion ↔ GitHub 양방향 자동 동기화 | 충돌 처리와 webhook 관리가 필요해 과제 범위를 초과함 |
| GitHub Projects custom field 완전 제어 | GraphQL 기반 필드 제어가 복잡해 핵심 목표와 거리가 있음 |
| webhook 기반 실시간 동기화 | 안정적인 재시도, 인증, 이벤트 처리 설계가 필요함 |
| Slack 연동 | 외부 시스템 범위가 과도하게 커짐 |
| 복잡한 관리자 페이지 | 핵심 AI 기능 구현 우선순위가 높음 |
| 과도한 UI 디자인 | 기능 완성 및 AI 흐름 검증이 우선 |

---

## 8. 주요 기능 상세

### 8.1 작업 로그 게시판

기능:

- 게시글 작성, 조회, 수정, 삭제
- 게시글 유형 선택
- 상태, 우선순위, 마감일 지정
- 태그 입력
- 검색 및 필터
- 페이지네이션

게시글 주요 필드:

```text
id
user_id
type
title
content
status
priority
due_date
created_at
updated_at
```

---

### 8.2 댓글

기능:

- 게시글 상세 페이지에서 댓글 조회
- 로그인한 사용자 댓글 작성
- 본인 댓글 수정/삭제
- Blocker나 Discussion 글에서 피드백 용도로 사용

---

### 8.3 GitHub 진행 상황 조회

기능:

- GitHub Issue 목록 조회
- GitHub PR 목록 조회
- 최근 commit 조회
- Dashboard에서 카드 형태로 표시

초기에는 FastAPI service에서 직접 GitHub API를 호출하고, 이후 MCP Tool로 분리합니다.

---

### 8.4 Notion 문서 조회

기능:

- Notion 문서 목록 조회
- Notion 문서 상세 내용 조회
- 공식 문서, 회의록, API 명세를 게시판에서 확인
- 이후 RAG 검색 대상으로 활용

---

### 8.5 오늘 할 일 AI 요약

입력 데이터:

- 사용자의 게시판 Task, Daily Log, Blocker
- 사용자의 GitHub Issue, PR
- 최근 commit
- 관련 Notion 문서

출력:

- 오늘의 요약
- 우선순위 작업
- 막힌 점
- 참고할 Notion 문서
- 다음 액션

---

### 8.6 팀 진행 상황 AI 요약

입력 데이터:

- 전체 Daily Log, Task, Blocker
- GitHub open Issue
- GitHub open PR
- recent commits
- Notion 회의록 또는 일정 문서

출력:

- 팀 전체 진행 상황
- 영역별 진행도
- 병목 및 리스크
- 추천 액션

---

## 9. RAG 설계

### RAG 사용 목적

Notion 공식 문서와 게시판 작업 로그를 검색 가능한 지식으로 만들고, 사용자의 질문에 관련 근거를 찾아 답변합니다.

### 데이터 소스

- Notion 기획서
- Notion API 명세
- Notion 회의록
- Notion 역할 분담 문서
- 게시판 Daily Log
- 게시판 Task
- 게시판 Blocker
- 과거 AI 브리핑

### 처리 흐름

```text
1. Notion 문서 또는 게시판 로그를 가져온다.
2. 내용을 chunk 단위로 나눈다.
3. 각 chunk를 embedding으로 변환한다.
4. PostgreSQL + pgvector에 저장한다.
5. 사용자의 질문을 embedding으로 변환한다.
6. 유사한 chunk를 top-k로 검색한다.
7. 검색 결과를 LLM prompt에 넣는다.
8. 답변과 참고 문서를 반환한다.
```

### 질문 예시

```text
"로그인 기능 구현하려면 어떤 문서 봐야 해?"
"어제 회의에서 댓글 권한은 어떻게 하기로 했어?"
"JWT 관련해서 누가 막혔었어?"
"게시글 수정 API 명세 알려줘."
```

---

## 10. MCP 설계

### MCP 사용 목적

AI Agent가 GitHub와 Notion 같은 외부 시스템을 도구처럼 호출할 수 있게 하기 위해 MCP Server를 구현합니다.

### 구현 방향

초기에는 FastAPI에서 GitHub/Notion API를 직접 호출해 기능을 검증합니다.  
이후 해당 기능을 MCP Tool로 분리합니다.

### MCP Tools

#### GitHub Tools

| Tool | 설명 |
|---|---|
| list_github_issues | 특정 repository의 Issue 목록 조회 |
| list_github_pull_requests | Pull Request 목록 조회 |
| list_recent_commits | 최근 commit 목록 조회 |
| get_github_issue | 특정 Issue 상세 조회 |
| create_github_issue | 선택 기능. 게시판 Task를 GitHub Issue로 생성 |

#### Notion Tools

| Tool | 설명 |
|---|---|
| search_notion_docs | Notion 문서 검색 |
| get_notion_page | 특정 Notion 페이지 내용 조회 |
| sync_notion_docs | Notion 문서를 DB 및 embedding으로 동기화 |
| create_notion_daily_report | 선택 기능. AI 일일 리포트를 Notion에 저장 |

### MCP 최소 구현 기준

- MCP Server가 별도 파일 또는 프로세스로 존재합니다.
- `tools/list`로 사용 가능한 도구 목록을 반환합니다.
- `tools/call`로 GitHub 또는 Notion 도구를 호출합니다.
- 요청/응답은 JSON-RPC 형태를 따릅니다.
- API Key는 `.env`에서 관리합니다.
- 허용된 tool만 호출 가능하도록 제한합니다.

---

## 11. Agent 설계

### Agent 이름

**Project Manager Agent**

### Agent 역할

- 사용자 정보를 확인합니다.
- 게시판 내부 Task, Daily Log, Blocker를 조회합니다.
- GitHub Issue, PR, commit을 조회합니다.
- Notion 관련 문서를 검색합니다.
- 오늘 할 일을 우선순위로 정리합니다.
- 팀 전체 진행 상황을 요약합니다.
- 막힌 작업과 다음 액션을 제안합니다.

### Agent State 예시

```json
{
  "user": {
    "id": 1,
    "nickname": "홍길동",
    "github_username": "gildong"
  },
  "date": "2026-06-06",
  "board_tasks": [],
  "github_issues": [],
  "github_prs": [],
  "recent_commits": [],
  "notion_docs": [],
  "blockers": [],
  "tool_logs": [],
  "final_summary": null
}
```

### 안전장치

- `max_steps = 4`
- 같은 tool 반복 호출 방지
- 외부 API 실패 시 fallback 응답 생성
- GitHub Issue 생성, Notion 문서 생성 같은 write 작업은 사용자 확인 후 실행
- tool 호출 로그를 남겨 디버깅 가능하게 처리

---

## 12. 기술 스택

| 영역 | 기술 |
|---|---|
| Frontend | React, Vite, React Router |
| Backend | FastAPI, SQLAlchemy 또는 SQLModel, Pydantic |
| Database | PostgreSQL, pgvector |
| Auth | JWT |
| AI | 상용 LLM API, Embedding API |
| RAG | PostgreSQL + pgvector 기반 검색 |
| MCP | JSON-RPC 기반 MCP Server |
| External APIs | GitHub API, Notion API |

---

## 13. 시스템 아키텍처

```text
[React Frontend]
  ├─ Dashboard
  ├─ 작업 로그 게시판
  ├─ GitHub 진행 상황 화면
  ├─ Notion 문서 화면
  └─ AI 브리핑 화면
        ↓ HTTP
[FastAPI Backend]
  ├─ Auth API
  ├─ Posts API
  ├─ Comments API
  ├─ Tags API
  ├─ GitHub Integration API
  ├─ Notion Integration API
  ├─ RAG API
  ├─ MCP Client
  └─ Agent Service
        ↓
[PostgreSQL + pgvector]
  ├─ users
  ├─ posts
  ├─ comments
  ├─ tags
  ├─ post_tags
  ├─ notion_documents
  ├─ document_embeddings
  ├─ external_links
  └─ ai_briefings
        ↓
[MCP Server]
  ├─ GitHub Tools
  └─ Notion Tools
        ↓
[GitHub API]   [Notion API]
```

---

## 14. 데이터베이스 설계 초안

### users

```text
id
email
password_hash
nickname
github_username
role
created_at
```

### posts

```text
id
user_id
type
title
content
status
priority
due_date
created_at
updated_at
```

### comments

```text
id
post_id
user_id
content
created_at
updated_at
```

### tags

```text
id
name
```

### post_tags

```text
post_id
tag_id
```

### external_links

```text
id
post_id
provider
external_id
external_url
external_type
status
created_at
updated_at
```

### notion_documents

```text
id
notion_page_id
title
url
content
last_synced_at
created_at
updated_at
```

### document_embeddings

```text
id
source_type
source_id
chunk_text
embedding
created_at
```

### ai_briefings

```text
id
user_id
briefing_date
summary
priority_tasks_json
github_summary
notion_summary
blockers_json
created_at
```

---

## 15. API 설계 초안

### Auth

```text
POST /auth/signup
POST /auth/login
GET  /auth/me
```

### Posts

```text
GET    /posts
POST   /posts
GET    /posts/{post_id}
PATCH  /posts/{post_id}
DELETE /posts/{post_id}
```

검색/필터:

```text
GET /posts?page=1&size=10&keyword=jwt&type=task&status=in_progress&tag=backend
```

### Comments

```text
GET    /comments/post/{post_id}
POST   /comments/post/{post_id}
PATCH  /comments/{comment_id}
DELETE /comments/{comment_id}
```

### GitHub Integration

```text
GET /integrations/github/issues
GET /integrations/github/pulls
GET /integrations/github/commits
```

### Notion Integration

```text
GET  /integrations/notion/docs
GET  /integrations/notion/docs/{page_id}
POST /integrations/notion/sync
```

### AI

```text
POST /ai/today-briefing
POST /ai/team-summary
POST /ai/ask-docs
POST /ai/sync-documents
```

---

## 16. 화면 구성

### Dashboard

- 오늘 할 일 AI 요약
- 팀 진행 상황 AI 요약
- 내 작업 Top 5
- GitHub Issue/PR 요약
- 최근 commit
- 관련 Notion 문서

### 작업 로그 게시판

- 게시글 목록
- 유형 필터
- 상태 필터
- 태그 필터
- 검색
- 페이지네이션

### 게시글 상세

- 제목, 본문
- 유형, 상태, 우선순위, 마감일
- 태그
- 댓글
- 연결된 GitHub/Notion 링크

### Notion 문서 화면

- 문서 목록
- 문서 상세
- RAG 질문 입력

### GitHub 진행 상황 화면

- Issue 목록
- PR 목록
- commit 목록

---

## 17. 구현 로드맵

현재 완료 상태:

```text
완료:
- React 실행
- FastAPI 실행
- PostgreSQL 연결
- React에서 FastAPI 응답 확인
```

### Day 1. 게시판 CRUD 빠르게 구현

- 작업 로그 게시글 CRUD
- type/status/priority/due_date 필드 포함
- 목록/작성/상세/수정 화면 구현

### Day 2. 인증 + 댓글 + 태그 + 검색 + 페이징

- 회원가입/로그인
- JWT 인증
- 댓글 CRUD
- 태그 입력/표시
- 검색/필터/페이징
- 본인 글/댓글 권한 처리

### Day 3. GitHub 조회

- GitHub Issue 조회
- GitHub PR 조회
- 최근 commit 조회
- Dashboard 표시

### Day 4. Notion 조회

- Notion 문서 목록 조회
- Notion 문서 상세 조회
- Dashboard 또는 문서 화면 표시

### Day 5. AI 요약 1차

- 오늘 할 일 요약
- 팀 진행 상황 요약
- 게시판/GitHub/Notion 데이터를 모아 LLM에 전달

### Day 6. RAG 구현

- Notion 문서와 게시판 로그 chunking
- embedding 생성
- pgvector 저장
- 문서 기반 질의응답

### Day 7. MCP Server 구현

- MCP Server
- tools/list
- tools/call
- GitHub/Notion Tool 분리

### Day 8. Agent 구조화

- Project Manager Agent
- Agent state 설계
- MCP/RAG/게시판 데이터 활용
- max_steps와 tool 호출 로그

### Day 9. 정리 및 발표 준비

- README 정리
- API 명세 정리
- ERD 정리
- 데모 데이터 생성
- 발표 시나리오 준비
- 버그 수정

---

## 18. 리스크와 대응 전략

| 리스크 | 설명 | 대응 |
|---|---|---|
| 외부 API 연동 지연 | GitHub/Notion 인증이나 권한 설정에서 막힐 수 있음 | 처음에는 조회 기능만 구현하고, write 기능은 선택으로 둠 |
| MCP 구현 난이도 | MCP 구조가 처음이라 구현 시간이 늘어날 수 있음 | 먼저 FastAPI 직접 호출로 기능 검증 후 MCP Tool로 분리 |
| RAG 품질 문제 | 문서 chunking이나 검색 품질이 낮을 수 있음 | 처음에는 Notion 문서와 게시판 로그를 단순 chunk로 처리 |
| Agent 복잡도 증가 | tool 선택 루프가 과도하게 복잡해질 수 있음 | max_steps 제한, 고정 tool 순서 기반으로 시작 |
| 일정 부족 | 필수 기능과 AI 기능을 모두 구현해야 함 | 필수/추천/선택 범위를 구분하고, 양방향 동기화는 제외 |
| UI 완성도 부족 | 기능 구현에 비해 화면이 단순할 수 있음 | 데모 흐름 중심으로 최소 UI 구성 |

---

## 19. 성공 기준

프로젝트가 성공적으로 구현되었다고 판단하는 기준은 다음과 같습니다.

1. 사용자가 로그인하고 작업 로그 게시글을 작성할 수 있습니다.
2. 게시글에 댓글, 태그, 상태, 우선순위, 마감일을 설정할 수 있습니다.
3. 게시판에서 검색과 페이징이 동작합니다.
4. GitHub Issue/PR/commit 정보를 조회할 수 있습니다.
5. Notion 문서 목록과 내용을 조회할 수 있습니다.
6. AI가 개인별 오늘 할 일을 요약합니다.
7. AI가 팀 전체 진행 상황과 병목을 요약합니다.
8. RAG를 통해 Notion 문서와 게시판 로그 기반 질문에 답변할 수 있습니다.
9. MCP Server를 통해 GitHub/Notion Tool 호출 구조를 설명하고 시연할 수 있습니다.
10. README와 발표에서 RAG, MCP, Agent의 역할을 명확히 설명할 수 있습니다.

---

## 20. 최종 데모 시나리오

1. 회원가입 및 로그인
2. Daily Log 작성
   - 오늘 할 일
   - 막힌 점
   - 관련 태그
3. Task 게시글 작성
4. 댓글로 피드백 작성
5. 게시글 검색/필터/페이징 확인
6. Dashboard에서 GitHub Issue/PR/commit 확인
7. Notion 공식 문서 목록 확인
8. **오늘 할 일 AI 요약** 실행
9. AI가 내 작업, GitHub 진행 상황, Notion 문서를 종합해 브리핑 제공
10. **팀 진행 상황 AI 요약** 실행
11. AI가 팀 전체 진행 상황과 병목, 다음 액션 제안
12. RAG 질문 예시 실행
    - "로그인 기능 구현하려면 어떤 문서 봐야 해?"
13. MCP Tool 호출 로그 또는 구조 설명

---

## 21. 팀장 공유용 요약

이번 프로젝트는 **AI Team Sync Board**라는 이름의 AI 프로젝트 관리 게시판입니다.

Notion은 공식 문서와 회의록을 저장하는 공간으로 두고, GitHub는 코드와 Issue/PR/commit 같은 개발 진행 상황을 관리하는 공간으로 둡니다. 게시판은 팀원들이 매일 작성하는 Daily Log, Task, Blocker, Discussion을 저장하는 작업 로그 공간으로 사용합니다.

AI Agent는 이 세 데이터 소스를 종합해서 사용자가 게시판에 접속했을 때 **오늘 무엇을 우선 처리해야 하는지**, **팀 전체가 어디까지 진행됐는지**, **현재 병목이 무엇인지**, **어떤 Notion 문서를 참고해야 하는지**를 요약해줍니다.

과제 요구사항인 기본 게시판 기능은 작업 로그 게시판으로 구현하고, RAG는 Notion 문서와 게시판 로그 검색에 사용합니다. MCP는 GitHub와 Notion API를 외부 도구로 연결하는 데 사용하며, Agent는 해당 도구와 게시판 데이터를 활용해 프로젝트 매니저처럼 오늘 할 일과 팀 진행 상황을 정리하는 역할을 합니다.

---

## 22. 한 줄 결론

**AI Team Sync Board는 Notion의 공식 문서, GitHub의 개발 진행 상황, 게시판의 작업 로그를 하나로 연결하고, AI Agent가 이를 종합해 오늘 할 일과 팀 전체 진행 상황을 요약해주는 AI 기반 프로젝트 관리 게시판입니다.**
