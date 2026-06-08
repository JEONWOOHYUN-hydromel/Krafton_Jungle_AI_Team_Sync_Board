# AI Team Sync Board 프로젝트 기획서

## 1. 프로젝트명

**AI Team Sync Board**

부제: **Notion과 GitHub를 연결한 AI 프로젝트 관리 게시판**

---

## 2. 한 줄 요약

**Notion의 공식 문서와 GitHub의 개발 진행 상황을 AI가 수집·요약하여, 팀원이 게시판 안에서 오늘 할 일과 팀 전체 진행 상황을 확인할 수 있는 AI 프로젝트 관리 게시판**을 구현한다.

---

## 3. 프로젝트 배경

팀 프로젝트를 진행하면 정보가 여러 곳에 흩어진다.

```text
Notion:
- 기획서
- 공식 문서
- 회의록
- API 명세
- ERD
- 역할 분담
- 일정

GitHub:
- 코드
- Issue
- Pull Request
- commit
- 리뷰 기록
- 실제 개발 진행 상황 

개인 메모 / 채팅 / 구두 공유:
- 오늘 무엇을 하려 했는지
- 어디에서 막혔는지
- 아직 코드로 남지 않은 진행 상황
- 팀원에게 도움을 요청하고 싶은 내용
```

문제는 팀원이 매일 Notion, GitHub, 채팅, 회의록을 모두 확인해야 현재 상황을 이해할 수 있다는 점이다. 특히 GitHub에는 코드 결과물은 남지만, “오늘 내가 무엇을 하려고 했는지”, “왜 막혔는지”, “아직 commit은 없지만 진행 중인 내용이 무엇인지”는 잘 남지 않는다.

따라서 이번 프로젝트에서는 게시판을 단순 자유게시판이 아니라 **팀원들이 매일 작업 로그, 할 일, 막힌 점, 논의 내용을 남기는 프로젝트 운영 공간**으로 정의한다. AI는 이 게시판 데이터와 Notion 문서, GitHub 진행 상황을 함께 분석하여 개인별 오늘 할 일과 팀 전체 진행 상황을 요약한다.

---

## 4. 각 도구의 역할

| 도구 | 역할 |
|---|---|
| Notion | 공식 문서, 기획서, 회의록, API 명세, ERD, 결정 사항 저장소 |
| GitHub | 코드, Issue, Pull Request, commit, 리뷰 기록 저장소 |
| 게시판 | Daily Log, Task, Blocker, Discussion 등 팀원의 현재 작업 맥락 저장소 |
| AI Agent | Notion, GitHub, 게시판 데이터를 종합해 오늘 할 일과 팀 진행 상황 요약 |

---

## 5. 게시판 CRUD의 의미

이 프로젝트에서 게시판 CRUD는 과제 요구사항을 채우기 위한 단순 기능이 아니라, AI가 팀의 현재 상태를 이해하기 위한 핵심 데이터 입력 창구다.

게시글은 다음과 같은 작업 로그 역할을 한다.

```text
Daily Log:
- 오늘 한 일
- 오늘 할 일
- 막힌 점

Task:
- 개인 작업
- 상태
- 우선순위
- 마감일

Blocker:
- 막힌 문제
- 도움이 필요한 내용

Discussion:
- 팀원들과 논의할 내용

Retrospective:
- 회고
- 배운 점
- 개선할 점
```

Notion은 정리된 공식 문서를 저장하고, GitHub는 코드와 이슈 진행 기록을 저장한다. 게시판은 그 사이에서 매일 변하는 개인 진행 상황과 작업 맥락을 저장한다.

AI Agent는 다음 세 데이터를 함께 사용한다.

```text
1. Notion
   - 공식 계획과 문서

2. GitHub
   - 실제 개발 진행 상황

3. 게시판
   - 개인의 오늘 계획, 막힌 점, 작업 로그
```

따라서 게시판 CRUD는 “팀원이 매일 자신의 상태를 남기는 기능”이자 “AI 브리핑의 근거 데이터”다.

