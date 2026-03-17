export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar__header">
        <div className="sidebar__logo">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="2" />
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
        </div>
        <span className="sidebar__title">Cosmos Note</span>
      </div>

      <nav className="sidebar__nav">
        <div className="nav-section">
          <div className="nav-section__label">General</div>
          <button className="nav-item nav-item--active">
            <span className="nav-item__icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="4" />
                <line x1="21.17" y1="8" x2="12" y2="8" />
                <line x1="3.95" y1="6.06" x2="8.54" y2="14" />
                <line x1="10.88" y1="21.94" x2="15.46" y2="14" />
              </svg>
            </span>
            Graph View
          </button>
          <button className="nav-item">
            <span className="nav-item__icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <line x1="10" y1="9" x2="8" y2="9" />
              </svg>
            </span>
            All Notes
          </button>
          <button className="nav-item">
            <span className="nav-item__icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="9" y1="21" x2="9" y2="9" />
              </svg>
            </span>
            Tasks
          </button>
          <button className="nav-item">
            <span className="nav-item__icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </span>
            AI Assist
          </button>
        </div>

        <div className="nav-section">
          <div className="nav-section__label">Workspaces</div>
          <button className="nav-item">
            <span className="nav-item__dot" style={{ background: 'var(--node-work)' }} />
            Work Projects
          </button>
          <button className="nav-item">
            <span className="nav-item__dot" style={{ background: 'var(--node-personal)' }} />
            Personal
          </button>
          <button className="nav-item">
            <span className="nav-item__dot" style={{ background: 'var(--node-task)' }} />
            Daily Tasks
          </button>
          <button className="nav-item">
            <span className="nav-item__dot" style={{ background: 'var(--node-idea)' }} />
            Ideas
          </button>
        </div>
      </nav>

      <div className="sidebar__footer">
        <div className="sidebar__user">
          <div className="sidebar__avatar">U</div>
          <span>User</span>
        </div>
      </div>
    </aside>
  )
}
