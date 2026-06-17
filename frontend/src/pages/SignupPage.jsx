import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { Button, Card, ErrorMessage, Input } from '../components/ui'
import { signup } from '../api/authApi'

function SignupPage() {
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nickname: '',
    github_username: '',
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const canSubmit =
    formData.email.trim().length > 0 &&
    formData.password.trim().length >= 4 &&
    formData.nickname.trim().length > 0 &&
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
      setError('이메일, 비밀번호, 닉네임을 확인해주세요.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await signup({
        email: formData.email.trim(),
        password: formData.password,
        nickname: formData.nickname.trim(),
        github_username: formData.github_username.trim() || null,
      })

      navigate('/login')
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AppLayout compact>
      <Card className="auth-card">
          <p className="eyebrow">Join workspace</p>
          <h1>회원가입</h1>
          <p className="lead">팀 싱크 보드에 참여할 계정을 만듭니다.</p>

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
              hint="4자 이상 입력해주세요."
              id="password"
              label="비밀번호"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={4}
            />

            <Input
              className="section"
              id="nickname"
              label="닉네임"
              name="nickname"
              value={formData.nickname}
              onChange={handleChange}
              required
            />

            <Input
              className="section"
              hint="GitHub 연동 화면에서 작성자를 맞추는 데 사용합니다."
              id="github_username"
              label="GitHub username"
              name="github_username"
              value={formData.github_username}
              onChange={handleChange}
              placeholder="선택 입력"
            />

            {error && <ErrorMessage error={error} />}

            <div className="form-actions">
              <Button tone="primary" type="submit" disabled={!canSubmit}>
                {isSubmitting ? '가입 중...' : '회원가입'}
              </Button>
              <Link className="button" to="/login">
                로그인
              </Link>
            </div>
          </form>
      </Card>
    </AppLayout>
  )
}

export default SignupPage