---

## 6. 핵심 사용자 시나리오

### 6.1 오늘 할 일 확인

```text
1. 팀원이 게시판에 로그인한다.
2. 대시보드에서 [오늘 할 일 AI 요약] 버튼을 누른다.
3. AI Agent가 다음 정보를 조회한다.
   - 게시판에 작성된 내 Task, Daily Log, Blocker
   - GitHub에서 내게 할당된 Issue, PR, 최근 commit
   - Notion의 관련 문서와 일정
4. AI가 오늘 우선 처리할 작업과 참고 문서, 막힌 점을 요약한다.
5. 사용자는 게시판에서 바로 오늘 할 일을 파악한다.
```

예시 응답:

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

### 6.2 팀 진행 상황 확인

```text
1. 팀원이 대시보드에서 [팀 진행 상황 AI 요약] 버튼을 누른다.
2. AI Agent가 전체 게시판 Daily Log, Task, Blocker를 확인한다.
3. GitHub Issue, PR, 최근 commit을 확인한다.
4. Notion 일정과 회의록을 참고한다.
5. 팀 전체 진행 상황, 병목, 다음 액션을 요약한다.
```

예시 응답:

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

## 7. 과제 요구사항 대응

| 과제 요구사항 | 이 프로젝트에서의 구현 |
|---|---|
| Frontend: React | React + Vite 사용 |
| Backend | FastAPI 사용 |
| Database | PostgreSQL 사용 |
| 회원가입 / 로그인 | 팀원 계정 로그인, JWT 인증 |
| 게시물 CRUD | Daily Log, Task, Blocker, Discussion 게시글 CRUD |
| 댓글 | 작업 피드백, 도움 요청, 논의 댓글 |
| 태그 | frontend, backend, ai, auth, blocker, urgent 등 작업 분류 |
| 페이징 | 작업 로그 목록 페이지네이션 |
| 검색 | 게시글 제목/본문/태그/상태 검색 |
| RAG | Notion 공식 문서와 게시판 작업 로그 검색 |
| MCP | GitHub API, Notion API를 MCP Tool로 연결 |
| AI Agent | 오늘 할 일 요약, 팀 진행 상황 요약, 관련 문서 추천 |

---

## 8. 기술 스택

```text
Frontend:
- React
- Vite
- React Router
- fetch 또는 axios

Backend:
- FastAPI
- SQLAlchemy 또는 SQLModel
- Pydantic
- JWT 인증

Database:
- PostgreSQL
- pgvector

External APIs:
- GitHub API
- Notion API

AI:
- 상용 LLM API
- Embedding API
- RAG
- MCP Server
- Agent 구조
```

---

## 9. 전체 시스템 아키텍처

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

## 10. 기능 우선순위

### 10.1 필수

필수 기능은 먼저 끝낸다.

```text
1. 게시판 CRUD
2. 회원가입 / 로그인
3. 댓글
4. 태그
5. 검색
6. 페이징
7. GitHub Issue 조회
8. GitHub PR 조회
9. Notion 문서 조회
10. AI 오늘 할 일 요약
11. AI 팀 진행 상황 요약
```

### 10.2 추천

필수 기능이 끝난 뒤 바로 진행하면 좋은 기능이다.

```text
1. GitHub recent commit 조회/요약
2. Notion 문서 RAG 검색
3. 게시판 Daily Log 기반 AI 브리핑
4. 게시글과 GitHub Issue URL 연결
5. 게시글과 Notion 문서 URL 연결
```

### 10.3 선택

시간이 남으면 진행한다.

```text
1. 게시판 Task를 GitHub Issue로 생성
2. AI 일일 리포트를 Notion에 저장
3. GitHub Issue 상태 수동 동기화
4. Notion 문서 수동 sync 버튼
5. Blocker만 따로 AI 요약
```

### 10.4 비추천

과제 기간 안에는 하지 않는 것이 좋다.

