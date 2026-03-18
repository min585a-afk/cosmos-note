import { useState, useMemo, useRef, useEffect } from 'react'
import { useSkillTreeState, useSkillTreeDispatch } from '../state/SkillTreeContext'
import { generateSuggestions } from '../utils/skillTreeAI'
import type { SkillNode, SkillNodeStatus } from '../types/skillTree'

// Layout constants
const NODE_W = 180
const NODE_H = 56
const GAP_X = 40
const GAP_Y = 80
const CANVAS_PAD = 60

interface LayoutNode extends SkillNode {
  lx: number
  ly: number
}

function layoutTree(nodes: SkillNode[]): LayoutNode[] {
  if (nodes.length === 0) return []

  const byDepth = new Map<number, SkillNode[]>()
  for (const n of nodes) {
    const arr = byDepth.get(n.depth) || []
    arr.push(n)
    byDepth.set(n.depth, arr)
  }

  const result: LayoutNode[] = []
  const maxDepth = Math.max(...Array.from(byDepth.keys()))

  for (let d = 0; d <= maxDepth; d++) {
    const row = byDepth.get(d) || []
    const totalWidth = row.length * NODE_W + (row.length - 1) * GAP_X
    const startX = -totalWidth / 2 + NODE_W / 2

    row.forEach((node, i) => {
      result.push({
        ...node,
        lx: startX + i * (NODE_W + GAP_X),
        ly: d * (NODE_H + GAP_Y),
      })
    })
  }

  return result
}

const STATUS_COLORS: Record<SkillNodeStatus, string> = {
  completed: '#00ff87',
  active: '#bf5af2',
  locked: '#4a4a5a',
  skipped: '#2a2a35',
}

const STATUS_LABELS: Record<SkillNodeStatus, string> = {
  completed: '완료',
  active: '진행중',
  locked: '잠김',
  skipped: '미선택',
}

