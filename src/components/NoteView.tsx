import { useState, useRef, useCallback, useMemo } from 'react'
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

// Parse [[link]] syntax
function parseWikiLinks(text: string): Array<{ type: 'text' | 'link'; value: string }> {
  const parts: Array<{ type: 'text' | 'link'; value: string }> = []
  const regex = /\[\[([^\]]+)\]\]/g
  let lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push({ type: 'text', value: text.slice(lastIndex, match.index) })
    parts.push({ type: 'link', value: match[1] })
    lastIndex = regex.lastIndex
  }
  if (lastIndex < text.length) parts.push({ type: 'text', value: text.slice(lastIndex) })
  return parts
}

// Markdown line parsing
function renderMarkdown(line: string): { tag: string; content: string; className: string } {
  if (line.startsWith('### ')) return { tag: 'h3', content: line.slice(4), className: 'md-h3' }
  if (line.startsWith('## ')) return { tag: 'h2', content: line.slice(3), className: 'md-h2' }
  if (line.startsWith('# ')) return { tag: 'h1', content: line.slice(2), className: 'md-h1' }
  if (line.startsWith('- [ ] ')) return { tag: 'div', content: line.slice(6), className: 'md-todo' }
  if (line.startsWith('- [x] ')) return { tag: 'div', content: line.slice(6), className: 'md-todo md-todo--done' }
  if (line.startsWith('- ')) return { tag: 'div', content: line.slice(2), className: 'md-list' }
  if (line.startsWith('> ')) return { tag: 'blockquote', content: line.slice(2), className: 'md-quote' }
  if (line.startsWith('---')) return { tag: 'hr', content: '', className: 'md-hr' }
  if (line.startsWith('```')) return { tag: 'pre', content: '', className: 'md-codeblock' }
  return { tag: 'p', content: line, className: 'md-p' }
}

