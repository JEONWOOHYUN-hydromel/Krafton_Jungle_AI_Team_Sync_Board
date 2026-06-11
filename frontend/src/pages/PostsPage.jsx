import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getPosts } from '../api/postApi'
import AuthNav from '../components/AuthNav'

const TYPE_OPTIONS = [
  { value: '', label: '전체 type' },
  { value: 'daily_log', label: 'Daily Log' },
  { value: 'task', label: 'Task' },
  { value: 'blocker', label: 'Blocker' },
  { value: 'discussion', label: 'Discussion' },
  { value: 'retrospective', label: 'Retrospective' },
]

const STATUS_OPTIONS = [
  { value: '', label: '전체 status' },
  { value: 'todo', label: 'Todo' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
  { value: 'blocked', label: 'Blocked' },
]

function PostsPage() {
  const [posts, setPosts] = useState([])
  const [draftFilters, setDraftFilters] = useState({
    keyword: '',
    type: '',
    status: '',
    tag: '',
  })
  const [filters, setFilters] = useState({
    keyword: '',
    type: '',
    status: '',
    tag: '',
  })
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(10)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

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
          tag: filters.tag,
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
  }, [page, size, filters])

  function handleFilterChange(event) {
    const { name, value } = event.target

    setDraftFilters((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  function handleSearchSubmit(event) {
    event.preventDefault()
    setPage(1)
    setFilters(draftFilters)
  }

  function handleResetFilters() {
    const emptyFilters = {
      keyword: '',
      type: '',
      status: '',
      tag: '',
    }

    setDraftFilters(emptyFilters)
    setFilters(emptyFilters)
    setPage(1)
  }

  function handleSizeChange(event) {
    setSize(Number(event.target.value))
    setPage(1)
  }

  return (
    <main style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <h1>작업 로그 게시판</h1>

      <AuthNav />

      <p>
        팀원의 Daily Log, Task, Blocker, Discussion을 남기는 공간입니다.
      </p>

      <form
        onSubmit={handleSearchSubmit}
        style={{
          border: '1px solid #ddd',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px',
        }}
      >
        <h2 style={{ marginTop: 0 }}>검색 / 필터</h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: '12px',
            marginBottom: '12px',
          }}
        >
          <input
            name="keyword"
            value={draftFilters.keyword}
            onChange={handleFilterChange}
            placeholder="제목/본문 검색"
            style={{ padding: '8px' }}
          />

          <select
            name="type"
            value={draftFilters.type}
            onChange={handleFilterChange}
            style={{ padding: '8px' }}
          >
            {TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            name="status"
            value={draftFilters.status}
            onChange={handleFilterChange}
            style={{ padding: '8px' }}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <input
            name="tag"
            value={draftFilters.tag}
            onChange={handleFilterChange}
            placeholder="태그 검색 예: backend"
            style={{ padding: '8px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button type="submit">검색</button>

          <button type="button" onClick={handleResetFilters}>
            초기화
          </button>

          <label>
            페이지 크기:{' '}
            <select value={size} onChange={handleSizeChange}>
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
          </label>
        </div>
      </form>

      {isLoading && <p>게시글을 불러오는 중...</p>}

      {error && <p style={{ color: 'red' }}>에러: {error}</p>}

      {!isLoading && !error && (
        <>
          <p>
            총 {total}개 / {page} 페이지 / 전체 {totalPages} 페이지
          </p>

          {posts.length === 0 ? (
            <p>게시글이 없습니다.</p>
          ) : (
            <ul style={{ padding: 0, listStyle: 'none' }}>
              {posts.map((post) => (
                <li
                  key={post.id}
                  style={{
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    padding: '16px',
                    marginBottom: '12px',
                  }}
                >
                  <h2 style={{ margin: '0 0 8px' }}>
                    <Link to={`/posts/${post.id}`}>
                      #{post.id} {post.title}
                    </Link>
                  </h2>

                  <p style={{ margin: '0 0 12px' }}>{post.content}</p>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <span>type: {post.type}</span>
                    <span>status: {post.status}</span>
                    <span>priority: {post.priority}</span>
                    {post.due_date && <span>due: {post.due_date}</span>}
                    <span>user_id: {post.user_id ?? 'unknown'}</span>
                  </div>

                  {post.tags?.length > 0 && (
                    <div
                      style={{
                        display: 'flex',
                        gap: '6px',
                        flexWrap: 'wrap',
                        marginTop: '12px',
                      }}
                    >
                      {post.tags.map((tag) => (
                        <span
                          key={tag}
                          style={{
                            border: '1px solid #ddd',
                            borderRadius: '999px',
                            padding: '2px 8px',
                            fontSize: '14px',
                          }}
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((prev) => prev - 1)}
            >
              이전
            </button>

            <span>
              {page} / {totalPages}
            </span>

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((prev) => prev + 1)}
            >
              다음
            </button>
          </div>
        </>
      )}
    </main>
  )
}

export default PostsPage