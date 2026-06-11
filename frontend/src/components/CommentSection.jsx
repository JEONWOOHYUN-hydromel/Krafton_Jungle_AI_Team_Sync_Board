import { useEffect, useState } from 'react'
import { isLoggedIn } from '../api/authApi'
import {
  createComment,
  deleteComment,
  getCommentsByPost,
  updateComment,
} from '../api/commentApi'

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
        const data = await getCommentsByPost(postId)
        setComments(data)
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

    if (!confirmed) {
      return
    }

    try {
      setError(null)

      await deleteComment(commentId)

      setComments((prev) =>
        prev.filter((comment) => comment.id !== commentId),
      )
    } catch (err) {
      setError(err.message)
    }
  }

  if (isLoading) {
    return (
      <section style={{ marginTop: '32px' }}>
        <h2>댓글</h2>
        <p>댓글을 불러오는 중...</p>
      </section>
    )
  }

  return (
    <section style={{ marginTop: '32px' }}>
      <h2>댓글</h2>

      {error && <p style={{ color: 'red' }}>에러: {error}</p>}

      {loggedIn ? (
        <form onSubmit={handleCreateComment} style={{ marginBottom: '24px' }}>
          <div style={{ marginBottom: '8px' }}>
            <textarea
              value={newContent}
              onChange={(event) => setNewContent(event.target.value)}
              rows={4}
              placeholder="댓글을 입력하세요."
              style={{
                width: '100%',
                padding: '8px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? '작성 중...' : '댓글 작성'}
          </button>
        </form>
      ) : (
        <p>댓글을 작성하려면 로그인이 필요합니다.</p>
      )}

      {comments.length === 0 ? (
        <p>아직 댓글이 없습니다.</p>
      ) : (
        <ul style={{ padding: 0, listStyle: 'none' }}>
          {comments.map((comment) => (
            <li
              key={comment.id}
              style={{
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '12px',
              }}
            >
              <p style={{ marginTop: 0 }}>
                댓글 #{comment.id} / user_id: {comment.user_id ?? 'unknown'}
              </p>

              {editingCommentId === comment.id ? (
                <>
                  <textarea
                    value={editingContent}
                    onChange={(event) =>
                      setEditingContent(event.target.value)
                    }
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '8px',
                      boxSizing: 'border-box',
                    }}
                  />

                  <p style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => handleUpdateComment(comment.id)}
                    >
                      저장
                    </button>

                    <button type="button" onClick={cancelEdit}>
                      취소
                    </button>
                  </p>
                </>
              ) : (
                <>
                  <p style={{ whiteSpace: 'pre-wrap' }}>{comment.content}</p>

                  <p style={{ fontSize: '14px', color: '#666' }}>
                    created_at: {comment.created_at}
                    <br />
                    updated_at: {comment.updated_at}
                  </p>

                  {loggedIn && (
                    <p style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => startEdit(comment)}
                      >
                        수정
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleDeleteComment(comment.id)
                        }
                      >
                        삭제
                      </button>
                    </p>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default CommentSection
