import { useEffect, useState } from 'react'
import AuthNav from '../components/AuthNav'
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

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

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