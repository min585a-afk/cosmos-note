import { useGraphState, useGraphDispatch } from '../state/GraphContext'
import type { NodeType } from '../types/graph'
import { NODE_COLORS, EMPTY_NODE_COLOR } from '../types/graph'
import type { ViewMode } from '../App'

export function Sidebar({ view, onViewChange }: { view: ViewMode; onViewChange: (v: ViewMode) => void }) {
  const { nodes, edges } = useGraphState()
  const dispatch = useGraphDispatch()

  const counts: Record<NodeType, number> = { work: 0, personal: 0, task: 0, idea: 0 }
  for (const n of nodes) counts[n.type]++

  const handleFilterByType = (type: NodeType) => {
    // Switch to notes view filtered to this type
    onViewChange('notes')
    const match = nodes.find(n => n.type === type)
    if (match) {
      dispatch({ type: 'SET_SELECTED', nodeId: match.id })
    }
  }

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
          <button
            className={`nav-item ${view === 'graph' ? 'nav-item--active' : ''}`}
            onClick={() => onViewChange('graph')}
          >
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
          <button
            className={`nav-item ${view === 'notes' ? 'nav-item--active' : ''}`}
            onClick={() => onViewChange('notes')}
          >
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
            <span className="nav-item__count">{nodes.length}</span>
          </button>
          <button className="nav-item">
            <span className="nav-item__icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </span>
            Connections
            <span className="nav-item__count">{edges.length}</span>
          </button>
          <button
            className={`nav-item ${view === 'skilltree' ? 'nav-item--active' : ''}`}
            onClick={() => onViewChange('skilltree')}
          >
            <span className="nav-item__icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="4" r="2" />
                <circle cx="6" cy="12" r="2" />
                <circle cx="18" cy="12" r="2" />
                <circle cx="12" cy="20" r="2" />
                <line x1="12" y1="6" x2="6" y2="10" />
                <line x1="12" y1="6" x2="18" y2="10" />
                <line x1="6" y1="14" x2="12" y2="18" />
                <line x1="18" y1="14" x2="12" y2="18" />
              </svg>
            </span>
            Skill Tree
          </button>
        </div>

        <div className="nav-section">
          <div className="nav-section__label">Workspaces</div>
          <button className="nav-item" onClick={() => handleFilterByType('work')}>
            <span className="nav-item__dot" style={{ background: 'var(--node-work)' }} />
            Work Projects
            <span className="nav-item__count">{counts.work}</span>
          </button>
          <button className="nav-item" onClick={() => handleFilterByType('personal')}>
            <span className="nav-item__dot" style={{ background: 'var(--node-personal)' }} />
            Personal
            <span className="nav-item__count">{counts.personal}</span>
          </button>
          <button className="nav-item" onClick={() => handleFilterByType('task')}>
            <span className="nav-item__dot" style={{ background: 'var(--node-task)' }} />
            Daily Tasks
            <span className="nav-item__count">{counts.task}</span>
          </button>
          <button className="nav-item" onClick={() => handleFilterByType('idea')}>
            <span className="nav-item__dot" style={{ background: 'var(--node-idea)' }} />
            Ideas
            <span className="nav-item__count">{counts.idea}</span>
          </button>
        </div>

        {/* Recent nodes */}
        <div className="nav-section">
          <div className="nav-section__label">Recent</div>
          {[...nodes]
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, 5)
            .map(n => (
              <button
                key={n.id}
                className="nav-item"
                onClick={() => {
                  dispatch({ type: 'SET_SELECTED', nodeId: n.id })
                  if (view === 'graph') {
                    dispatch({ type: 'SET_VIEWPORT', viewport: { x: -n.x, y: -n.y, scale: 1.2 } })
                  }
                }}
              >
                <span className="nav-item__dot" style={{ background: n.description.trim() ? NODE_COLORS[n.type] : EMPTY_NODE_COLOR }} />
                <span className="nav-item__label-text">{n.label}</span>
              </button>
            ))}
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
