import { useEffect, useState } from 'react'
import AppLayout from '../components/AppLayout'
import { Badge, Button, Card, CardHeader, EmptyState, ErrorMessage, Loading } from '../components/ui'
import { getMe, isLoggedIn } from '../api/authApi'

function SettingsPage() {
  const loggedIn = isLoggedIn()
  const [me, setMe] = useState(null)
  const [isLoading, setIsLoading] = useState(loggedIn)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!loggedIn) return

    async function loadMe() {
      try {
        setIsLoading(true)
        setError(null)
        setMe(await getMe())
      } catch (err) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    loadMe()
  }, [loggedIn])

  return (
    <AppLayout
      description="워크스페이스 계정과 외부 연동 상태를 확인합니다."
      eyebrow="Workspace"
      title="Settings"
    >
      {!loggedIn ? (
        <EmptyState
          action={<Button tone="primary" to="/login">로그인</Button>}
          description="계정 정보를 보려면 로그인해주세요."
          title="로그인이 필요합니다."
        />
      ) : isLoading ? (
        <Loading message="계정 정보를 불러오는 중입니다." />
      ) : error ? (
        <ErrorMessage error={error} />
      ) : (
        <div className="settings-grid">
          <Card>
            <CardHeader eyebrow="Account" title="내 계정" />
            <dl className="meta-list">
              <div>
                <dt>Nickname</dt>
                <dd>{me?.nickname}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{me?.email}</dd>
              </div>
              <div>
                <dt>Role</dt>
                <dd><Badge>{me?.role}</Badge></dd>
              </div>
              <div>
                <dt>GitHub</dt>
                <dd>{me?.github_username ?? '미설정'}</dd>
              </div>
            </dl>
          </Card>

          <Card>
            <CardHeader eyebrow="Integrations" title="연동 상태" />
            <div className="integration-summary">
              <div>
                <span>GitHub</span>
                <strong>연결됨</strong>
              </div>
              <div>
                <span>Notion</span>
                <strong>연결됨</strong>
              </div>
              <div>
                <span>RAG</span>
                <strong>사용 가능</strong>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader eyebrow="Demo" title="데모 계정" />
            <p className="subtle">
              초기화 스크립트로 생성한 데모 계정은 모두 같은 비밀번호를 사용합니다.
            </p>
            <div className="demo-account-box">
              <strong>woohyun@atsb.local</strong>
              <span>password: jungle1234!</span>
            </div>
          </Card>
        </div>
      )}
    </AppLayout>
  )
}

export default SettingsPage
