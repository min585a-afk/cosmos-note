import { useRef, useCallback, useEffect } from 'react'
import { tick, ALPHA_DECAY, ALPHA_MIN } from '../physics/simulation'
import { useGraphState, useGraphDispatch } from '../state/GraphContext'
import type { GraphNode } from '../types/graph'

export function useSimulation() {
  const { nodes, edges, simulationAlpha } = useGraphState()
  const dispatch = useGraphDispatch()

  const nodesRef = useRef<GraphNode[]>([])
  const alphaRef = useRef(simulationAlpha)
  const frameRef = useRef(0)
  const runningRef = useRef(false)

  // Sync nodes from state into mutable ref
  useEffect(() => {
    const refMap = new Map(nodesRef.current.map((n) => [n.id, n]))
    nodesRef.current = nodes.map((n) => {
      const existing = refMap.get(n.id)
      if (existing) {
        // Keep physics state, sync pinned state
        existing.fx = n.fx
        existing.fy = n.fy
        if (n.fx !== null) existing.x = n.fx
        if (n.fy !== null) existing.y = n.fy
        existing.label = n.label
        existing.type = n.type
        existing.color = n.color
        existing.radius = n.radius
        existing.createdAt = n.createdAt
        return existing
      }
      return { ...n }
    })
  }, [nodes])

  useEffect(() => {
    alphaRef.current = simulationAlpha
  }, [simulationAlpha])

  const syncToState = useCallback(() => {
    dispatch({
      type: 'UPDATE_POSITIONS',
      positions: nodesRef.current.map((n) => ({
        id: n.id,
        x: n.x,
        y: n.y,
        vx: n.vx,
        vy: n.vy,
      })),
    })
  }, [dispatch])

  const loop = useCallback(() => {
    if (!runningRef.current) return

    const alpha = alphaRef.current
    if (alpha < ALPHA_MIN) {
      runningRef.current = false
      syncToState()
      return
    }

    tick(nodesRef.current, edges, alpha)
    alphaRef.current = Math.max(alpha - ALPHA_DECAY, 0)

    // Sync to React state every 3 frames
    if (frameRef.current++ % 3 === 0) {
      syncToState()
      dispatch({ type: 'SET_ALPHA', alpha: alphaRef.current })
    }

    requestAnimationFrame(loop)
  }, [edges, syncToState, dispatch])

  const start = useCallback(() => {
    if (runningRef.current) return
    runningRef.current = true
    requestAnimationFrame(loop)
  }, [loop])

  const reheat = useCallback((alpha = 0.8) => {
    alphaRef.current = alpha
    dispatch({ type: 'SET_ALPHA', alpha })
    start()
  }, [dispatch, start])

  // Auto-start
  useEffect(() => {
    reheat(1.0)
    return () => { runningRef.current = false }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { nodesRef, reheat, start }
}
