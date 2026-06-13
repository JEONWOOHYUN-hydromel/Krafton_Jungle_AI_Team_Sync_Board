import { useEffect, useState } from 'react'
import AuthNav from '../components/AuthNav'
import { createTeamSummary, createTodayBriefing } from '../api/aiApi'

import {
  getGithubCommits,
  getGithubIssues,
  getGithubPullRequests,
} from '../api/githubApi'

function DashboardSection({ title, isLoading, error, children }) {
  return (
    <section
      style={{
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '16px',
      }}
    >
      <h2 style={{ marginTop: 0 }}>{title}</h2>

      {isLoading && <p>불러오는 중...</p>}
      {error && <p style={{ color: 'red' }}>에러: {error}</p>}
      {!isLoading && !error && children}
    </section>
  )
}

function DashboardPage() {
  const [issues, setIssues] = useState([])
  const [pulls, setPulls] = useState([])
  const [commits, setCommits] = useState([])

  const [todayBriefing, setTodayBriefing] = useState(null)
  const [teamSummary, setTeamSummary] = useState(null)
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [aiError, setAiError] = useState(null)

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  async function handleCreateTodayBriefing() {
    try {
      setIsAiLoading(true)
      setAiError(null)

      const data = await createTodayBriefing()
      setTodayBriefing(data)
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

      const data = await createTeamSummary()
      setTeamSummary(data)
    } catch (err) {
      setAiError(err.message)
    } finally {
      setIsAiLoading(false)
    }
  }

  useEffect(() => {
    async function loadGithubData() {
      try {
        setIsLoading(true)
        setError(null)

        const [issuesData, pullsData, commitsData] = await Promise.all([
          getGithubIssues({ state: 'open', per_page: 10 }),
          getGithubPullRequests({ state: 'open', per_page: 10 }),
          getGithubCommits({ per_page: 10 }),
        ])

        setIssues(issuesData)
        setPulls(pullsData)
        setCommits(commitsData)
      } catch (err) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    loadGithubData()
  }, [])

  return (
    <main style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <h1>Dashboard</h1>

      <AuthNav />

      <p>
        GitHub Issue, Pull Request, 최근 commit을 확인하는 대시보드입니다.
      </p>

      <section
    style={{
      border: '1px solid #ddd',
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '16px',
    }}
  >
    <h2 style={{ marginTop: 0 }}>AI 요약</h2>

    <p>
      게시판 작업 로그, GitHub 진행 상황, Notion 문서를 모아서 요약합니다.
    </p>

    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
      <button
        type="button"
        onClick={handleCreateTodayBriefing}
        disabled={isAiLoading}
      >
        {isAiLoading ? '요약 중...' : '오늘 할 일 AI 요약'}
      </button>

      <button
        type="button"
        onClick={handleCreateTeamSummary}
        disabled={isAiLoading}
      >
        {isAiLoading ? '요약 중...' : '팀 진행 상황 AI 요약'}
      </button>
    </div>

    {aiError && <p style={{ color: 'red' }}>AI 에러: {aiError}</p>}

    {todayBriefing && (
      <article
        style={{
          border: '1px solid #eee',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '12px',
        }}
      >
        <h3>오늘 할 일 요약</h3>

        <p>{todayBriefing.summary}</p>

        <h4>우선 작업</h4>
        {todayBriefing.priority_tasks?.length > 0 ? (
          <ul>
            {todayBriefing.priority_tasks.map((task, index) => (
              <li key={`${task.title}-${index}`}>
                <strong>{task.title}</strong> [{task.priority}] - {task.reason}
                <br />
                <span>source: {task.source}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p>우선 작업이 없습니다.</p>
        )}

        <h4>GitHub 요약</h4>
        <p>{todayBriefing.github_summary}</p>

        <h4>참고 Notion 문서</h4>
        {todayBriefing.notion_references?.length > 0 ? (
          <ul>
            {todayBriefing.notion_references.map((doc, index) => (
              <li key={`${doc.title}-${index}`}>
                <strong>{doc.title}</strong> - {doc.reason}
              </li>
            ))}
          </ul>
        ) : (
          <p>추천 문서가 없습니다.</p>
        )}

        <h4>Blockers</h4>
        {todayBriefing.blockers?.length > 0 ? (
          <ul>
            {todayBriefing.blockers.map((blocker, index) => (
              <li key={`${blocker}-${index}`}>{blocker}</li>
            ))}
          </ul>
        ) : (
          <p>확인된 blocker가 없습니다.</p>
        )}

        <h4>다음 액션</h4>
        <p>{todayBriefing.next_action}</p>

        {todayBriefing.data_warnings?.length > 0 && (
          <>
            <h4>데이터 경고</h4>
            <ul>
              {todayBriefing.data_warnings.map((warning, index) => (
                <li key={`${warning}-${index}`}>{warning}</li>
              ))}
            </ul>
          </>
        )}
      </article>
    )}

    {teamSummary && (
      <article
        style={{
          border: '1px solid #eee',
          borderRadius: '8px',
          padding: '12px',
        }}
      >
        <h3>팀 진행 상황 요약</h3>

        <p>{teamSummary.summary}</p>

        <h4>영역별 진행 상황</h4>
        {teamSummary.by_area?.length > 0 ? (
          <ul>
            {teamSummary.by_area.map((area, index) => (
              <li key={`${area.area}-${index}`}>
                <strong>{area.area}</strong>
                <br />
                progress: {area.progress}
                <br />
                risk: {area.risk}
              </li>
            ))}
          </ul>
        ) : (
          <p>영역별 요약이 없습니다.</p>
        )}

        <h4>Blockers</h4>
        {teamSummary.blockers?.length > 0 ? (
          <ul>
            {teamSummary.blockers.map((blocker, index) => (
              <li key={`${blocker}-${index}`}>{blocker}</li>
            ))}
          </ul>
        ) : (
          <p>확인된 blocker가 없습니다.</p>
        )}

        <h4>추천 액션</h4>
        {teamSummary.recommended_actions?.length > 0 ? (
          <ul>
            {teamSummary.recommended_actions.map((action, index) => (
              <li key={`${action}-${index}`}>{action}</li>
            ))}
          </ul>
        ) : (
          <p>추천 액션이 없습니다.</p>
        )}

        <h4>GitHub 요약</h4>
        <p>{teamSummary.github_summary}</p>

        <h4>Notion 요약</h4>
        <p>{teamSummary.notion_summary}</p>

        {teamSummary.data_warnings?.length > 0 && (
          <>
            <h4>데이터 경고</h4>
            <ul>
              {teamSummary.data_warnings.map((warning, index) => (
                <li key={`${warning}-${index}`}>{warning}</li>
              ))}
            </ul>
          </>
        )}
      </article>
    )}
  </section>

      <DashboardSection
        title="Open Issues"
        isLoading={isLoading}
        error={error}
      >
        {issues.length === 0 ? (
          <p>열린 Issue가 없습니다.</p>
        ) : (
          <ul style={{ paddingLeft: '20px' }}>
            {issues.map((issue) => (
              <li key={issue.number} style={{ marginBottom: '12px' }}>
                <a href={issue.url} target="_blank" rel="noreferrer">
                  #{issue.number} {issue.title}
                </a>
                <br />
                <span>state: {issue.state}</span>
                <br />
                <span>
                  assignees:{' '}
                  {issue.assignees.length > 0
                    ? issue.assignees.join(', ')
                    : 'none'}
                </span>
                <br />
                <span>
                  labels:{' '}
                  {issue.labels.length > 0 ? issue.labels.join(', ') : 'none'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </DashboardSection>

      <DashboardSection
        title="Open Pull Requests"
        isLoading={isLoading}
        error={error}
      >
        {pulls.length === 0 ? (
          <p>열린 PR이 없습니다.</p>
        ) : (
          <ul style={{ paddingLeft: '20px' }}>
            {pulls.map((pull) => (
              <li key={pull.number} style={{ marginBottom: '12px' }}>
                <a href={pull.url} target="_blank" rel="noreferrer">
                  #{pull.number} {pull.title}
                </a>
                <br />
                <span>state: {pull.state}</span>
                <br />
                <span>author: {pull.user ?? 'unknown'}</span>
                <br />
                <span>{pull.draft ? 'draft' : 'ready'}</span>
              </li>
            ))}
          </ul>
        )}
      </DashboardSection>

      <DashboardSection
        title="Recent Commits"
        isLoading={isLoading}
        error={error}
      >
        {commits.length === 0 ? (
          <p>최근 commit이 없습니다.</p>
        ) : (
          <ul style={{ paddingLeft: '20px' }}>
            {commits.map((commit) => (
              <li key={commit.full_sha} style={{ marginBottom: '12px' }}>
                <a href={commit.url} target="_blank" rel="noreferrer">
                  {commit.sha}
                </a>{' '}
                {commit.message.split('\n')[0]}
                <br />
                <span>author: {commit.author ?? 'unknown'}</span>
                <br />
                <span>date: {commit.date}</span>
              </li>
            ))}
          </ul>
        )}
      </DashboardSection>
    </main>
  )
}

export default DashboardPage