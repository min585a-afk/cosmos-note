import { useRef, useCallback, useEffect } from 'react'
import { tick, ALPHA_DECAY, ALPHA_MIN } from '../physics/simulation'
import { useGraphState, useGraphDispatch } from '../state/GraphContext'
import type { GraphNode } from '../types/graph'

export function useSimulation() {
  const { nodes, edges, simulationAlpha } = useGraphState()
  const dispatch = useGraphDispatch()

  const nodesRef = useRef<GraphNode[]>([])
  const alphaRef = useRef(simulationAlpha)
  const edgesRef = useRef(edges)
  const runningRef = useRef(false)

  // Sync nodes from state into mutable ref
  useEffect(() => {
    const refMap = new Map(nodesRef.current.map((n) => [n.id, n]))
    nodesRef.current = nodes.map((n) => {
      const existing = refMap.get(n.id)
      if (existing) {
        existing.fx = n.fx
        existing.fy = n.fy
        if (n.fx !== null) existing.x = n.fx
        if (n.fy !== null) existing.y = n.fy
        existing.label = n.label
        existing.type = n.type
        existing.color = n.color
        existing.radius = n.radius
        existing.createdAt = n.createdAt
        existing.size = n.size
        existing.icon = n.icon
        existing.customColor = n.customColor
        existing.statuses = n.statuses
        return existing
      }
      return { ...n }
    })
  }, [nodes])

  useEffect(() => {
    edgesRef.current = edges
  }, [edges])

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
      // Only sync positions once when simulation settles
      syncToState()
      return
    }

    tick(nodesRef.current, edgesRef.current, alpha)
    alphaRef.current = Math.max(alpha - ALPHA_DECAY, 0)

    // No dispatches during simulation - canvas reads from nodesRef directly
    requestAnimationFrame(loop)
  }, [syncToState])

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
