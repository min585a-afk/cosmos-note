import { useMemo, useRef, useEffect, useCallback } from 'react'
import { useGraphState, useGraphDispatch } from '../state/GraphContext'
import { NODE_COLORS } from '../types/graph'
import type { GraphNode } from '../types/graph'
import type { ViewMode } from '../App'

interface SkillTreeViewProps {
  onViewChange: (v: ViewMode) => void
}

interface TreeNode {
  node: GraphNode
  children: TreeNode[]
  x: number
  y: number
}

export function SkillTreeView({ onViewChange }: SkillTreeViewProps) {
  const { nodes, edges } = useGraphState()
  const dispatch = useGraphDispatch()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Build skill tree from skill nodes and their connections
  const skillNodes = useMemo(() => nodes.filter(n => n.type === 'skill'), [nodes])

  // Find connections between skill nodes
  const skillEdges = useMemo(() => {
    const skillIds = new Set(skillNodes.map(n => n.id))
    return edges.filter(e => skillIds.has(e.source) || skillIds.has(e.target))
  }, [skillNodes, edges])

  // Build tree structure
  const trees = useMemo(() => {
    if (skillNodes.length === 0) return []

    // Adjacency
    const adj = new Map<string, string[]>()
    for (const e of skillEdges) {
      const arr = adj.get(e.source) || []
      arr.push(e.target)
      adj.set(e.source, arr)
    }

    // Find roots (no incoming edges from other skill nodes)
    const hasIncoming = new Set<string>()
    const skillIds = new Set(skillNodes.map(n => n.id))
    for (const e of skillEdges) {
      if (skillIds.has(e.source) && skillIds.has(e.target)) {
        hasIncoming.add(e.target)
      }
    }
    const roots = skillNodes.filter(n => !hasIncoming.has(n.id))
    if (roots.length === 0 && skillNodes.length > 0) roots.push(skillNodes[0])

    // Build trees
    const visited = new Set<string>()
    const buildTree = (node: GraphNode, depth: number): TreeNode => {
      visited.add(node.id)
      const childIds = (adj.get(node.id) || []).filter(id => !visited.has(id) && skillIds.has(id))
      const children = childIds.map(id => {
        const child = nodes.find(n => n.id === id)!
        return buildTree(child, depth + 1)
      })
      return { node, children, x: 0, y: depth * 120 }
    }

    const result: TreeNode[] = []
    for (const root of roots) {
      if (!visited.has(root.id)) {
        result.push(buildTree(root, 0))
      }
    }
    // Also add unconnected skill nodes
    for (const n of skillNodes) {
      if (!visited.has(n.id)) {
        result.push({ node: n, children: [], x: 0, y: 0 })
      }
    }
    return result
  }, [skillNodes, skillEdges, nodes])

  // Layout tree positions
  const layoutNodes = useMemo(() => {
    const allNodes: Array<{ node: GraphNode; x: number; y: number; depth: number }> = []
    let globalX = 0

    const layout = (tree: TreeNode, depth: number) => {
      if (tree.children.length === 0) {
        tree.x = globalX
        tree.y = depth * 120
        globalX += 160
        allNodes.push({ node: tree.node, x: tree.x, y: tree.y, depth })
      } else {
        for (const child of tree.children) {
          layout(child, depth + 1)
        }
        const firstChild = tree.children[0]
        const lastChild = tree.children[tree.children.length - 1]
        tree.x = (firstChild.x + lastChild.x) / 2
        tree.y = depth * 120
        allNodes.push({ node: tree.node, x: tree.x, y: tree.y, depth })
      }
    }

    for (const tree of trees) {
      layout(tree, 0)
      globalX += 40
    }

    return allNodes
  }, [trees])

  // Layout edges
  const layoutEdges = useMemo(() => {
    const posMap = new Map(layoutNodes.map(n => [n.node.id, { x: n.x, y: n.y }]))
    const skillIds = new Set(skillNodes.map(n => n.id))
    return skillEdges
      .filter(e => skillIds.has(e.source) && skillIds.has(e.target))
      .map(e => ({
        from: posMap.get(e.source),
        to: posMap.get(e.target),
      }))
      .filter(e => e.from && e.to) as Array<{ from: { x: number; y: number }; to: { x: number; y: number } }>
  }, [layoutNodes, skillEdges, skillNodes])

  // Canvas rendering
  const renderTree = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const w = container.clientWidth
    const h = container.clientHeight
    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)

    if (layoutNodes.length === 0) return

    // Center the tree
    const minX = Math.min(...layoutNodes.map(n => n.x))
    const maxX = Math.max(...layoutNodes.map(n => n.x))
    const minY = Math.min(...layoutNodes.map(n => n.y))
    const maxY = Math.max(...layoutNodes.map(n => n.y))
    const treeW = maxX - minX + 200
    const treeH = maxY - minY + 160
    const scale = Math.min(1, w / treeW, h / treeH) * 0.85
    const offsetX = (w - treeW * scale) / 2 - minX * scale + 100 * scale
    const offsetY = 60 - minY * scale + 40

    ctx.save()
    ctx.translate(offsetX, offsetY)
    ctx.scale(scale, scale)

    // Draw edges
    for (const e of layoutEdges) {
      ctx.beginPath()
      ctx.moveTo(e.from.x, e.from.y + 30)
      const midY = (e.from.y + 30 + e.to.y - 10) / 2
      ctx.bezierCurveTo(e.from.x, midY, e.to.x, midY, e.to.x, e.to.y - 10)
      ctx.strokeStyle = 'rgba(255, 184, 0, 0.25)'
      ctx.lineWidth = 2
      ctx.stroke()

      // Arrow
      ctx.beginPath()
      ctx.moveTo(e.to.x, e.to.y - 10)
      ctx.lineTo(e.to.x - 5, e.to.y - 18)
      ctx.lineTo(e.to.x + 5, e.to.y - 18)
      ctx.closePath()
      ctx.fillStyle = 'rgba(255, 184, 0, 0.3)'
      ctx.fill()
    }

    // Draw nodes
    for (const item of layoutNodes) {
      const { node, x, y } = item
      const steps = node.skillSteps || []
      const done = steps.filter(s => s.status === 'done').length
      const pct = steps.length > 0 ? done / steps.length : 0
      const color = NODE_COLORS[node.type] || '#ffb800'

      // Glow
      const glow = ctx.createRadialGradient(x, y, 10, x, y, 50)
      glow.addColorStop(0, `rgba(255, 184, 0, 0.1)`)
      glow.addColorStop(1, `rgba(255, 184, 0, 0)`)
      ctx.beginPath()
      ctx.arc(x, y, 50, 0, Math.PI * 2)
      ctx.fillStyle = glow
      ctx.fill()

      // Progress ring
      if (steps.length > 0) {
        ctx.beginPath()
        ctx.arc(x, y, 28, 0, Math.PI * 2)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
        ctx.lineWidth = 4
        ctx.stroke()

        ctx.beginPath()
        ctx.arc(x, y, 28, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct)
        ctx.strokeStyle = pct >= 1 ? '#00ff87' : color
        ctx.lineWidth = 4
        ctx.stroke()
      }

      // Node circle
      const grad = ctx.createRadialGradient(x - 5, y - 5, 2, x, y, 22)
      grad.addColorStop(0, '#fff3')
      grad.addColorStop(0.5, color)
      grad.addColorStop(1, 'rgba(0,0,0,0.3)')
      ctx.beginPath()
      ctx.arc(x, y, 22, 0, Math.PI * 2)
      ctx.fillStyle = grad
      ctx.fill()

      // Icon
      ctx.font = '16px "Apple Color Emoji", "Segoe UI Emoji", sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(node.skillIcon || '⚡', x, y + 1)

      // Label
      ctx.font = '500 12px "Pretendard Variable", system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillStyle = '#e8eaf0'
      ctx.fillText(node.label, x, y + 36)

      // Step count
      if (steps.length > 0) {
        ctx.font = '400 10px "Pretendard Variable", system-ui, sans-serif'
        ctx.fillStyle = pct >= 1 ? '#00ff87' : 'rgba(255,255,255,0.5)'
        ctx.fillText(`${done}/${steps.length}`, x, y + 52)
      }
    }

    ctx.restore()
  }, [layoutNodes, layoutEdges])

  useEffect(() => {
    renderTree()
    const obs = new ResizeObserver(() => renderTree())
    if (containerRef.current) obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [renderTree])

  const handleNodeClick = (nodeId: string) => {
    dispatch({ type: 'SET_SELECTED', nodeId })
    onViewChange('notes')
  }

  if (skillNodes.length === 0) {
    return (
      <div className="skilltree-view">
        <div className="skilltree-view__empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          <h3>스킬 트리</h3>
          <p>스킬 타입의 노트를 만들고 연결하면</p>
          <p>여기에 스킬 트리가 표시됩니다</p>
          <p className="skilltree-view__hint">헤더에서 "스킬" 키워드로 노트를 생성하세요</p>
        </div>
      </div>
    )
  }

  return (
    <div className="skilltree-view">
      <div className="skilltree-view__header">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffb800" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
        <h3>스킬 트리</h3>
        <span className="skilltree-view__count">{skillNodes.length}개 스킬</span>
      </div>

      <div className="skilltree-view__canvas-wrap" ref={containerRef}>
        <canvas ref={canvasRef} />
      </div>

      {/* Skill list below */}
      <div className="skilltree-view__list">
        {skillNodes.map(n => {
          const steps = n.skillSteps || []
          const done = steps.filter(s => s.status === 'done').length
          return (
            <button key={n.id} className="skilltree-view__item" onClick={() => handleNodeClick(n.id)}>
              <span className="skilltree-view__item-icon">{n.skillIcon || '⚡'}</span>
              <span className="skilltree-view__item-name">{n.label}</span>
              {steps.length > 0 && (
                <span className="skilltree-view__item-steps">{done}/{steps.length}</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
