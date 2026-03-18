import { useState } from 'react'
import { useGraphState, useGraphDispatch } from '../state/GraphContext'
import { worldToScreen } from '../canvas/viewport'
import { generateBranches } from '../utils/generateBranches'
import type { NodeType } from '../types/graph'

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
  const { nodes, selectedNodeId, viewport } = useGraphState()
  const dispatch = useGraphDispatch()
  const [editingField, setEditingField] = useState<'label' | 'description' | null>(null)
  const [editValue, setEditValue] = useState('')

  if (!selectedNodeId) return null

  const node = nodes.find((n) => n.id === selectedNodeId)
  if (!node) return null

  const vp = {
    ...viewport,
    x: viewport.x + containerWidth / 2,
    y: viewport.y + containerHeight / 2,
  }
  const screen = worldToScreen(node.x, node.y, vp)

  const tooltipWidth = 260
  const tooltipHeight = 200
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
    if (e.key === 'Enter') saveEdit()
    if (e.key === 'Escape') setEditingField(null)
  }

  const cycleType = () => {
    const types: NodeType[] = ['idea', 'work', 'task', 'personal']
    const idx = types.indexOf(node.type)
    const next = types[(idx + 1) % types.length]
    dispatch({ type: 'UPDATE_NODE', nodeId: node.id, updates: { type: next } })
  }

  const handleGenerateBranches = () => {
    const { nodes: newNodes, edges } = generateBranches(node.label, node.x, node.y)
    // Remove the root node (same label), keep only branches
    const branches = newNodes.slice(1)
    const branchEdges = edges
      .filter(e => e.source !== newNodes[0].id)
      .concat(
        branches.map((b, i) => ({
          id: `edge-${Date.now()}-${i}`,
          source: node.id,
          target: b.id,
        }))
      )
    // Connect branches to the current node instead
    const rootEdges = edges
      .filter(e => e.source === newNodes[0].id)
      .map(e => ({ ...e, source: node.id }))

    dispatch({ type: 'BATCH_ADD', nodes: branches, edges: rootEdges.length ? rootEdges : branchEdges })
    onReheat()
  }

  return (
    <div
      className="node-tooltip"
      style={{ left, top, width: tooltipWidth }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="node-tooltip__header">
        <div className="node-tooltip__bar" style={{ background: node.color }} />
        <button className="node-tooltip__type-btn" onClick={cycleType} title="타입 변경">
          {NODE_TYPE_LABELS[node.type]}
        </button>
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
          rows={2}
        />
      ) : (
        <div
          className="node-tooltip__desc"
          onClick={() => startEdit('description')}
          title="클릭하여 수정"
        >
          {node.description || '설명을 추가하세요...'}
        </div>
      )}

      {node.tags.length > 0 && (
        <div className="node-tooltip__tags">
          {node.tags.map((tag) => (
            <span key={tag} className="node-tooltip__tag">{tag}</span>
          ))}
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