function SkillTreeCanvas({ treeId }: { treeId: string }) {
  const state = useSkillTreeState()
  const dispatch = useSkillTreeDispatch()
  const tree = state.trees.find(t => t.id === treeId)
  const [showSuggestions, setShowSuggestions] = useState<string | null>(null)
  const [editingNode, setEditingNode] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  const layoutNodes = useMemo(() => tree ? layoutTree(tree.nodes) : [], [tree])

  // Auto-scroll to bottom when new nodes added
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [layoutNodes.length])

  if (!tree) return null

  // Calculate SVG viewBox
  const allX = layoutNodes.map(n => n.lx)
  const allY = layoutNodes.map(n => n.ly)
  const minX = allX.length > 0 ? Math.min(...allX) - NODE_W / 2 - CANVAS_PAD : -200
  const maxX = allX.length > 0 ? Math.max(...allX) + NODE_W / 2 + CANVAS_PAD : 200
  const minY = allY.length > 0 ? Math.min(...allY) - NODE_H / 2 - CANVAS_PAD : -50
  const maxY = allY.length > 0 ? Math.max(...allY) + NODE_H / 2 + CANVAS_PAD + 80 : 200

  const svgW = maxX - minX
  const svgH = maxY - minY

  const nodeById = new Map(layoutNodes.map(n => [n.id, n]))

  // Get active leaf nodes (no children)
  const activeLeaves = layoutNodes.filter(n => {
    if (n.status !== 'active') return false
    return !layoutNodes.some(c => c.parentId === n.id)
  })

  // Handle suggestion generation
  const handleGenerateBranches = (nodeId: string) => {
    const node = tree.nodes.find(n => n.id === nodeId)
    if (!node) return

    // Check if branches already exist
    const hasChildren = tree.nodes.some(n => n.parentId === nodeId)
    if (hasChildren) return

    const siblingLabels = tree.nodes
      .filter(n => n.parentId === node.parentId)
      .map(n => n.label)

    const suggestions = generateSuggestions(node.label, node.description, node.depth, siblingLabels)
    dispatch({
      type: 'ADD_BRANCH_NODES',
      treeId,
      parentId: nodeId,
      nodes: suggestions,
    })
    setShowSuggestions(nodeId)
  }

  const handleSelectPath = (nodeId: string) => {
    dispatch({ type: 'SELECT_PATH', treeId, nodeId })
    setShowSuggestions(null)
  }

  const handleCompleteNode = (nodeId: string) => {
    dispatch({ type: 'COMPLETE_NODE', treeId, nodeId })
  }

  const startEdit = (nodeId: string, label: string) => {
    setEditingNode(nodeId)
    setEditValue(label)
  }

  const saveEdit = () => {
    if (editingNode && editValue.trim()) {
      dispatch({
        type: 'UPDATE_SKILL_NODE',
        treeId,
        nodeId: editingNode,
        updates: { label: editValue.trim() },
      })
    }
    setEditingNode(null)
  }

  return (
    <div className="skilltree-canvas" ref={containerRef}>
      <svg
        width={svgW}
        height={svgH}
        viewBox={`${minX} ${minY} ${svgW} ${svgH}`}
        className="skilltree-svg"
      >
        {/* Connection lines */}
        {layoutNodes.map(node => {
          if (!node.parentId) return null
          const parent = nodeById.get(node.parentId)
          if (!parent) return null

          const isActive = node.status === 'active' || node.status === 'completed'
          const isSkipped = node.status === 'skipped'

          return (
            <g key={`edge-${node.id}`}>
              {/* Glow effect for active paths */}
              {isActive && (
                <line
                  x1={parent.lx}
                  y1={parent.ly + NODE_H / 2}
                  x2={node.lx}
                  y2={node.ly - NODE_H / 2}
                  stroke={STATUS_COLORS[node.status]}
                  strokeWidth={4}
                  opacity={0.2}
                  strokeLinecap="round"
                />
              )}
              <line
                x1={parent.lx}
                y1={parent.ly + NODE_H / 2}
                x2={node.lx}
                y2={node.ly - NODE_H / 2}
                stroke={isSkipped ? '#1a1a25' : STATUS_COLORS[node.status]}
                strokeWidth={isActive ? 2 : 1}
                opacity={isSkipped ? 0.3 : 0.6}
                strokeLinecap="round"
                strokeDasharray={node.status === 'locked' ? '4 4' : undefined}
              />
            </g>
          )
        })}

        {/* Nodes */}
        {layoutNodes.map(node => {
          const isSelected = state.selectedNodeId === node.id
          const color = STATUS_COLORS[node.status]
          const isClickable = node.status === 'locked' || node.status === 'active'

          return (
            <g
              key={node.id}
              className={`skilltree-node skilltree-node--${node.status}`}
              onClick={() => {
                if (node.status === 'locked') {
                  handleSelectPath(node.id)
                } else {
                  dispatch({ type: 'SET_SELECTED_NODE', nodeId: node.id })
                }
              }}
              style={{ cursor: isClickable ? 'pointer' : 'default' }}
            >
              {/* Glow for active */}
              {node.status === 'active' && (
                <rect
                  x={node.lx - NODE_W / 2 - 4}
                  y={node.ly - NODE_H / 2 - 4}
                  width={NODE_W + 8}
                  height={NODE_H + 8}
                  rx={14}
                  fill="none"
                  stroke={color}
                  strokeWidth={1.5}
                  opacity={0.3}
                  className="skilltree-node__glow"
                />
              )}

              {/* Selection highlight */}
              {isSelected && (
                <rect
                  x={node.lx - NODE_W / 2 - 3}
                  y={node.ly - NODE_H / 2 - 3}
                  width={NODE_W + 6}
                  height={NODE_H + 6}
                  rx={13}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth={1}
                  opacity={0.4}
                />
              )}

              {/* Node body */}
              <rect
                x={node.lx - NODE_W / 2}
                y={node.ly - NODE_H / 2}
                width={NODE_W}
                height={NODE_H}
                rx={10}
                fill={node.status === 'skipped' ? '#15151f' : 'rgba(12, 14, 24, 0.9)'}
                stroke={color}
                strokeWidth={node.status === 'active' ? 1.5 : 0.8}
                opacity={node.status === 'skipped' ? 0.4 : 1}
              />

              {/* Status dot */}
              <circle
                cx={node.lx - NODE_W / 2 + 16}
                cy={node.ly - 4}
                r={4}
                fill={color}
                opacity={node.status === 'skipped' ? 0.3 : 0.8}
              />

              {/* Label */}
              {editingNode === node.id ? (
                <foreignObject
                  x={node.lx - NODE_W / 2 + 28}
                  y={node.ly - NODE_H / 2 + 6}
                  width={NODE_W - 36}
                  height={NODE_H - 12}
                >
                  <input
                    autoFocus
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingNode(null) }}
                    onBlur={saveEdit}
                    className="skilltree-node__edit"
                  />
                </foreignObject>
              ) : (
                <>
                  <text
                    x={node.lx - NODE_W / 2 + 28}
                    y={node.ly - 4}
                    fill={node.status === 'skipped' ? '#555' : '#e0e0f0'}
                    fontSize={12}
                    fontWeight={node.status === 'active' ? 600 : 400}
                    fontFamily="'Pretendard Variable', system-ui, sans-serif"
                    onDoubleClick={() => startEdit(node.id, node.label)}
                    style={{ cursor: 'text' }}
                  >
                    {node.label.length > 14 ? node.label.slice(0, 14) + '...' : node.label}
                  </text>
                  <text
                    x={node.lx - NODE_W / 2 + 28}
                    y={node.ly + 14}
                    fill={node.status === 'skipped' ? '#333' : '#7777a0'}
                    fontSize={9}
                    fontFamily="'Pretendard Variable', system-ui, sans-serif"
                  >
                    {STATUS_LABELS[node.status]}
                  </text>
                </>
              )}

              {/* Completed checkmark */}
              {node.status === 'completed' && (
                <text
                  x={node.lx + NODE_W / 2 - 20}
                  y={node.ly + 4}
                  fill="#00ff87"
                  fontSize={14}
                  textAnchor="middle"
                >
                  ✓
                </text>
              )}
            </g>
          )
        })}
      </svg>

      {/* Action buttons for active leaf nodes */}
      {activeLeaves.map(node => {
        const hasChildren = tree.nodes.some(n => n.parentId === node.id)
        if (hasChildren) return null

        return (
          <div
            key={`action-${node.id}`}
            className="skilltree-action"
            style={{
              left: `calc(50% + ${node.lx}px - 80px)`,
              top: node.ly + NODE_H / 2 + CANVAS_PAD + 16,
            }}
          >
            <button
              className="skilltree-action__btn skilltree-action__btn--ai"
              onClick={() => handleGenerateBranches(node.id)}
            >
              AI 분석
            </button>
            <button
              className="skilltree-action__btn skilltree-action__btn--complete"
              onClick={() => handleCompleteNode(node.id)}
            >
              완료
            </button>
          </div>
        )
      })}
    </div>
  )
}