```text
1. Notion ↔ GitHub 양방향 자동 동기화
2. GitHub Projects custom field 완전 제어
3. webhook 기반 실시간 동기화
4. Slack 연동
5. 복잡한 관리자 페이지
6. UI 디자인에 과도한 시간 투자
```

---

## 11. 데이터베이스 설계 초안

### 11.1 users

```text
id
email
password_hash
nickname
github_username
role
created_at
```

### 11.2 posts

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

`type` 예시:

```text
daily_log
task
blocker
discussion
retrospective
```

`status` 예시:

```text
todo
in_progress
done
blocked
```

`priority` 예시:

```text
low
medium
high
```

### 11.3 comments

```text
id
post_id
user_id
content
created_at
updated_at
```

### 11.4 tags

```text
id
name
```

### 11.5 post_tags

```text
post_id
tag_id
```

### 11.6 external_links

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

예시:

```text
provider: github
external_type: issue
external_url: https://github.com/owner/repo/issues/12
status: open
```

### 11.7 notion_documents

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

### 11.8 document_embeddings

```text
id
source_type
source_id
chunk_text
embedding
created_at
```

### 11.9 ai_briefings

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

## 12. API 설계 초안

### 12.1 Auth API

```text
POST /auth/signup
POST /auth/login
GET  /auth/me
```

### 12.2 Posts API

```text
GET    /posts
POST   /posts
GET    /posts/{post_id}
PATCH  /posts/{post_id}
DELETE /posts/{post_id}
```

검색과 필터:

```text
GET /posts?page=1&size=10&keyword=jwt&type=task&status=in_progress&tag=backend
```

### 12.3 Comments API

```text
GET    /comments/post/{post_id}
POST   /comments/post/{post_id}
PATCH  /comments/{comment_id}
DELETE /comments/{comment_id}
```

### 12.4 GitHub Integration API

```text
GET /integrations/github/issues
GET /integrations/github/pulls
GET /integrations/github/commits
```

선택 기능:

```text
POST /integrations/github/issues
```

### 12.5 Notion Integration API

```text
GET  /integrations/notion/docs
GET  /integrations/notion/docs/{page_id}
POST /integrations/notion/sync
```

선택 기능:

```text
POST /integrations/notion/daily-report
```

### 12.6 AI API

```text
POST /ai/today-briefing
POST /ai/team-summary
POST /ai/ask-docs
POST /ai/sync-documents
```

---

## 13. RAG 설계

RAG는 Notion 공식 문서와 게시판 작업 로그를 검색하는 데 사용한다.

### 13.1 RAG 데이터 소스

```text
- Notion 기획서
- Notion API 명세
- Notion 회의록
- Notion 역할 분담 문서
- 게시판 Daily Log
- 게시판 Task
- 게시판 Blocker
- 과거 AI 브리핑
```

### 13.2 처리 흐름

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

### 13.3 질문 예시

```text
"로그인 기능 구현하려면 어떤 문서 봐야 해?"
"어제 회의에서 댓글 권한은 어떻게 하기로 했어?"
"JWT 관련해서 누가 막혔었어?"
"게시글 수정 API 명세 알려줘."
```

---

## 14. MCP 설계

MCP는 GitHub와 Notion 외부 시스템을 AI Agent가 호출 가능한 도구로 연결하는 데 사용한다.

초기에는 FastAPI에서 GitHub/Notion API를 직접 호출해 동작을 확인한다. 이후 해당 기능을 MCP Tool로 분리한다.

### 14.1 GitHub MCP Tools

```text
list_github_issues(assignee, state)
- 특정 담당자의 issue 목록 조회

get_github_issue(issue_number)
- issue 상세 조회

list_github_pull_requests(state)
- PR 목록 조회

list_recent_commits(since)
- 최근 commit 목록 조회

create_github_issue(title, body, labels, assignees)
- 선택 기능. 게시판 task를 GitHub issue로 생성
```

### 14.2 Notion MCP Tools

