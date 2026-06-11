import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signup } from '../api/authApi'
import AuthNav from '../components/AuthNav'

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

  function handleChange(event) {
    const { name, value } = event.target

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      await signup({
        email: formData.email,
        password: formData.password,
        nickname: formData.nickname,
        github_username: formData.github_username || null,
      })

      navigate('/login')
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <AuthNav />
      <h1>회원가입</h1>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="email">이메일</label>
          <br />
          <input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="password">비밀번호</label>
          <br />
          <input
            id="password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            required
            minLength={4}
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="nickname">닉네임</label>
          <br />
          <input
            id="nickname"
            name="nickname"
            value={formData.nickname}
            onChange={handleChange}
            required
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="github_username">GitHub username 선택</label>
          <br />
          <input
            id="github_username"
            name="github_username"
            value={formData.github_username}
            onChange={handleChange}
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>

        {error && <p style={{ color: 'red' }}>에러: {error}</p>}

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? '가입 중...' : '회원가입'}
        </button>
      </form>

      <p>
        이미 계정이 있나요? <Link to="/login">로그인</Link>
      </p>

      <p>
        <Link to="/posts">게시글 목록으로</Link>
      </p>
    </main>
  )
}

export default SignupPage