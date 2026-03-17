import type { GraphNode, GraphEdge } from '../types/graph'

const SPRING_STRENGTH = 0.03
const SPRING_LENGTH = 220
const REPULSION_STRENGTH = 800
const CENTER_STRENGTH = 0.012
const DAMPING = 0.82
const MIN_DIST = 30

export function tick(nodes: GraphNode[], edges: GraphEdge[], alpha: number): void {
  const n = nodes.length
  if (n === 0) return

  // Repulsion (all pairs)
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = nodes[i]
      const b = nodes[j]
      let dx = b.x - a.x
      let dy = b.y - a.y
      let dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < MIN_DIST) dist = MIN_DIST

      const force = (REPULSION_STRENGTH * alpha) / (dist * dist)
      const fx = (dx / dist) * force
      const fy = (dy / dist) * force

      a.vx -= fx
      a.vy -= fy
      b.vx += fx
      b.vy += fy
    }
  }

  // Spring (connected pairs)
  const nodeMap = new Map<string, GraphNode>()
  for (const node of nodes) nodeMap.set(node.id, node)

  for (const edge of edges) {
    const source = nodeMap.get(edge.source)
    const target = nodeMap.get(edge.target)
    if (!source || !target) continue

    let dx = target.x - source.x
    let dy = target.y - source.y
    let dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < 1) dist = 1

    const displacement = dist - SPRING_LENGTH
    const force = displacement * SPRING_STRENGTH * alpha
    const fx = (dx / dist) * force
    const fy = (dy / dist) * force

    source.vx += fx
    source.vy += fy
    target.vx -= fx
    target.vy -= fy
  }

  // Center gravity
  for (const node of nodes) {
    node.vx -= node.x * CENTER_STRENGTH * alpha
    node.vy -= node.y * CENTER_STRENGTH * alpha
  }

  // Apply damping and update positions
  for (const node of nodes) {
    node.vx *= DAMPING
    node.vy *= DAMPING

    if (node.fx !== null && node.fy !== null) {
      node.x = node.fx
      node.y = node.fy
      node.vx = 0
      node.vy = 0
    } else {
      node.x += node.vx
      node.y += node.vy
    }
  }
}

export const ALPHA_DECAY = 0.0015
export const ALPHA_MIN = 0.001
