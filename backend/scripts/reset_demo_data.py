from __future__ import annotations

import os
import sys
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any

import psycopg
from dotenv import load_dotenv
from psycopg.rows import dict_row

BACKEND_DIR = Path(__file__).resolve().parents[1]
SQL_DIR = BACKEND_DIR / "sql"
sys.path.insert(0, str(BACKEND_DIR))

load_dotenv(BACKEND_DIR / ".env")

from app.security import get_password_hash  # noqa: E402

DATABASE_URL = os.getenv("DATABASE_URL")
DEMO_PASSWORD = "jungle1234!"


DEMO_USERS = [
    {
        "email": "woohyun@atsb.local",
        "nickname": "전우현",
        "github_username": "JEONWOOHYUN-hydromel",
        "role": "admin",
    },
    {
        "email": "minseo@atsb.local",
        "nickname": "김민서",
        "github_username": "minseo-k",
        "role": "lead",
    },
    {
        "email": "seojun@atsb.local",
        "nickname": "박서준",
        "github_username": "seojun-park",
        "role": "member",
    },
    {
        "email": "jiyoon@atsb.local",
        "nickname": "최지윤",
        "github_username": "jiyoon-choi",
        "role": "member",
    },
    {
        "email": "haneul@atsb.local",
        "nickname": "이하늘",
        "github_username": "haneul-lee",
        "role": "member",
    },
    {
        "email": "doyeon@atsb.local",
        "nickname": "정도연",
        "github_username": "doyeon-j",
        "role": "member",
    },
    {
        "email": "taeho@atsb.local",
        "nickname": "강태호",
        "github_username": "taeho-kang",
        "role": "member",
    },
    {
        "email": "yuna@atsb.local",
        "nickname": "서유나",
        "github_username": "yuna-seo",
        "role": "member",
    },
    {
        "email": "hyunwoo@atsb.local",
        "nickname": "오현우",
        "github_username": "hyunwoo-oh",
        "role": "member",
    },
    {
        "email": "sumin@atsb.local",
        "nickname": "한수민",
        "github_username": "sumin-han",
        "role": "member",
    },
]


