import { useEffect, useMemo, useState } from 'react'
import AppLayout from '../components/AppLayout'
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorMessage,
  Input,
  Loading,
  Select,
} from '../components/ui'
import {
  getGithubCommits,
  getGithubIssues,
  getGithubPullRequests,
} from '../api/githubApi'
import { formatDateTime } from '../utils/display'

const TAB_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'issue', label: 'Issues' },
  { value: 'pull', label: 'Pull Requests' },
  { value: 'commit', label: 'Commits' },
]

function valueToText(value, fallback = '없음') {
  if (!value) return fallback
  if (typeof value === 'string') return value
  return value.login ?? value.name ?? value.title ?? fallback
}

function normalizeLabels(labels) {
  if (!Array.isArray(labels)) return []

  return labels
    .map((label) => valueToText(label, ''))
    .filter(Boolean)
}

function normalizeIssue(issue) {
  const assignees = Array.isArray(issue?.assignees) ? issue.assignees : []

  return {
    type: 'issue',
    typeLabel: 'Issue',
    id: issue?.number ? `#${issue.number}` : '#unknown',
    title: issue?.title ?? 'Untitled issue',
    labels: normalizeLabels(issue?.labels),
    owner: assignees.length > 0
      ? assignees.map((assignee) => valueToText(assignee)).join(', ')
      : valueToText(issue?.user),
    ownerLabel: assignees.length > 0 ? 'Assignee' : 'Author',
    date: issue?.created_at ?? issue?.updated_at ?? '',
    dateLabel: 'Created',
    sortDate: issue?.updated_at ?? issue?.created_at ?? '',
    url: issue?.html_url ?? issue?.url,
  }
}

function normalizePull(pull) {
  return {
    type: 'pull',
    typeLabel: 'PR',
    id: pull?.number ? `#${pull.number}` : '#unknown',
    title: pull?.title ?? 'Untitled pull request',
    labels: normalizeLabels(pull?.labels),
    owner: valueToText(pull?.user, 'unknown'),
    ownerLabel: 'Author',
    date: pull?.created_at ?? pull?.updated_at ?? '',
    dateLabel: 'Created',
    sortDate: pull?.updated_at ?? pull?.created_at ?? '',
    url: pull?.html_url ?? pull?.url,
  }
}

function normalizeCommit(commit) {
  return {
    type: 'commit',
    typeLabel: 'Commit',
    id: commit?.sha ?? 'unknown',
    title: commit?.message?.split('\n')[0] ?? 'Commit message unavailable',
    labels: [],
    owner: valueToText(commit?.author, 'unknown'),
    ownerLabel: 'Author',
    date: commit?.committed_at ?? commit?.date ?? '',
    dateLabel: 'Committed',
    sortDate: commit?.committed_at ?? commit?.date ?? '',
    url: commit?.html_url ?? commit?.url,
  }
}

function GitHubActivityRow({ item }) {
  return (
    <article className="github-row-card">
      <div className="github-row-main">
        <div className="github-row-heading">
          <Badge>{item.typeLabel}</Badge>
          <span className="github-row-id">{item.id}</span>
          <h3>{item.title}</h3>
        </div>

        <div className="github-row-meta">
          <span>{item.ownerLabel}: {item.owner}</span>
          <span>{item.dateLabel}: {formatDateTime(item.date)}</span>
        </div>

        <div className="github-row-tags">
          {item.labels.length > 0 ? (
            item.labels.map((label, index) => (
              <Badge key={`${item.type}-${item.id}-${label}-${index}`}>#{label}</Badge>
            ))
          ) : (
            <span className="subtle">labels 없음</span>
          )}
        </div>
      </div>

      {item.url && <Button href={item.url}>열기</Button>}
    </article>
  )
}