```text
search_notion_docs(query)
- Notion 문서 검색

get_notion_page(page_id)
- 특정 Notion 페이지 내용 조회

sync_notion_docs()
- Notion 문서를 가져와 DB와 embedding 갱신

create_notion_daily_report(content)
- 선택 기능. AI가 만든 일일 리포트를 Notion에 저장
```

### 14.3 MCP 최소 구현 기준

```text
- MCP Server가 별도 파일 또는 별도 프로세스로 존재한다.
- tools/list로 사용 가능한 도구 목록을 반환한다.
- tools/call로 GitHub 또는 Notion 도구를 호출한다.
- 요청/응답은 JSON-RPC 형태를 따른다.
- API Key는 .env에서 관리한다.
```

---

## 15. Agent 설계

### 15.1 Agent 이름

```text
Project Manager Agent
```

### 15.2 Agent 역할

```text
1. 사용자 정보를 확인한다.
2. 게시판 내부 task, daily_log, blocker를 조회한다.
3. GitHub Issue, PR, commit을 조회한다.
4. Notion 관련 문서를 검색한다.
5. 오늘 할 일을 우선순위로 정리한다.
6. 팀 전체 진행 상황을 요약한다.
7. 막힌 작업과 다음 액션을 제안한다.
```

### 15.3 Agent State 예시

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
  "final_summary": null
}
```

### 15.4 무한 루프 방지

```text
- max_steps = 4
- 같은 tool 2번 이상 호출 금지
- 외부 API 실패 시 fallback 응답 생성
- GitHub Issue 생성, Notion 문서 생성 같은 write 작업은 사용자 확인 후 실행
```

---

## 16. 구현 로드맵

현재 완료 상태:

```text
완료:
- React 실행
- FastAPI 실행
- PostgreSQL 연결
- React에서 FastAPI 응답 확인
```

### Day 1. 게시판 CRUD 빠르게 구현

```text
목표:
- 작업 로그 게시판 CRUD 완성

Backend:
- GET /posts
- POST /posts
- GET /posts/{post_id}
- PATCH /posts/{post_id}
- DELETE /posts/{post_id}

Frontend:
- /posts
- /posts/new
- /posts/:id
- /posts/:id/edit

필드:
- title
- content
- type
- status
- priority
- due_date
```

### Day 2. 인증 + 댓글 + 태그 + 검색 + 페이징

```text
목표:
- 기본 게시판 필수 기능 완성

구현:
- 회원가입
- 로그인
- JWT 인증
- 본인 글 수정/삭제 권한
- 댓글 CRUD
- 태그 입력/표시
- keyword 검색
- type/status/tag 필터
- page/size 페이지네이션
```

### Day 3. GitHub 조회

```text
목표:
- 게시판 대시보드에서 GitHub 진행 상황 확인

구현:
- GitHub Issue 목록 조회
- GitHub PR 목록 조회
- 최근 commit 조회
- Dashboard에 표시
```

### Day 4. Notion 조회

```text
목표:
- 게시판에서 Notion 공식 문서 확인

구현:
- Notion 문서 목록 조회
- Notion 문서 상세 조회
- 문서 제목, URL, 내용 일부 표시
```

### Day 5. AI 요약 1차

```text
목표:
- 복잡한 Agent 구조 없이 AI 요약 기능 먼저 구현

구현:
- POST /ai/today-briefing
- POST /ai/team-summary
- 게시판 데이터 + GitHub 데이터 + Notion 데이터를 모아 LLM에 전달
- 오늘 할 일과 팀 진행 상황 요약 출력
```

### Day 6. RAG 구현

```text
목표:
- Notion 문서와 게시판 작업 로그를 검색 가능한 지식으로 만들기

구현:
- notion_documents 테이블
- document_embeddings 테이블
- 문서 chunk 분리
- embedding 생성
- pgvector 저장
- POST /ai/ask-docs
```

### Day 7. MCP Server 구현

```text
목표:
- GitHub/Notion 외부 API 호출을 MCP Tool 구조로 분리

