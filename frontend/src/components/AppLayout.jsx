import { useEffect, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { getMe, isLoggedIn, removeAccessToken } from '../api/authApi'

const SIDEBAR_OPEN_KEY = 'atsb_sidebar_open'

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    return localStorage.getItem(SIDEBAR_OPEN_KEY) !== 'false'
  })
  const [hasSession, setHasSession] = useState(isLoggedIn)
  const [currentUser, setCurrentUser] = useState(null)

  useEffect(() => {
    localStorage.setItem(SIDEBAR_OPEN_KEY, String(isSidebarOpen))
  }, [isSidebarOpen])

  useEffect(() => {
    if (!hasSession) {
      setCurrentUser(null)
      return
    }

    let isMounted = true

    async function loadCurrentUser() {
      try {
        const me = await getMe()

        if (isMounted) {
          setCurrentUser(me)
        }
      } catch {
        removeAccessToken()

        if (isMounted) {
          setCurrentUser(null)
          setHasSession(false)
        }
      }
    }

    loadCurrentUser()

    return () => {
      isMounted = false
    }
  }, [hasSession])

  function handleLogout() {
    removeAccessToken()
    setCurrentUser(null)
    setHasSession(false)
    navigate('/login')
  }

  return (
    <div className={`workspace-shell ${isSidebarOpen ? '' : 'sidebar-collapsed'}`.trim()}>
      <aside className="sidebar" aria-label="Workspace navigation" aria-hidden={!isSidebarOpen}>
        <div className="sidebar-header">
          <Link className="workspace-brand" to="/dashboard">
            <span className="workspace-brand-mark">ATS</span>
            <span>
              <strong>AI Team</strong>
              <small>Sync Board</small>
            </span>
          </Link>

          <button
            className="sidebar-close"
            type="button"
            aria-label="Hide navigation"
            onClick={() => setIsSidebarOpen(false)}
          >
            <span />
            <span />
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Workspace">
          {navItems.map((item) => (
            <NavLink
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''}`.trim()
              }
              key={item.to}
              title={item.label}
              to={item.to}
            >
              <span>{item.short}</span>
              <strong>{item.label}</strong>
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="workspace-main">
        <header className="topbar">
          <div className="topbar-title">
            <button
              className={`nav-toggle ${isSidebarOpen ? 'hidden' : ''}`.trim()}
              type="button"
              aria-expanded={isSidebarOpen}
              aria-label="Show navigation"
              onClick={() => setIsSidebarOpen(true)}
            >
              <span />
              <span />
              <span />
            </button>
            <div>
              <p className="topbar-kicker">Project workspace</p>
              <strong>Team delivery cockpit</strong>
            </div>
          </div>

          <div className="topbar-actions">
            {hasSession ? (
              <>
                <div className="user-summary" aria-label="Logged in user">
                  <span className="user-avatar" aria-hidden="true">
                    {(currentUser?.nickname ?? currentUser?.email ?? 'U').slice(0, 1)}
                  </span>
                  <span>
                    <strong>{currentUser?.nickname ?? 'Signed in'}</strong>
                    <small>
                      {currentUser?.email ?? 'Loading account'}
                      {currentUser?.role ? ` - ${currentUser.role}` : ''}
                    </small>
                  </span>
                </div>
                <button type="button" onClick={handleLogout}>
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link className="button" to="/login">
                  Login
                </Link>
                <Link className="button primary" to="/signup">
                  Sign up
                </Link>
              </>
            )}
          </div>
        </header>

        {!isSidebarOpen && (
          <nav className="floating-nav" aria-label="Quick workspace navigation">
            {navItems.map((item) => (
              <NavLink
                className={({ isActive }) =>
                  `floating-nav-link ${isActive ? 'active' : ''}`.trim()
                }
                key={item.to}
                title={item.label}
                to={item.to}
              >
                {item.short}
              </NavLink>
            ))}
          </nav>
        )}

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