DEMO_POSTS = [
    {
        "email": "woohyun@atsb.local",
        "title": "[RAG] Notion 문서 동기화 안정화",
        "type": "task",
        "status": "in_progress",
        "priority": "high",
        "due_offset": 1,
        "age_days": 0,
        "tags": ["RAG", "Notion", "backend"],
        "content": """
담당자: 전우현
현재 상태: Notion 데이터베이스에서 문서 목록과 본문 블록을 다시 받아오는 흐름을 점검 중입니다.
배경: 문서 ID와 view ID가 섞이면 "요청한 데이터를 찾을 수 없음" 오류가 발생해서, 설정값과 동기화 로그를 같이 확인해야 합니다.
다음 액션: 동기화 후 notion_documents와 document_embeddings 적재 건수를 비교하고, 실패 문서는 warning으로 노출합니다.
""",
    },
    {
        "email": "minseo@atsb.local",
        "title": "[Git] RAG 검색에 저장소 상태 포함",
        "type": "task",
        "status": "todo",
        "priority": "high",
        "due_offset": 2,
        "age_days": 0,
        "tags": ["RAG", "Git", "GitHub"],
        "content": """
담당자: 김민서
목표: 사용자가 RAG에 "현재 변경된 파일이 뭐야?"라고 물었을 때 브랜치, 변경 파일, 최근 커밋을 근거로 답하게 만듭니다.
범위: GitHub issue, PR, commit 목록과 로컬 git status 요약을 별도 source_type으로 저장합니다.
완료 기준: /ai/sync-documents 실행 후 document_embeddings에 github_* 및 git_status source가 생성됩니다.
""",
    },
    {
        "email": "seojun@atsb.local",
        "title": "[UI] 대시보드 카드 밀도와 RAG Step 균형 조정",
        "type": "discussion",
        "status": "in_progress",
        "priority": "medium",
        "due_offset": 3,
        "age_days": 1,
        "tags": ["frontend", "dashboard", "RAG"],
        "content": """
담당자: 박서준
논의 내용: Step 1은 버튼만 있고 Step 2는 입력 영역이 많아 한 화면에서 무게 중심이 아래로 쏠립니다.
제안: Step 1에는 동기화 대상과 최근 결과 요약을 함께 보여주고, Step 2는 질문 작성과 참고 문서 결과를 분리합니다.
확인 필요: 모바일에서 카드가 과하게 길어지지 않는지, 버튼과 상태 정보가 한 줄에서 깨지지 않는지 확인합니다.
""",
    },
    {
        "email": "jiyoon@atsb.local",
        "title": "[Auth] 데모 계정 로그인 플로우 점검",
        "type": "task",
        "status": "done",
        "priority": "medium",
        "due_offset": -1,
        "age_days": 2,
        "tags": ["auth", "demo", "QA"],
        "content": """
담당자: 최지윤
완료 내용: 데모 계정 10개를 동일한 초기 비밀번호로 생성하고, 로그인 후 게시글/댓글 작성 권한을 확인했습니다.
검증 포인트: 만료된 토큰일 때는 다시 로그인하도록 안내하고, 401 에러는 사용자가 이해할 수 있는 문장으로 바꿉니다.
남은 일: 데모 배포 전에는 비밀번호를 README나 내부 공유 문서에만 남깁니다.
""",
    },
    {
        "email": "haneul@atsb.local",
        "title": "[Blocker] OpenAI embedding 요청 제한 확인 필요",
        "type": "blocker",
        "status": "blocked",
        "priority": "high",
        "due_offset": 0,
        "age_days": 1,
        "tags": ["OpenAI", "embedding", "infra"],
        "content": """
담당자: 이하늘
문제: 대량 문서 동기화 중 embedding API 요청이 연속으로 발생하면 속도 제한이나 키 설정 문제로 실패할 수 있습니다.
영향: vector DB가 일부만 채워지면 RAG 답변의 근거가 편향됩니다.
필요한 결정: 동기화 버튼에서 제한값을 낮게 시작할지, 백엔드에서 재시도와 부분 성공 메시지를 더 자세히 보여줄지 정해야 합니다.
""",
    },
    {
        "email": "doyeon@atsb.local",
        "title": "[Notion] 블록 렌더링 품질 개선",
        "type": "task",
        "status": "in_progress",
        "priority": "medium",
        "due_offset": 4,
        "age_days": 2,
        "tags": ["Notion", "frontend", "renderer"],
        "content": """
담당자: 정도연
현재 상태: heading, bullet, numbered list, todo, quote, code, image 블록을 화면에 맞춰 표시하도록 구현했습니다.
남은 일: toggle 내부 children과 callout 아이콘 표시를 더 자연스럽게 다듬어야 합니다.
검증: 실제 Notion 문서를 열었을 때 원문 구조가 한눈에 보이는지 확인합니다.
""",
    },
    {
        "email": "taeho@atsb.local",
        "title": "[Backend] 게시글 필터와 페이지네이션 응답 점검",
        "type": "task",
        "status": "todo",
        "priority": "medium",
        "due_offset": 5,
        "age_days": 3,
        "tags": ["backend", "posts", "pagination"],
        "content": """
담당자: 강태호
목표: type/status/priority/tag 필터 조합에서 total_pages와 items가 일관되게 내려오는지 확인합니다.
상황: 데모 데이터가 다양해지면서 필터 조합별 빈 상태와 페이지 이동 UX를 확인하기 좋아졌습니다.
완료 기준: /posts API에서 page, size, total, total_pages가 모두 기대값으로 반환됩니다.
""",
    },
    {
        "email": "yuna@atsb.local",
        "title": "[Design] 게시판 목록의 상태 인식성 개선",
        "type": "discussion",
        "status": "in_progress",
        "priority": "low",
        "due_offset": 6,
        "age_days": 3,
        "tags": ["design", "posts", "UX"],
        "content": """
담당자: 서유나
논의 내용: 사용자는 제목보다 먼저 상태와 담당자를 스캔합니다. 카드 안에서 상태 배지, 담당자, 마감일의 우선순위를 올리는 방향을 제안합니다.
주의점: 장식적인 카드보다 반복 사용에 편한 밀도와 정렬이 더 중요합니다.
다음 액션: 목록, 상세, 작성 화면의 용어를 통일합니다.
""",
    },
    {
        "email": "hyunwoo@atsb.local",
        "title": "[Docker] 로컬 DB 재시작 후 헬스체크",
        "type": "daily_log",
        "status": "done",
        "priority": "low",
        "due_offset": -2,
        "age_days": 4,
        "tags": ["Docker", "Postgres", "devops"],
        "content": """
담당자: 오현우
오늘 한 일: postgres 컨테이너 상태, atsb 데이터베이스 접속, pgvector extension 생성을 확인했습니다.
결과: FastAPI /health/db 응답이 정상이며, SQL migration도 재실행 가능하게 유지되어 있습니다.
메모: reset_demo_data.py 실행 전에는 기존 데이터 삭제가 의도된 작업인지 꼭 확인합니다.
""",
    },
    {
        "email": "sumin@atsb.local",
        "title": "[QA] RAG 답변 근거 링크 확인",
        "type": "task",
        "status": "todo",
        "priority": "medium",
        "due_offset": 3,
        "age_days": 4,
        "tags": ["QA", "RAG", "references"],
        "content": """
담당자: 한수민
목표: RAG 답변의 참고 문서 목록에서 게시글은 내부 링크로, Notion/GitHub는 외부 링크로 열리는지 확인합니다.
체크 질문: "RAG 동기화 담당자는 누구야?", "현재 blocker는 뭐야?", "최근 Git 변경 상태는 어때?"를 사용합니다.
완료 기준: answer.references의 source_type과 source_url에 맞게 버튼이 동작합니다.
""",
    },
    {
        "email": "woohyun@atsb.local",
        "title": "[Agent] MCP/Agent 설명 문서 최신화",
        "type": "task",
        "status": "todo",
        "priority": "low",
        "due_offset": 7,
        "age_days": 5,
        "tags": ["MCP", "Agent", "docs"],
        "content": """
담당자: 전우현
목표: 현재 브랜치에 살아있는 RAG 코드와 과거 커밋의 MCP/Agent 구현 경계를 설명 문서에 명확히 남깁니다.
주의점: 현재 실행 가능한 기능과 발표용 설명 소스를 섞어 말하지 않습니다.
다음 액션: docs/rag_mcp_agent_presentation.md의 코드 경로와 커밋 근거를 다시 점검합니다.
""",
    },
    {
        "email": "minseo@atsb.local",
        "title": "[Retrospective] 문서 중심 협업 흐름 회고",
        "type": "retrospective",
        "status": "done",
        "priority": "low",
        "due_offset": -3,
        "age_days": 6,
        "tags": ["retrospective", "team"],
        "content": """
담당자: 김민서
좋았던 점: Notion, 게시판, GitHub가 한 검색 흐름으로 묶이면 팀원이 히스토리를 찾는 시간이 줄어듭니다.
아쉬운 점: 동기화 실패 원인이 화면에 충분히 설명되지 않으면 사용자가 직접 원인을 추적해야 합니다.
다음 실험: 실패 warning을 사람이 읽기 쉬운 한국어로 정리해 보여줍니다.
""",
    },
    {
        "email": "seojun@atsb.local",
        "title": "[Frontend] 모바일 폭에서 작성 폼 정리",
        "type": "task",
        "status": "in_progress",
        "priority": "medium",
        "due_offset": 5,
        "age_days": 2,
        "tags": ["frontend", "mobile", "forms"],
        "content": """
담당자: 박서준
현재 상태: 작성/수정 폼에서 select와 button이 좁은 폭에서 겹치지 않도록 정렬을 확인하고 있습니다.
리스크: 긴 한글 제목이나 태그가 카드 폭을 밀어낼 수 있습니다.
완료 기준: 375px 폭에서도 버튼 텍스트와 입력 라벨이 잘리지 않습니다.
""",
    },
    {
        "email": "jiyoon@atsb.local",
        "title": "[Comments] 상세 페이지 댓글 UX 확인",
        "type": "task",
        "status": "todo",
        "priority": "medium",
        "due_offset": 4,
        "age_days": 1,
        "tags": ["comments", "frontend", "API"],
        "content": """
담당자: 최지윤
목표: 댓글 작성, 수정, 삭제 후 상세 페이지가 즉시 최신 상태로 보이는지 확인합니다.
체크 포인트: 로그인하지 않은 사용자는 댓글 입력 대신 로그인 안내를 봐야 합니다.
다음 액션: 데모 게시글마다 1~2개 댓글을 넣어 상세 페이지 밀도를 확인합니다.
""",
    },
    {
        "email": "haneul@atsb.local",
        "title": "[Infra] 환경 변수 샘플 정리",
        "type": "task",
        "status": "blocked",
        "priority": "medium",
        "due_offset": 2,
        "age_days": 5,
        "tags": ["env", "infra", "docs"],
        "content": """
담당자: 이하늘
블로커: 실제 키가 포함된 .env와 공유 가능한 .env.example의 경계를 정리해야 합니다.
영향: 새 팀원이 프로젝트를 실행할 때 어떤 값이 필수인지 헷갈릴 수 있습니다.
필요한 지원: API 키는 로컬에만 두고, 문서에는 변수명과 설명만 남기는 방향으로 정리합니다.
""",
    },
    {
        "email": "doyeon@atsb.local",
        "title": "[Search] 질문 예시 프리셋 추가 제안",
        "type": "discussion",
        "status": "todo",
        "priority": "low",
        "due_offset": 8,
        "age_days": 6,
        "tags": ["RAG", "UX", "search"],
        "content": """
담당자: 정도연
제안: RAG 페이지에 자주 묻는 질문 프리셋을 3개 정도 제공하면 처음 쓰는 사람이 바로 기능을 이해할 수 있습니다.
예시: "현재 blocked 상태인 작업 알려줘", "Notion 동기화 담당자 누구야?", "최근 GitHub PR 상태 요약해줘".
주의점: 설명 텍스트를 길게 붙이는 대신 버튼 자체가 자연스러운 진입점이 되게 합니다.
""",
    },
    {
        "email": "taeho@atsb.local",
        "title": "[API] sync-documents 부분 성공 응답 구조 점검",
        "type": "task",
        "status": "in_progress",
        "priority": "high",
        "due_offset": 1,
        "age_days": 1,
        "tags": ["backend", "RAG", "API"],
        "content": """
담당자: 강태호
목표: Notion은 실패했지만 게시글과 Git은 성공하는 상황에서도 전체 응답이 500으로 무너지지 않게 합니다.
현재 상태: details.notion/posts/github/git 각각의 synced_documents, synced_chunks, warnings를 분리해 반환합니다.
검증: 프론트가 details를 받아 동기화 결과를 source별로 보여주는지 확인합니다.
""",
    },
    {
        "email": "yuna@atsb.local",
        "title": "[Visual QA] Notion 문서 화면 실제 데이터 확인",
        "type": "task",
        "status": "todo",
        "priority": "medium",
        "due_offset": 3,
        "age_days": 2,
        "tags": ["Notion", "QA", "frontend"],
        "content": """
담당자: 서유나
목표: 실제 Notion 문서의 제목, 리스트, 체크박스, 코드블록, 이미지가 앱에서 너무 납작하게 보이지 않는지 확인합니다.
확인 기준: 문서처럼 읽히되 앱 전체 톤과 분리되어 보이지 않아야 합니다.
다음 액션: 내용이 긴 문서와 짧은 문서를 각각 열어 비교합니다.
""",
    },
    {
        "email": "hyunwoo@atsb.local",
        "title": "[DB] 시드 데이터 초기화 스크립트 작성",
        "type": "task",
        "status": "done",
        "priority": "high",
        "due_offset": 0,
        "age_days": 0,
        "tags": ["database", "seed", "demo"],
        "content": """
담당자: 오현우
완료 내용: 기존 users, posts, comments, tags, notion_documents, document_embeddings를 초기화하고 데모 계정과 게시글을 다시 넣는 스크립트를 준비했습니다.
주의점: 실행하면 기존 게시글과 계정은 복구되지 않습니다.
다음 액션: 초기화 직후 /ai/sync-documents를 실행해 벡터 DB를 다시 채웁니다.
""",
    },
    {
        "email": "sumin@atsb.local",
        "title": "[QA] 데모 시나리오 체크리스트",
        "type": "daily_log",
        "status": "in_progress",
        "priority": "medium",
        "due_offset": 2,
        "age_days": 0,
        "tags": ["QA", "demo", "checklist"],
        "content": """
담당자: 한수민
오늘 할 일: 로그인, 게시글 목록 필터, 상세 댓글, Notion 문서 상세, RAG 동기화, RAG 질문까지 한 번에 이어지는 흐름을 점검합니다.
예상 질문: "현재 high priority 작업은?", "blocked인 항목 담당자는?", "Git 상태 반영됐어?"를 준비합니다.
완료 기준: 데모 중 빈 화면이나 원인 모를 오류 메시지가 나오지 않습니다.
""",
    },
    {
        "email": "woohyun@atsb.local",
        "title": "[Dashboard] 오늘 브리핑 문구 품질 개선",
        "type": "task",
        "status": "todo",
        "priority": "medium",
        "due_offset": 6,
        "age_days": 3,
        "tags": ["dashboard", "AI", "copy"],
        "content": """
담당자: 전우현
목표: 오늘 브리핑이 단순 나열이 아니라 "오늘 집중할 일"을 먼저 말하도록 프롬프트와 fallback 문구를 정리합니다.
확인 필요: 담당자별 작업과 팀 전체 blocker가 함께 들어갈 때 우선순위가 잘 보이는지 확인합니다.
완료 기준: AI 호출 실패 시에도 보드 데이터를 기반으로 읽을 만한 요약이 표시됩니다.
""",
    },
    {
        "email": "minseo@atsb.local",
        "title": "[GitHub] PR 카드 상태 문구 정리",
        "type": "task",
        "status": "in_progress",
        "priority": "low",
        "due_offset": 5,
        "age_days": 4,
        "tags": ["GitHub", "frontend", "dashboard"],
        "content": """
담당자: 김민서
현재 상태: PR 목록에서 draft, open, review 필요 상태가 한눈에 보이도록 문구를 정리하고 있습니다.
리스크: GitHub API가 실패하면 대시보드가 비어 보일 수 있습니다.
다음 액션: 실패 시 "GitHub 연결 확인 필요" 수준의 안내와 재시도 버튼을 표시합니다.
""",
    },
    {
        "email": "seojun@atsb.local",
        "title": "[Performance] RAG 동기화 체감 시간 줄이기",
        "type": "discussion",
        "status": "todo",
        "priority": "medium",
        "due_offset": 9,
        "age_days": 6,
        "tags": ["performance", "RAG", "backend"],
        "content": """
담당자: 박서준
논의 내용: 문서가 많아질수록 동기화 버튼을 누른 뒤 기다리는 시간이 길어집니다.
아이디어: 문서 변경 여부를 먼저 비교하고, 바뀐 source만 embedding을 재생성합니다.
다음 액션: last_edited_time, updated_at, commit sha를 기준으로 incremental sync 가능성을 검토합니다.
""",
    },
    {
        "email": "jiyoon@atsb.local",
        "title": "[Docs] 데모 계정과 테스트 질문 정리",
        "type": "task",
        "status": "todo",
        "priority": "low",
        "due_offset": 7,
        "age_days": 5,
        "tags": ["docs", "demo", "RAG"],
        "content": """
담당자: 최지윤
목표: 데모를 보는 사람이 바로 따라할 수 있도록 로그인 계정, 동기화 순서, 추천 질문을 짧게 정리합니다.
포함할 질문: "RAG 담당자는 누구야?", "현재 블로커를 알려줘", "최근 Git 변경 파일은 뭐야?".
완료 기준: 별도 설명 없이도 앱 첫 화면에서 흐름을 따라갈 수 있습니다.
""",
    },
]


