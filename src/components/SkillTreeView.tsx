import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useSkillTreeState, useSkillTreeDispatch } from '../state/SkillTreeContext'
import { useGraphDispatch } from '../state/GraphContext'
import { generateSuggestions, generatePathSummary } from '../utils/skillTreeAI'
import { createNode, generateId } from '../state/graphReducer'
import type { SkillNode, SkillNodeStatus, FlowNode, FlowNodeStatus } from '../types/skillTree'

// ===== Analysis Tree =====
const NODE_W = 160
const NODE_H = 50
const GAP_X = 24
const GAP_Y = 72

interface LayoutNode extends SkillNode { lx: number; ly: number }

function layoutTree(nodes: SkillNode[]): LayoutNode[] {
  if (nodes.length === 0) return []
  const byDepth = new Map<number, SkillNode[]>()
  for (const n of nodes) { const arr = byDepth.get(n.depth) || []; arr.push(n); byDepth.set(n.depth, arr) }
  const result: LayoutNode[] = []
  const maxDepth = Math.max(...Array.from(byDepth.keys()))
  for (let d = 0; d <= maxDepth; d++) {
    const row = byDepth.get(d) || []
    const totalWidth = row.length * NODE_W + (row.length - 1) * GAP_X
    const startX = -totalWidth / 2 + NODE_W / 2
    row.forEach((node, i) => { result.push({ ...node, lx: startX + i * (NODE_W + GAP_X), ly: d * (NODE_H + GAP_Y) }) })
  }
  return result
}

const STATUS_COLORS: Record<SkillNodeStatus, string> = { completed: '#00ff87', active: '#bf5af2', locked: '#4a4a5a', skipped: '#2a2a35' }
const STATUS_LABELS: Record<SkillNodeStatus, string> = { completed: '완료', active: '진행중', locked: '선택 가능', skipped: '미선택' }

