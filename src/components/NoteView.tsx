import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useGraphState, useGraphDispatch } from '../state/GraphContext'
import { createNode, generateId } from '../state/graphReducer'
import type { NodeType, GraphNode } from '../types/graph'
import { NODE_COLORS } from '../types/graph'

const NODE_TYPE_LABELS: Record<NodeType, string> = {
  work: '업무',
  personal: '개인',
  task: '할일',
  idea: '아이디어',
}

function detectNodeType(text: string): NodeType {
  const lower = text.toLowerCase()
  if (/디자인|ui|ux|레이아웃|컬러|폰트|타이포|와이어프레임|프로토타입|목업|figma|sketch|일러스트|그래픽|아이콘|로고|브랜딩|비주얼|css|스타일/.test(lower)) return 'idea'
  if (/회의|미팅|보고|업무|프로젝트|일정|마감|클라이언트|기획|전략|분석|리뷰|발표|제안/.test(lower)) return 'work'
  if (/해야|할일|todo|체크|완료|진행|구현|수정|버그|fix|deploy|배포|테스트|확인/.test(lower)) return 'task'
  if (/일기|감정|생각|느낌|고민|꿈|목표|운동|건강|취미|여행|독서|영화/.test(lower)) return 'personal'
  return 'idea'
}

// Parse [[link]] syntax and return segments
function parseWikiLinks(text: string): Array<{ type: 'text' | 'link'; value: string }> {
  const parts: Array<{ type: 'text' | 'link'; value: string }> = []
  const regex = /\[\[([^\]]+)\]\]/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, match.index) })
    }
    parts.push({ type: 'link', value: match[1] })
    lastIndex = regex.lastIndex
  }
  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex) })
  }
  return parts
}

// Simple markdown-like rendering
function renderMarkdown(line: string): { tag: string; content: string; className: string } {
  if (line.startsWith('### ')) return { tag: 'h3', content: line.slice(4), className: 'md-h3' }
  if (line.startsWith('## ')) return { tag: 'h2', content: line.slice(3), className: 'md-h2' }
  if (line.startsWith('# ')) return { tag: 'h1', content: line.slice(2), className: 'md-h1' }
  if (line.startsWith('- [ ] ')) return { tag: 'div', content: line.slice(6), className: 'md-todo' }
  if (line.startsWith('- [x] ')) return { tag: 'div', content: line.slice(6), className: 'md-todo md-todo--done' }
  if (line.startsWith('- ')) return { tag: 'div', content: line.slice(2), className: 'md-list' }
  if (line.startsWith('> ')) return { tag: 'blockquote', content: line.slice(2), className: 'md-quote' }
  if (line.startsWith('---')) return { tag: 'hr', content: '', className: 'md-hr' }
  return { tag: 'p', content: line, className: 'md-p' }
}