DEMO_COMMENTS = [
    (0, "taeho@atsb.local", "동기화 후 source별 건수까지 같이 확인하겠습니다."),
    (0, "sumin@atsb.local", "실패 문서가 있으면 QA 질문 목록에 따로 표시할게요."),
    (1, "woohyun@atsb.local", "로컬 git status는 민감한 diff 본문 없이 요약만 넣는 방향이 좋아 보입니다."),
    (2, "yuna@atsb.local", "Step 1에 결과 요약이 들어가면 화면 균형이 훨씬 좋아질 것 같아요."),
    (4, "minseo@atsb.local", "embedding 제한은 일단 작은 limit으로 재현해보고 판단합시다."),
    (5, "jiyoon@atsb.local", "코드블록과 체크박스는 실제 문서 두 개로 비교해볼게요."),
    (7, "seojun@atsb.local", "담당자와 마감일은 목록에서 바로 보이는 게 좋겠습니다."),
    (9, "doyeon@atsb.local", "참고 문서 버튼 라벨도 source_type별로 다르게 보이면 이해가 쉬울 것 같아요."),
    (13, "woohyun@atsb.local", "댓글 수정 후 refetch 타이밍만 한 번 더 확인해주세요."),
    (16, "haneul@atsb.local", "부분 성공 응답이면 warning 표시 위치가 중요합니다."),
    (18, "sumin@atsb.local", "초기화 후 바로 RAG 질문까지 이어서 테스트하겠습니다."),
    (20, "jiyoon@atsb.local", "브리핑 fallback이 자연스러우면 데모 안정성이 올라갈 것 같아요."),
    (22, "taeho@atsb.local", "incremental sync는 다음 스프린트 후보로 올려두겠습니다."),
]