export function SkillTreeView() {
  const state = useSkillTreeState()
  const dispatch = useSkillTreeDispatch()
  const [newTreeName, setNewTreeName] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [rootInput, setRootInput] = useState('')
  const [showRootInput, setShowRootInput] = useState(false)

  const activeTree = state.trees.find(t => t.id === state.activeTreeId)

  const handleCreateTree = () => {
    if (!newTreeName.trim()) return
    dispatch({ type: 'CREATE_TREE', name: newTreeName.trim() })
    setNewTreeName('')
    setShowCreate(false)
    setShowRootInput(true)
  }

  const handleAddRoot = () => {
    if (!rootInput.trim() || !state.activeTreeId) return
    dispatch({
      type: 'ADD_ROOT_NODE',
      treeId: state.activeTreeId,
      label: rootInput.trim(),
      description: '',
    })
    setRootInput('')
    setShowRootInput(false)
  }

  // Selected node detail panel
  const selectedNode = activeTree?.nodes.find(n => n.id === state.selectedNodeId)

  return (
    <div className="skilltree-view">
      {/* Left: tree list */}
      <div className="skilltree-sidebar">
        <div className="skilltree-sidebar__header">
          <h3>프로젝트 플랜</h3>
          <button
            className="skilltree-sidebar__add"
            onClick={() => setShowCreate(true)}
            title="새 스킬트리"
          >
            +
          </button>
        </div>

        {showCreate && (
          <div className="skilltree-sidebar__create">
            <input
              autoFocus
              placeholder="프로젝트 이름..."
              value={newTreeName}
              onChange={e => setNewTreeName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleCreateTree()
                if (e.key === 'Escape') setShowCreate(false)
              }}
              className="skilltree-sidebar__input"
            />
          </div>
        )}

        <div className="skilltree-sidebar__list">
          {state.trees.map(tree => {
            const completedCount = tree.nodes.filter(n => n.status === 'completed').length
            const totalActive = tree.nodes.filter(n => n.status !== 'skipped').length

            return (
              <button
                key={tree.id}
                className={`skilltree-sidebar__item ${state.activeTreeId === tree.id ? 'skilltree-sidebar__item--active' : ''}`}
                onClick={() => dispatch({ type: 'SET_ACTIVE_TREE', treeId: tree.id })}
              >
                <span className="skilltree-sidebar__item-icon">🌳</span>
                <div className="skilltree-sidebar__item-info">
                  <span className="skilltree-sidebar__item-name">{tree.name}</span>
                  <span className="skilltree-sidebar__item-progress">
                    {completedCount}/{totalActive} 단계
                  </span>
                </div>
                <button
                  className="skilltree-sidebar__item-delete"
                  onClick={(e) => {
                    e.stopPropagation()
                    dispatch({ type: 'DELETE_TREE', treeId: tree.id })
                  }}
                  title="삭제"
                >
                  ×
                </button>
              </button>
            )
          })}
        </div>

        {state.trees.length === 0 && !showCreate && (
          <div className="skilltree-sidebar__empty">
            프로젝트 계획을 만들어보세요.
            <br />
            목표를 입력하면 AI가 단계별 대안을 제시합니다.
          </div>
        )}
      </div>

      {/* Center: skill tree canvas */}
      <div className="skilltree-main">
        {activeTree ? (
          <>
            <div className="skilltree-main__header">
              <h2>{activeTree.name}</h2>
              <span className="skilltree-main__meta">
                {activeTree.nodes.filter(n => n.status === 'completed').length} 완료
                {' / '}
                {activeTree.nodes.filter(n => n.status !== 'skipped').length} 단계
              </span>
            </div>

            {activeTree.nodes.length === 0 ? (
              <div className="skilltree-empty">
                {showRootInput ? (
                  <div className="skilltree-empty__input-wrap">
                    <p>첫 번째 목표를 입력하세요</p>
                    <input
                      autoFocus
                      className="skilltree-empty__input"
                      placeholder="예: 앱 디자인 완성하기"
                      value={rootInput}
                      onChange={e => setRootInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleAddRoot()
                        if (e.key === 'Escape') setShowRootInput(false)
                      }}
                    />
                    <button className="skilltree-empty__btn" onClick={handleAddRoot}>
                      시작
                    </button>
                  </div>
                ) : (
                  <button
                    className="skilltree-empty__start"
                    onClick={() => setShowRootInput(true)}
                  >
                    <span className="skilltree-empty__icon">🎯</span>
                    <span>목표 설정하기</span>
                  </button>
                )}
              </div>
            ) : (
              <SkillTreeCanvas treeId={activeTree.id} />
            )}
          </>
        ) : (
          <div className="skilltree-placeholder">
            <div className="skilltree-placeholder__icon">🌌</div>
            <h3>스킬트리 뷰</h3>
            <p>프로젝트의 계획을 게임 스킬트리처럼 관리하세요.</p>
            <p>왼쪽에서 새 프로젝트를 만들거나 선택하세요.</p>
          </div>
        )}
      </div>

      {/* Right: node detail */}
      {selectedNode && activeTree && (
        <div className="skilltree-detail">
          <div className="skilltree-detail__header">
            <span
              className="skilltree-detail__status"
              style={{ background: STATUS_COLORS[selectedNode.status] }}
            />
            <span className="skilltree-detail__status-label">
              {STATUS_LABELS[selectedNode.status]}
            </span>
          </div>
          <h3 className="skilltree-detail__title">{selectedNode.label}</h3>
          <textarea
            className="skilltree-detail__desc"
            value={selectedNode.description}
            onChange={e =>
              dispatch({
                type: 'UPDATE_SKILL_NODE',
                treeId: activeTree.id,
                nodeId: selectedNode.id,
                updates: { description: e.target.value },
              })
            }
            placeholder="이 단계에 대한 메모를 작성하세요..."
            rows={6}
          />

          {/* Show children (branches) */}
          {(() => {
            const children = activeTree.nodes.filter(n => n.parentId === selectedNode.id)
            if (children.length === 0) return null
            return (
              <div className="skilltree-detail__branches">
                <div className="skilltree-detail__branches-label">분기 옵션</div>
                {children.map(child => (
                  <div
                    key={child.id}
                    className={`skilltree-detail__branch skilltree-detail__branch--${child.status}`}
                    onClick={() => {
                      if (child.status === 'locked') {
                        dispatch({ type: 'SELECT_PATH', treeId: activeTree.id, nodeId: child.id })
                      }
                    }}
                  >
                    <span
                      className="skilltree-detail__branch-dot"
                      style={{ background: STATUS_COLORS[child.status] }}
                    />
                    <div>
                      <div className="skilltree-detail__branch-name">{child.label}</div>
                      <div className="skilltree-detail__branch-desc">{child.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            )
          })()}

          <div className="skilltree-detail__depth">
            Depth: {selectedNode.depth}
          </div>
        </div>
      )}
    </div>
  )
}
