import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { isLoggedIn, removeAccessToken } from '../api/authApi'

function AuthNav() {
  const navigate = useNavigate()
  const [loggedIn, setLoggedIn] = useState(isLoggedIn())

  function handleLogout() {
    removeAccessToken()
    setLoggedIn(false)
    navigate('/posts')
  }

  return (
    <nav
      style={{
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
        marginBottom: '16px',
      }}
    >
      <Link to="/posts">게시글 목록</Link>
      <Link to="/notion-docs">Notion 문서</Link>
      <Link to="/dashboard">Dashboard</Link>

      {loggedIn ? (
        <>
          <Link to="/posts/new">새 글 작성</Link>

          <button type="button" onClick={handleLogout}>
            로그아웃
          </button>
        </>
      ) : (
        <>
          <Link to="/login">로그인</Link>
          <Link to="/signup">회원가입</Link>
        </>
      )}
    </nav>
  )
}

export default AuthNav