def require_database_url() -> str:
    if DATABASE_URL is None:
        raise RuntimeError("DATABASE_URL is not set")

    return DATABASE_URL


def execute_migrations(cur) -> None:
    for migration_path in sorted(SQL_DIR.glob("*.sql")):
        cur.execute(migration_path.read_text(encoding="utf-8"))


def reset_tables(cur) -> None:
    cur.execute(
        """
        TRUNCATE TABLE
            post_tags,
            comments,
            document_embeddings,
            notion_documents,
            posts,
            tags,
            users
        RESTART IDENTITY CASCADE
        """
    )


def insert_users(cur) -> dict[str, dict[str, Any]]:
    password_hash = get_password_hash(DEMO_PASSWORD)
    users_by_email = {}

    for user in DEMO_USERS:
        cur.execute(
            """
            INSERT INTO users (
                email,
                password_hash,
                nickname,
                github_username,
                role
            )
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id, email, nickname, github_username, role
            """,
            (
                user["email"],
                password_hash,
                user["nickname"],
                user["github_username"],
                user["role"],
            ),
        )
        row = cur.fetchone()
        users_by_email[row["email"]] = row

    return users_by_email


def ensure_tag(cur, name: str) -> int:
    cur.execute(
        """
        INSERT INTO tags (name)
        VALUES (%s)
        ON CONFLICT (name)
        DO UPDATE SET name = EXCLUDED.name
        RETURNING id
        """,
        (name,),
    )
    return cur.fetchone()["id"]


