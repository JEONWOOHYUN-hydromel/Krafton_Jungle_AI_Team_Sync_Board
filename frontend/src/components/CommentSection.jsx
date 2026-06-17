import { useEffect, useState } from 'react'
import { isLoggedIn } from '../api/authApi'
import {
  createComment,
  deleteComment,
  getCommentsByPost,
  updateComment,
} from '../api/commentApi'
import { formatDateTime } from '../utils/display'
import { Badge, Button, Card, CardHeader, EmptyState, ErrorMessage, Loading } from './ui'

function CommentSection({ postId }) {
  const loggedIn = isLoggedIn()

  const [comments, setComments] = useState([])
  const [newContent, setNewContent] = useState('')
  const [editingCommentId, setEditingCommentId] = useState(null)
  const [editingContent, setEditingContent] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function loadComments() {
      try {
        setError(null)
        setComments(await getCommentsByPost(postId))
      } catch (err) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    loadComments()
  }, [postId])

  async function handleCreateComment(event) {
    event.preventDefault()

    const content = newContent.trim()
    if (!content) {
      setError('댓글 내용을 입력해주세요.')
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)
      const createdComment = await createComment(postId, { content })
      setComments((prev) => [...prev, createdComment])
      setNewContent('')
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  function startEdit(comment) {
    setEditingCommentId(comment.id)
    setEditingContent(comment.content)
  }

  function cancelEdit() {
    setEditingCommentId(null)
    setEditingContent('')
  }

  async function handleUpdateComment(commentId) {
    const content = editingContent.trim()
    if (!content) {
      setError('댓글 내용을 입력해주세요.')
      return
    }

    try {
      setError(null)
      const updatedComment = await updateComment(commentId, { content })
      setComments((prev) =>
        prev.map((comment) =>
          comment.id === commentId ? updatedComment : comment,
        ),
      )
      cancelEdit()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDeleteComment(commentId) {
    const confirmed = window.confirm('정말 이 댓글을 삭제할까요?')
    if (!confirmed) return

    try {
      setError(null)
      await deleteComment(commentId)
      setComments((prev) => prev.filter((comment) => comment.id !== commentId))
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <Card className="comments-card">
      <CardHeader
        eyebrow="Discussion"
        title="댓글"
        action={<Badge>{comments.length}</Badge>}
      />

      {isLoading ? (
        <Loading message="댓글을 불러오는 중입니다." />
      ) : (
        <>
          {error && <ErrorMessage error={error} />}

          {loggedIn ? (
            <form className="comment-form" onSubmit={handleCreateComment}>
              <label className="field">
                <span>새 댓글</span>
                <textarea
                  id="new-comment"
                  value={newContent}
                  onChange={(event) => setNewContent(event.target.value)}
                  rows={4}
                  placeholder="결정 사항, 확인한 내용, 다음 액션을 남겨주세요."
                />
              </label>
              <Button tone="primary" type="submit" disabled={isSubmitting}>
                {isSubmitting ? '작성 중' : '댓글 작성'}
              </Button>
            </form>
          ) : (
            <EmptyState title="댓글 작성은 로그인이 필요합니다." />
          )}

          {comments.length === 0 ? (
            <EmptyState title="아직 댓글이 없습니다." />
          ) : (
            <ul className="comment-list">
              {comments.map((comment) => (
                <li className="comment-item" key={comment.id}>
                  <div className="comment-meta">
                    <Badge>comment #{comment.id}</Badge>
                    <span>user {comment.user_id ?? 'unknown'}</span>
                    <span>{formatDateTime(comment.updated_at)}</span>
                  </div>

                  {editingCommentId === comment.id ? (
                    <>
                      <textarea
                        value={editingContent}
                        onChange={(event) => setEditingContent(event.target.value)}
                        rows={4}
                      />
                      <div className="form-actions">
                        <Button tone="primary" onClick={() => handleUpdateComment(comment.id)}>
                          저장
                        </Button>
                        <Button onClick={cancelEdit}>취소</Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p>{comment.content}</p>
                      {loggedIn && (
                        <div className="form-actions">
                          <Button onClick={() => startEdit(comment)}>수정</Button>
                          <Button tone="danger" onClick={() => handleDeleteComment(comment.id)}>
                            삭제
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Card>
  )
}

export default CommentSection
