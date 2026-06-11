import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { deletePost, getPost } from '../api/postApi'

import AuthNav from '../components/AuthNav'
import CommentSection from '../components/CommentSection'

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
        const data = await getPost(postId)
        setPost(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    loadPost()
  }, [postId])

  async function handleDelete() {
    const confirmed = window.confirm('Delete this post?')

    if (!confirmed) {
      return
    }

    try {
      await deletePost(postId)
      navigate('/posts')
    } catch (err) {
      setError(err.message)
    }
  }

  if (isLoading) {
    return (
      <main style={{ padding: '40px', fontFamily: 'sans-serif' }}>
        <AuthNav />
        <p>Loading post...</p>
      </main>
    )
  }

  if (error) {
    return (
      <main style={{ padding: '40px', fontFamily: 'sans-serif' }}>
        <AuthNav />
        <p>
          <Link to="/posts">Back to posts</Link>
        </p>
        <h1>Post detail</h1>
        <p style={{ color: 'red' }}>Error: {error}</p>
      </main>
    )
  }

  if (!post) {
    return (
      <main style={{ padding: '40px', fontFamily: 'sans-serif' }}>
        <AuthNav />
        <p>
          <Link to="/posts">Back to posts</Link>
        </p>
        <h1>Post detail</h1>
        <p>Post not found.</p>
      </main>
    )
  }

  return (
    <main style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <AuthNav />
      <p>
        <Link to="/posts">Back to posts</Link>
      </p>
      <p>
        <Link to={`/posts/${postId}/edit`}>Edit</Link>
        <button type="button" onClick={handleDelete}>
          Delete
        </button>
      </p>

      <article
        style={{
          border: '1px solid #ddd',
          borderRadius: '8px',
          padding: '24px',
        }}
      >
        <h1>{post.title}</h1>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <span>type: {post.type}</span>
          <span>status: {post.status}</span>
          <span>priority: {post.priority}</span>
          {post.due_date && <span>due: {post.due_date}</span>}
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

        <hr />

        <p style={{ whiteSpace: 'pre-wrap' }}>{post.content}</p>

        <hr />

        <p>created_at: {post.created_at}</p>
        <p>updated_at: {post.updated_at}</p>
      </article>

      <CommentSection postId={postId} />
    </main>
  )
}

export default PostDetailPage
