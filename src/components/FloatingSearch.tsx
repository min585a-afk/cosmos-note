import { useState, useRef, useEffect, useCallback } from 'react'
import { useGraphState, useGraphDispatch } from '../state/GraphContext'

export function FloatingSearch() {
  const { nodes, searchQuery } = useGraphState()
  const dispatch = useGraphDispatch()

  const [isOpen, setIsOpen] = useState(false)
  const [isPinned, setIsPinned] = useState(false)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const dragOffset = useRef({ x: 0, y: 0 })
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Matching nodes
  const query = searchQuery.toLowerCase()
  const matches = query
    ? nodes.filter(n => n.label.toLowerCase().includes(query))
    : []

  // Ctrl+K to toggle
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(prev => {
          if (prev) {
            dispatch({ type: 'SET_SEARCH', query: '' })
            return false
          }
          return true
        })
      }
      if (e.key === 'Escape' && isOpen && !isPinned) {
        setIsOpen(false)
        dispatch({ type: 'SET_SEARCH', query: '' })
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, isPinned, dispatch])

  // Focus input on open
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 50)
  }, [isOpen])

  const handleSearch = useCallback((value: string) => {
    dispatch({ type: 'SET_SEARCH', query: value })
    if (value.trim()) {
      const match = nodes.find(n => n.label.toLowerCase().includes(value.toLowerCase()))
      if (match) {
        dispatch({ type: 'SET_SELECTED', nodeId: match.id })
        dispatch({ type: 'SET_VIEWPORT', viewport: { x: -match.x, y: -match.y, scale: 1.2 } })
      }
    }
  }, [dispatch, nodes])

  const navigateToNode = (nodeId: string) => {
    const target = nodes.find(n => n.id === nodeId)
    if (target) {
      dispatch({ type: 'SET_SELECTED', nodeId })
      dispatch({ type: 'SET_VIEWPORT', viewport: { x: -target.x, y: -target.y, scale: 1.2 } })
    }
    if (!isPinned) {
      setIsOpen(false)
      dispatch({ type: 'SET_SEARCH', query: '' })
    }
  }

  // Drag handlers
  const handleDragStart = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).tagName === 'INPUT') return
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    setIsDragging(true)
    el.setPointerCapture(e.pointerId)
  }

  const handleDragMove = (e: React.PointerEvent) => {
    if (!isDragging) return
    setPos({
      x: e.clientX - dragOffset.current.x,
      y: e.clientY - dragOffset.current.y,
    })
  }

  const handleDragEnd = () => {
    setIsDragging(false)
  }

  if (!isOpen) return null

  const style: React.CSSProperties = pos
    ? { left: pos.x, top: pos.y, transform: 'none' }
    : { left: '50%', bottom: '60px', transform: 'translateX(-50%)' }

  return (
    <div
      ref={containerRef}
      className={`floating-search ${isDragging ? 'floating-search--dragging' : ''} ${isPinned ? 'floating-search--pinned' : ''}`}
      style={style}
      onPointerDown={handleDragStart}
      onPointerMove={handleDragMove}
      onPointerUp={handleDragEnd}
    >
      {/* Drag handle */}
      <div className="floating-search__handle">
        <div className="floating-search__handle-dots" />
      </div>

      <div className="floating-search__bar">
        <svg className="floating-search__icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="노드 검색... (Ctrl+K)"
          className="floating-search__input"
          autoComplete="off"
        />
        <button
          className={`floating-search__pin ${isPinned ? 'floating-search__pin--active' : ''}`}
          onClick={() => setIsPinned(!isPinned)}
          title={isPinned ? '고정 해제' : '위치 고정'}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill={isPinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 17v5M9.5 2.1L14.5 2.1C15.3 2.1 16 2.8 16 3.6V7C17.4 7.7 18.5 9.2 18.5 11V12.5H5.5V11C5.5 9.2 6.6 7.7 8 7V3.6C8 2.8 8.7 2.1 9.5 2.1Z" />
          </svg>
        </button>
        <button
          className="floating-search__close"
          onClick={() => {
            setIsOpen(false)
            dispatch({ type: 'SET_SEARCH', query: '' })
          }}
        >
          ✕
        </button>
      </div>

      {/* Results */}
      {query && (
        <div className="floating-search__results">
          {matches.length === 0 ? (
            <div className="floating-search__empty">검색 결과가 없습니다</div>
          ) : (
            matches.slice(0, 8).map(n => (
              <button
                key={n.id}
                className="floating-search__result"
                onClick={() => navigateToNode(n.id)}
              >
                <span className="floating-search__result-dot" style={{ background: n.color }} />
                <span className="floating-search__result-label">{n.label}</span>
                <span className="floating-search__result-type">{n.type}</span>
              </button>
            ))
          )}
          {matches.length > 0 && (
            <div className="floating-search__count">{matches.length}개 노드 발견</div>
          )}
        </div>
      )}
    </div>
  )
}
