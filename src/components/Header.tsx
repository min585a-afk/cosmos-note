import { useState, useRef, useEffect, useCallback } from 'react'
import { useGraphState, useGraphDispatch } from '../state/GraphContext'

export function Header() {
  const { nodes, searchQuery } = useGraphState()
  const dispatch = useGraphDispatch()
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Cmd+K shortcut to open search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsSearchOpen(true)
        setTimeout(() => inputRef.current?.focus(), 50)
      }
      if (e.key === 'Escape' && isSearchOpen) {
        setIsSearchOpen(false)
        dispatch({ type: 'SET_SEARCH', query: '' })
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isSearchOpen, dispatch])

  const handleSearch = useCallback((value: string) => {
    dispatch({ type: 'SET_SEARCH', query: value })

    // Auto-navigate to first matching node
    if (value.trim()) {
      const match = nodes.find(n => n.label.toLowerCase().includes(value.toLowerCase()))
      if (match) {
        dispatch({ type: 'SET_SELECTED', nodeId: match.id })
        dispatch({ type: 'SET_VIEWPORT', viewport: { x: -match.x, y: -match.y, scale: 1.2 } })
      }
    }
  }, [dispatch, nodes])

  const handleSearchClick = () => {
    setIsSearchOpen(true)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const handleBlur = () => {
    if (!searchQuery) {
      setIsSearchOpen(false)
    }
  }

  return (
    <header className="header">
      <div className="header__left">
        <div className="header__breadcrumb">
          <span>Workspaces</span>
          <span>/</span>
          <span className="header__current">Graph View</span>
        </div>
      </div>
      <div className="header__actions">
        {isSearchOpen ? (
          <div className="search-bar search-bar--active">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onBlur={handleBlur}
              placeholder="노드 검색..."
              className="search-bar__input"
              autoComplete="off"
            />
            {searchQuery && (
              <button
                className="search-bar__clear"
                onMouseDown={(e) => {
                  e.preventDefault()
                  dispatch({ type: 'SET_SEARCH', query: '' })
                  inputRef.current?.focus()
                }}
              >
                ✕
              </button>
            )}
          </div>
        ) : (
          <div className="search-bar" onClick={handleSearchClick}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span>Search notes...</span>
            <span className="search-bar__shortcut">Ctrl+K</span>
          </div>
        )}
        <button className="btn-icon" title="Toggle theme">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        </button>
        <button className="btn-icon" title="Settings">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>
    </header>
  )
}
