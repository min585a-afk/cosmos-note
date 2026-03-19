import { useCallback, useRef } from 'react'
import { useGraphState, useGraphDispatch } from '../state/GraphContext'
import { hitTestNode } from '../canvas/hitTest'
import { screenToWorld } from '../canvas/viewport'
import { createNode, generateId } from '../state/graphReducer'
import type { GraphNode, Viewport } from '../types/graph'

export function useCanvasInteraction(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  nodesRef: React.RefObject<GraphNode[]>,
  reheat: (alpha?: number) => void,
  onOpenNote?: (nodeId: string) => void
) {
  const state = useGraphState()
  const dispatch = useGraphDispatch()
  const interactionRef = useRef(state.interaction)
  interactionRef.current = state.interaction
  const didDragRef = useRef(false)
  const dragStartRef = useRef<{ x: number; y: number } | null>(null)

  const getCanvasPos = useCallback((e: React.PointerEvent | React.WheelEvent | React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }, [canvasRef])

  // Create the centered viewport matching what the render uses
  const getCenteredVp = useCallback((): Viewport => {
    const rect = canvasRef.current?.getBoundingClientRect()
    const w = rect?.width ?? 0
    const h = rect?.height ?? 0
    return {
      x: state.viewport.x + w / 2,
      y: state.viewport.y + h / 2,
      scale: state.viewport.scale,
    }
  }, [canvasRef, state.viewport])

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    // Don't interfere with creating-node mode
    if (interactionRef.current.type === 'creating-node') return
    const pos = getCanvasPos(e)
    const nodes = nodesRef.current ?? state.nodes
    const cvp = getCenteredVp()
    const hit = hitTestNode(pos.x, pos.y, nodes, cvp)

    didDragRef.current = false
    dragStartRef.current = { x: pos.x, y: pos.y }

    if (hit) {
      // Always select the node immediately on pointer down
      dispatch({ type: 'SET_SELECTED', nodeId: hit.id })
      if (e.shiftKey) {
        dispatch({
          type: 'SET_INTERACTION',
          interaction: { type: 'creating-edge', sourceId: hit.id, currentX: hit.x, currentY: hit.y },
        })
      } else {
        const world = screenToWorld(pos.x, pos.y, cvp)
        dispatch({
          type: 'SET_INTERACTION',
          interaction: {
            type: 'dragging-node',
            nodeId: hit.id,
            offsetX: world.x - hit.x,
            offsetY: world.y - hit.y,
          },
        })
        dispatch({ type: 'PIN_NODE', nodeId: hit.id, x: hit.x, y: hit.y })
      }
    } else {
      dispatch({
        type: 'SET_INTERACTION',
        interaction: {
          type: 'panning',
          startX: pos.x,
          startY: pos.y,
          startVpX: state.viewport.x,
          startVpY: state.viewport.y,
        },
      })
    }

    canvasRef.current?.setPointerCapture(e.pointerId)
  }, [canvasRef, dispatch, getCanvasPos, getCenteredVp, nodesRef, state.nodes, state.viewport])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const pos = getCanvasPos(e)
    const interaction = interactionRef.current
    const cvp = getCenteredVp()

    if (interaction.type === 'dragging-node') {
      // Track if actual movement happened (> 4px threshold)
      if (dragStartRef.current) {
        const dx = pos.x - dragStartRef.current.x
        const dy = pos.y - dragStartRef.current.y
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
          didDragRef.current = true
        }
      }
      const world = screenToWorld(pos.x, pos.y, cvp)
      dispatch({
        type: 'PIN_NODE',
        nodeId: interaction.nodeId,
        x: world.x - interaction.offsetX,
        y: world.y - interaction.offsetY,
      })
      reheat(0.3)
    } else if (interaction.type === 'panning') {
      const dx = pos.x - interaction.startX
      const dy = pos.y - interaction.startY
      dispatch({
        type: 'SET_VIEWPORT',
        viewport: {
          ...state.viewport,
          x: interaction.startVpX + dx,
          y: interaction.startVpY + dy,
        },
      })
    } else if (interaction.type === 'creating-edge') {
      const world = screenToWorld(pos.x, pos.y, cvp)
      dispatch({
        type: 'SET_INTERACTION',
        interaction: { ...interaction, currentX: world.x, currentY: world.y },
      })
    } else {
      const nodes = nodesRef.current ?? state.nodes
      const hit = hitTestNode(pos.x, pos.y, nodes, cvp)
      const newId = hit?.id ?? null
      if (newId !== state.hoveredNodeId) {
        dispatch({ type: 'SET_HOVERED', nodeId: newId })
      }
    }
  }, [dispatch, getCanvasPos, getCenteredVp, nodesRef, reheat, state.hoveredNodeId, state.nodes, state.viewport])

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    const interaction = interactionRef.current

    if (interaction.type === 'dragging-node') {
      dispatch({ type: 'UNPIN_NODE', nodeId: interaction.nodeId })
      // didDragRef is already set in onPointerMove if actual movement occurred
      reheat(0.5)
    } else if (interaction.type === 'creating-edge') {
      const pos = getCanvasPos(e)
      const nodes = nodesRef.current ?? state.nodes
      const cvp = getCenteredVp()
      const target = hitTestNode(pos.x, pos.y, nodes, cvp)
      if (target && target.id !== interaction.sourceId) {
        dispatch({
          type: 'ADD_EDGE',
          edge: { id: generateId(), source: interaction.sourceId, target: target.id },
        })
        reheat(0.5)
      }
    }

    dispatch({ type: 'SET_INTERACTION', interaction: { type: 'idle' } })
    canvasRef.current?.releasePointerCapture(e.pointerId)
  }, [canvasRef, dispatch, getCanvasPos, getCenteredVp, nodesRef, reheat, state.nodes, state.viewport])

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const pos = getCanvasPos(e)
    const { viewport } = state
    const zoomFactor = 1 - e.deltaY * 0.001
    const newScale = Math.min(5, Math.max(0.1, viewport.scale * zoomFactor))

    // Zoom toward cursor (using raw viewport, not centered)
    const rect = canvasRef.current?.getBoundingClientRect()
    const cx = pos.x - (rect?.width ?? 0) / 2
    const cy = pos.y - (rect?.height ?? 0) / 2

    dispatch({
      type: 'SET_VIEWPORT',
      viewport: {
        x: cx - (cx - viewport.x) * (newScale / viewport.scale),
        y: cy - (cy - viewport.y) * (newScale / viewport.scale),
        scale: newScale,
      },
    })
  }, [canvasRef, dispatch, getCanvasPos, state])

  const onDoubleClick = useCallback((e: React.MouseEvent) => {
    const pos = getCanvasPos(e)
    const nodes = nodesRef.current ?? state.nodes
    const cvp = getCenteredVp()
    const hit = hitTestNode(pos.x, pos.y, nodes, cvp)

    if (hit) {
      // Double click on node → open note view
      dispatch({ type: 'SET_SELECTED', nodeId: hit.id })
      onOpenNote?.(hit.id)
    } else {
      const world = screenToWorld(pos.x, pos.y, cvp)
      // Open node creator input at click position
      dispatch({
        type: 'SET_INTERACTION',
        interaction: {
          type: 'creating-node',
          worldX: world.x,
          worldY: world.y,
          screenX: pos.x,
          screenY: pos.y,
        },
      })
    }
  }, [dispatch, getCanvasPos, getCenteredVp, nodesRef, state.nodes, state.viewport])

  const onClick = useCallback((e: React.MouseEvent) => {
    if (e.detail > 1) return
    // Don't interfere with creating-node mode
    if (interactionRef.current.type === 'creating-node') return
    // Skip selection after drag
    if (didDragRef.current) { didDragRef.current = false; return }
    const pos = getCanvasPos(e)
    const nodes = nodesRef.current ?? state.nodes
    const cvp = getCenteredVp()
    const hit = hitTestNode(pos.x, pos.y, nodes, cvp)
    dispatch({ type: 'SET_SELECTED', nodeId: hit?.id ?? null })
  }, [dispatch, getCanvasPos, getCenteredVp, nodesRef, state.nodes, state.viewport])

  return { onPointerDown, onPointerMove, onPointerUp, onWheel, onDoubleClick, onClick }
}