function GitHubPage() {
  const [issues, setIssues] = useState([])
  const [pulls, setPulls] = useState([])
  const [commits, setCommits] = useState([])
  const [activeTab, setActiveTab] = useState('all')
  const [query, setQuery] = useState('')
  const [sortOrder, setSortOrder] = useState('newest')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function loadGitHub() {
      try {
        setIsLoading(true)
        setError(null)

        const [issuesData, pullsData, commitsData] = await Promise.all([
          getGithubIssues({ state: 'open', per_page: 40 }),
          getGithubPullRequests({ state: 'open', per_page: 40 }),
          getGithubCommits({ per_page: 40 }),
        ])

        setIssues(Array.isArray(issuesData) ? issuesData : [])
        setPulls(Array.isArray(pullsData) ? pullsData : [])
        setCommits(Array.isArray(commitsData) ? commitsData : [])
      } catch (err) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    loadGitHub()
  }, [])

  const allItems = useMemo(() => {
    return [
      ...issues.map(normalizeIssue),
      ...pulls.map(normalizePull),
      ...commits.map(normalizeCommit),
    ]
  }, [issues, pulls, commits])

  const visibleItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return allItems
      .filter((item) => activeTab === 'all' || item.type === activeTab)
      .filter((item) => {
        if (!normalizedQuery) return true

        const searchable = [
          item.typeLabel,
          item.id,
          item.title,
          item.owner,
          ...item.labels,
        ]
          .join(' ')
          .toLowerCase()

        return searchable.includes(normalizedQuery)
      })
      .sort((a, b) => {
        if (sortOrder === 'oldest') {
          return new Date(a.sortDate || 0) - new Date(b.sortDate || 0)
        }

        if (sortOrder === 'title') {
          return a.title.localeCompare(b.title)
        }

        return new Date(b.sortDate || 0) - new Date(a.sortDate || 0)
      })
  }, [activeTab, allItems, query, sortOrder])

  return (
    <AppLayout
      description="저장소의 이슈, PR, 커밋 흐름을 한 줄 활동 목록으로 확인합니다."
      eyebrow="Development activity"
      title="GitHub"
    >
      {error && <ErrorMessage error={error} />}

      <section className="metrics-grid">
        <Card className="metric-card">
          <p className="metric-label">Open Issues</p>
          <strong>{issues.length}</strong>
          <span>진행 중인 개발 항목</span>
        </Card>
        <Card className="metric-card">
          <p className="metric-label">Open PRs</p>
          <strong>{pulls.length}</strong>
          <span>리뷰 대기 변경사항</span>
        </Card>
        <Card className="metric-card">
          <p className="metric-label">Recent Commits</p>
          <strong>{commits.length}</strong>
          <span>최근 반영 내역</span>
        </Card>
      </section>

      <Card className="github-activity-card">
        <CardHeader
          eyebrow="Activity"
          title="Repository activity"
          description="탭과 검색으로 필요한 흐름만 좁혀 봅니다."
        />

        <div className="github-controls">
          <Input
            label="검색"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="title, label, assignee, sha"
            value={query}
          />

          <Select
            label="정렬"
            onChange={(event) => setSortOrder(event.target.value)}
            value={sortOrder}
          >
            <option value="newest">최신순</option>
            <option value="oldest">오래된순</option>
            <option value="title">제목순</option>
          </Select>
        </div>

        <div className="github-tabs" role="tablist" aria-label="GitHub activity filters">
          {TAB_OPTIONS.map((tab) => (
            <Button
              aria-selected={activeTab === tab.value}
              className={`github-tab ${activeTab === tab.value ? 'active' : ''}`}
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              role="tab"
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <Loading message="GitHub 데이터를 불러오는 중입니다." />
        ) : visibleItems.length === 0 ? (
          <EmptyState
            description="검색어를 줄이거나 다른 탭을 선택해보세요."
            title="표시할 GitHub 활동이 없습니다."
          />
        ) : (
          <div className="github-activity-list">
            {visibleItems.map((item) => (
              <GitHubActivityRow item={item} key={`${item.type}-${item.id}`} />
            ))}
          </div>
        )}
      </Card>
    </AppLayout>
  )
}

export default GitHubPage
