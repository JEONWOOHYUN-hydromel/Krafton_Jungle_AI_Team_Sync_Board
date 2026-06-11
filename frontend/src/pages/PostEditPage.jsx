import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import PostForm from '../components/PostForm'
import { getPost, updatePost } from '../api/postApi'

function PostEditPage() {
  const { postId } = useParams()
  const navigate = useNavigate()

  const [post, setPost] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function loadPost() {
      try {
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

  async function handleUpdate(postData) {
    const updatedPost = await updatePost(postId, postData)
    navigate(`/posts/${updatedPost.id}`)
  }

  if (isLoading) {
    return (
      <main style={{ padding: '40px', fontFamily: 'sans-serif' }}>
        <p>게시글을 불러오는 중...</p>
      </main>
    )
  }

  if (error) {
    return (
      <main style={{ padding: '40px', fontFamily: 'sans-serif' }}>
        <p>
          <Link to="/posts">← 목록으로</Link>
        </p>
        <h1>작업 로그 수정</h1>
        <p style={{ color: 'red' }}>에러: {error}</p>
      </main>
    )
  }

  if (!post) {
    return (
      <main style={{ padding: '40px', fontFamily: 'sans-serif' }}>
        <p>
          <Link to="/posts">← 목록으로</Link>
        </p>
        <h1>작업 로그 수정</h1>
        <p>게시글이 없습니다.</p>
      </main>
    )
  }

  return (
    <main style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <p>
        <Link to={`/posts/${post.id}`}>← 상세로</Link>
      </p>

      <h1>작업 로그 수정</h1>

      <PostForm
        initialValues={post}
        submitLabel="수정하기"
        onSubmit={handleUpdate}
      />
    </main>
  )
}

export default PostEditPage