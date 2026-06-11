import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login, saveAccessToken } from '../api/authApi'
import AuthNav from '../components/AuthNav'

function LoginPage() {
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    email: '',
    password: '',
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
    <main style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <AuthNav />
      <h1>로그인</h1>

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
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>

        {error && <p style={{ color: 'red' }}>에러: {error}</p>}

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? '로그인 중...' : '로그인'}
        </button>
      </form>

      <p>
        아직 계정이 없나요? <Link to="/signup">회원가입</Link>
      </p>

      <p>
        <Link to="/posts">게시글 목록으로</Link>
      </p>
    </main>
  )
}

export default LoginPage