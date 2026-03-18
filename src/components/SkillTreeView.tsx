import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useSkillTreeState, useSkillTreeDispatch } from '../state/SkillTreeContext'
import { useGraphDispatch } from '../state/GraphContext'
import { generateSuggestions, generatePathSummary } from '../utils/skillTreeAI'
import { createNode, generateId } from '../state/graphReducer'
import type { SkillNode, SkillNodeStatus, GameSkill } from '../types/skillTree'

// ===== Layout =====
const NODE_W = 180
const NODE_H = 56
const GAP_X = 32
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
  locked: '선택 가능',
  skipped: '미선택',
}

// ===== Analysis Tree Canvas =====
function AnalysisTreeCanvas({ treeId, onExportToGraph }: { treeId: string; onExportToGraph: () => void }) {
  const state = useSkillTreeState()
  const dispatch = useSkillTreeDispatch()
  const tree = state.trees.find(t => t.id === treeId)
  const [editingNode, setEditingNode] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  const layoutNodes = useMemo(() => tree ? layoutTree(tree.nodes) : [], [tree])

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [layoutNodes.length])

  if (!tree) return null

  const allX = layoutNodes.map(n => n.lx)
  const allY = layoutNodes.map(n => n.ly)
  const minX = allX.length > 0 ? Math.min(...allX) - NODE_W / 2 - CANVAS_PAD : -200
  const maxX = allX.length > 0 ? Math.max(...allX) + NODE_W / 2 + CANVAS_PAD : 200
  const minY = allY.length > 0 ? Math.min(...allY) - NODE_H / 2 - CANVAS_PAD : -50
  const maxY = allY.length > 0 ? Math.max(...allY) + NODE_H / 2 + CANVAS_PAD + 100 : 200
  const svgW = maxX - minX
  const svgH = maxY - minY

  const nodeById = new Map(layoutNodes.map(n => [n.id, n]))

  const activeLeaves = layoutNodes.filter(n => {
    if (n.status !== 'active') return false
    return !layoutNodes.some(c => c.parentId === n.id)
  })

  const handleGenerateBranches = (nodeId: string) => {
    const node = tree.nodes.find(n => n.id === nodeId)
    if (!node) return
    if (tree.nodes.some(n => n.parentId === nodeId)) return

    const siblingLabels = tree.nodes.filter(n => n.parentId === node.parentId).map(n => n.label)
    const suggestions = generateSuggestions(node.label, node.description, node.depth, siblingLabels)
    dispatch({ type: 'ADD_BRANCH_NODES', treeId, parentId: nodeId, nodes: suggestions })
  }

  const handleUndo = (nodeId: string) => {
    dispatch({ type: 'UNDO_PATH', treeId, nodeId })
  }

  const saveEdit = () => {
    if (editingNode && editValue.trim()) {
      dispatch({ type: 'UPDATE_SKILL_NODE', treeId, nodeId: editingNode, updates: { label: editValue.trim() } })
    }
    setEditingNode(null)
  }

  // Check if all active paths are completed
  const allCompleted = tree.nodes.length > 0 &&
    tree.nodes.filter(n => n.status === 'active').length === 0 &&
    tree.nodes.filter(n => n.status === 'completed').length > 0

  return (
    <div className="skilltree-canvas" ref={containerRef}>
      <svg width={svgW} height={svgH} viewBox={`${minX} ${minY} ${svgW} ${svgH}`} className="skilltree-svg">
        {/* Lines */}
        {layoutNodes.map(node => {
          if (!node.parentId) return null
          const parent = nodeById.get(node.parentId)
          if (!parent) return null
          const isActive = node.status === 'active' || node.status === 'completed'
          const isSkipped = node.status === 'skipped'

          return (
            <g key={`edge-${node.id}`}>
              {isActive && (
                <line x1={parent.lx} y1={parent.ly + NODE_H / 2} x2={node.lx} y2={node.ly - NODE_H / 2}
                  stroke={STATUS_COLORS[node.status]} strokeWidth={4} opacity={0.2} strokeLinecap="round" />
              )}
              <line x1={parent.lx} y1={parent.ly + NODE_H / 2} x2={node.lx} y2={node.ly - NODE_H / 2}
                stroke={isSkipped ? '#1a1a25' : STATUS_COLORS[node.status]}
                strokeWidth={isActive ? 2 : 1}
                opacity={isSkipped ? 0.3 : 0.6} strokeLinecap="round"
                strokeDasharray={node.status === 'locked' ? '4 4' : undefined} />
            </g>
          )
        })}

        {/* Nodes */}
        {layoutNodes.map(node => {
          const isSelected = state.selectedNodeId === node.id
          const color = STATUS_COLORS[node.status]
          const isClickable = node.status === 'locked' || node.status === 'active'

          return (
            <g key={node.id} className={`skilltree-node skilltree-node--${node.status}`}
              onClick={() => {
                if (node.status === 'locked') {
                  dispatch({ type: 'SELECT_PATH', treeId, nodeId: node.id })
                } else {
                  dispatch({ type: 'SET_SELECTED_NODE', nodeId: node.id })
                }
              }}
              style={{ cursor: isClickable ? 'pointer' : 'default' }}>
              {node.status === 'active' && (
                <rect x={node.lx - NODE_W / 2 - 4} y={node.ly - NODE_H / 2 - 4}
                  width={NODE_W + 8} height={NODE_H + 8} rx={14}
                  fill="none" stroke={color} strokeWidth={1.5} opacity={0.3}
                  className="skilltree-node__glow" />
              )}
              {isSelected && (
                <rect x={node.lx - NODE_W / 2 - 3} y={node.ly - NODE_H / 2 - 3}
                  width={NODE_W + 6} height={NODE_H + 6} rx={13}
                  fill="none" stroke="#ffffff" strokeWidth={1} opacity={0.4} />
              )}
              <rect x={node.lx - NODE_W / 2} y={node.ly - NODE_H / 2}
                width={NODE_W} height={NODE_H} rx={10}
                fill={node.status === 'skipped' ? '#15151f' : 'rgba(12, 14, 24, 0.9)'}
                stroke={color} strokeWidth={node.status === 'active' ? 1.5 : 0.8}
                opacity={node.status === 'skipped' ? 0.4 : 1} />
              <circle cx={node.lx - NODE_W / 2 + 16} cy={node.ly - 4} r={4}
                fill={color} opacity={node.status === 'skipped' ? 0.3 : 0.8} />

              {editingNode === node.id ? (
                <foreignObject x={node.lx - NODE_W / 2 + 28} y={node.ly - NODE_H / 2 + 6}
                  width={NODE_W - 36} height={NODE_H - 12}>
                  <input autoFocus value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingNode(null) }}
                    onBlur={saveEdit} className="skilltree-node__edit" />
                </foreignObject>
              ) : (
                <>
                  <text x={node.lx - NODE_W / 2 + 28} y={node.ly - 4}
                    fill={node.status === 'skipped' ? '#555' : '#e0e0f0'}
                    fontSize={12} fontWeight={node.status === 'active' ? 600 : 400}
                    fontFamily="'Pretendard Variable', system-ui, sans-serif"
                    onDoubleClick={() => { setEditingNode(node.id); setEditValue(node.label) }}
                    style={{ cursor: 'text' }}>
                    {node.label.length > 14 ? node.label.slice(0, 14) + '...' : node.label}
                  </text>
                  <text x={node.lx - NODE_W / 2 + 28} y={node.ly + 14}
                    fill={node.status === 'skipped' ? '#333' : '#7777a0'} fontSize={9}
                    fontFamily="'Pretendard Variable', system-ui, sans-serif">
                    {STATUS_LABELS[node.status]}
                  </text>
                </>
              )}

              {node.status === 'completed' && (
                <text x={node.lx + NODE_W / 2 - 20} y={node.ly + 4} fill="#00ff87" fontSize={14} textAnchor="middle">✓</text>
              )}
            </g>
          )
        })}
      </svg>

      {/* Action buttons for active leaves */}
      {activeLeaves.map(node => {
        const hasChildren = tree.nodes.some(n => n.parentId === node.id)
        if (hasChildren) return null
        return (
          <div key={`action-${node.id}`} className="skilltree-action"
            style={{ left: `calc(50% + ${node.lx}px - 100px)`, top: node.ly + NODE_H / 2 + CANVAS_PAD + 16 }}>
            <button className="skilltree-action__btn skilltree-action__btn--ai"
              onClick={() => handleGenerateBranches(node.id)}>⚡ 분석</button>
            <button className="skilltree-action__btn skilltree-action__btn--undo"
              onClick={() => handleUndo(node.id)}>↩ 되돌리기</button>
            <button className="skilltree-action__btn skilltree-action__btn--complete"
              onClick={() => dispatch({ type: 'COMPLETE_NODE', treeId, nodeId: node.id })}>✓ 완료</button>
          </div>
        )
      })}

      {/* Export to Graph button when all completed */}
      {allCompleted && (
        <div className="skilltree-export-banner">
          <span>🎉 분석 완료!</span>
          <button className="skilltree-export-btn" onClick={onExportToGraph}>
            Graph View로 내보내기
          </button>
        </div>
      )}
    </div>
  )
}

