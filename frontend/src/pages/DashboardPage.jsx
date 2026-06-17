import { useEffect, useMemo, useState } from 'react'
import AppLayout from '../components/AppLayout'
import { Badge, Button, Card, CardHeader, EmptyState, ErrorMessage, Loading } from '../components/ui'
import { createTeamSummary, createTodayBriefing } from '../api/aiApi'
import {
  getGithubCommits,
  getGithubIssues,
  getGithubPullRequests,
} from '../api/githubApi'
import { getNotionDocs } from '../api/notionApi'
import { getPosts } from '../api/postApi'
import {
  formatDateTime,
  getPriorityLabel,
  getStatusClass,
  getStatusLabel,
  getTypeLabel,
} from '../utils/display'

function getTodayKey() {
  const now = new Date()
  const month = `${now.getMonth() + 1}`.padStart(2, '0')
  const day = `${now.getDate()}`.padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

function getPriorityWeight(priority) {
  return { high: 3, medium: 2, low: 1 }[priority] ?? 0
}

function TodayTaskVisual({ isLoading, posts }) {
  const todayKey = getTodayKey()
  const tasks = posts
    .filter((post) => post.status !== 'done')
    .filter((post) => {
      if (post.due_date && post.due_date <= todayKey) return true
      return post.priority === 'high' || post.status === 'blocked' || post.status === 'in_progress'
    })
    .sort((a, b) => {
      if (a.status === 'blocked' && b.status !== 'blocked') return -1
      if (b.status === 'blocked' && a.status !== 'blocked') return 1
      return getPriorityWeight(b.priority) - getPriorityWeight(a.priority)
    })
    .slice(0, 5)

  const statusCounts = {
    todo: tasks.filter((post) => post.status === 'todo').length,
    inProgress: tasks.filter((post) => post.status === 'in_progress').length,
    blocked: tasks.filter((post) => post.status === 'blocked').length,
  }
  const total = tasks.length
  const highPriority = tasks.filter((post) => post.priority === 'high').length
  const dueToday = tasks.filter((post) => post.due_date && post.due_date <= todayKey).length

  if (isLoading) return <Loading />

  if (total === 0) {
    return (
      <EmptyState
        title="오늘 바로 볼 작업이 없습니다."
        description="마감이 임박했거나 높은 우선순위인 작업이 생기면 여기에 표시됩니다."
      />
    )
  }

  return (
    <div className="today-task-visual">
      <div className="today-task-summary">
        <div>
          <strong>{total}</strong>
          <span>오늘 볼 작업</span>
        </div>
        <div>
          <strong>{highPriority}</strong>
          <span>높은 우선순위</span>
        </div>
        <div>
          <strong>{dueToday}</strong>
          <span>마감 임박</span>
        </div>
      </div>

      <div className="today-task-bars" aria-label="오늘 할 일 상태 분포">
        <div>
          <span>대기</span>
          <strong>{statusCounts.todo}</strong>
          <i style={{ width: `${(statusCounts.todo / total) * 100}%` }} />
        </div>
        <div>
          <span>진행</span>
          <strong>{statusCounts.inProgress}</strong>
          <i style={{ width: `${(statusCounts.inProgress / total) * 100}%` }} />
        </div>
        <div>
          <span>막힘</span>
          <strong>{statusCounts.blocked}</strong>
          <i style={{ width: `${(statusCounts.blocked / total) * 100}%` }} />
        </div>
      </div>

      <ul className="today-task-list">
        {tasks.map((post) => (
          <li key={post.id}>
            <div>
              <strong>{post.title}</strong>
              <span>{post.due_date ? `마감 ${post.due_date}` : getTypeLabel(post.type)}</span>
            </div>
            <div className="meta-row">
              <Badge tone={getStatusClass(post.status)}>{getStatusLabel(post.status)}</Badge>
              <Badge tone={post.priority}>{getPriorityLabel(post.priority)}</Badge>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function DashboardPage() {
  const [posts, setPosts] = useState([])
  const [issues, setIssues] = useState([])
  const [pulls, setPulls] = useState([])
  const [commits, setCommits] = useState([])
  const [notionDocs, setNotionDocs] = useState([])

  const [todayBriefing, setTodayBriefing] = useState(null)
  const [teamSummary, setTeamSummary] = useState(null)
  const [isTodayLoading, setIsTodayLoading] = useState(false)
  const [isTeamLoading, setIsTeamLoading] = useState(false)
  const [aiError, setAiError] = useState(null)

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const metrics = useMemo(() => {
    return {
      openTasks: posts.filter((post) => post.status === 'todo').length,
      inProgress: posts.filter((post) => post.status === 'in_progress').length,
      blockers: posts.filter((post) => post.status === 'blocked').length,
      openPrs: pulls.length,
    }
  }, [posts, pulls])

  const recentLogs = posts.slice(0, 3)

  useEffect(() => {
    async function loadDashboard() {
      try {
        setIsLoading(true)
        setError(null)

        const [postsData, issuesData, pullsData, commitsData, notionData] =
          await Promise.all([
            getPosts({ page: 1, size: 24 }),
            getGithubIssues({ state: 'open', per_page: 20 }),
            getGithubPullRequests({ state: 'open', per_page: 20 }),
            getGithubCommits({ per_page: 20 }),
            getNotionDocs({ page_size: 6 }),
          ])

        setPosts(postsData.items ?? [])
        setIssues(Array.isArray(issuesData) ? issuesData : [])
        setPulls(Array.isArray(pullsData) ? pullsData : [])
        setCommits(Array.isArray(commitsData) ? commitsData : [])
        setNotionDocs(notionData.items ?? [])
      } catch (err) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    loadDashboard()
  }, [])

  async function handleCreateTodayBriefing() {
    try {
      setIsTodayLoading(true)
      setAiError(null)
      setTodayBriefing(await createTodayBriefing())
    } catch (err) {
      setAiError(err.message)
    } finally {
      setIsTodayLoading(false)
    }
  }

  async function handleCreateTeamSummary() {
    try {
      setIsTeamLoading(true)
      setAiError(null)
      setTeamSummary(await createTeamSummary())
    } catch (err) {
      setAiError(err.message)
    } finally {
      setIsTeamLoading(false)
    }
  }

  return (
    <AppLayout
      actions={<Button tone="primary" to="/posts/new">새 작업 로그</Button>}
      description="작업 로그, GitHub 진행 상황, Notion 문서와 AI 요약을 한 화면에서 확인합니다."
      eyebrow="Project control room"
      title="Dashboard"
    >
      {error && <ErrorMessage error={error} />}

      <section className="metrics-grid">
        <Card className="metric-card">
          <p className="metric-label">Open Tasks</p>
          <strong>{metrics.openTasks}</strong>
          <span>아직 착수 전인 작업</span>
        </Card>
        <Card className="metric-card">
          <p className="metric-label">In Progress</p>
          <strong>{metrics.inProgress}</strong>
          <span>현재 진행 중</span>
        </Card>
        <Card className="metric-card">
          <p className="metric-label">Blockers</p>
          <strong>{metrics.blockers}</strong>
          <span>주의가 필요한 항목</span>
        </Card>
        <Card className="metric-card">
          <p className="metric-label">Open PRs</p>
          <strong>{metrics.openPrs}</strong>
          <span>검토 대기 PR</span>
        </Card>
      </section>

      <section className="dashboard-grid">
        <Card className="ai-command-card">
          <CardHeader
            eyebrow="AI Briefing"
            title="오늘 할 일"
            description="현재 작업 상태를 먼저 훑고, 필요할 때 AI 요약을 생성합니다."
          />

          {aiError && <ErrorMessage error={aiError} />}

          <div className="briefing-toolbar">
            <Button
              disabled={isTodayLoading}
              onClick={handleCreateTodayBriefing}
              tone="primary"
            >
              {isTodayLoading ? '요약 중' : '오늘 할 일 생성'}
            </Button>
            <Button to="/rag">Ask Docs</Button>
          </div>

          <div className="briefing-body">
            <TodayTaskVisual isLoading={isLoading} posts={posts} />
            {todayBriefing ? (
              <>
                <p className="briefing-summary">{todayBriefing.summary}</p>
                <ul className="compact-list">
                  {todayBriefing.priority_tasks?.slice(0, 3).map((task, index) => (
                    <li key={`${task.title}-${index}`}>
                      <strong>{task.title}</strong>
                      <span>{task.reason}</span>
                    </li>
                  ))}
                </ul>
                <p className="next-action">{todayBriefing.next_action}</p>
              </>
            ) : (
              <p className="briefing-hint">
                생성 버튼을 누르면 이 블록 안에 오늘의 요약과 우선순위가 정리됩니다.
              </p>
            )}
          </div>
        </Card>

        <Card className="team-summary-card">
          <CardHeader
            eyebrow="Team Summary"
            title="팀 진행 상황"
            description="영역별 진행과 리스크를 별도 요약으로 확인합니다."
          />

          <div className="briefing-toolbar">
            <Button
              disabled={isTeamLoading}
              onClick={handleCreateTeamSummary}
              tone="primary"
            >
              {isTeamLoading ? '요약 중' : '팀 진행 상황 생성'}
            </Button>
          </div>

          <div className="briefing-body">
            {teamSummary ? (
              <>
                <p className="briefing-summary">{teamSummary.summary}</p>
                <ul className="compact-list">
                  {teamSummary.by_area?.slice(0, 3).map((area, index) => (
                    <li key={`${area.area}-${index}`}>
                      <strong>{area.area}</strong>
                      <span>{area.progress}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <EmptyState
                title="팀 요약이 아직 없습니다."
                description="생성 버튼을 누르면 팀 진행 상황만 따로 정리합니다."
              />
            )}
          </div>
        </Card>
      </section>

      <section className="dashboard-lower-grid">
        <Card>
          <CardHeader
            action={<Button to="/posts">전체 보기</Button>}
            eyebrow="Work logs"
            title="최근 작업 로그"
          />
          {isLoading ? (
            <Loading />
          ) : recentLogs.length === 0 ? (
            <EmptyState title="작업 로그가 없습니다." />
          ) : (
            <ul className="work-feed">
              {recentLogs.map((post) => (
                <li key={post.id}>
                  <div className="feed-marker" />
                  <div>
                    <strong>{post.title}</strong>
                    <p className="one-line">{post.content}</p>
                    <div className="meta-row">
                      <Badge>{getTypeLabel(post.type)}</Badge>
                      <Badge tone={getStatusClass(post.status)}>
                        {getStatusLabel(post.status)}
                      </Badge>
                      <Badge tone={post.priority}>우선순위 {getPriorityLabel(post.priority)}</Badge>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            action={<Button to="/github">GitHub 열기</Button>}
            eyebrow="GitHub"
            title="개발 진행"
          />
          {isLoading ? (
            <Loading />
          ) : (
            <div className="integration-summary">
              <div>
                <span>Issues</span>
                <strong>{issues.length}</strong>
              </div>
              <div>
                <span>Pull Requests</span>
                <strong>{pulls.length}</strong>
              </div>
              <div>
                <span>Commits</span>
                <strong>{commits.length}</strong>
              </div>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader
            action={<Button to="/notion-docs">문서 보기</Button>}
            eyebrow="Notion"
            title="최근 문서"
          />
          {isLoading ? (
            <Loading />
          ) : notionDocs.length === 0 ? (
            <EmptyState title="표시할 Notion 문서가 없습니다." />
          ) : (
            <ul className="compact-list">
              {notionDocs.slice(0, 3).map((doc) => (
                <li key={doc.page_id}>
                  <strong>{doc.title}</strong>
                  <span>수정 {formatDateTime(doc.last_edited_time)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </AppLayout>
  )
}

export default DashboardPage
