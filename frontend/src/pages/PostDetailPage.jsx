import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import CommentSection from '../components/CommentSection'
import { Badge, Button, Card, CardHeader, EmptyState, ErrorMessage, Loading } from '../components/ui'
import { deletePost, getPost } from '../api/postApi'
import {
  formatDateTime,
  getPriorityLabel,
  getStatusClass,
  getStatusLabel,
  getTypeLabel,
} from '../utils/display'

function PostDetailPage() {
  const { postId } = useParams()
  const navigate = useNavigate()

  const [post, setPost] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function loadPost() {
      try {
        setIsLoading(true)
        setError(null)
        setPost(await getPost(postId))
      } catch (err) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    loadPost()
  }, [postId])

  async function handleDelete() {
    const confirmed = window.confirm('이 작업 로그를 삭제할까요?')
    if (!confirmed) return

    try {
      await deletePost(postId)
      navigate('/posts')
    } catch (err) {
      setError(err.message)
    }
  }

  if (isLoading) {
    return (
      <AppLayout title="Work Log">
        <Loading message="작업 로그를 불러오는 중입니다." />
      </AppLayout>
    )
  }

  if (error) {
    return (
      <AppLayout actions={<Button to="/posts">목록으로</Button>} title="Work Log">
        <ErrorMessage error={error} />
      </AppLayout>
    )
  }

  if (!post) {
    return (
      <AppLayout actions={<Button to="/posts">목록으로</Button>} title="Work Log">
        <EmptyState title="작업 로그를 찾을 수 없습니다." />
      </AppLayout>
    )
  }

  return (
    <AppLayout
      actions={
        <>
          <Button to="/posts">목록</Button>
          <Button tone="primary" to={`/posts/${postId}/edit`}>수정</Button>
          <Button tone="danger" onClick={handleDelete}>삭제</Button>
        </>
      }
      description="작업 하나의 진행 상태, 우선순위, 마감일과 논의 내용을 확인합니다."
      eyebrow={`LOG-${post.id}`}
      title={post.title}
    >
      <div className="detail-layout">
        <Card className="detail-content">
          <div className="meta-row">
            <Badge>{getTypeLabel(post.type)}</Badge>
            <Badge tone={getStatusClass(post.status)}>{getStatusLabel(post.status)}</Badge>
            <Badge tone={post.priority}>Priority {getPriorityLabel(post.priority)}</Badge>
          </div>

          {post.tags?.length > 0 && (
            <div className="tag-row">
              {post.tags.map((tag) => (
                <Badge key={tag}>#{tag}</Badge>
              ))}
            </div>
          )}

          <article className="article-body worklog-body">{post.content}</article>
        </Card>

        <aside className="detail-aside">
          <Card>
            <CardHeader eyebrow="Meta" title="작업 정보" />
            <dl className="meta-list">
              <div>
                <dt>Status</dt>
                <dd><Badge tone={getStatusClass(post.status)}>{getStatusLabel(post.status)}</Badge></dd>
              </div>
              <div>
                <dt>Priority</dt>
                <dd><Badge tone={post.priority}>{getPriorityLabel(post.priority)}</Badge></dd>
              </div>
              <div>
                <dt>Due date</dt>
                <dd>{post.due_date ?? '미정'}</dd>
              </div>
              <div>
                <dt>Owner</dt>
                <dd>User #{post.user_id ?? 'unknown'}</dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>{formatDateTime(post.created_at)}</dd>
              </div>
              <div>
                <dt>Updated</dt>
                <dd>{formatDateTime(post.updated_at)}</dd>
              </div>
            </dl>
          </Card>

          <Card>
            <CardHeader eyebrow="Next" title="추천 확인 질문" />
            <ul className="compact-list">
              <li>
                <strong>Ask Docs</strong>
                <span>이 작업과 관련된 문서를 검색해보세요.</span>
              </li>
              <li>
                <strong>GitHub</strong>
                <span>관련 PR이나 issue가 열려 있는지 확인하세요.</span>
              </li>
            </ul>
          </Card>
        </aside>
      </div>

      <CommentSection postId={postId} />
    </AppLayout>
  )
}

export default PostDetailPage
