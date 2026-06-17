import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorMessage,
  Input,
  Loading,
  Select,
} from '../components/ui'
import { getMe, isLoggedIn } from '../api/authApi'
import { getPosts } from '../api/postApi'
import {
  PRIORITY_OPTIONS,
  STATUS_OPTIONS,
  TYPE_OPTIONS,
  formatDateTime,
  getPriorityLabel,
  getStatusClass,
  getStatusLabel,
  getTypeLabel,
} from '../utils/display'

const EMPTY_FILTERS = {
  keyword: '',
  type: '',
  status: '',
  priority: '',
  tag: '',
  userId: '',
  dueSoon: false,
}

const QUICK_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'my_logs', label: 'My Logs' },
  { value: 'blockers', label: 'Blockers' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'due_soon', label: 'Due Soon' },
  { value: 'done', label: 'Done' },
]

const SORT_OPTIONS = [
  { value: 'latest', label: '최신순' },
  { value: 'updated', label: '수정일순' },
  { value: 'due_date', label: '마감일 가까운 순' },
  { value: 'priority', label: '우선순위 높은 순' },
]

function getPreview(content) {
  const normalized = content?.replace(/\s+/g, ' ').trim()
  return normalized || '내용이 없습니다.'
}

function getDueLabel(dueDate) {
  if (!dueDate) return '마감 없음'
  return `Due ${dueDate}`
}

function getActiveFilterCount(filters) {
  return Object.values(filters).filter(Boolean).length
}

