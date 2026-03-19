import { useState } from 'react'
import { useGraphState, useGraphDispatch } from '../state/GraphContext'
import { useTheme, type ThemeMode } from '../state/ThemeContext'
import type { NodeType } from '../types/graph'
import { NODE_COLORS, EMPTY_NODE_COLOR } from '../types/graph'
import type { ViewMode } from '../App'
import { generateId } from '../state/graphReducer'
import { QuestTodo } from './QuestTodo'

export function Sidebar({ view, onViewChange, onScreensaver }: { view: ViewMode; onViewChange: (v: ViewMode) => void; onScreensaver?: () => void }) {
  const state = useGraphState()
  const { nodes, recentlyDeleted, calendarEvents } = state
  const dispatch = useGraphDispatch()
  const { theme, setTheme } = useTheme()

  const [searchQuery, setSearchQuery] = useState('')
  const [generalOpen, setGeneralOpen] = useState(true)
  const [workspaceOpen, setWorkspaceOpen] = useState(true)
  const [recentOpen, setRecentOpen] = useState(true)
  const [deletedOpen, setDeletedOpen] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [questOpen, setQuestOpen] = useState(false)
  const [themePickerOpen, setThemePickerOpen] = useState(false)

  // Calendar state
  const [newEventTitle, setNewEventTitle] = useState('')
  const [newEventDate, setNewEventDate] = useState(() => new Date().toISOString().slice(0, 10))

  const counts: Record<NodeType, number> = { work: 0, personal: 0, task: 0, idea: 0 }
  for (const n of nodes) counts[n.type]++

  const handleFilterByType = (type: NodeType) => {
    onViewChange('notes')
    const match = nodes.find(n => n.type === type)
    if (match) {
      dispatch({ type: 'SET_SELECTED', nodeId: match.id })
    }
  }

  // Search filter
  const filteredNodes = searchQuery.trim()
    ? nodes.filter(n =>
        n.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : null

  const handleAddEvent = () => {
    if (!newEventTitle.trim()) return
    dispatch({
      type: 'ADD_CALENDAR_EVENT',
      event: { id: generateId(), title: newEventTitle.trim(), date: newEventDate, done: false },
    })
    setNewEventTitle('')
  }

  const themes: { key: ThemeMode; label: string; icon: string }[] = [
    { key: 'cosmos', label: '우주', icon: '🌌' },
    { key: 'dot', label: '도트', icon: '⬤' },
    { key: 'light', label: '기본', icon: '☀️' },
  ]

  // Group calendar events by date
  const todayStr = new Date().toISOString().slice(0, 10)
  const sortedEvents = [...calendarEvents].sort((a, b) => a.date.localeCompare(b.date))

  return (
    <aside className="sidebar">
      <div className="sidebar__header">
        <button className="sidebar__logo" onClick={() => onViewChange('graph')} title="Graph View">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="4" />
            <line x1="21.17" y1="8" x2="12" y2="8" />
            <line x1="3.95" y1="6.06" x2="8.54" y2="14" />
            <line x1="10.88" y1="21.94" x2="15.46" y2="14" />
          </svg>
        </button>
        <span className="sidebar__title" style={{ cursor: 'pointer' }} onClick={() => onViewChange('graph')}>Cosmos Note</span>
        <div className="sidebar__theme-toggle">
          <button
            className="btn-icon btn-icon--sm"
            onClick={() => setThemePickerOpen(!themePickerOpen)}
            title="테마 변경"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          </button>
          {themePickerOpen && (
            <div className="theme-picker">
              {themes.map(t => (
                <button
                  key={t.key}
                  className={`theme-picker__item ${theme === t.key ? 'theme-picker__item--active' : ''}`}
                  onClick={() => { setTheme(t.key); setThemePickerOpen(false) }}
                >
                  <span>{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="sidebar__search">
        <svg className="sidebar__search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          className="sidebar__search-input"
          type="text"
          placeholder="카테고리 검색..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button className="sidebar__search-clear" onClick={() => setSearchQuery('')}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        )}
      </div>

      {/* Search results */}
      {filteredNodes && (
        <div className="sidebar__search-results">
          <div className="nav-section__label">검색 결과 ({filteredNodes.length})</div>
          {filteredNodes.slice(0, 8).map(n => (
            <button
              key={n.id}
              className="nav-item nav-item--small"
              onClick={() => {
                dispatch({ type: 'SET_SELECTED', nodeId: n.id })
                onViewChange('notes')
              }}
            >
              <span className="nav-item__dot" style={{ background: n.description.trim() ? NODE_COLORS[n.type] : EMPTY_NODE_COLOR }} />
              <span className="nav-item__label-text">{n.label}</span>
              <span className="nav-item__type-badge">{n.type}</span>
            </button>
          ))}
        </div>
      )}

      <nav className="sidebar__nav">
        {/* General - collapsible */}
        <div className="nav-section">
          <button className="nav-section__label nav-section__label--toggle" onClick={() => setGeneralOpen(!generalOpen)}>
            <svg className={`nav-section__chevron ${generalOpen ? 'nav-section__chevron--open' : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
            General
          </button>
          {generalOpen && (
            <>
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
              <button
                className={`nav-item ${view === 'analysis' ? 'nav-item--active' : ''}`}
                onClick={() => onViewChange('analysis')}
              >
                <span className="nav-item__icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    <line x1="11" y1="8" x2="11" y2="14" />
                    <line x1="8" y1="11" x2="14" y2="11" />
                  </svg>
                </span>
                Analysis
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
              <button
                className={`nav-item ${view === 'calendar' ? 'nav-item--active' : ''}`}
                onClick={() => { setCalendarOpen(!calendarOpen); onViewChange('calendar') }}
              >
                <span className="nav-item__icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </span>
                Calendar
                <span className="nav-item__count">{calendarEvents.filter(e => !e.done).length}</span>
              </button>
              <button
                className={`nav-item ${view === 'quests' ? 'nav-item--active' : ''}`}
                onClick={() => { onViewChange('quests'); setQuestOpen(!questOpen) }}
              >
                <span className="nav-item__icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </span>
                Quests
              </button>
            </>
          )}
        </div>

        {/* Quest panel */}
        {questOpen && (
          <div className="nav-section nav-section--quest">
            <QuestTodo />
          </div>
        )}

        {/* Calendar panel */}
        {calendarOpen && (
          <div className="nav-section nav-section--calendar">
            <div className="calendar-panel">
              <div className="calendar-panel__add">
                <input
                  type="text"
                  className="calendar-panel__input"
                  placeholder="할 일 / 일정..."
                  value={newEventTitle}
                  onChange={e => setNewEventTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddEvent()}
                />
                <input
                  type="date"
                  className="calendar-panel__date"
                  value={newEventDate}
                  onChange={e => setNewEventDate(e.target.value)}
                />
                <button className="calendar-panel__add-btn" onClick={handleAddEvent}>+</button>
              </div>
              <div className="calendar-panel__list">
                {sortedEvents.length === 0 && (
                  <div className="calendar-panel__empty">일정이 없습니다</div>
                )}
                {sortedEvents.map(ev => (
                  <div key={ev.id} className={`calendar-panel__event ${ev.done ? 'calendar-panel__event--done' : ''} ${ev.date === todayStr ? 'calendar-panel__event--today' : ''}`}>
                    <button
                      className="calendar-panel__check"
                      onClick={() => dispatch({ type: 'TOGGLE_CALENDAR_EVENT', eventId: ev.id })}
                    >
                      {ev.done ? '✓' : '○'}
                    </button>
                    <div className="calendar-panel__event-info">
                      <span className="calendar-panel__event-title">{ev.title}</span>
                      <span className="calendar-panel__event-date">{ev.date === todayStr ? '오늘' : ev.date}</span>
                    </div>
                    <button
                      className="calendar-panel__remove"
                      onClick={() => dispatch({ type: 'REMOVE_CALENDAR_EVENT', eventId: ev.id })}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Workspaces - collapsible */}
        <div className="nav-section">
          <button className="nav-section__label nav-section__label--toggle" onClick={() => setWorkspaceOpen(!workspaceOpen)}>
            <svg className={`nav-section__chevron ${workspaceOpen ? 'nav-section__chevron--open' : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
            Workspaces
          </button>
          {workspaceOpen && (
            <>
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
            </>
          )}
        </div>

        {/* Recent */}
        <div className="nav-section nav-section--compact">
          <button className="nav-section__label nav-section__label--toggle" onClick={() => setRecentOpen(!recentOpen)}>
            <svg className={`nav-section__chevron ${recentOpen ? 'nav-section__chevron--open' : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
            Recent
          </button>
          {recentOpen && [...nodes]
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, 4)
            .map(n => (
              <button
                key={n.id}
                className="nav-item nav-item--small"
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

        {/* Recently Deleted */}
        {recentlyDeleted.length > 0 && (
          <div className="nav-section nav-section--compact nav-section--deleted">
            <button className="nav-section__label nav-section__label--toggle" onClick={() => setDeletedOpen(!deletedOpen)}>
              <svg className={`nav-section__chevron ${deletedOpen ? 'nav-section__chevron--open' : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
              최근 삭제
              <span className="nav-item__count">{recentlyDeleted.length}</span>
            </button>
            {deletedOpen && (
              <>
                {recentlyDeleted.slice(0, 5).map((d, i) => (
                  <div key={d.node.id + d.deletedAt} className="nav-item nav-item--small nav-item--deleted">
                    <span className="nav-item__dot" style={{ background: EMPTY_NODE_COLOR }} />
                    <span className="nav-item__label-text">{d.node.label}</span>
                    <button
                      className="nav-item__restore"
                      onClick={() => dispatch({ type: 'RESTORE_NODE', deletedIndex: i })}
                      title="복원"
                    >
                      ↩
                    </button>
                  </div>
                ))}
                <button
                  className="nav-item nav-item--small nav-item--danger"
                  onClick={() => dispatch({ type: 'CLEAR_DELETED' })}
                >
                  전체 삭제
                </button>
              </>
            )}
          </div>
        )}
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