구현:
- MCP Server
- tools/list
- tools/call
- GitHub tools
- Notion tools
- FastAPI MCP Client
```

### Day 8. Agent 구조화

```text
목표:
- Project Manager Agent 구현

구현:
- Agent state 설계
- board task tool
- github tool
- notion/rag tool
- today briefing agent
- team summary agent
- max_steps 제한
- tool 호출 로그
```

### Day 9. 정리 / 테스트 / 발표 준비

```text
목표:
- 제출 가능한 상태로 정리

구현:
- README 정리
- API 명세 정리
- ERD 정리
- 데모 데이터 생성
- 발표 시나리오 준비
- 버그 수정
```

---

## 17. 추천 폴더 구조

```text
ai-team-sync-board/
  frontend/
    src/
      api/
        client.js
        authApi.js
        postApi.js
        commentApi.js
        githubApi.js
        notionApi.js
        aiApi.js
      components/
        PostForm.jsx
        PostList.jsx
        CommentList.jsx
        TagList.jsx
        TodayBriefingCard.jsx
        TeamSummaryCard.jsx
      pages/
        LoginPage.jsx
        SignupPage.jsx
        DashboardPage.jsx
        PostsPage.jsx
        PostDetailPage.jsx
        PostCreatePage.jsx
        PostEditPage.jsx
        NotionDocsPage.jsx
      App.jsx
      main.jsx

  backend/
    app/
      main.py
      database.py
      models/
        user.py
        post.py
        comment.py
        tag.py
        external_link.py
        notion_document.py
        embedding.py
      schemas/
        auth.py
        post.py
        comment.py
        ai.py
      routers/
        auth.py
        posts.py
        comments.py
        integrations_github.py
        integrations_notion.py
        ai.py
      services/
        auth_service.py
        post_service.py
        github_service.py
        notion_service.py
        embedding_service.py
        rag_service.py
        agent_service.py
      mcp_server/
        server.py
        tools/
          github_tools.py
          notion_tools.py
      core/
        config.py
        security.py

  docker-compose.yml
  README.md
```

---

## 18. 최종 데모 시나리오

```text
1. 회원가입
2. 로그인
3. Daily Log 작성
   - 오늘 할 일
   - 막힌 점
   - 관련 태그
4. Task 게시글 작성
5. 댓글로 피드백 작성
6. 게시글 검색/필터 확인
7. Dashboard에서 GitHub Issue/PR/commit 확인
8. Notion 공식 문서 목록 확인
9. [오늘 할 일 AI 요약] 실행
10. AI가 내 작업, GitHub 진행 상황, Notion 문서를 종합해 브리핑 제공
11. [팀 진행 상황 AI 요약] 실행
12. AI가 팀 전체 진행 상황과 병목, 다음 액션 제안
13. RAG 질문 예시 실행
    - "로그인 기능 구현하려면 어떤 문서 봐야 해?"
14. MCP tool 호출 로그 또는 구조 설명
```

---

## 19. 최종 목표

이 프로젝트의 최종 목표는 단순 게시판이 아니라, **팀원이 매일 들어와서 오늘 할 일과 팀 전체 진행 상황을 한눈에 확인할 수 있는 AI 프로젝트 관리 허브**를 만드는 것이다.

```text
Notion은 공식 문서를 저장한다.
GitHub는 코드와 개발 진행 상황을 저장한다.
게시판은 팀원의 매일 작업 맥락을 저장한다.
AI Agent는 이 세 데이터를 종합해 오늘 할 일과 팀 진행 상황을 요약한다.
```

---

## 20. 제출용 한 줄 설명

**AI Team Sync Board는 Notion의 공식 문서, GitHub의 개발 진행 상황, 게시판의 작업 로그를 AI Agent가 종합하여 개인별 오늘 할 일과 팀 전체 진행 상황을 요약해주는 AI 프로젝트 관리 게시판입니다.**
