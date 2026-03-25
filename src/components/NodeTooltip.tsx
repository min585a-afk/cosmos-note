import { useState, useMemo } from 'react'
import { useGraphState, useGraphDispatch } from '../state/GraphContext'
import { worldToScreen } from '../canvas/viewport'
import { findRelatedNodes, suggestTags } from '../utils/autoLink'
import { generateId } from '../state/graphReducer'
import type { NodeType, NodeSize, NodeStatus } from '../types/graph'
import { NODE_COLORS, EMPTY_NODE_COLOR } from '../types/graph'

const ICON_OPTIONS = ['🎯', '📚', '💡', '🔥', '⚡', '🎨', '🏠', '💼', '🎮', '🌟', '❤️', '🔑', '📌', '🧩', '🎵', '✈️']
const COLOR_OPTIONS = [null, '#ff2d55', '#ff9500', '#ffcc00', '#00ff87', '#00e5ff', '#bf5af2', '#ff6b9d', '#ffffff']
const STATUS_OPTIONS: { key: NodeStatus; emoji: string; label: string }[] = [
  { key: 'good', emoji: '👍', label: '좋음' },
  { key: 'bad', emoji: '👎', label: '나쁨' },
  { key: 'question', emoji: '❓', label: '질문' },
  { key: 'heart', emoji: '❤️', label: '좋아요' },
  { key: 'star', emoji: '⭐', label: '중요' },
]

const NODE_TYPE_LABELS: Record<NodeType, string> = {
  work: '업무',
  personal: '개인',
  task: '할일',
  idea: '아이디어',
  skill: '스킬',
}

