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

function MiniLog({ post }) {
  return (
    <li className="mini-row">
      <div>
        <strong>{post.title}</strong>
        <p>
          {getTypeLabel(post.type)} · {post.due_date ? `마감 ${post.due_date}` : '마감 없음'}
        </p>
      </div>
      <Badge tone={getStatusClass(post.status)}>{getStatusLabel(post.status)}</Badge>
    </li>
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
  const [activeBriefing, setActiveBriefing] = useState('today')
  const [isAiLoading, setIsAiLoading] = useState(false)
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

  const highPriorityPosts = posts.filter((post) => post.priority === 'high').slice(0, 3)
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
        setIssues(issuesData)
        setPulls(pullsData)
        setCommits(commitsData)
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
      setIsAiLoading(true)
      setAiError(null)
      setTodayBriefing(await createTodayBriefing())
    } catch (err) {
      setAiError(err.message)
    } finally {
      setIsAiLoading(false)
    }
  }

  async function handleCreateTeamSummary() {
    try {
      setIsAiLoading(true)
      setAiError(null)
      setTeamSummary(await createTeamSummary())
    } catch (err) {
      setAiError(err.message)
    } finally {
      setIsAiLoading(false)
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
            title={activeBriefing === 'today' ? '오늘 할 일' : '팀 진행 상황'}
            description="필요한 요약 하나만 열어 오늘의 판단에 집중합니다."
            action={
              <div className="briefing-tabs">
                <Button
                  className={`briefing-tab ${activeBriefing === 'today' ? 'active' : ''}`}
                  onClick={() => setActiveBriefing('today')}
                >
                  오늘 할 일
                </Button>
                <Button
                  className={`briefing-tab ${activeBriefing === 'team' ? 'active' : ''}`}
                  onClick={() => setActiveBriefing('team')}
                >
                  팀 진행 상황
                </Button>
              </div>
            }
          />

          {aiError && <ErrorMessage error={aiError} />}

          <div className="briefing-toolbar">
            <Button
              disabled={isAiLoading}
              onClick={
                activeBriefing === 'today'
                  ? handleCreateTodayBriefing
                  : handleCreateTeamSummary
              }
              tone="primary"
            >
              {isAiLoading
                ? '요약 중'
                : activeBriefing === 'today'
                  ? '오늘 할 일 생성'
                  : '팀 진행 상황 생성'}
            </Button>
            <Button to="/rag">Ask Docs</Button>
          </div>

          <div className="briefing-body">
            {activeBriefing === 'today' ? (
              todayBriefing ? (
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
                <EmptyState
                  title="오늘 요약이 아직 없습니다."
                  description="버튼을 누르면 현재 작업 상태를 기준으로 생성합니다."
                />
              )
            ) : teamSummary ? (
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
                  description="진행 영역과 리스크를 AI가 정리합니다."
                />
              )}
          </div>
        </Card>

        <Card>
          <CardHeader
            action={<Button to="/posts">전체 보기</Button>}
            eyebrow="Focus"
            title="Today Focus"
            description="높은 우선순위 작업만 최대 3개 표시합니다."
          />
          {isLoading ? (
            <Loading />
          ) : highPriorityPosts.length === 0 ? (
            <EmptyState title="높은 우선순위 작업이 없습니다." />
          ) : (
            <ul className="mini-list">
              {highPriorityPosts.map((post) => (
                <MiniLog key={post.id} post={post} />
              ))}
            </ul>
          )}
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
