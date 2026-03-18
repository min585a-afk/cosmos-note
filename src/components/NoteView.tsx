import { useState, useRef, useEffect } from 'react'
import { useGraphState, useGraphDispatch } from '../state/GraphContext'
import { createNode } from '../state/graphReducer'
import type { NodeType, GraphNode } from '../types/graph'

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

export function NoteView({ onSwitchToGraph }: { onSwitchToGraph: (nodeId: string) => void }) {
  const { nodes, edges, selectedNodeId } = useGraphState()
  const dispatch = useGraphDispatch()
  const [filter, setFilter] = useState<NodeType | 'all'>('all')
  const [sortBy, setSortBy] = useState<'recent' | 'name'>('recent')
  const [newNoteInput, setNewNoteInput] = useState('')
  const descRef = useRef<HTMLTextAreaElement>(null)

  const activeNote = selectedNodeId ? nodes.find(n => n.id === selectedNodeId) : null

  // Auto-select first note if none selected
  useEffect(() => {
    if (!selectedNodeId && nodes.length > 0) {
      const sorted = [...nodes].sort((a, b) => b.createdAt - a.createdAt)
      dispatch({ type: 'SET_SELECTED', nodeId: sorted[0].id })
    }
  }, [selectedNodeId, nodes, dispatch])

  const filtered = nodes.filter(n => filter === 'all' || n.type === filter)
  const sorted = [...filtered].sort((a, b) =>
    sortBy === 'recent' ? b.createdAt - a.createdAt : a.label.localeCompare(b.label)
  )

  // Connected notes for the active note
  const connectedNotes = activeNote
    ? edges
        .filter(e => e.source === activeNote.id || e.target === activeNote.id)
        .map(e => {
          const otherId = e.source === activeNote.id ? e.target : e.source
          return nodes.find(n => n.id === otherId)
        })
        .filter(Boolean) as GraphNode[]
    : []

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

  return (
    <div className="note-view">
      {/* Note list panel */}
      <div className="note-list">
        <div className="note-list__header">
          <h2 className="note-list__title">Notes</h2>
          <div className="note-list__filters">
            {(['all', 'idea', 'work', 'task', 'personal'] as const).map(f => (
              <button
                key={f}
                className={`note-list__filter ${filter === f ? 'note-list__filter--active' : ''}`}
                onClick={() => setFilter(f)}
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
          {sorted.map(n => (
            <button
              key={n.id}
              className={`note-item ${n.id === selectedNodeId ? 'note-item--active' : ''}`}
              onClick={() => dispatch({ type: 'SET_SELECTED', nodeId: n.id })}
            >
              <div className="note-item__dot" style={{ background: n.color }} />
              <div className="note-item__content">
                <div className="note-item__label">{n.label}</div>
                <div className="note-item__meta">
                  <span className="note-item__type">{NODE_TYPE_LABELS[n.type]}</span>
                  <span className="note-item__date">
                    {new Date(n.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                {n.description && (
                  <div className="note-item__preview">{n.description.slice(0, 60)}</div>
                )}
              </div>
            </button>
          ))}
          {sorted.length === 0 && (
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
                    style={activeNote.type === t ? { borderColor: activeNote.color, color: activeNote.color } : undefined}
                  >
                    {NODE_TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
              <div className="note-editor__actions">
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
              </div>
            </div>

            <input
              className="note-editor__title"
              value={activeNote.label}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="제목..."
            />

            <div className="note-editor__date">
              {new Date(activeNote.createdAt).toLocaleDateString('ko-KR', {
                year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
              })}
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

            <textarea
              ref={descRef}
              className="note-editor__body"
              value={activeNote.description}
              onChange={(e) => handleDescChange(e.target.value)}
              placeholder="여기에 내용을 작성하세요...&#10;&#10;생각, 메모, 계획 등 자유롭게 적어보세요."
            />

            {/* Connected notes */}
            {connectedNotes.length > 0 && (
              <div className="note-editor__links">
                <div className="note-editor__links-title">연결된 노트</div>
                <div className="note-editor__links-list">
                  {connectedNotes.map(cn => (
                    <button
                      key={cn.id}
                      className="note-editor__link"
                      onClick={() => dispatch({ type: 'SET_SELECTED', nodeId: cn.id })}
                    >
                      <span className="note-editor__link-dot" style={{ background: cn.color }} />
                      {cn.label}
                    </button>
                  ))}
                </div>
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
