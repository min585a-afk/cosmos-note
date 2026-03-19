import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useSkillTreeState, useSkillTreeDispatch } from '../state/SkillTreeContext'
import { useGraphDispatch } from '../state/GraphContext'
import { generateSuggestions, generatePathSummary } from '../utils/skillTreeAI'
import { createNode, generateId } from '../state/graphReducer'
import type { SkillNode, SkillNodeStatus, FlowNodeStatus, FlowEdge } from '../types/skillTree'

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
        {allCompleted && !tree.exportedToGraph && (
          <button className="analysis-bottom-btn analysis-bottom-btn--export" onClick={onExportToGraph}>📊 Graph View로 내보내기</button>
        )}
        {allCompleted && tree.exportedToGraph && (
          <span className="analysis-bottom-exported">✓ Graph View에 내보내기 완료</span>
        )}
      </div>
    </div>
  )
}

// ===== Hexagonal SVG path helper =====
function hexPath(cx: number, cy: number, r: number): string {
  const pts: string[] = []
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2
    pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`)
  }
  return pts.join(' ')
}

// ===== Skill Node Graph (시각적 노드 연결 시스템) =====
const SKILL_NODE_R_BIG = 36
const SKILL_NODE_R_SMALL = 20
const AUTO_CONNECT_DIST = 80

function SkillNodeGraph({ treeId }: { treeId: string }) {
  const state = useSkillTreeState()
  const dispatch = useSkillTreeDispatch()
  const tree = state.flowTrees.find(t => t.id === treeId)
  const svgRef = useRef<SVGSVGElement>(null)
  const [dragging, setDragging] = useState<{ nodeId: string; offX: number; offY: number } | null>(null)
  const [connecting, setConnecting] = useState<{ sourceId: string; mx: number; my: number } | null>(null)
  const [addingAt, setAddingAt] = useState<{ x: number; y: number } | null>(null)
  const [newLabel, setNewLabel] = useState('')
  const [viewBox, setViewBox] = useState({ x: 0, y: 0 })
  const [panning, setPanning] = useState<{ startX: number; startY: number; startVbX: number; startVbY: number } | null>(null)
  const [autoConnectPreview, setAutoConnectPreview] = useState<{ from: string; to: string } | null>(null)
  const [zoom, setZoom] = useState(1)

  if (!tree) return null

  const edges = tree.edges || []
  const nodes = tree.nodes

  const getNodeR = (nodeId: string) => {
    return nodes.length > 0 && nodes[0].id === nodeId ? SKILL_NODE_R_BIG : SKILL_NODE_R_SMALL
  }

  const getSvgPos = (e: React.MouseEvent) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return { x: (e.clientX - rect.left) / zoom + viewBox.x, y: (e.clientY - rect.top) / zoom + viewBox.y }
  }

  const handleNodePointerDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation()
    const node = nodes.find(n => n.id === nodeId)
    if (!node) return
    const pos = getSvgPos(e)
    if (e.shiftKey) {
      // Shift+drag to connect
      setConnecting({ sourceId: nodeId, mx: pos.x, my: pos.y })
    } else {
      setDragging({ nodeId, offX: pos.x - (node.x || 0), offY: pos.y - (node.y || 0) })
    }
  }

  const handleSvgPointerDown = (e: React.MouseEvent) => {
    if (e.target === svgRef.current) {
      const pos = getSvgPos(e)
      setPanning({ startX: e.clientX, startY: e.clientY, startVbX: viewBox.x, startVbY: viewBox.y })
      dispatch({ type: 'SET_SELECTED_NODE', nodeId: null })
    }
  }

  const handlePointerMove = (e: React.MouseEvent) => {
    if (dragging) {
      const pos = getSvgPos(e)
      const nx = pos.x - dragging.offX
      const ny = pos.y - dragging.offY
      dispatch({ type: 'MOVE_FLOW_NODE', treeId, nodeId: dragging.nodeId, x: nx, y: ny })
      // Auto-connect preview: find nearest node within distance
      let nearest: { id: string; dist: number } | null = null
      for (const n of nodes) {
        if (n.id === dragging.nodeId) continue
        const d = Math.hypot((n.x || 0) - nx, (n.y || 0) - ny)
        if (d < AUTO_CONNECT_DIST && (!nearest || d < nearest.dist)) {
          nearest = { id: n.id, dist: d }
        }
      }
      setAutoConnectPreview(nearest ? { from: dragging.nodeId, to: nearest.id } : null)
    } else if (connecting) {
      const pos = getSvgPos(e)
      setConnecting({ ...connecting, mx: pos.x, my: pos.y })
    } else if (panning) {
      const dx = e.clientX - panning.startX
      const dy = e.clientY - panning.startY
      setViewBox({ x: panning.startVbX - dx, y: panning.startVbY - dy })
    }
  }

  const handlePointerUp = (e: React.MouseEvent) => {
    if (connecting) {
      // Check if released on a node
      const pos = getSvgPos(e)
      const target = nodes.find(n => {
        const nx = n.x || 0, ny = n.y || 0
        return Math.hypot(pos.x - nx, pos.y - ny) < getNodeR(n.id) + 10 && n.id !== connecting.sourceId
      })
      if (target) {
        dispatch({ type: 'ADD_FLOW_EDGE', treeId, edge: { id: `fe-${Date.now()}`, source: connecting.sourceId, target: target.id } })
      }
      setConnecting(null)
    }
    if (dragging && autoConnectPreview) {
      // Auto-connect if nearby and not already connected
      const alreadyConnected = edges.some(e =>
        (e.source === autoConnectPreview.from && e.target === autoConnectPreview.to) ||
        (e.source === autoConnectPreview.to && e.target === autoConnectPreview.from)
      )
      if (!alreadyConnected) {
        dispatch({ type: 'ADD_FLOW_EDGE', treeId, edge: { id: `fe-${Date.now()}`, source: autoConnectPreview.from, target: autoConnectPreview.to } })
      }
      setAutoConnectPreview(null)
    }
    setDragging(null)
    setPanning(null)
  }

  const handleDoubleClick = (e: React.MouseEvent) => {
    if ((e.target as SVGElement).closest('.skill-graph-node')) return
    const pos = getSvgPos(e)
    setAddingAt(pos)
    setNewLabel('')
  }

  const handleAddNode = () => {
    if (!newLabel.trim() || !addingAt) return
    const mainChain = nodes.filter(n => n.parentId === null)
    dispatch({ type: 'ADD_FLOW_NODE', treeId, label: newLabel.trim(), afterNodeId: mainChain.length > 0 ? mainChain[mainChain.length - 1].id : null })
    // Move the newly created node to the click position
    setTimeout(() => {
      const updated = state.flowTrees.find(t => t.id === treeId)
      if (updated) {
        const lastNode = updated.nodes[updated.nodes.length - 1]
        if (lastNode && addingAt) {
          dispatch({ type: 'MOVE_FLOW_NODE', treeId, nodeId: lastNode.id, x: addingAt.x, y: addingAt.y })
        }
      }
    }, 10)
    setAddingAt(null)
    setNewLabel('')
  }

  const toggleDone = (nodeId: string, current: FlowNodeStatus) => {
    const next: FlowNodeStatus = current === 'done' ? 'pending' : 'done'
    dispatch({ type: 'UPDATE_FLOW_NODE', treeId, nodeId, updates: { status: next } })
  }

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    const newZoom = Math.min(3, Math.max(0.2, zoom * delta))
    // Zoom toward cursor position
    const cx = (e.clientX - rect.left) / zoom + viewBox.x
    const cy = (e.clientY - rect.top) / zoom + viewBox.y
    const newVbX = cx - (e.clientX - rect.left) / newZoom
    const newVbY = cy - (e.clientY - rect.top) / newZoom
    setZoom(newZoom)
    setViewBox({ x: newVbX, y: newVbY })
  }, [zoom, viewBox])

  // Determine which nodes are "connected" to the first node (chain activation)
  const connectedSet = useMemo(() => {
    if (nodes.length === 0) return new Set<string>()
    const firstId = nodes[0].id
    const visited = new Set<string>([firstId])
    const queue = [firstId]
    while (queue.length > 0) {
      const cur = queue.shift()!
      for (const e of edges) {
        const other = e.source === cur ? e.target : e.target === cur ? e.source : null
        if (other && !visited.has(other)) {
          visited.add(other)
          queue.push(other)
        }
      }
    }
    return visited
  }, [nodes, edges])

  const selectedNode = nodes.find(n => n.id === state.selectedNodeId)
  const allDone = nodes.length > 0 && nodes.every(n => n.status === 'done')

  const rect = svgRef.current?.getBoundingClientRect()
  const svgW = (rect?.width || 800) / zoom
  const svgH = (rect?.height || 500) / zoom

  return (
    <div className="skill-graph">
      <div className="skill-graph__toolbar">
        <span className="skill-graph__hint">더블클릭: 노드 추가 | Shift+드래그: 연결 | 드래그: 이동</span>
        {allDone && nodes.length > 0 && <span className="skill-graph__complete">모든 노드 완료!</span>}
      </div>

      <svg
        ref={svgRef}
        className="skill-graph__svg"
        viewBox={`${viewBox.x} ${viewBox.y} ${svgW} ${svgH}`}
        onMouseDown={handleSvgPointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
      >
        {/* Edges — plain lines, no arrows */}
        {edges.map(edge => {
          const src = nodes.find(n => n.id === edge.source)
          const tgt = nodes.find(n => n.id === edge.target)
          if (!src || !tgt) return null
          const sx = src.x || 0, sy = src.y || 0
          const tx = tgt.x || 0, ty = tgt.y || 0
          const bothConnected = connectedSet.has(edge.source) && connectedSet.has(edge.target)
          return (
            <line key={edge.id} x1={sx} y1={sy} x2={tx} y2={ty}
              stroke={bothConnected ? 'rgba(0,255,135,0.5)' : 'rgba(167,139,250,0.3)'}
              strokeWidth={bothConnected ? 2 : 1.5}
            />
          )
        })}

        {/* Connecting line preview */}
        {connecting && (() => {
          const src = nodes.find(n => n.id === connecting.sourceId)
          if (!src) return null
          return <line x1={src.x || 0} y1={src.y || 0} x2={connecting.mx} y2={connecting.my}
            stroke="rgba(167,139,250,0.6)" strokeWidth={2} strokeDasharray="4 4" />
        })()}

        {/* Auto-connect preview */}
        {autoConnectPreview && (() => {
          const from = nodes.find(n => n.id === autoConnectPreview.from)
          const to = nodes.find(n => n.id === autoConnectPreview.to)
          if (!from || !to) return null
          return (
            <line x1={from.x || 0} y1={from.y || 0} x2={to.x || 0} y2={to.y || 0}
              stroke="rgba(0,255,135,0.5)" strokeWidth={2} strokeDasharray="4 4"
              className="skill-graph__auto-connect" />
          )
        })()}

        {/* Nodes */}
        {nodes.map(node => {
          const nx = node.x || 0
          const ny = node.y || 0
          const isDone = node.status === 'done'
          const isSelected = state.selectedNodeId === node.id
          const R = getNodeR(node.id)
          const isFirst = nodes.length > 0 && nodes[0].id === node.id
          const isAutoTarget = autoConnectPreview?.to === node.id
          const isConnected = connectedSet.has(node.id)
          return (
            <g key={node.id} className="skill-graph-node"
              onMouseDown={e => handleNodePointerDown(e, node.id)}
              onClick={e => { e.stopPropagation(); dispatch({ type: 'SET_SELECTED_NODE', nodeId: node.id }) }}
              onDoubleClick={e => { e.stopPropagation(); toggleDone(node.id, node.status) }}
              style={{ cursor: dragging ? 'grabbing' : 'grab' }}
            >
              {/* Auto-connect glow */}
              {isAutoTarget && <polygon points={hexPath(nx, ny, R + 10)} fill="none" stroke="#00ff87" strokeWidth={2} opacity={0.5} className="skill-graph__pulse" />}

              {/* Glow */}
              {isSelected && <polygon points={hexPath(nx, ny, R + 6)} fill="none" stroke="var(--accent)" strokeWidth={2} opacity={0.4} />}
              {isConnected && !isFirst && <polygon points={hexPath(nx, ny, R + 4)} fill="none" stroke="#00ff87" strokeWidth={1} opacity={0.25} />}

              {/* Hex body */}
              <polygon points={hexPath(nx, ny, R)}
                fill={isFirst ? 'rgba(0,255,135,0.12)' : isConnected ? 'rgba(0,255,135,0.06)' : 'rgba(12,14,24,0.9)'}
                stroke={isFirst ? '#00ff87' : isSelected ? 'var(--accent)' : isConnected ? 'rgba(0,255,135,0.5)' : 'rgba(167,139,250,0.3)'}
                strokeWidth={isFirst ? 2.5 : isConnected ? 1.5 : 1}
              />

              {/* Icon */}
              <text x={nx} y={ny + 1} textAnchor="middle" dominantBaseline="middle"
                fontSize={isFirst ? 18 : 11} fill={isFirst ? '#00ff87' : isConnected ? 'rgba(0,255,135,0.7)' : 'rgba(167,139,250,0.6)'}>
                {isFirst ? '★' : isConnected ? '✦' : '◇'}
              </text>

              {/* Label */}
              <text x={nx} y={ny + R + 14} textAnchor="middle"
                fill={isFirst ? '#00ff87' : isConnected ? 'rgba(0,255,135,0.8)' : '#c0c0e0'} fontSize={isFirst ? 13 : 11} fontWeight={isFirst ? 700 : 500}
                fontFamily="'Pretendard Variable', system-ui, sans-serif">
                {node.label.length > 10 ? node.label.slice(0, 10) + '..' : node.label}
              </text>
            </g>
          )
        })}
      </svg>

      {/* Add node input overlay */}
      {addingAt && (
        <div className="skill-graph__add-overlay" style={{ left: addingAt.x - viewBox.x - 80, top: addingAt.y - viewBox.y - 20 }}>
          <input autoFocus value={newLabel} onChange={e => setNewLabel(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAddNode(); if (e.key === 'Escape') setAddingAt(null) }}
            placeholder="노드 이름..." className="skill-graph__add-input" />
        </div>
      )}

      {/* Selected node detail */}
      {selectedNode && (
        <div className="skill-graph__detail">
          <div className="skill-graph__detail-header">
            <div className={`skill-graph__detail-check ${selectedNode.status === 'done' ? 'skill-graph__detail-check--on' : ''}`}
              onClick={() => toggleDone(selectedNode.id, selectedNode.status)}>
              {selectedNode.status === 'done' ? '✓' : ''}
            </div>
            <span className="skill-graph__detail-status">{selectedNode.status === 'done' ? '완료' : '진행중'}</span>
          </div>
          <input className="skill-graph__detail-title" value={selectedNode.label}
            onChange={e => dispatch({ type: 'UPDATE_FLOW_NODE', treeId, nodeId: selectedNode.id, updates: { label: e.target.value } })} />
          <textarea className="skill-graph__detail-desc" value={selectedNode.description}
            onChange={e => dispatch({ type: 'UPDATE_FLOW_NODE', treeId, nodeId: selectedNode.id, updates: { description: e.target.value } })}
            placeholder="메모, 자료, 정보를 기록하세요..." rows={3} />
          <div className="skill-graph__detail-actions">
            <button className="skill-graph__detail-delete" onClick={() => dispatch({ type: 'REMOVE_FLOW_NODE', treeId, nodeId: selectedNode.id })}>삭제</button>
            <button className="skill-graph__detail-close" onClick={() => dispatch({ type: 'SET_SELECTED_NODE', nodeId: null })}>닫기</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ===== Main View =====
export function SkillTreeView({ forceTab }: { forceTab?: 'analysis' | 'skill' } = {}) {
  const state = useSkillTreeState()
  const dispatch = useSkillTreeDispatch()
  const graphDispatch = useGraphDispatch()
  const [newName, setNewName] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [rootInput, setRootInput] = useState('')
  const [showRootInput, setShowRootInput] = useState(false)
  const [quickCreate, setQuickCreate] = useState(false)
  const [quickName, setQuickName] = useState('')

  const tab = forceTab || state.activeTab
  const activeTree = state.trees.find(t => t.id === state.activeTreeId)
  const activeFlowTree = state.flowTrees.find(t => t.id === state.activeFlowTreeId)
  const selectedNode = activeTree?.nodes.find(n => n.id === state.selectedNodeId)

  const handleCreate = () => {
    if (!newName.trim()) return
    if (tab === 'analysis') { dispatch({ type: 'CREATE_TREE', name: newName.trim() }); setShowRootInput(true) }
    else dispatch({ type: 'CREATE_FLOW_TREE', name: newName.trim() })
    setNewName(''); setShowCreate(false)
  }

  const handleQuickCreate = () => {
    if (!quickName.trim()) return
    if (tab === 'analysis') { dispatch({ type: 'CREATE_TREE', name: quickName.trim() }); setShowRootInput(true) }
    else dispatch({ type: 'CREATE_FLOW_TREE', name: quickName.trim() })
    setQuickName(''); setQuickCreate(false)
  }

  const handleAddRoot = () => {
    if (!rootInput.trim() || !state.activeTreeId) return
    dispatch({ type: 'ADD_ROOT_NODE', treeId: state.activeTreeId, label: rootInput.trim(), description: '' })
    setRootInput(''); setShowRootInput(false)
  }

  const handleExportToGraph = useCallback(() => {
    if (!activeTree || activeTree.exportedToGraph) return
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
    dispatch({ type: 'MARK_EXPORTED', treeId: activeTree.id })
  }, [activeTree, graphDispatch, dispatch])

  const sidebarItems = tab === 'analysis' ? state.trees : state.flowTrees
  const activeId = tab === 'analysis' ? state.activeTreeId : state.activeFlowTreeId

  return (
    <div className="skilltree-view">
      <div className="skilltree-sidebar">
        {!forceTab && (
          <div className="skilltree-tabs">
            <button className={`skilltree-tab ${tab === 'analysis' ? 'skilltree-tab--active' : ''}`}
              onClick={() => dispatch({ type: 'SET_TAB', tab: 'analysis' })}>🔍 분석트리</button>
            <button className={`skilltree-tab ${tab === 'skill' ? 'skilltree-tab--active' : ''}`}
              onClick={() => dispatch({ type: 'SET_TAB', tab: 'skill' })}>⚡ 스킬트리</button>
          </div>
        )}
        <div className="skilltree-sidebar__header">
          <h3>{tab === 'analysis' ? '프로젝트 분석' : '스킬 노드'}</h3>
          <button className="skilltree-sidebar__add" onClick={() => setShowCreate(true)}>+</button>
        </div>
        {showCreate && (
          <div className="skilltree-sidebar__create">
            <input autoFocus placeholder={tab === 'analysis' ? '프로젝트 이름...' : '스킬트리 이름...'}
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
              const done = t.nodes.filter(n => n.status === 'done').length
              progress = `${done}/${t.nodes.length} 노드`
            }
            return (
              <div key={item.id} className={`skilltree-sidebar__item ${isActive ? 'skilltree-sidebar__item--active' : ''}`}
                onClick={() => { if (tab === 'analysis') dispatch({ type: 'SET_ACTIVE_TREE', treeId: item.id }); else dispatch({ type: 'SET_ACTIVE_FLOW_TREE', treeId: item.id }) }}>
                <span className="skilltree-sidebar__item-icon">{tab === 'analysis' ? '🔬' : '⬡'}</span>
                <div className="skilltree-sidebar__item-info">
                  <span className="skilltree-sidebar__item-name">{item.name}</span>
                  <span className="skilltree-sidebar__item-progress">{progress}</span>
                </div>
                <button className="skilltree-sidebar__item-delete" onClick={e => { e.stopPropagation(); if (tab === 'analysis') dispatch({ type: 'DELETE_TREE', treeId: item.id }); else dispatch({ type: 'DELETE_FLOW_TREE', treeId: item.id }) }}>×</button>
              </div>
            )
          })}
        </div>
        {sidebarItems.length === 0 && !showCreate && (
          <div className="skilltree-sidebar__empty">{tab === 'analysis' ? '목표를 입력하면\nAI가 단계별 대안을 제시합니다.' : '노드를 만들고 연결하여\n자동화 워크플로우를 구성하세요.'}</div>
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
            <div className="skilltree-placeholder">
              {quickCreate ? (
                <div className="skilltree-placeholder__create">
                  <input autoFocus className="skilltree-placeholder__input" placeholder="프로젝트 이름 입력..."
                    value={quickName} onChange={e => setQuickName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleQuickCreate(); if (e.key === 'Escape') { setQuickCreate(false); setQuickName('') } }} />
                  <button className="skilltree-placeholder__create-btn" onClick={handleQuickCreate}>생성</button>
                </div>
              ) : (
                <button className="skilltree-placeholder__add" onClick={() => setQuickCreate(true)}>
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                    <rect x="1" y="1" width="46" height="46" rx="12" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
                    <line x1="24" y1="14" x2="24" y2="34" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <line x1="14" y1="24" x2="34" y2="24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              )}
              <div className="skilltree-placeholder__icon">🔍</div>
              <h3>분석트리</h3>
              <p>목표를 입력하면 AI가 단계별 대안을 제시합니다.</p>
              <p>경로를 선택하며 프로젝트의 방향을 결정하세요.</p>
            </div>
          )
        ) : (
          activeFlowTree ? (
            <>
              <div className="skilltree-main__header">
                <h2>{activeFlowTree.name}</h2>
                <span className="skilltree-main__meta">
                  {activeFlowTree.nodes.filter(n => n.status === 'done').length}/{activeFlowTree.nodes.length} 노드
                </span>
              </div>
              <SkillNodeGraph treeId={activeFlowTree.id} />
            </>
          ) : (
            <div className="skilltree-placeholder">
              {quickCreate ? (
                <div className="skilltree-placeholder__create">
                  <input autoFocus className="skilltree-placeholder__input" placeholder="스킬트리 이름 입력..."
                    value={quickName} onChange={e => setQuickName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleQuickCreate(); if (e.key === 'Escape') { setQuickCreate(false); setQuickName('') } }} />
                  <button className="skilltree-placeholder__create-btn" onClick={handleQuickCreate}>생성</button>
                </div>
              ) : (
                <button className="skilltree-placeholder__add" onClick={() => setQuickCreate(true)}>
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                    <rect x="1" y="1" width="46" height="46" rx="12" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
                    <line x1="24" y1="14" x2="24" y2="34" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <line x1="14" y1="24" x2="34" y2="24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              )}
              <div className="skilltree-placeholder__icon">⬡</div>
              <h3>스킬트리</h3>
              <p>노드를 만들고 연결하여</p>
              <p>자동화 워크플로우를 구성하세요.</p>
            </div>
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