export function NoteView({ onSwitchToGraph }: { onSwitchToGraph: (nodeId: string) => void }) {
  const { nodes, edges, selectedNodeId } = useGraphState()
  const dispatch = useGraphDispatch()
  const [filter, setFilter] = useState<NodeType | 'all'>('all')
  const [sortBy, setSortBy] = useState<'recent' | 'name'>('recent')
  const [newNoteInput, setNewNoteInput] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [noteOrder, setNoteOrder] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('cosmos-note-order') || '[]') } catch { return [] }
  })

  const activeNote = selectedNodeId ? nodes.find(n => n.id === selectedNodeId) : null

  // Auto-select first note
  useEffect(() => {
    if (!selectedNodeId && nodes.length > 0) {
      const sorted = [...nodes].sort((a, b) => b.createdAt - a.createdAt)
      dispatch({ type: 'SET_SELECTED', nodeId: sorted[0].id })
    }
  }, [selectedNodeId, nodes, dispatch])

  // Filter and sort
  const filtered = useMemo(() => {
    let list = nodes.filter(n => filter === 'all' || n.type === filter)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(n =>
        n.label.toLowerCase().includes(q) ||
        n.description.toLowerCase().includes(q) ||
        n.tags.some(t => t.toLowerCase().includes(q))
      )
    }
    const sorted = [...list].sort((a, b) =>
      sortBy === 'recent' ? b.createdAt - a.createdAt : a.label.localeCompare(b.label)
    )
    // Apply custom order if exists
    if (noteOrder.length > 0 && sortBy === 'recent') {
      sorted.sort((a, b) => {
        const ai = noteOrder.indexOf(a.id)
        const bi = noteOrder.indexOf(b.id)
        if (ai === -1 && bi === -1) return b.createdAt - a.createdAt
        if (ai === -1) return 1
        if (bi === -1) return -1
        return ai - bi
      })
    }
    return sorted
  }, [nodes, filter, sortBy, searchQuery, noteOrder])

  // Connected notes
  const connectedNotes = useMemo(() => {
    if (!activeNote) return []
    return edges
      .filter(e => e.source === activeNote.id || e.target === activeNote.id)
      .map(e => {
        const otherId = e.source === activeNote.id ? e.target : e.source
        return nodes.find(n => n.id === otherId)
      })
      .filter(Boolean) as GraphNode[]
  }, [activeNote, edges, nodes])

  // Backlinks: notes that mention this note via [[link]]
  const backlinks = useMemo(() => {
    if (!activeNote) return []
    const label = activeNote.label.toLowerCase()
    return nodes.filter(n =>
      n.id !== activeNote.id &&
      n.description.toLowerCase().includes(`[[${label}]]`)
    )
  }, [activeNote, nodes])

  // Word count
  const wordCount = useMemo(() => {
    if (!activeNote) return 0
    return activeNote.description.trim() ? activeNote.description.trim().split(/\s+/).length : 0
  }, [activeNote])

  const handleNewNote = (e: React.FormEvent) => {
    e.preventDefault()
    const text = newNoteInput.trim()
    if (!text) return
    const detectedType = detectNodeType(text)
    const newNode = createNode({
      label: text,
      type: detectedType,
      x: (Math.random() - 0.5) * 400,
      y: (Math.random() - 0.5) * 400,
      description: '',
      radius: 14,
    })
    dispatch({ type: 'ADD_NODE', node: newNode })
    dispatch({ type: 'SET_SELECTED', nodeId: newNode.id })
    setNewNoteInput('')
    setIsEditing(true)
  }

  const handleTitleChange = (value: string) => {
    if (!activeNote) return
    dispatch({ type: 'UPDATE_NODE', nodeId: activeNote.id, updates: { label: value } })
  }

  const handleDescChange = (value: string) => {
    if (!activeNote) return
    dispatch({ type: 'UPDATE_NODE', nodeId: activeNote.id, updates: { description: value } })
  }

  const handleTypeChange = (type: NodeType) => {
    if (!activeNote) return
    dispatch({ type: 'UPDATE_NODE', nodeId: activeNote.id, updates: { type } })
  }

  const handleDelete = () => {
    if (!activeNote) return
    dispatch({ type: 'REMOVE_NODE', nodeId: activeNote.id })
  }

  const handleAddTag = (tag: string) => {
    if (!activeNote || activeNote.tags.includes(tag)) return
    dispatch({ type: 'UPDATE_NODE', nodeId: activeNote.id, updates: { tags: [...activeNote.tags, tag] } })
  }

  const handleRemoveTag = (tag: string) => {
    if (!activeNote) return
    dispatch({ type: 'UPDATE_NODE', nodeId: activeNote.id, updates: { tags: activeNote.tags.filter(t => t !== tag) } })
  }

  // Handle [[link]] click: navigate to linked note or create it
  const handleLinkClick = useCallback((linkName: string) => {
    const target = nodes.find(n => n.label.toLowerCase() === linkName.toLowerCase())
    if (target) {
      dispatch({ type: 'SET_SELECTED', nodeId: target.id })
    } else {
      // Create new note from link
      const newNode = createNode({
        label: linkName,
        type: 'idea',
        x: (Math.random() - 0.5) * 400,
        y: (Math.random() - 0.5) * 400,
        description: '',
        radius: 14,
      })
      dispatch({ type: 'ADD_NODE', node: newNode })
      // Connect to current note
      if (activeNote) {
        dispatch({
          type: 'ADD_EDGE',
          edge: { id: generateId(), source: activeNote.id, target: newNode.id },
        })
      }
      dispatch({ type: 'SET_SELECTED', nodeId: newNode.id })
    }
  }, [nodes, dispatch, activeNote])

  // Insert [[link]] helper
  const insertLink = useCallback(() => {
    if (!bodyRef.current || !activeNote) return
    const ta = bodyRef.current
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const text = activeNote.description
    const selected = text.slice(start, end)
    const insert = selected ? `[[${selected}]]` : '[[]]'
    const newText = text.slice(0, start) + insert + text.slice(end)
    handleDescChange(newText)
    setTimeout(() => {
      ta.focus()
      const cursorPos = selected ? start + insert.length : start + 2
      ta.setSelectionRange(cursorPos, cursorPos)
    }, 0)
  }, [activeNote])

  // Keyboard shortcut for [[link]]
  const handleBodyKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === '[' && e.ctrlKey) {
      e.preventDefault()
      insertLink()
    }
  }

  // Render description with [[link]] support (preview mode)
  const renderDescription = (text: string) => {
    const lines = text.split('\n')
    return lines.map((line, i) => {
      const { tag, content, className } = renderMarkdown(line)

      if (tag === 'hr') {
        return <hr key={i} className={className} />
      }

      if (!content && tag === 'p') {
        return <div key={i} className="md-empty-line">&nbsp;</div>
      }

      const parts = parseWikiLinks(content)

      // Apply inline formatting
      const renderInline = (text: string, key: string) => {
        // Bold
        const boldParts = text.split(/\*\*(.+?)\*\*/g)
        return boldParts.map((part, j) => {
          if (j % 2 === 1) return <strong key={`${key}-b${j}`}>{part}</strong>
          // Italic
          const italicParts = part.split(/\*(.+?)\*/g)
          return italicParts.map((ip, k) => {
            if (k % 2 === 1) return <em key={`${key}-i${k}`}>{ip}</em>
            // Code
            const codeParts = ip.split(/`(.+?)`/g)
            return codeParts.map((cp, l) => {
              if (l % 2 === 1) return <code key={`${key}-c${l}`} className="md-code">{cp}</code>
              return cp || null
            })
          })
        })
      }

      const Element = tag as keyof JSX.IntrinsicElements

      return (
        <Element key={i} className={className}>
          {className === 'md-todo' || className === 'md-todo md-todo--done' ? (
            <span className="md-todo__check">{className.includes('done') ? '✓' : '○'}</span>
          ) : null}
          {className === 'md-list' ? <span className="md-list__bullet">•</span> : null}
          {parts.map((part, j) => {
            if (part.type === 'link') {
              const exists = nodes.some(n => n.label.toLowerCase() === part.value.toLowerCase())
              return (
                <button
                  key={j}
                  className={`md-wikilink ${exists ? 'md-wikilink--exists' : 'md-wikilink--new'}`}
                  onClick={() => handleLinkClick(part.value)}
                >
                  {part.value}
                </button>
              )
            }
            return <span key={j}>{renderInline(part.value, `${i}-${j}`)}</span>
          })}
        </Element>
      )
    })
  }

  return (
    <div className="note-view">
      {/* Note list panel */}
      <div className="note-list">
        <div className="note-list__header">
          <h2 className="note-list__title">Notes</h2>

          {/* Search within notes */}
          <div className="note-list__search">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="노트 검색..."
              className="note-list__search-input"
            />
            {searchQuery && (
              <button className="note-list__search-clear" onClick={() => setSearchQuery('')}>×</button>
            )}
          </div>

          <div className="note-list__filters">
            {(['all', 'idea', 'work', 'task', 'personal'] as const).map(f => (
              <button
                key={f}
                className={`note-list__filter ${filter === f ? 'note-list__filter--active' : ''}`}
                onClick={() => setFilter(f)}
                style={f !== 'all' && filter === f ? { borderColor: NODE_COLORS[f], color: NODE_COLORS[f] } : undefined}
              >
                {f === 'all' ? '전체' : NODE_TYPE_LABELS[f]}
              </button>
            ))}
          </div>
          <div className="note-list__sort">
            <button
              className={`note-list__sort-btn ${sortBy === 'recent' ? 'note-list__sort-btn--active' : ''}`}
              onClick={() => setSortBy('recent')}
            >최신</button>
            <button
              className={`note-list__sort-btn ${sortBy === 'name' ? 'note-list__sort-btn--active' : ''}`}
              onClick={() => setSortBy('name')}
            >이름</button>
          </div>
        </div>

        {/* New note input */}
        <form onSubmit={handleNewNote} className="note-list__new">
          <input
            type="text"
            value={newNoteInput}
            onChange={(e) => setNewNoteInput(e.target.value)}
            placeholder="+ 새 노트..."
            className="note-list__new-input"
            autoComplete="off"
          />
        </form>

        {/* Note items */}
        <div className="note-list__items">
          {filtered.map(n => {
            const hasContent = n.description.trim().length > 0
            return (
              <button
                key={n.id}
                className={`note-item ${n.id === selectedNodeId ? 'note-item--active' : ''} ${dragOverId === n.id ? 'note-item--dragover' : ''}`}
                onClick={() => { dispatch({ type: 'SET_SELECTED', nodeId: n.id }); setIsEditing(false) }}
                draggable
                onDragStart={() => setDragId(n.id)}
                onDragOver={(e) => { e.preventDefault(); setDragOverId(n.id) }}
                onDragLeave={() => setDragOverId(null)}
                onDrop={() => {
                  if (dragId && dragId !== n.id) {
                    const currentIds = filtered.map(x => x.id)
                    const fromIdx = currentIds.indexOf(dragId)
                    const toIdx = currentIds.indexOf(n.id)
                    if (fromIdx !== -1 && toIdx !== -1) {
                      const newOrder = [...currentIds]
                      newOrder.splice(fromIdx, 1)
                      newOrder.splice(toIdx, 0, dragId)
                      setNoteOrder(newOrder)
                      localStorage.setItem('cosmos-note-order', JSON.stringify(newOrder))
                    }
                  }
                  setDragId(null); setDragOverId(null)
                }}
                onDragEnd={() => { setDragId(null); setDragOverId(null) }}
              >
                <div
                  className={`note-item__dot ${!hasContent ? 'note-item__dot--empty' : ''}`}
                  style={{ background: hasContent ? n.color : undefined }}
                />
                <div className="note-item__content">
                  <div className="note-item__label">{n.label}</div>
                  <div className="note-item__meta">
                    <span className="note-item__type">{NODE_TYPE_LABELS[n.type]}</span>
                    <span className="note-item__date">
                      {new Date(n.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                    </span>
                    {!hasContent && <span className="note-item__empty-badge">빈 노트</span>}
                  </div>
                  {n.description && (
                    <div className="note-item__preview">{n.description.slice(0, 60)}</div>
                  )}
                </div>
              </button>
            )
          })}
          {filtered.length === 0 && (
            <div className="note-list__empty">노트가 없습니다</div>
          )}
        </div>
      </div>

      {/* Note editor panel */}
      <div className="note-editor">
        {activeNote ? (
          <>
            <div className="note-editor__toolbar">
              <div className="note-editor__types">
                {(['idea', 'work', 'task', 'personal'] as const).map(t => (
                  <button
                    key={t}
                    className={`note-editor__type-btn ${activeNote.type === t ? 'note-editor__type-btn--active' : ''}`}
                    onClick={() => handleTypeChange(t)}
                    style={activeNote.type === t ? { borderColor: NODE_COLORS[t], color: NODE_COLORS[t] } : undefined}
                  >
                    {NODE_TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
              <div className="note-editor__actions">
                <button
                  className="note-editor__action-btn"
                  onClick={() => setIsEditing(!isEditing)}
                  title={isEditing ? '미리보기' : '편집'}
                >
                  {isEditing ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  )}
                  {isEditing ? '미리보기' : '편집'}
                </button>
                <button
                  className="note-editor__action-btn"
                  onClick={insertLink}
                  title="링크 삽입 (Ctrl+[)"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                  링크
                </button>
                <button
                  className="note-editor__action-btn"
                  onClick={() => onSwitchToGraph(activeNote.id)}
                  title="그래프에서 보기"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="4" />
                  </svg>
                  그래프
                </button>
                <button className="note-editor__action-btn note-editor__action-btn--danger" onClick={handleDelete}>
                  삭제
                </button>
                <span className="note-editor__esc-hint" title="ESC 키로 그래프뷰 복귀">
                  ESC → 그래프
                </span>
              </div>
            </div>

            {/* Title */}
            <input
              className="note-editor__title"
              value={activeNote.label}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="제목..."
            />

            {/* Meta info */}
            <div className="note-editor__meta">
              <span className="note-editor__date">
                {new Date(activeNote.createdAt).toLocaleDateString('ko-KR', {
                  year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
                })}
              </span>
              {/* word count removed */}
              {!activeNote.description.trim() && (
                <span className="note-editor__empty-badge">빈 노트 — 내용을 적으면 색상이 활성화됩니다</span>
              )}
            </div>

            {/* Tags */}
            <div className="note-editor__tags">
              {activeNote.tags.map(tag => (
                <span key={tag} className="note-editor__tag" onClick={() => handleRemoveTag(tag)}>
                  {tag} ✕
                </span>
              ))}
              <TagInput onAdd={handleAddTag} />
            </div>

            {/* Body: Edit or Preview mode */}
            {isEditing ? (
              <textarea
                ref={bodyRef}
                className="note-editor__body"
                value={activeNote.description}
                onChange={(e) => handleDescChange(e.target.value)}
                onKeyDown={handleBodyKeyDown}
                placeholder={'여기에 내용을 작성하세요...\n\n마크다운 문법 지원:\n# 제목\n**굵게** *기울임* `코드`\n- 목록\n- [ ] 할일\n> 인용\n[[다른 노트]] 로 링크'}
              />
            ) : (
              <div
                className="note-editor__preview"
                onClick={() => setIsEditing(true)}
              >
                {activeNote.description.trim() ? (
                  renderDescription(activeNote.description)
                ) : (
                  <div className="note-editor__preview-empty">
                    <p>클릭하여 내용을 작성하세요</p>
                    <p className="note-editor__preview-hint">
                      마크다운 · [[위키링크]] · 태그 지원
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Backlinks */}
            {(connectedNotes.length > 0 || backlinks.length > 0) && (
              <div className="note-editor__links">
                {connectedNotes.length > 0 && (
                  <>
                    <div className="note-editor__links-title">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                      </svg>
                      연결된 노트 ({connectedNotes.length})
                    </div>
                    <div className="note-editor__links-list">
                      {connectedNotes.map(cn => (
                        <button
                          key={cn.id}
                          className="note-editor__link"
                          onClick={() => { dispatch({ type: 'SET_SELECTED', nodeId: cn.id }); setIsEditing(false) }}
                        >
                          <span className="note-editor__link-dot" style={{ background: cn.description.trim() ? NODE_COLORS[cn.type] : '#4a4a5a' }} />
                          {cn.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                {backlinks.length > 0 && (
                  <>
                    <div className="note-editor__links-title note-editor__links-title--backlinks">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6" />
                      </svg>
                      백링크 ({backlinks.length})
                    </div>
                    <div className="note-editor__links-list">
                      {backlinks.map(bl => (
                        <button
                          key={bl.id}
                          className="note-editor__link"
                          onClick={() => { dispatch({ type: 'SET_SELECTED', nodeId: bl.id }); setIsEditing(false) }}
                        >
                          <span className="note-editor__link-dot" style={{ background: bl.description.trim() ? NODE_COLORS[bl.type] : '#4a4a5a' }} />
                          {bl.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="note-editor__empty">
            <div className="note-editor__empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <p>노트를 선택하거나 새로 만들어보세요</p>
            <p className="note-editor__empty-sub">[[링크]] 문법으로 노트를 연결할 수 있습니다</p>
          </div>
        )}
      </div>
    </div>
  )
}

function TagInput({ onAdd }: { onAdd: (tag: string) => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const [value, setValue] = useState('')

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const tag = value.trim()
      if (tag) onAdd(tag)
      setValue('')
      setIsOpen(false)
    }
    if (e.key === 'Escape') {
      setValue('')
      setIsOpen(false)
    }
  }

  if (!isOpen) {
    return (
      <button className="note-editor__add-tag" onClick={() => setIsOpen(true)}>+ 태그</button>
    )
  }

  return (
    <input
      autoFocus
      className="note-editor__tag-input"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={() => { setIsOpen(false); setValue('') }}
      placeholder="태그명..."
    />
  )
}