function AnalysisTreeCanvas({ treeId, onExportToGraph }: { treeId: string; onExportToGraph: () => void }) {
  const state = useSkillTreeState()
  const dispatch = useSkillTreeDispatch()
  const tree = state.trees.find(t => t.id === treeId)
  const [analyzing, setAnalyzing] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const layoutNodes = useMemo(() => tree ? layoutTree(tree.nodes) : [], [tree])

  useEffect(() => { containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight, behavior: 'smooth' }) }, [layoutNodes.length])

  if (!tree) return null

  const allX = layoutNodes.map(n => n.lx)
  const allY = layoutNodes.map(n => n.ly)
  const pad = 80
  const minX = allX.length > 0 ? Math.min(...allX) - NODE_W / 2 - pad : -300
  const maxX = allX.length > 0 ? Math.max(...allX) + NODE_W / 2 + pad : 300
  const minY = allY.length > 0 ? Math.min(...allY) - NODE_H / 2 - pad : -50
  const maxY = allY.length > 0 ? Math.max(...allY) + NODE_H / 2 + pad : 200
  const svgW = maxX - minX
  const svgH = maxY - minY
  const nodeById = new Map(layoutNodes.map(n => [n.id, n]))

  const activeLeaves = layoutNodes.filter(n => n.status === 'active' && !layoutNodes.some(c => c.parentId === n.id))

  const handleAnalyze = (nodeId: string) => {
    const node = tree.nodes.find(n => n.id === nodeId)
    if (!node || tree.nodes.some(n => n.parentId === nodeId)) return
    setAnalyzing(true)
    setTimeout(() => {
      const suggestions = generateSuggestions(node.label, node.description, node.depth, [])
      dispatch({ type: 'ADD_BRANCH_NODES', treeId, parentId: nodeId, nodes: suggestions })
      setAnalyzing(false)
    }, 800)
  }

  const allCompleted = tree.nodes.length > 0 && tree.nodes.filter(n => n.status === 'active').length === 0 && tree.nodes.filter(n => n.status === 'completed').length > 0

  return (
    <div className="analysis-canvas" ref={containerRef}>
      <svg width={svgW} height={svgH} viewBox={`${minX} ${minY} ${svgW} ${svgH}`} className="analysis-svg">
        {layoutNodes.map(node => {
          if (!node.parentId) return null
          const parent = nodeById.get(node.parentId)
          if (!parent) return null
          const isActive = node.status === 'active' || node.status === 'completed'
          const isSkipped = node.status === 'skipped'
          return (
            <g key={`e-${node.id}`}>
              {isActive && <line x1={parent.lx} y1={parent.ly + NODE_H / 2} x2={node.lx} y2={node.ly - NODE_H / 2} stroke={STATUS_COLORS[node.status]} strokeWidth={4} opacity={0.15} strokeLinecap="round" />}
              <line x1={parent.lx} y1={parent.ly + NODE_H / 2} x2={node.lx} y2={node.ly - NODE_H / 2}
                stroke={isSkipped ? '#1a1a25' : STATUS_COLORS[node.status]} strokeWidth={isActive ? 2 : 1}
                opacity={isSkipped ? 0.3 : 0.5} strokeLinecap="round" strokeDasharray={node.status === 'locked' ? '4 4' : undefined} />
            </g>
          )
        })}
        {layoutNodes.map(node => {
          const color = STATUS_COLORS[node.status]
          return (
            <g key={node.id} className={`analysis-node analysis-node--${node.status}`}
              onClick={() => {
                if (node.status === 'locked') dispatch({ type: 'SELECT_PATH', treeId, nodeId: node.id })
                else dispatch({ type: 'SET_SELECTED_NODE', nodeId: node.id })
              }}
              style={{ cursor: node.status === 'locked' || node.status === 'active' ? 'pointer' : 'default' }}>
              {node.status === 'active' && <rect x={node.lx - NODE_W / 2 - 3} y={node.ly - NODE_H / 2 - 3} width={NODE_W + 6} height={NODE_H + 6} rx={12} fill="none" stroke={color} strokeWidth={1.5} opacity={0.3} className="analysis-node__glow" />}
              <rect x={node.lx - NODE_W / 2} y={node.ly - NODE_H / 2} width={NODE_W} height={NODE_H} rx={10}
                fill={node.status === 'skipped' ? '#15151f' : 'rgba(12, 14, 24, 0.92)'} stroke={color}
                strokeWidth={node.status === 'active' ? 1.5 : 0.7} opacity={node.status === 'skipped' ? 0.35 : 1} />
              <circle cx={node.lx - NODE_W / 2 + 14} cy={node.ly - 2} r={3.5} fill={color} opacity={node.status === 'skipped' ? 0.3 : 0.8} />
              <text x={node.lx - NODE_W / 2 + 24} y={node.ly - 2} fill={node.status === 'skipped' ? '#444' : '#e0e0f0'}
                fontSize={11} fontWeight={node.status === 'active' ? 600 : 400} fontFamily="'Pretendard Variable', system-ui, sans-serif">
                {node.label.length > 12 ? node.label.slice(0, 12) + '...' : node.label}
              </text>
              <text x={node.lx - NODE_W / 2 + 24} y={node.ly + 14} fill={node.status === 'skipped' ? '#333' : '#6666a0'} fontSize={8.5}
                fontFamily="'Pretendard Variable', system-ui, sans-serif">{STATUS_LABELS[node.status]}</text>
              {node.status === 'completed' && <text x={node.lx + NODE_W / 2 - 16} y={node.ly + 4} fill="#00ff87" fontSize={13} textAnchor="middle">✓</text>}
            </g>
          )
        })}
      </svg>

      {/* Bottom action bar */}
      <div className="analysis-bottom-bar">
        {analyzing && <div className="analysis-analyzing">⚡ 분석중...</div>}
        {!analyzing && activeLeaves.length > 0 && !tree.nodes.some(n => n.parentId === activeLeaves[0]?.id) && (
          <>
            <button className="analysis-bottom-btn analysis-bottom-btn--ai" onClick={() => handleAnalyze(activeLeaves[0].id)}>⚡ AI 분석</button>
            <button className="analysis-bottom-btn analysis-bottom-btn--undo" onClick={() => dispatch({ type: 'UNDO_PATH', treeId, nodeId: activeLeaves[0].id })}>↩ 되돌리기</button>
            <button className="analysis-bottom-btn analysis-bottom-btn--complete" onClick={() => dispatch({ type: 'COMPLETE_NODE', treeId, nodeId: activeLeaves[0].id })}>✓ 완료</button>
          </>
        )}
        {allCompleted && (
          <button className="analysis-bottom-btn analysis-bottom-btn--export" onClick={onExportToGraph}>📊 Graph View로 내보내기</button>
        )}
      </div>
    </div>
  )
}