export function NodeTooltip({
  containerWidth,
  containerHeight,
  onReheat,
}: {
  containerWidth: number
  containerHeight: number
  onReheat: () => void
}) {
  const { nodes, edges, selectedNodeId, viewport } = useGraphState()
  const dispatch = useGraphDispatch()
  const [editingField, setEditingField] = useState<'label' | 'description' | null>(null)
  const [editValue, setEditValue] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [showTagInput, setShowTagInput] = useState(false)
  const [showRelated, setShowRelated] = useState(false)

  const node = selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) : null

  // All hooks MUST be called before any early return (Rules of Hooks)
  const relatedNodes = useMemo(() =>
    (showRelated && node) ? findRelatedNodes(node, nodes, edges, 5) : [],
    [showRelated, node, nodes, edges]
  )

  const tagSuggestions = useMemo(() =>
    node ? suggestTags(node, nodes) : [],
    [node, nodes]
  )

  if (!selectedNodeId || !node) return null

  // Find connected nodes (backlinks)
  const connectedNodes = edges
    .filter(e => e.source === node.id || e.target === node.id)
    .map(e => {
      const otherId = e.source === node.id ? e.target : e.source
      return nodes.find(n => n.id === otherId)
    })
    .filter(Boolean) as typeof nodes

  const vp = {
    ...viewport,
    x: viewport.x + containerWidth / 2,
    y: viewport.y + containerHeight / 2,
  }
  const screen = worldToScreen(node.x, node.y, vp)

  const tooltipWidth = 280
  const tooltipHeight = 260
  let left = screen.x + 24
  let top = screen.y - tooltipHeight / 2

  if (left + tooltipWidth > containerWidth - 20) {
    left = screen.x - tooltipWidth - 24
  }
  top = Math.max(10, Math.min(top, containerHeight - tooltipHeight - 10))

  const startEdit = (field: 'label' | 'description') => {
    setEditingField(field)
    setEditValue(field === 'label' ? node.label : node.description)
  }

  const saveEdit = () => {
    if (!editingField) return
    dispatch({
      type: 'UPDATE_NODE',
      nodeId: node.id,
      updates: { [editingField]: editValue },
    })
    setEditingField(null)
  }

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) saveEdit()
    if (e.key === 'Escape') setEditingField(null)
  }

  const cycleType = () => {
    const types: NodeType[] = ['idea', 'work', 'task', 'personal']
    const idx = types.indexOf(node.type)
    const next = types[(idx + 1) % types.length]
    dispatch({ type: 'UPDATE_NODE', nodeId: node.id, updates: { type: next } })
  }

  const handleConnectRelated = (targetId: string) => {
    dispatch({
      type: 'ADD_EDGE',
      edge: { id: generateId(), source: node.id, target: targetId },
    })
    onReheat()
  }

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const tag = tagInput.trim()
      if (tag && !node.tags.includes(tag)) {
        dispatch({
          type: 'UPDATE_NODE',
          nodeId: node.id,
          updates: { tags: [...node.tags, tag] },
        })
      }
      setTagInput('')
      setShowTagInput(false)
    }
    if (e.key === 'Escape') {
      setTagInput('')
      setShowTagInput(false)
    }
  }

  const handleRemoveTag = (tag: string) => {
    dispatch({
      type: 'UPDATE_NODE',
      nodeId: node.id,
      updates: { tags: node.tags.filter(t => t !== tag) },
    })
  }

  const navigateToNode = (nodeId: string) => {
    const target = nodes.find(n => n.id === nodeId)
    if (target) {
      dispatch({ type: 'SET_SELECTED', nodeId })
      dispatch({ type: 'SET_VIEWPORT', viewport: { x: -target.x, y: -target.y, scale: 1.2 } })
    }
  }

  return (
    <div
      className="node-tooltip"
      style={{ left, top, width: tooltipWidth }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="node-tooltip__header">
        <div className="node-tooltip__bar" style={{ background: node.description.trim() ? NODE_COLORS[node.type] : EMPTY_NODE_COLOR }} />
        <span className="node-tooltip__node-kind">{node.radius >= 14 ? '🪐' : '✦'}</span>
        <button className="node-tooltip__type-btn" onClick={cycleType} title="타입 변경">
          {NODE_TYPE_LABELS[node.type]}
        </button>
        <span className="node-tooltip__date">
          {new Date(node.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
        </span>
      </div>

      {editingField === 'label' ? (
        <input
          autoFocus
          className="node-tooltip__edit-input"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleEditKeyDown}
          onBlur={saveEdit}
        />
      ) : (
        <div className="node-tooltip__title" onClick={() => startEdit('label')} title="클릭하여 수정">
          {node.label}
        </div>
      )}

      {editingField === 'description' ? (
        <textarea
          autoFocus
          className="node-tooltip__edit-textarea"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleEditKeyDown}
          onBlur={saveEdit}
          rows={5}
          placeholder="메모를 입력하세요... (Shift+Enter: 줄바꿈)"
        />
      ) : (
        <div
          className="node-tooltip__desc"
          onClick={() => startEdit('description')}
          title="클릭하여 수정"
        >
          {node.description || '클릭하여 메모를 작성하세요. 내용을 적으면 색상이 활성화됩니다.'}
        </div>
      )}

      {/* Tags */}
      <div className="node-tooltip__tags">
        {node.tags.map((tag) => (
          <span key={tag} className="node-tooltip__tag" onClick={() => handleRemoveTag(tag)} title="클릭하여 삭제">
            {tag}
          </span>
        ))}
        {showTagInput ? (
          <input
            autoFocus
            className="node-tooltip__tag-input"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleAddTag}
            onBlur={() => { setShowTagInput(false); setTagInput('') }}
            placeholder="태그..."
          />
        ) : (
          <button className="node-tooltip__add-tag" onClick={() => setShowTagInput(true)}>
            + 태그
          </button>
        )}
      </div>

      {/* Tag suggestions */}
      {tagSuggestions.length > 0 && (
        <div className="node-tooltip__tag-suggest">
          <span className="node-tooltip__tag-suggest-label">추천 태그:</span>
          {tagSuggestions.map(tag => (
            <button
              key={tag}
              className="node-tooltip__tag-suggest-btn"
              onClick={() => dispatch({ type: 'UPDATE_NODE', nodeId: node.id, updates: { tags: [...node.tags, tag] } })}
            >
              +{tag}
            </button>
          ))}
        </div>
      )}

      {/* Backlinks / Connected nodes */}
      {connectedNodes.length > 0 ? (
        <div className="node-tooltip__backlinks">
          <div className="node-tooltip__backlinks-label">연결된 노드</div>
          <div className="node-tooltip__backlinks-list">
            {connectedNodes.map(cn => (
              <button
                key={cn.id}
                className="node-tooltip__backlink"
                onClick={() => navigateToNode(cn.id)}
              >
                <span className="node-tooltip__backlink-dot" style={{ background: cn.color }} />
                {cn.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="node-tooltip__no-links">
          연결된 노트가 없습니다. 태그나 [[위키링크]]를 추가하면 자동으로 연결됩니다.
        </div>
      )}

      {/* Related nodes panel */}
      {showRelated && relatedNodes.length > 0 && (
        <div className="node-tooltip__related">
          <div className="node-tooltip__related-label">연관 노트 추천</div>
          {relatedNodes.map(r => (
            <div key={r.node.id} className="node-tooltip__related-item">
              <button className="node-tooltip__related-link" onClick={() => navigateToNode(r.node.id)}>
                <span className="node-tooltip__backlink-dot" style={{ background: r.node.color }} />
                {r.node.label}
              </button>
              <span className="node-tooltip__related-reason">{r.reason}</span>
              <button className="node-tooltip__related-connect" onClick={() => handleConnectRelated(r.node.id)} title="연결하기">
                +
              </button>
            </div>
          ))}
        </div>
      )}
      {showRelated && relatedNodes.length === 0 && (
        <div className="node-tooltip__no-links">연관 노트가 없습니다.</div>
      )}

      {/* Customization: Size / Icon / Color */}
      <div className="node-tooltip__customize">
        <div className="node-tooltip__custom-row">
          <span className="node-tooltip__custom-label">크기</span>
          <div className="node-tooltip__size-options">
            {([1, 2, 3, 4, 5] as NodeSize[]).map(s => (
              <button
                key={s}
                className={`node-tooltip__size-btn ${node.size === s ? 'node-tooltip__size-btn--active' : ''}`}
                onClick={() => dispatch({ type: 'UPDATE_NODE', nodeId: node.id, updates: { size: s } })}
                style={{ width: 6 + s * 5, height: 6 + s * 5 }}
                title={`크기 ${s}`}
              />
            ))}
          </div>
        </div>
        <div className="node-tooltip__custom-row">
          <span className="node-tooltip__custom-label">아이콘</span>
          <div className="node-tooltip__icon-grid">
            {ICON_OPTIONS.map(emoji => (
              <button
                key={emoji}
                className={`node-tooltip__icon-btn ${node.icon === emoji ? 'node-tooltip__icon-btn--active' : ''}`}
                onClick={() => dispatch({ type: 'UPDATE_NODE', nodeId: node.id, updates: { icon: node.icon === emoji ? undefined : emoji } })}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
        <div className="node-tooltip__custom-row">
          <span className="node-tooltip__custom-label">색상</span>
          <div className="node-tooltip__color-grid">
            {COLOR_OPTIONS.map((c, i) => (
              <button
                key={i}
                className={`node-tooltip__color-btn ${(c === null ? !node.customColor : node.customColor === c) ? 'node-tooltip__color-btn--active' : ''}`}
                onClick={() => dispatch({ type: 'UPDATE_NODE', nodeId: node.id, updates: { customColor: c ?? undefined } })}
                style={{ background: c ?? NODE_COLORS[node.type] }}
                title={c === null ? '자동' : c}
              />
            ))}
          </div>
        </div>
        <div className="node-tooltip__custom-row">
          <span className="node-tooltip__custom-label">상태</span>
          <div className="node-tooltip__status-options">
            {STATUS_OPTIONS.map(s => {
              const isActive = node.statuses?.includes(s.key)
              return (
                <button
                  key={s.key}
                  className={`node-tooltip__status-btn ${isActive ? 'node-tooltip__status-btn--active' : ''}`}
                  onClick={() => {
                    const current = node.statuses ?? []
                    const next = isActive
                      ? current.filter(x => x !== s.key)
                      : [...current, s.key]
                    dispatch({ type: 'UPDATE_NODE', nodeId: node.id, updates: { statuses: next } })
                  }}
                  title={s.label}
                >
                  {s.emoji}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="node-tooltip__actions">
        <button
          className={`node-tooltip__btn node-tooltip__btn--branch ${showRelated ? 'node-tooltip__btn--active' : ''}`}
          onClick={() => setShowRelated(!showRelated)}
        >
          연관 노트
        </button>
        <button
          className="node-tooltip__btn"
          onClick={() => dispatch({ type: 'REMOVE_NODE', nodeId: node.id })}
        >
          삭제
        </button>
        <button
          className="node-tooltip__btn"
          onClick={() => dispatch({ type: 'SET_SELECTED', nodeId: null })}
        >
          닫기
        </button>
      </div>
    </div>
  )
}