export function NoteView({ onSwitchToGraph }: { onSwitchToGraph: (nodeId: string) => void }) {
  const { nodes, edges, selectedNodeId } = useGraphState()
  const dispatch = useGraphDispatch()
  const [mode, setMode] = useState<'edit' | 'preview'>('edit')
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  const activeNote = selectedNodeId ? nodes.find(n => n.id === selectedNodeId) : null

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

  // Backlinks
  const backlinks = useMemo(() => {
    if (!activeNote) return []
    const label = activeNote.label.toLowerCase()
    return nodes.filter(n =>
      n.id !== activeNote.id &&
      n.description.toLowerCase().includes(`[[${label}]]`)
    )
  }, [activeNote, nodes])

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

  const handleLinkClick = useCallback((linkName: string) => {
    const target = nodes.find(n => n.label.toLowerCase() === linkName.toLowerCase())
    if (target) {
      dispatch({ type: 'SET_SELECTED', nodeId: target.id })
    } else {
      const newNode = createNode({
        label: linkName,
        type: 'idea',
        x: (Math.random() - 0.5) * 400,
        y: (Math.random() - 0.5) * 400,
        description: '',
      })
      dispatch({ type: 'ADD_NODE', node: newNode })
      if (activeNote) {
        dispatch({ type: 'ADD_EDGE', edge: { id: generateId(), source: activeNote.id, target: newNode.id } })
      }
      dispatch({ type: 'SET_SELECTED', nodeId: newNode.id })
    }
  }, [nodes, dispatch, activeNote])

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

  const handleBodyKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === '[' && e.ctrlKey) {
      e.preventDefault()
      insertLink()
    }
  }

  // Render inline formatting
  const renderInline = (text: string, key: string) => {
    const boldParts = text.split(/\*\*(.+?)\*\*/g)
    return boldParts.map((part, j) => {
      if (j % 2 === 1) return <strong key={`${key}-b${j}`}>{part}</strong>
      const italicParts = part.split(/\*(.+?)\*/g)
      return italicParts.map((ip, k) => {
        if (k % 2 === 1) return <em key={`${key}-i${k}`}>{ip}</em>
        const codeParts = ip.split(/`(.+?)`/g)
        return codeParts.map((cp, l) => {
          if (l % 2 === 1) return <code key={`${key}-c${l}`} className="md-code">{cp}</code>
          return cp || null
        })
      })
    })
  }

  // Render description as markdown
  const renderDescription = (text: string) => {
    const lines = text.split('\n')
    let inCodeBlock = false

    return lines.map((line, i) => {
      if (line.startsWith('```')) {
        inCodeBlock = !inCodeBlock
        return inCodeBlock ? null : null
      }
      if (inCodeBlock) {
        return <pre key={i} className="md-codeblock-line">{line}</pre>
      }

      const { tag, content, className } = renderMarkdown(line)
      if (tag === 'hr') return <hr key={i} className={className} />
      if (!content && tag === 'p') return <div key={i} className="md-empty-line">&nbsp;</div>

      const parts = parseWikiLinks(content)

      return (
        <div key={i} className={className} role={tag === 'blockquote' ? 'blockquote' : undefined}>
          {className.startsWith('md-todo') && (
            <span className="md-todo__check">{className.includes('done') ? '✓' : '○'}</span>
          )}
          {className === 'md-list' && <span className="md-list__bullet">•</span>}
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
        </div>
      )
    })
  }

  if (!activeNote) {
    return (
      <div className="note-view">
        <div className="note-editor note-editor--empty-state">
          <div className="note-editor__empty">
            <div className="note-editor__empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <p>사이드바에서 노트를 선택하거나</p>
            <p>새 노트를 만들어보세요</p>
            <p className="note-editor__empty-sub">[[링크]] 문법으로 노트를 연결할 수 있습니다</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="note-view">
      <div className="note-editor">
        {/* Toolbar */}
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
              className={`note-editor__action-btn ${mode === 'preview' ? 'note-editor__action-btn--active' : ''}`}
              onClick={() => setMode(mode === 'edit' ? 'preview' : 'edit')}
              title={mode === 'edit' ? '미리보기' : '편집'}
            >
              {mode === 'edit' ? (
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
            </button>
            <button className="note-editor__action-btn" onClick={insertLink} title="링크 삽입 (Ctrl+[)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </button>
            <button className="note-editor__action-btn" onClick={() => onSwitchToGraph(activeNote.id)} title="그래프에서 보기">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="4" />
              </svg>
            </button>
            <button className="note-editor__action-btn note-editor__action-btn--danger" onClick={handleDelete} title="삭제">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          </div>
        </div>

        {/* Title — large, editable */}
        <input
          className="note-editor__title"
          value={activeNote.label}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="제목 없음"
        />

        {/* Meta */}
        <div className="note-editor__meta">
          <span className="note-editor__date">
            {new Date(activeNote.createdAt).toLocaleDateString('ko-KR', {
              year: 'numeric', month: 'long', day: 'numeric',
            })}
          </span>
          <span className="note-editor__meta-sep">·</span>
          <span className="note-editor__word-count">
            {activeNote.description.trim() ? activeNote.description.trim().split(/\s+/).length : 0}자
          </span>
        </div>

        {/* Tags */}
        <div className="note-editor__tags">
          {activeNote.tags.map(tag => (
            <span key={tag} className="note-editor__tag" onClick={() => handleRemoveTag(tag)}>
              #{tag} ✕
            </span>
          ))}
          <TagInput onAdd={handleAddTag} />
        </div>

        {/* Editor body */}
        <div className="note-editor__body-wrapper">
          {mode === 'edit' ? (
            <textarea
              ref={bodyRef}
              className="note-editor__body"
              value={activeNote.description}
              onChange={(e) => handleDescChange(e.target.value)}
              onKeyDown={handleBodyKeyDown}
              placeholder={'여기에 내용을 작성하세요...\n\n마크다운 문법 지원:\n# 제목  ## 소제목  ### 소소제목\n**굵게**  *기울임*  `코드`\n- 목록\n- [ ] 할일\n> 인용\n[[다른 노트]] 로 링크\n--- 구분선'}
            />
          ) : (
            <div className="note-editor__preview" onClick={() => setMode('edit')}>
              {activeNote.description.trim() ? (
                renderDescription(activeNote.description)
              ) : (
                <div className="note-editor__preview-empty">
                  <p>클릭하여 내용을 작성하세요</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Backlinks / Connected notes */}
        {(connectedNotes.length > 0 || backlinks.length > 0) && (
          <div className="note-editor__links">
            {connectedNotes.length > 0 && (
              <div className="note-editor__links-section">
                <div className="note-editor__links-title">
                  연결된 노트 ({connectedNotes.length})
                </div>
                <div className="note-editor__links-list">
                  {connectedNotes.map(cn => (
                    <button
                      key={cn.id}
                      className="note-editor__link"
                      onClick={() => dispatch({ type: 'SET_SELECTED', nodeId: cn.id })}
                    >
                      <span className="note-editor__link-dot" style={{ background: cn.description.trim() ? NODE_COLORS[cn.type] : '#4a4a5a' }} />
                      {cn.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {backlinks.length > 0 && (
              <div className="note-editor__links-section">
                <div className="note-editor__links-title note-editor__links-title--backlinks">
                  백링크 ({backlinks.length})
                </div>
                <div className="note-editor__links-list">
                  {backlinks.map(bl => (
                    <button
                      key={bl.id}
                      className="note-editor__link"
                      onClick={() => dispatch({ type: 'SET_SELECTED', nodeId: bl.id })}
                    >
                      <span className="note-editor__link-dot" style={{ background: bl.description.trim() ? NODE_COLORS[bl.type] : '#4a4a5a' }} />
                      {bl.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
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
    return <button className="note-editor__add-tag" onClick={() => setIsOpen(true)}>+ 태그</button>
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
