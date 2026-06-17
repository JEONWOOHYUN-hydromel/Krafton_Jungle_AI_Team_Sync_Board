import { Link, NavLink, useNavigate } from 'react-router-dom'
import { isLoggedIn, removeAccessToken } from '../api/authApi'

const navItems = [
  { label: 'Dashboard', to: '/dashboard', short: 'DB' },
  { label: 'Work Logs', to: '/posts', short: 'WL' },
  { label: 'GitHub', to: '/github', short: 'GH' },
  { label: 'Notion Docs', to: '/notion-docs', short: 'ND' },
  { label: 'Ask Docs', to: '/rag', short: 'AI' },
  { label: 'Settings', to: '/settings', short: 'ST' },
]

function AppLayout({ eyebrow, title, description, actions, children, compact = false }) {
  const navigate = useNavigate()
  const loggedIn = isLoggedIn()

  function handleLogout() {
    removeAccessToken()
    navigate('/login')
  }

  return (
    <div className="workspace-shell">
      <aside className="sidebar">
        <Link className="workspace-brand" to="/dashboard">
          <span className="workspace-brand-mark">ATS</span>
          <span>
            <strong>AI Team</strong>
            <small>Sync Board</small>
          </span>
        </Link>

        <nav className="sidebar-nav" aria-label="Workspace">
          {navItems.map((item) => (
            <NavLink
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''}`.trim()
              }
              key={item.to}
              to={item.to}
            >
              <span>{item.short}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="workspace-main">
        <header className="topbar">
          <div>
            <p className="topbar-kicker">Project workspace</p>
            <strong>Team delivery cockpit</strong>
          </div>

          <div className="topbar-actions">
            {loggedIn ? (
              <>
                <Link className="button primary" to="/posts/new">
                  새 로그
                </Link>
                <button type="button" onClick={handleLogout}>
                  로그아웃
                </button>
              </>
            ) : (
              <>
                <Link className="button" to="/login">
                  로그인
                </Link>
                <Link className="button primary" to="/signup">
                  회원가입
                </Link>
              </>
            )}
          </div>
        </header>

        <main className={`content-shell ${compact ? 'compact' : ''}`.trim()}>
          {(title || description || actions) && (
            <header className="page-header">
              <div>
                {eyebrow && <p className="eyebrow">{eyebrow}</p>}
                {title && <h1>{title}</h1>}
                {description && <p className="lead">{description}</p>}
              </div>
              {actions && <div className="page-actions">{actions}</div>}
            </header>
          )}

          {children}
        </main>
      </div>
    </div>
  )
}

export default AppLayout
