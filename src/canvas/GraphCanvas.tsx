import { useRef, useEffect, useCallback, type MutableRefObject } from 'react'
import { useGraphState } from '../state/GraphContext'
import { useSimulation } from '../hooks/useSimulation'
import { useCanvasInteraction } from '../hooks/useCanvasInteraction'
import { drawGrid, drawEdge, drawNode, drawLabel, drawDraftEdge } from './renderer'
import type { GraphSettings } from '../components/GraphSettingsPanel'

export function GraphCanvas({ reheatRef, onOpenNote, settings }: { reheatRef?: MutableRefObject<(() => void) | null>; onOpenNote?: (nodeId: string) => void; settings?: GraphSettings }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const sizeRef = useRef({ w: 0, h: 0 })
  const animRef = useRef(0)

  const state = useGraphState()
  const { nodesRef, reheat } = useSimulation()
  const interactions = useCanvasInteraction(canvasRef, nodesRef, reheat, onOpenNote)

  // Refs to decouple render loop from React state
  const viewportRef = useRef(state.viewport)
  const edgesRef = useRef(state.edges)
  const hoveredRef = useRef(state.hoveredNodeId)
  const selectedRef = useRef(state.selectedNodeId)
  const interactionRef = useRef(state.interaction)
  const searchRef = useRef(state.searchQuery)
  const settingsRef = useRef(settings)

  useEffect(() => { settingsRef.current = settings }, [settings])
  useEffect(() => { viewportRef.current = state.viewport }, [state.viewport])
  useEffect(() => { edgesRef.current = state.edges }, [state.edges])
  useEffect(() => { hoveredRef.current = state.hoveredNodeId }, [state.hoveredNodeId])
  useEffect(() => { selectedRef.current = state.selectedNodeId }, [state.selectedNodeId])
  useEffect(() => { interactionRef.current = state.interaction }, [state.interaction])
  useEffect(() => { searchRef.current = state.searchQuery }, [state.searchQuery])

  // Expose reheat to parent
  useEffect(() => {
    if (reheatRef) reheatRef.current = reheat
  }, [reheat, reheatRef])

  // Resize handling
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const obs = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      const dpr = window.devicePixelRatio || 1
      const canvas = canvasRef.current
      if (!canvas) return

      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      sizeRef.current = { w: width, h: height }
    })

    obs.observe(container)
    return () => obs.disconnect()
  }, [])

  // Render loop - stable callback, reads from refs only
  const render = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const dpr = window.devicePixelRatio || 1
    const w = canvas.width / dpr
    const h = canvas.height / dpr
    const time = performance.now()

    const viewport = viewportRef.current
    const edges = edgesRef.current
    const hoveredNodeId = hoveredRef.current
    const selectedNodeId = selectedRef.current
    const interaction = interactionRef.current

    // Clear
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)

    // Apply viewport with center offset
    const vpX = viewport.x + w / 2
    const vpY = viewport.y + h / 2
    const s = viewport.scale
    ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * vpX, dpr * vpY)

    // Grid
    drawGrid(ctx, w / s + 200, h / s + 200, s)

    // Get live node positions from simulation ref
    const liveNodes = nodesRef.current
    const nodeMap = new Map(liveNodes.map((n) => [n.id, n]))
    const gs = settingsRef.current

    // Filter nodes based on settings
    const connectedIds = new Set<string>()
    for (const e of edges) { connectedIds.add(e.source); connectedIds.add(e.target) }

    const visibleNodes = liveNodes.filter(n => {
      if (gs) {
        if (!gs.showTypes[n.type]) return false
        if (!gs.showOrphans && !connectedIds.has(n.id)) return false
        if (gs.filterTags.length > 0 && !n.tags.some(t => gs.filterTags.includes(t))) return false
      }
      return true
    })
    const visibleIds = new Set(visibleNodes.map(n => n.id))

    // Edges
    const thickness = gs?.linkThickness ?? 1.0
    const showArrow = gs?.showArrows ?? false
    for (const edge of edges) {
      const src = nodeMap.get(edge.source)
      const tgt = nodeMap.get(edge.target)
      if (src && tgt && visibleIds.has(edge.source) && visibleIds.has(edge.target)) {
        drawEdge(ctx, src, tgt, false, time, thickness, showArrow)
      }
    }

    // Draft edge
    if (interaction.type === 'creating-edge') {
      const source = nodeMap.get(interaction.sourceId)
      if (source) {
        drawDraftEdge(ctx, source.x, source.y, interaction.currentX, interaction.currentY)
      }
    }

    // Search matching
    const query = searchRef.current.toLowerCase()
    const searchMatchIds = query
      ? new Set(visibleNodes.filter(n => n.label.toLowerCase().includes(query)).map(n => n.id))
      : new Set<string>()

    const sizeMul = gs?.nodeSizeMul ?? 1.0
    const labelThreshold = gs?.labelThreshold ?? 0.3

    // Nodes
    for (const node of visibleNodes) {
      drawNode(ctx, node, node.id === hoveredNodeId, node.id === selectedNodeId, time, searchMatchIds.has(node.id), sizeMul)
    }

    // Labels (hide when zoomed out below threshold)
    if (viewport.scale >= labelThreshold) {
      for (const node of visibleNodes) {
        drawLabel(ctx, node, node.id === hoveredNodeId, node.id === selectedNodeId, time, searchMatchIds.has(node.id))
      }
    }

    animRef.current = requestAnimationFrame(render)
  }, [nodesRef])

  useEffect(() => {
    animRef.current = requestAnimationFrame(render)
    return () => cancelAnimationFrame(animRef.current)
  }, [render])

  return (
    <div ref={containerRef} className="canvas">
      <canvas
        ref={canvasRef}
        onPointerDown={interactions.onPointerDown}
        onPointerMove={interactions.onPointerMove}
        onPointerUp={interactions.onPointerUp}
        onWheel={interactions.onWheel}
        onDoubleClick={interactions.onDoubleClick}
        onClick={interactions.onClick}
        style={{ display: 'block', cursor: state.interaction.type === 'dragging-node' ? 'grabbing' : state.hoveredNodeId ? 'pointer' : 'grab' }}
      />
    </div>
  )
}
