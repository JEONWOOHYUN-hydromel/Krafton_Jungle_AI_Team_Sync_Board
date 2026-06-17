import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
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
    <nav className="app-nav" aria-label="Primary">
      <Link className="brand" to="/posts">
        <span className="brand-mark">ATS</span>
        <span>팀 싱크 보드</span>
      </Link>

      <div className="nav-links">
        <NavLink className="nav-link" to="/posts">
          작업 로그
        </NavLink>
        <NavLink className="nav-link" to="/dashboard">
          대시보드
        </NavLink>
        <NavLink className="nav-link" to="/notion-docs">
          문서
        </NavLink>
        <NavLink className="nav-link" to="/rag">
          RAG
        </NavLink>

        {loggedIn ? (
          <>
            <Link className="nav-link primary" to="/posts/new">
              새 로그
            </Link>
            <button className="nav-button" type="button" onClick={handleLogout}>
              로그아웃
            </button>
          </>
        ) : (
          <>
            <Link className="nav-link" to="/login">
              로그인
            </Link>
            <Link className="nav-link primary" to="/signup">
              회원가입
            </Link>
          </>
        )}
      </div>
    </nav>
  )
}

export default AuthNav