def insert_posts(cur, users_by_email: dict[str, dict[str, Any]]) -> list[int]:
    now = datetime.now()
    today = date.today()
    post_ids = []

    for index, post in enumerate(DEMO_POSTS):
        created_at = now - timedelta(days=post["age_days"], hours=index % 6)
        updated_at = min(now, created_at + timedelta(hours=3 + (index % 5)))
        due_date = today + timedelta(days=post["due_offset"])
        user = users_by_email[post["email"]]

        cur.execute(
            """
            INSERT INTO posts (
                user_id,
                title,
                content,
                type,
                status,
                priority,
                due_date,
                created_at,
                updated_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            (
                user["id"],
                post["title"],
                post["content"].strip(),
                post["type"],
                post["status"],
                post["priority"],
                due_date,
                created_at,
                updated_at,
            ),
        )
        post_id = cur.fetchone()["id"]
        post_ids.append(post_id)

        for tag in post["tags"]:
            tag_id = ensure_tag(cur, tag)
            cur.execute(
                """
                INSERT INTO post_tags (post_id, tag_id)
                VALUES (%s, %s)
                ON CONFLICT DO NOTHING
                """,
                (post_id, tag_id),
            )

    return post_ids


def insert_comments(
    cur,
    users_by_email: dict[str, dict[str, Any]],
    post_ids: list[int],
) -> None:
    now = datetime.now()

    for index, (post_index, email, content) in enumerate(DEMO_COMMENTS):
        created_at = now - timedelta(hours=index + 1)
        cur.execute(
            """
            INSERT INTO comments (
                post_id,
                user_id,
                content,
                created_at,
                updated_at
            )
            VALUES (%s, %s, %s, %s, %s)
            """,
            (
                post_ids[post_index],
                users_by_email[email]["id"],
                content,
                created_at,
                created_at,
            ),
        )


def fetch_counts(cur) -> dict[str, int]:
    cur.execute(
        """
        SELECT
            (SELECT COUNT(*) FROM users) AS users,
            (SELECT COUNT(*) FROM posts) AS posts,
            (SELECT COUNT(*) FROM comments) AS comments,
            (SELECT COUNT(*) FROM tags) AS tags,
            (SELECT COUNT(*) FROM notion_documents) AS notion_documents,
            (SELECT COUNT(*) FROM document_embeddings) AS document_embeddings
        """
    )
    return dict(cur.fetchone())


def main() -> None:
    database_url = require_database_url()

    with psycopg.connect(database_url, row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            execute_migrations(cur)
            reset_tables(cur)
            users_by_email = insert_users(cur)
            post_ids = insert_posts(cur, users_by_email)
            insert_comments(cur, users_by_email, post_ids)
            counts = fetch_counts(cur)

        conn.commit()

    print("Demo DB reset complete.")
    print(f"Users: {counts['users']}")
    print(f"Posts: {counts['posts']}")
    print(f"Comments: {counts['comments']}")
    print(f"Tags: {counts['tags']}")
    print(f"Notion documents: {counts['notion_documents']}")
    print(f"Vector chunks: {counts['document_embeddings']}")
    print(f"Demo password for all accounts: {DEMO_PASSWORD}")
    print("Primary login: woohyun@atsb.local")


if __name__ == "__main__":
    main()