// ===== Game Skill Tree =====
const SKILL_CATEGORIES = ['프로그래밍', '디자인', '기획', '마케팅', '커뮤니케이션', '기타']
const LEVEL_COLORS = ['#4a4a5a', '#ff2d55', '#ff9500', '#ffcc00', '#00ff87', '#00e5ff']

function GameSkillTreeView({ treeId }: { treeId: string }) {
  const state = useSkillTreeState()
  const dispatch = useSkillTreeDispatch()
  const tree = state.gameTrees.find(t => t.id === treeId)
  const [addingSkill, setAddingSkill] = useState(false)
  const [newSkillLabel, setNewSkillLabel] = useState('')
  const [newSkillCategory, setNewSkillCategory] = useState(SKILL_CATEGORIES[0])
  const [newSkillParent, setNewSkillParent] = useState<string | null>(null)

  if (!tree) return null

  const byCategory = new Map<string, GameSkill[]>()
  for (const s of tree.skills) {
    const arr = byCategory.get(s.category) || []
    arr.push(s)
    byCategory.set(s.category, arr)
  }

  const handleAddSkill = () => {
    if (!newSkillLabel.trim()) return
    dispatch({
      type: 'ADD_GAME_SKILL',
      treeId,
      skill: {
        label: newSkillLabel.trim(),
        description: '',
        level: 0,
        maxLevel: 5,
        category: newSkillCategory,
        parentId: newSkillParent,
        x: 0, y: 0,
      },
    })
    setNewSkillLabel('')
    setAddingSkill(false)
  }

  return (
    <div className="gametree">
      <div className="gametree__points">
        <span className="gametree__points-label">스킬 포인트</span>
        <span className="gametree__points-value">{tree.totalPoints - tree.usedPoints}</span>
        <span className="gametree__points-total">/ {tree.totalPoints}</span>
      </div>

      <div className="gametree__categories">
        {Array.from(byCategory.entries()).map(([cat, skills]) => (
          <div key={cat} className="gametree__category">
            <div className="gametree__category-name">{cat}</div>
            <div className="gametree__skills">
              {skills.map(skill => {
                const canLevelUp = skill.level < skill.maxLevel && tree.usedPoints < tree.totalPoints
                const canLevelDown = skill.level > 0
                const prereqMet = !skill.parentId || (tree.skills.find(s => s.id === skill.parentId)?.level ?? 0) > 0

                return (
                  <div key={skill.id} className={`gametree__skill ${skill.level > 0 ? 'gametree__skill--active' : ''} ${!prereqMet ? 'gametree__skill--locked' : ''}`}>
                    <div className="gametree__skill-header">
                      <span className="gametree__skill-name">{skill.label}</span>
                      <button className="gametree__skill-remove"
                        onClick={() => dispatch({ type: 'REMOVE_GAME_SKILL', treeId, skillId: skill.id })}>×</button>
                    </div>
                    <div className="gametree__skill-levels">
                      {Array.from({ length: skill.maxLevel }, (_, i) => (
                        <div key={i} className="gametree__skill-pip"
                          style={{ background: i < skill.level ? LEVEL_COLORS[skill.level] : '#1a1a25' }} />
                      ))}
                    </div>
                    <div className="gametree__skill-controls">
                      <button className="gametree__skill-btn"
                        disabled={!canLevelDown}
                        onClick={() => dispatch({ type: 'LEVEL_DOWN_SKILL', treeId, skillId: skill.id })}>−</button>
                      <span className="gametree__skill-level">Lv.{skill.level}</span>
                      <button className="gametree__skill-btn"
                        disabled={!canLevelUp || !prereqMet}
                        onClick={() => dispatch({ type: 'LEVEL_UP_SKILL', treeId, skillId: skill.id })}>+</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {tree.skills.length === 0 && !addingSkill && (
        <div className="gametree__empty">
          스킬을 추가하고 레벨업하세요!<br />
          포인트를 사용하여 스킬을 성장시킬 수 있습니다.
        </div>
      )}

      {addingSkill ? (
        <div className="gametree__add-form">
          <input autoFocus className="gametree__add-input" placeholder="스킬 이름..."
            value={newSkillLabel} onChange={e => setNewSkillLabel(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAddSkill(); if (e.key === 'Escape') setAddingSkill(false) }} />
          <select className="gametree__add-select" value={newSkillCategory}
            onChange={e => setNewSkillCategory(e.target.value)}>
            {SKILL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {tree.skills.length > 0 && (
            <select className="gametree__add-select" value={newSkillParent || ''}
              onChange={e => setNewSkillParent(e.target.value || null)}>
              <option value="">선행 스킬 없음</option>
              {tree.skills.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          )}
          <button className="gametree__add-confirm" onClick={handleAddSkill}>추가</button>
        </div>
      ) : (
        <button className="gametree__add-btn" onClick={() => setAddingSkill(true)}>+ 스킬 추가</button>
      )}
    </div>
  )
}

// ===== Main View =====
export function SkillTreeView() {
  const state = useSkillTreeState()
  const dispatch = useSkillTreeDispatch()
  const graphDispatch = useGraphDispatch()
  const [newTreeName, setNewTreeName] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [rootInput, setRootInput] = useState('')
  const [showRootInput, setShowRootInput] = useState(false)

  const tab = state.activeTab

  const activeTree = state.trees.find(t => t.id === state.activeTreeId)
  const activeGameTree = state.gameTrees.find(t => t.id === state.activeGameTreeId)
  const selectedNode = activeTree?.nodes.find(n => n.id === state.selectedNodeId)

  const handleCreateTree = () => {
    if (!newTreeName.trim()) return
    if (tab === 'analysis') {
      dispatch({ type: 'CREATE_TREE', name: newTreeName.trim() })
      setShowRootInput(true)
    } else {
      dispatch({ type: 'CREATE_GAME_TREE', name: newTreeName.trim() })
    }
    setNewTreeName('')
    setShowCreate(false)
  }

  const handleAddRoot = () => {
    if (!rootInput.trim() || !state.activeTreeId) return
    dispatch({ type: 'ADD_ROOT_NODE', treeId: state.activeTreeId, label: rootInput.trim(), description: '' })
    setRootInput('')
    setShowRootInput(false)
  }

  // Export completed analysis tree to Graph View
  const handleExportToGraph = useCallback(() => {
    if (!activeTree) return

    const completedPath = activeTree.nodes
      .filter(n => n.status === 'completed' || n.status === 'active')
      .sort((a, b) => a.depth - b.depth)

    if (completedPath.length === 0) return

    const summary = generatePathSummary(activeTree.nodes)

    // Create main planet node
    const mainNode = createNode({
      label: activeTree.name,
      type: 'work',
      description: summary,
      tags: ['분석트리'],
      radius: 14,
    })
    graphDispatch({ type: 'ADD_NODE', node: mainNode })

    // Create star nodes for each step
    const angle = (2 * Math.PI) / completedPath.length
    completedPath.forEach((step, i) => {
      const starNode = createNode({
        label: step.label,
        type: 'task',
        description: step.description,
        tags: ['분석트리', activeTree.name],
        radius: 10,
        x: mainNode.x + Math.cos(angle * i) * 150,
        y: mainNode.y + Math.sin(angle * i) * 150,
      })
      graphDispatch({ type: 'ADD_NODE', node: starNode })
      graphDispatch({ type: 'ADD_EDGE', edge: { id: generateId(), source: mainNode.id, target: starNode.id } })
    })
  }, [activeTree, graphDispatch])

  // Sidebar items
  const sidebarItems = tab === 'analysis' ? state.trees : state.gameTrees
  const activeId = tab === 'analysis' ? state.activeTreeId : state.activeGameTreeId

  return (
    <div className="skilltree-view">
      {/* Left sidebar */}
      <div className="skilltree-sidebar">
        {/* Tabs */}
        <div className="skilltree-tabs">
          <button className={`skilltree-tab ${tab === 'analysis' ? 'skilltree-tab--active' : ''}`}
            onClick={() => dispatch({ type: 'SET_TAB', tab: 'analysis' })}>
            🔍 분석트리
          </button>
          <button className={`skilltree-tab ${tab === 'skill' ? 'skilltree-tab--active' : ''}`}
            onClick={() => dispatch({ type: 'SET_TAB', tab: 'skill' })}>
            ⚔️ 스킬트리
          </button>
        </div>

        <div className="skilltree-sidebar__header">
          <h3>{tab === 'analysis' ? '프로젝트 분석' : '나의 스킬'}</h3>
          <button className="skilltree-sidebar__add" onClick={() => setShowCreate(true)} title="새로 만들기">+</button>
        </div>

        {showCreate && (
          <div className="skilltree-sidebar__create">
            <input autoFocus
              placeholder={tab === 'analysis' ? '프로젝트 이름...' : '스킬트리 이름...'}
              value={newTreeName} onChange={e => setNewTreeName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreateTree(); if (e.key === 'Escape') setShowCreate(false) }}
              className="skilltree-sidebar__input" />
          </div>
        )}

        <div className="skilltree-sidebar__list">
          {sidebarItems.map(item => {
            const isActive = activeId === item.id
            let progress = ''
            if (tab === 'analysis') {
              const t = item as typeof state.trees[0]
              const done = t.nodes.filter(n => n.status === 'completed').length
              const total = t.nodes.filter(n => n.status !== 'skipped').length
              progress = `${done}/${total} 단계`
            } else {
              const t = item as typeof state.gameTrees[0]
              progress = `${t.usedPoints}/${t.totalPoints} pts`
            }

            return (
              <button key={item.id}
                className={`skilltree-sidebar__item ${isActive ? 'skilltree-sidebar__item--active' : ''}`}
                onClick={() => {
                  if (tab === 'analysis') dispatch({ type: 'SET_ACTIVE_TREE', treeId: item.id })
                  else dispatch({ type: 'SET_ACTIVE_GAME_TREE', treeId: item.id })
                }}>
                <span className="skilltree-sidebar__item-icon">{tab === 'analysis' ? '🔬' : '⚔️'}</span>
                <div className="skilltree-sidebar__item-info">
                  <span className="skilltree-sidebar__item-name">{item.name}</span>
                  <span className="skilltree-sidebar__item-progress">{progress}</span>
                </div>
                <button className="skilltree-sidebar__item-delete"
                  onClick={e => {
                    e.stopPropagation()
                    if (tab === 'analysis') dispatch({ type: 'DELETE_TREE', treeId: item.id })
                    else dispatch({ type: 'DELETE_GAME_TREE', treeId: item.id })
                  }} title="삭제">×</button>
              </button>
            )
          })}
        </div>

        {sidebarItems.length === 0 && !showCreate && (
          <div className="skilltree-sidebar__empty">
            {tab === 'analysis'
              ? '프로젝트 목표를 입력하면\nAI가 단계별 대안을 제시합니다.'
              : '나의 스킬을 추가하고\n게임처럼 레벨업하세요!'}
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="skilltree-main">
        {tab === 'analysis' ? (
          activeTree ? (
            <>
              <div className="skilltree-main__header">
                <h2>{activeTree.name}</h2>
                <span className="skilltree-main__meta">
                  {activeTree.nodes.filter(n => n.status === 'completed').length} 완료 / {activeTree.nodes.filter(n => n.status !== 'skipped').length} 단계
                </span>
                {activeTree.nodes.length > 0 && (
                  <button className="skilltree-main__export" onClick={handleExportToGraph}>
                    📊 Graph로 내보내기
                  </button>
                )}
              </div>
              {activeTree.nodes.length === 0 ? (
                <div className="skilltree-empty">
                  {showRootInput ? (
                    <div className="skilltree-empty__input-wrap">
                      <p>분석할 목표를 입력하세요</p>
                      <input autoFocus className="skilltree-empty__input"
                        placeholder="예: 앱 디자인 완성하기, 새 프로젝트 기획..."
                        value={rootInput} onChange={e => setRootInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleAddRoot(); if (e.key === 'Escape') setShowRootInput(false) }} />
                      <button className="skilltree-empty__btn" onClick={handleAddRoot}>분석 시작</button>
                    </div>
                  ) : (
                    <button className="skilltree-empty__start" onClick={() => setShowRootInput(true)}>
                      <span className="skilltree-empty__icon">🎯</span>
                      <span>목표 설정하기</span>
                    </button>
                  )}
                </div>
              ) : (
                <AnalysisTreeCanvas treeId={activeTree.id} onExportToGraph={handleExportToGraph} />
              )}
            </>
          ) : (
            <div className="skilltree-placeholder">
              <div className="skilltree-placeholder__icon">🔍</div>
              <h3>분석트리</h3>
              <p>목표를 입력하면 AI가 단계별 대안을 제시합니다.</p>
              <p>경로를 선택하며 프로젝트의 방향을 결정하세요.</p>
              <p className="skilltree-placeholder__hint">완료 후 Graph View로 내보내기 가능!</p>
            </div>
          )
        ) : (
          activeGameTree ? (
            <>
              <div className="skilltree-main__header">
                <h2>{activeGameTree.name}</h2>
                <span className="skilltree-main__meta">
                  {activeGameTree.usedPoints}/{activeGameTree.totalPoints} 포인트 사용
                </span>
              </div>
              <GameSkillTreeView treeId={activeGameTree.id} />
            </>
          ) : (
            <div className="skilltree-placeholder">
              <div className="skilltree-placeholder__icon">⚔️</div>
              <h3>스킬트리</h3>
              <p>나의 스킬을 노드로 만들어 게임처럼 관리하세요.</p>
              <p>포인트를 사용하여 스킬을 레벨업!</p>
            </div>
          )
        )}
      </div>

      {/* Right detail panel (analysis only) */}
      {tab === 'analysis' && selectedNode && activeTree && (
        <div className="skilltree-detail">
          <div className="skilltree-detail__header">
            <span className="skilltree-detail__status" style={{ background: STATUS_COLORS[selectedNode.status] }} />
            <span className="skilltree-detail__status-label">{STATUS_LABELS[selectedNode.status]}</span>
          </div>
          <h3 className="skilltree-detail__title">{selectedNode.label}</h3>
          <textarea className="skilltree-detail__desc"
            value={selectedNode.description}
            onChange={e => dispatch({ type: 'UPDATE_SKILL_NODE', treeId: activeTree.id, nodeId: selectedNode.id, updates: { description: e.target.value } })}
            placeholder="이 단계에 대한 메모를 작성하세요..."
            rows={6} />

          {/* Undo button */}
          {(selectedNode.status === 'active' || selectedNode.status === 'completed') && selectedNode.parentId && (
            <button className="skilltree-detail__undo"
              onClick={() => dispatch({ type: 'UNDO_PATH', treeId: activeTree.id, nodeId: selectedNode.id })}>
              ↩ 선택 되돌리기
            </button>
          )}

          {/* Children */}
          {(() => {
            const children = activeTree.nodes.filter(n => n.parentId === selectedNode.id)
            if (children.length === 0) return null
            return (
              <div className="skilltree-detail__branches">
                <div className="skilltree-detail__branches-label">분기 옵션 ({children.length}개)</div>
                {children.map(child => (
                  <div key={child.id}
                    className={`skilltree-detail__branch skilltree-detail__branch--${child.status}`}
                    onClick={() => {
                      if (child.status === 'locked') dispatch({ type: 'SELECT_PATH', treeId: activeTree.id, nodeId: child.id })
                    }}>
                    <span className="skilltree-detail__branch-dot" style={{ background: STATUS_COLORS[child.status] }} />
                    <div>
                      <div className="skilltree-detail__branch-name">{child.label}</div>
                      <div className="skilltree-detail__branch-desc">{child.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            )
          })()}

          <div className="skilltree-detail__depth">Depth: {selectedNode.depth}</div>
        </div>
      )}
    </div>
  )
}