function WorkLogCard({ onTagClick, post }) {
  return (
    <article className="work-log-card compact-work-log-card">
      <div className="work-log-main">
        <div className="work-log-title-row">
          <div>
            <p className="work-log-id">LOG-{post.id}</p>
            <h2>
              <Link to={`/posts/${post.id}`}>{post.title}</Link>
            </h2>
          </div>

          <div className="work-log-owner">
            <span>Owner #{post.user_id ?? 'unknown'}</span>
            <span>Updated {formatDateTime(post.updated_at)}</span>
          </div>
        </div>

        <div className="meta-row work-log-badges">
          <Badge>{getTypeLabel(post.type)}</Badge>
          <Badge tone={getStatusClass(post.status)}>{getStatusLabel(post.status)}</Badge>
          <Badge tone={post.priority}>Priority {getPriorityLabel(post.priority)}</Badge>
          <Badge>{getDueLabel(post.due_date)}</Badge>
        </div>

        <p className="work-log-preview">{getPreview(post.content)}</p>

        {post.tags?.length > 0 && (
          <div className="tag-row">
            {post.tags.map((tag) => (
              <button
                className="badge tag-filter-button"
                key={tag}
                onClick={() => onTagClick(tag)}
                type="button"
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      <Button to={`/posts/${post.id}`}>열기</Button>
    </article>
  )
}

function PostsPage() {
  const [posts, setPosts] = useState([])
  const [draftFilters, setDraftFilters] = useState(EMPTY_FILTERS)
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [quickFilter, setQuickFilter] = useState('all')
  const [sortOrder, setSortOrder] = useState('latest')
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(10)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [currentUser, setCurrentUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const activeFilterCount = getActiveFilterCount(filters)

  const pageMetrics = useMemo(() => {
    return posts.reduce(
      (acc, post) => {
        acc[post.status] = (acc[post.status] ?? 0) + 1
        return acc
      },
      { blocked: 0, in_progress: 0, todo: 0 },
    )
  }, [posts])

  useEffect(() => {
    if (!isLoggedIn()) return

    let ignore = false

    async function loadCurrentUser() {
      try {
        const me = await getMe()
        if (!ignore) setCurrentUser(me)
      } catch {
        if (!ignore) setCurrentUser(null)
      }
    }

    loadCurrentUser()

    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    async function loadPosts() {
      try {
        setIsLoading(true)
        setError(null)

        const data = await getPosts({
          page,
          size,
          keyword: filters.keyword,
          type: filters.type,
          status: filters.status,
          priority: filters.priority,
          tag: filters.tag,
          user_id: filters.userId,
          due_soon: filters.dueSoon ? true : '',
          sort: sortOrder,
        })

        setPosts(data.items)
        setTotal(data.total)
        setTotalPages(data.total_pages)
      } catch (err) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    loadPosts()
  }, [page, size, filters, sortOrder])

  function handleFilterChange(event) {
    const { name, value } = event.target

    setQuickFilter('custom')
    setDraftFilters((prev) => ({
      ...prev,
      [name]: value,
      dueSoon: false,
      userId: '',
    }))
  }

  function applyFilters(nextFilters, nextQuickFilter = 'custom') {
    setDraftFilters(nextFilters)
    setFilters(nextFilters)
    setQuickFilter(nextQuickFilter)
    setPage(1)
  }

  function handleSearchSubmit(event) {
    event.preventDefault()
    applyFilters(draftFilters, getActiveFilterCount(draftFilters) === 0 ? 'all' : 'custom')
  }

  function handleResetFilters() {
    applyFilters(EMPTY_FILTERS, 'all')
  }

  function handleQuickFilter(nextQuickFilter) {
    if (nextQuickFilter === 'my_logs' && !currentUser?.id) return

    const quickFilters = {
      all: EMPTY_FILTERS,
      my_logs: { ...EMPTY_FILTERS, userId: String(currentUser?.id ?? '') },
      blockers: { ...EMPTY_FILTERS, status: 'blocked' },
      in_progress: { ...EMPTY_FILTERS, status: 'in_progress' },
      due_soon: { ...EMPTY_FILTERS, dueSoon: true },
      done: { ...EMPTY_FILTERS, status: 'done' },
    }

    applyFilters(quickFilters[nextQuickFilter], nextQuickFilter)
  }

  function handleTagClick(tag) {
    applyFilters({ ...EMPTY_FILTERS, tag }, 'custom')
  }

  function handleSortChange(event) {
    setSortOrder(event.target.value)
    setPage(1)
  }

  return (
    <AppLayout
      actions={<Button tone="primary" to="/posts/new">새 로그 작성</Button>}
      description="Daily Log, Task, Blocker, Discussion을 빠르게 검색하고 작업 흐름을 확인합니다."
      eyebrow="Work management"
      title="Work Logs"
    >
      <Card className="filter-card compact-filter-card" as="form" onSubmit={handleSearchSubmit}>
        <div className="worklog-search-row">
          <Input
            label="검색어"
            name="keyword"
            onChange={handleFilterChange}
            placeholder="예: RAG, API, blocker"
            value={draftFilters.keyword}
          />
          <Button tone="primary" type="submit">검색</Button>
          <Button onClick={handleResetFilters}>초기화</Button>
        </div>

        <div className="quick-filter-row filter-chips" aria-label="빠른 필터">
          {QUICK_FILTERS.map((filter) => (
            <Button
              aria-pressed={quickFilter === filter.value}
              className={`quick-chip ${quickFilter === filter.value ? 'active' : ''}`}
              disabled={filter.value === 'my_logs' && !currentUser?.id}
              key={filter.value}
              onClick={() => handleQuickFilter(filter.value)}
            >
              {filter.label}
            </Button>
          ))}
        </div>

        <div className="filter-grid worklog-filter-grid">
          <Select
            label="Type"
            name="type"
            onChange={handleFilterChange}
            value={draftFilters.type}
          >
            <option value="">전체 Type</option>
            {TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.value}
              </option>
            ))}
          </Select>

          <Select
            label="Status"
            name="status"
            onChange={handleFilterChange}
            value={draftFilters.status}
          >
            <option value="">전체 Status</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.value}
              </option>
            ))}
          </Select>

          <Select
            label="Priority"
            name="priority"
            onChange={handleFilterChange}
            value={draftFilters.priority}
          >
            <option value="">전체 Priority</option>
            {PRIORITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.value}
              </option>
            ))}
          </Select>

          <Input
            label="Tag"
            name="tag"
            onChange={handleFilterChange}
            placeholder="예: backend"
            value={draftFilters.tag}
          />

          <Select label="Sort" onChange={handleSortChange} value={sortOrder}>
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      <section className="worklog-summary-strip" aria-label="작업 로그 요약">
        <span className="worklog-summary-item">
          <strong>{total}</strong>
          Total
        </span>
        <span className="worklog-summary-item">
          <strong>{pageMetrics.todo}</strong>
          Todo
        </span>
        <span className="worklog-summary-item">
          <strong>{pageMetrics.in_progress}</strong>
          In Progress
        </span>
        <span className="worklog-summary-item">
          <strong>{pageMetrics.blocked}</strong>
          Blocked
        </span>
        <span className="worklog-summary-note">
          {activeFilterCount > 0
            ? `${activeFilterCount}개 조건으로 좁혀 보는 중`
            : '전체 작업 로그를 최신 흐름으로 보고 있습니다'}
        </span>
      </section>

      {isLoading && <Loading message="작업 로그를 불러오는 중입니다." />}
      {error && <ErrorMessage error={error} />}

      {!isLoading && !error && (
        <>
          {posts.length === 0 ? (
            <EmptyState
              action={
                <>
                  <Button onClick={handleResetFilters}>필터 초기화</Button>
                  <Button tone="primary" to="/posts/new">첫 로그 작성</Button>
                </>
              }
              description="검색어를 줄이거나 필터를 초기화해보세요."
              title="조건에 맞는 작업 로그가 없습니다."
            />
          ) : (
            <div className="work-log-list">
              {posts.map((post) => (
                <WorkLogCard key={post.id} onTagClick={handleTagClick} post={post} />
              ))}
            </div>
          )}

          <div className="worklog-footer">
            <div className="pagination">
              <Button disabled={page <= 1} onClick={() => setPage((prev) => prev - 1)}>
                이전
              </Button>
              <Badge>{page} / {totalPages}</Badge>
              <Button disabled={page >= totalPages} onClick={() => setPage((prev) => prev + 1)}>
                다음
              </Button>
            </div>

            <Select
              className="page-size-select"
              label="Page size"
              onChange={(event) => {
                setSize(Number(event.target.value))
                setPage(1)
              }}
              value={size}
            >
              <option value={5}>5개</option>
              <option value={10}>10개</option>
              <option value={20}>20개</option>
            </Select>
          </div>
        </>
      )}
    </AppLayout>
  )
}

export default PostsPage
