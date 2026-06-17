import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import PostForm from '../components/PostForm'
import { Button, EmptyState, ErrorMessage, Loading } from '../components/ui'
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

  async function handleUpdate(postData) {
    const updatedPost = await updatePost(postId, postData)
    navigate(`/posts/${updatedPost.id}`)
  }

  if (isLoading) {
    return (
      <AppLayout title="작업 로그 수정">
        <Loading message="작업 로그를 불러오는 중입니다." />
      </AppLayout>
    )
  }

  if (error) {
    return (
      <AppLayout actions={<Button to="/posts">목록으로</Button>} title="작업 로그 수정">
        <ErrorMessage error={error} />
      </AppLayout>
    )
  }

  if (!post) {
    return (
      <AppLayout actions={<Button to="/posts">목록으로</Button>} title="작업 로그 수정">
        <EmptyState title="작업 로그를 찾을 수 없습니다." />
      </AppLayout>
    )
  }

  return (
    <AppLayout
      actions={<Button to={`/posts/${post.id}`}>상세로 돌아가기</Button>}
      description={post.title}
      eyebrow={`LOG-${post.id}`}
      title="작업 로그 수정"
    >
      <PostForm
        initialValues={post}
        submitLabel="수정하기"
        onSubmit={handleUpdate}
      />
    </AppLayout>
  )
}

export default PostEditPage
