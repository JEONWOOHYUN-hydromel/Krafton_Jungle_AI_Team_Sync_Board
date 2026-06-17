import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { Button, Card, ErrorMessage, Input } from '../components/ui'
import { login, saveAccessToken } from '../api/authApi'

function LoginPage() {
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const canSubmit =
    formData.email.trim().length > 0 &&
    formData.password.trim().length > 0 &&
    !isSubmitting

  function handleChange(event) {
    const { name, value } = event.target

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!canSubmit) {
      setError('이메일과 비밀번호를 입력해주세요.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const data = await login(formData)
      saveAccessToken(data.access_token)
      navigate('/posts')
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AppLayout compact>
      <Card className="auth-card">
          <p className="eyebrow">Welcome back</p>
          <h1>로그인</h1>
          <p className="lead">작업 로그와 AI 요약을 이어서 확인하세요.</p>

          <form className="section" onSubmit={handleSubmit}>
            <Input
              id="email"
              label="이메일"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              required
            />

            <Input
              className="section"
              id="password"
              label="비밀번호"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              required
            />

            {error && <ErrorMessage error={error} />}

            <div className="form-actions">
              <Button tone="primary" type="submit" disabled={!canSubmit}>
                {isSubmitting ? '로그인 중...' : '로그인'}
              </Button>
              <Link className="button" to="/signup">
                회원가입
              </Link>
            </div>
          </form>
      </Card>
    </AppLayout>
  )
}

export default LoginPage
