import { Link, useNavigate } from 'react-router-dom'
import { createPost } from '../api/postApi'
import { isLoggedIn } from '../api/authApi'
import AuthNav from '../components/AuthNav'
import PostForm from '../components/PostForm'

function PostCreatePage() {
  const navigate = useNavigate()
  const loggedIn = isLoggedIn()

  async function handleCreate(postData) {
    await createPost(postData)
    navigate('/posts')
  }

  if (!loggedIn) {
    return (
      <main style={{ padding: '40px', fontFamily: 'sans-serif' }}>
        <AuthNav />

        <h1>작업 로그 작성</h1>

        <p>글을 작성하려면 로그인이 필요합니다.</p>

        <p>
          <Link to="/login">로그인하러 가기</Link>
        </p>
      </main>
    )
  }

  return (
    <main style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <AuthNav />

      <p>
        <Link to="/posts">← 목록으로</Link>
      </p>

      <h1>작업 로그 작성</h1>

      <PostForm submitLabel="작성하기" onSubmit={handleCreate} />
    </main>
  )
}

export default PostCreatePage