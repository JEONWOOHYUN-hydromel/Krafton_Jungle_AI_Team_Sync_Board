import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import PostForm from '../components/PostForm'
import { Button, Card, EmptyState } from '../components/ui'
import { createPost } from '../api/postApi'
import { isLoggedIn } from '../api/authApi'

function PostCreatePage() {
  const navigate = useNavigate()
  const loggedIn = isLoggedIn()

  async function handleCreate(postData) {
    await createPost(postData)
    navigate('/posts')
  }

  if (!loggedIn) {
    return (
      <AppLayout compact title="로그인이 필요합니다">
        <Card className="auth-card">
          <EmptyState
            action={
              <>
                <Button tone="primary" to="/login">로그인</Button>
                <Button to="/posts">작업 로그 보기</Button>
              </>
            }
            description="작업 로그를 작성하려면 먼저 로그인해주세요."
            title="로그인이 필요합니다."
          />
        </Card>
      </AppLayout>
    )
  }

  return (
    <AppLayout
      actions={<Button to="/posts">목록으로</Button>}
      description="현재 상태, 진행 상황, 막힌 점과 다음 액션을 팀이 이해할 수 있게 남깁니다."
      eyebrow="New work log"
      title="작업 로그 작성"
    >
      <PostForm submitLabel="작성하기" onSubmit={handleCreate} />
    </AppLayout>
  )
}

export default PostCreatePage
