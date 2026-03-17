import { useRef, useEffect, useCallback, type MutableRefObject } from 'react'
import { useGraphState } from '../state/GraphContext'
import { useSimulation } from '../hooks/useSimulation'
import { useCanvasInteraction } from '../hooks/useCanvasInteraction'
import { drawGrid, drawEdge, drawNode, drawLabel, drawDraftEdge } from './renderer'

export function GraphCanvas({ reheatRef }: { reheatRef?: MutableRefObject<(() => void) | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const sizeRef = useRef({ w: 0, h: 0 })
  const animRef = useRef(0)

  const state = useGraphState()
  const { nodesRef, reheat } = useSimulation()
  const interactions = useCanvasInteraction(canvasRef, nodesRef, reheat)

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

  // Render loop
  const render = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const dpr = window.devicePixelRatio || 1
    const w = canvas.width / dpr
    const h = canvas.height / dpr
    const time = performance.now()

    // Clear
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)

    // Apply viewport with center offset (include DPR scaling)
    const vpX = state.viewport.x + w / 2
    const vpY = state.viewport.y + h / 2
    const s = state.viewport.scale
    ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * vpX, dpr * vpY)

    const vp = { ...state.viewport, x: vpX, y: vpY }

    // Grid
    drawGrid(ctx, w / vp.scale + 200, h / vp.scale + 200, vp.scale)

    // Get live node positions from simulation ref
    const liveNodes = nodesRef.current
    const nodeMap = new Map(liveNodes.map((n) => [n.id, n]))

    // Edges
    for (const edge of state.edges) {
      const src = nodeMap.get(edge.source)
      const tgt = nodeMap.get(edge.target)
      if (src && tgt) {
        drawEdge(ctx, src, tgt, false, time)
      }
    }

    // Draft edge
    if (state.interaction.type === 'creating-edge') {
      const source = nodeMap.get(state.interaction.sourceId)
      if (source) {
        drawDraftEdge(ctx, source.x, source.y, state.interaction.currentX, state.interaction.currentY)
      }
    }

    // Nodes
    for (const node of liveNodes) {
      drawNode(
        ctx,
        node,
        node.id === state.hoveredNodeId,
        node.id === state.selectedNodeId,
        time
      )
    }

    // Labels
    for (const node of liveNodes) {
      drawLabel(
        ctx,
        node,
        node.id === state.hoveredNodeId,
        node.id === state.selectedNodeId,
        time
      )
    }

    animRef.current = requestAnimationFrame(render)
  }, [state, nodesRef])

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