// ===== Flow Skill Tree (가로형) =====
const FLOW_COLORS: Record<FlowNodeStatus, string> = { 'pending': '#4a4a5a', 'in-progress': '#bf5af2', 'done': '#00ff87' }
const FLOW_LABELS: Record<FlowNodeStatus, string> = { 'pending': '대기', 'in-progress': '진행중', 'done': '완료' }

function FlowSkillTreeView({ treeId }: { treeId: string }) {
  const state = useSkillTreeState()
  const dispatch = useSkillTreeDispatch()
  const tree = state.flowTrees.find(t => t.id === treeId)
  const [addingAfter, setAddingAfter] = useState<string | null | 'end'>( null)
  const [newLabel, setNewLabel] = useState('')
  const [addingBranch, setAddingBranch] = useState<string | null>(null)
  const [branchLabel, setBranchLabel] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  if (!tree) return null

  const mainChain = tree.nodes.filter(n => n.parentId === null).sort((a, b) => a.order - b.order)

  const handleAddNode = () => {
    if (!newLabel.trim()) return
    const afterId = addingAfter === 'end' ? (mainChain.length > 0 ? mainChain[mainChain.length - 1].id : null) : addingAfter
    dispatch({ type: 'ADD_FLOW_NODE', treeId, label: newLabel.trim(), afterNodeId: afterId })
    setNewLabel('')
    setAddingAfter(null)
    setTimeout(() => scrollRef.current?.scrollTo({ left: scrollRef.current.scrollWidth, behavior: 'smooth' }), 100)
  }

  const handleAddBranch = () => {
    if (!branchLabel.trim() || !addingBranch) return
    dispatch({ type: 'ADD_FLOW_BRANCH', treeId, parentId: addingBranch, label: branchLabel.trim() })
    setBranchLabel('')
    setAddingBranch(null)
  }

  const cycleStatus = (nodeId: string, current: FlowNodeStatus) => {
    const next: FlowNodeStatus = current === 'pending' ? 'in-progress' : current === 'in-progress' ? 'done' : 'pending'
    dispatch({ type: 'UPDATE_FLOW_NODE', treeId, nodeId, updates: { status: next } })
  }

  const selectedNode = tree.nodes.find(n => n.id === state.selectedNodeId)

  return (
    <div className="flow-tree">
      <div className="flow-scroll" ref={scrollRef}>
        <div className="flow-chain">
          {mainChain.map((node, i) => {
            const branches = tree.nodes.filter(n => n.parentId === node.id).sort((a, b) => a.order - b.order)
            const isSelected = state.selectedNodeId === node.id
            const color = FLOW_COLORS[node.status]

            return (
              <div key={node.id} className="flow-column">
                {/* Arrow from previous */}
                {i > 0 && <div className="flow-arrow"><svg width="32" height="20" viewBox="0 0 32 20"><line x1="0" y1="10" x2="24" y2="10" stroke={mainChain[i - 1].status === 'done' ? '#00ff87' : '#3a3a4a'} strokeWidth="2" /><polygon points="24,5 32,10 24,15" fill={mainChain[i - 1].status === 'done' ? '#00ff87' : '#3a3a4a'} /></svg></div>}

                {/* Main node */}
                <div className={`flow-node flow-node--${node.status} ${isSelected ? 'flow-node--selected' : ''}`}
                  onClick={() => dispatch({ type: 'SET_SELECTED_NODE', nodeId: node.id })}>
                  <div className="flow-node__status-dot" style={{ background: color }} onClick={e => { e.stopPropagation(); cycleStatus(node.id, node.status) }} title="상태 변경" />
                  <div className="flow-node__label">{node.label}</div>
                  <div className="flow-node__meta">{FLOW_LABELS[node.status]}</div>
                </div>

                {/* Branches below */}
                {branches.length > 0 && (
                  <div className="flow-branches">
                    <div className="flow-branch-line" />
                    {branches.map(branch => (
                      <div key={branch.id} className={`flow-branch flow-branch--${branch.status} ${state.selectedNodeId === branch.id ? 'flow-branch--selected' : ''}`}
                        onClick={() => dispatch({ type: 'SET_SELECTED_NODE', nodeId: branch.id })}>
                        <div className="flow-branch__dot" style={{ background: FLOW_COLORS[branch.status] }}
                          onClick={e => { e.stopPropagation(); cycleStatus(branch.id, branch.status) }} />
                        <span className="flow-branch__label">{branch.label}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add branch button */}
                {addingBranch === node.id ? (
                  <div className="flow-branch-input">
                    <input autoFocus value={branchLabel} onChange={e => setBranchLabel(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleAddBranch(); if (e.key === 'Escape') setAddingBranch(null) }}
                      placeholder="가지 노드..." className="flow-branch-input__field" />
                  </div>
                ) : (
                  <button className="flow-add-branch" onClick={() => setAddingBranch(node.id)}>+ 가지</button>
                )}
              </div>
            )
          })}

          {/* Add node */}
          {addingAfter !== null ? (
            <div className="flow-column">
              {mainChain.length > 0 && <div className="flow-arrow"><svg width="32" height="20" viewBox="0 0 32 20"><line x1="0" y1="10" x2="24" y2="10" stroke="#3a3a4a" strokeWidth="2" strokeDasharray="4 4" /><polygon points="24,5 32,10 24,15" fill="#3a3a4a" /></svg></div>}
              <div className="flow-node-input">
                <input autoFocus value={newLabel} onChange={e => setNewLabel(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddNode(); if (e.key === 'Escape') { setAddingAfter(null); setNewLabel('') } }}
                  placeholder="단계 이름..." className="flow-node-input__field" />
              </div>
            </div>
          ) : (
            <button className="flow-add-node" onClick={() => setAddingAfter('end')}>
              <span>+</span>
              <span>단계 추가</span>
            </button>
          )}
        </div>
      </div>

      {/* Detail panel for selected node */}
      {selectedNode && (
        <div className="flow-detail">
          <div className="flow-detail__header">
            <span className="flow-detail__dot" style={{ background: FLOW_COLORS[selectedNode.status] }} />
            <span className="flow-detail__status">{FLOW_LABELS[selectedNode.status]}</span>
            <button className="flow-detail__status-btn" onClick={() => cycleStatus(selectedNode.id, selectedNode.status)}>상태 변경</button>
          </div>
          <input className="flow-detail__title" value={selectedNode.label}
            onChange={e => dispatch({ type: 'UPDATE_FLOW_NODE', treeId, nodeId: selectedNode.id, updates: { label: e.target.value } })} />
          <textarea className="flow-detail__desc" value={selectedNode.description}
            onChange={e => dispatch({ type: 'UPDATE_FLOW_NODE', treeId, nodeId: selectedNode.id, updates: { description: e.target.value } })}
            placeholder="메모, 자료, 정보를 기록하세요..." rows={4} />
          <div className="flow-detail__actions">
            <button className="flow-detail__delete" onClick={() => dispatch({ type: 'REMOVE_FLOW_NODE', treeId, nodeId: selectedNode.id })}>삭제</button>
            <button className="flow-detail__close" onClick={() => dispatch({ type: 'SET_SELECTED_NODE', nodeId: null })}>닫기</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ===== Main View =====
export function SkillTreeView() {
  const state = useSkillTreeState()
  const dispatch = useSkillTreeDispatch()
  const graphDispatch = useGraphDispatch()
  const [newName, setNewName] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [rootInput, setRootInput] = useState('')
  const [showRootInput, setShowRootInput] = useState(false)

  const tab = state.activeTab
  const activeTree = state.trees.find(t => t.id === state.activeTreeId)
  const activeFlowTree = state.flowTrees.find(t => t.id === state.activeFlowTreeId)
  const selectedNode = activeTree?.nodes.find(n => n.id === state.selectedNodeId)

  const handleCreate = () => {
    if (!newName.trim()) return
    if (tab === 'analysis') { dispatch({ type: 'CREATE_TREE', name: newName.trim() }); setShowRootInput(true) }
    else dispatch({ type: 'CREATE_FLOW_TREE', name: newName.trim() })
    setNewName(''); setShowCreate(false)
  }

  const handleAddRoot = () => {
    if (!rootInput.trim() || !state.activeTreeId) return
    dispatch({ type: 'ADD_ROOT_NODE', treeId: state.activeTreeId, label: rootInput.trim(), description: '' })
    setRootInput(''); setShowRootInput(false)
  }

  const handleExportToGraph = useCallback(() => {
    if (!activeTree) return
    const completedPath = activeTree.nodes.filter(n => n.status === 'completed' || n.status === 'active').sort((a, b) => a.depth - b.depth)
    if (completedPath.length === 0) return
    const summary = generatePathSummary(activeTree.nodes)
    const mainNode = createNode({ label: activeTree.name, type: 'work', description: summary, tags: ['분석트리'], radius: 14 })
    graphDispatch({ type: 'ADD_NODE', node: mainNode })
    const angle = (2 * Math.PI) / completedPath.length
    completedPath.forEach((step, i) => {
      const star = createNode({ label: step.label, type: 'task', description: step.description, tags: ['분석트리', activeTree.name], radius: 10, x: mainNode.x + Math.cos(angle * i) * 150, y: mainNode.y + Math.sin(angle * i) * 150 })
      graphDispatch({ type: 'ADD_NODE', node: star })
      graphDispatch({ type: 'ADD_EDGE', edge: { id: generateId(), source: mainNode.id, target: star.id } })
    })
  }, [activeTree, graphDispatch])

  const sidebarItems = tab === 'analysis' ? state.trees : state.flowTrees
  const activeId = tab === 'analysis' ? state.activeTreeId : state.activeFlowTreeId

  return (
    <div className="skilltree-view">
      <div className="skilltree-sidebar">
        <div className="skilltree-tabs">
          <button className={`skilltree-tab ${tab === 'analysis' ? 'skilltree-tab--active' : ''}`}
            onClick={() => dispatch({ type: 'SET_TAB', tab: 'analysis' })}>🔍 분석트리</button>
          <button className={`skilltree-tab ${tab === 'skill' ? 'skilltree-tab--active' : ''}`}
            onClick={() => dispatch({ type: 'SET_TAB', tab: 'skill' })}>🔗 스킬트리</button>
        </div>
        <div className="skilltree-sidebar__header">
          <h3>{tab === 'analysis' ? '프로젝트 분석' : '작업 플로우'}</h3>
          <button className="skilltree-sidebar__add" onClick={() => setShowCreate(true)}>+</button>
        </div>
        {showCreate && (
          <div className="skilltree-sidebar__create">
            <input autoFocus placeholder={tab === 'analysis' ? '프로젝트 이름...' : '플로우 이름...'}
              value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setShowCreate(false) }}
              className="skilltree-sidebar__input" />
          </div>
        )}
        <div className="skilltree-sidebar__list">
          {sidebarItems.map(item => {
            const isActive = activeId === item.id
            let progress = ''
            if (tab === 'analysis') {
              const t = item as typeof state.trees[0]
              progress = `${t.nodes.filter(n => n.status === 'completed').length}/${t.nodes.filter(n => n.status !== 'skipped').length}`
            } else {
              const t = item as typeof state.flowTrees[0]
              const main = t.nodes.filter(n => n.parentId === null)
              const done = main.filter(n => n.status === 'done').length
              progress = `${done}/${main.length} 단계`
            }
            return (
              <button key={item.id} className={`skilltree-sidebar__item ${isActive ? 'skilltree-sidebar__item--active' : ''}`}
                onClick={() => { if (tab === 'analysis') dispatch({ type: 'SET_ACTIVE_TREE', treeId: item.id }); else dispatch({ type: 'SET_ACTIVE_FLOW_TREE', treeId: item.id }) }}>
                <span className="skilltree-sidebar__item-icon">{tab === 'analysis' ? '🔬' : '🔗'}</span>
                <div className="skilltree-sidebar__item-info">
                  <span className="skilltree-sidebar__item-name">{item.name}</span>
                  <span className="skilltree-sidebar__item-progress">{progress}</span>
                </div>
                <button className="skilltree-sidebar__item-delete" onClick={e => { e.stopPropagation(); if (tab === 'analysis') dispatch({ type: 'DELETE_TREE', treeId: item.id }); else dispatch({ type: 'DELETE_FLOW_TREE', treeId: item.id }) }}>×</button>
              </button>
            )
          })}
        </div>
        {sidebarItems.length === 0 && !showCreate && (
          <div className="skilltree-sidebar__empty">{tab === 'analysis' ? '목표를 입력하면\nAI가 단계별 대안을 제시합니다.' : '작업 단계를 노드로 만들어\n플로우를 구성하세요.'}</div>
        )}
      </div>

      <div className="skilltree-main">
        {tab === 'analysis' ? (
          activeTree ? (
            <>
              <div className="skilltree-main__header">
                <h2>{activeTree.name}</h2>
                <span className="skilltree-main__meta">{activeTree.nodes.filter(n => n.status === 'completed').length} 완료 / {activeTree.nodes.filter(n => n.status !== 'skipped').length} 단계</span>
              </div>
              {activeTree.nodes.length === 0 ? (
                <div className="skilltree-empty">
                  {showRootInput ? (
                    <div className="skilltree-empty__input-wrap">
                      <p>분석할 목표를 입력하세요</p>
                      <input autoFocus className="skilltree-empty__input" placeholder="예: 앱 디자인 완성하기"
                        value={rootInput} onChange={e => setRootInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleAddRoot(); if (e.key === 'Escape') setShowRootInput(false) }} />
                      <button className="skilltree-empty__btn" onClick={handleAddRoot}>분석 시작</button>
                    </div>
                  ) : (
                    <button className="skilltree-empty__start" onClick={() => setShowRootInput(true)}>
                      <span className="skilltree-empty__icon">🎯</span><span>목표 설정하기</span>
                    </button>
                  )}
                </div>
              ) : <AnalysisTreeCanvas treeId={activeTree.id} onExportToGraph={handleExportToGraph} />}
            </>
          ) : (
            <div className="skilltree-placeholder"><div className="skilltree-placeholder__icon">🔍</div><h3>분석트리</h3><p>목표를 입력하면 AI가 단계별 대안을 제시합니다.</p><p>경로를 선택하며 프로젝트의 방향을 결정하세요.</p></div>
          )
        ) : (
          activeFlowTree ? (
            <>
              <div className="skilltree-main__header">
                <h2>{activeFlowTree.name}</h2>
                <span className="skilltree-main__meta">
                  {activeFlowTree.nodes.filter(n => n.parentId === null && n.status === 'done').length}/{activeFlowTree.nodes.filter(n => n.parentId === null).length} 완료
                </span>
              </div>
              <FlowSkillTreeView treeId={activeFlowTree.id} />
            </>
          ) : (
            <div className="skilltree-placeholder"><div className="skilltree-placeholder__icon">🔗</div><h3>스킬트리</h3><p>작업 단계를 좌→우 가로형 노드로 만드세요.</p><p>각 노드에 자료, 스킬, 정보를 가지로 연결합니다.</p></div>
          )
        )}
      </div>

      {/* Analysis detail panel */}
      {tab === 'analysis' && selectedNode && activeTree && (
        <div className="skilltree-detail">
          <div className="skilltree-detail__header">
            <span className="skilltree-detail__status" style={{ background: STATUS_COLORS[selectedNode.status] }} />
            <span className="skilltree-detail__status-label">{STATUS_LABELS[selectedNode.status]}</span>
          </div>
          <h3 className="skilltree-detail__title">{selectedNode.label}</h3>
          <textarea className="skilltree-detail__desc" value={selectedNode.description}
            onChange={e => dispatch({ type: 'UPDATE_SKILL_NODE', treeId: activeTree.id, nodeId: selectedNode.id, updates: { description: e.target.value } })}
            placeholder="이 단계에 대한 메모..." rows={6} />
          {(selectedNode.status === 'active' || selectedNode.status === 'completed') && selectedNode.parentId && (
            <button className="skilltree-detail__undo" onClick={() => dispatch({ type: 'UNDO_PATH', treeId: activeTree.id, nodeId: selectedNode.id })}>↩ 선택 되돌리기</button>
          )}
          {(() => {
            const children = activeTree.nodes.filter(n => n.parentId === selectedNode.id)
            if (!children.length) return null
            return (
              <div className="skilltree-detail__branches">
                <div className="skilltree-detail__branches-label">분기 옵션 ({children.length}개)</div>
                {children.map(c => (
                  <div key={c.id} className={`skilltree-detail__branch skilltree-detail__branch--${c.status}`}
                    onClick={() => { if (c.status === 'locked') dispatch({ type: 'SELECT_PATH', treeId: activeTree.id, nodeId: c.id }) }}>
                    <span className="skilltree-detail__branch-dot" style={{ background: STATUS_COLORS[c.status] }} />
                    <div><div className="skilltree-detail__branch-name">{c.label}</div><div className="skilltree-detail__branch-desc">{c.description}</div></div>
                  </div>
                ))}
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}
