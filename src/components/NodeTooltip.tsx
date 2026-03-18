import { useState } from 'react'
import { useGraphState, useGraphDispatch } from '../state/GraphContext'
import { worldToScreen } from '../canvas/viewport'
import { generateBranches } from '../utils/generateBranches'
import type { NodeType } from '../types/graph'
import { NODE_COLORS, EMPTY_NODE_COLOR } from '../types/graph'

const NODE_TYPE_LABELS: Record<NodeType, string> = {
  work: '업무',
  personal: '개인',
  task: '할일',
  idea: '아이디어',
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

  if (!selectedNodeId) return null

  const node = nodes.find((n) => n.id === selectedNodeId)
  if (!node) return null

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

  const handleGenerateBranches = () => {
    const { nodes: newNodes, edges: newEdges } = generateBranches(node.label, node.x, node.y)
    const branches = newNodes.slice(1)
    const rootEdges = newEdges
      .filter(e => e.source === newNodes[0].id)
      .map(e => ({ ...e, source: node.id }))

    dispatch({ type: 'BATCH_ADD', nodes: branches, edges: rootEdges })
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

      <div className="node-tooltip__actions">
        <button className="node-tooltip__btn node-tooltip__btn--branch" onClick={handleGenerateBranches}>
          연관 노드
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
