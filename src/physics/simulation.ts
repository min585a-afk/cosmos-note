import type { GraphNode, GraphEdge } from '../types/graph'

const SPRING_STRENGTH = 0.08
const SPRING_LENGTH = 70
const REPULSION_SAME_GROUP = 400    // Within same group — mild, keeps nodes readable
const REPULSION_DIFF_GROUP = 300    // Between different groups — push away from other clusters
const EDGE_REPULSION = 600          // Edges push away non-connected nodes
const EDGE_REPULSION_DIST = 60      // Max distance for edge repulsion
const GLOBAL_CENTER = 0.006         // Pull ALL nodes toward (0,0) — the "gravity"
const GROUP_COHESION = 0.02         // Extra pull within same group toward group center
const DAMPING = 0.8
const MIN_DIST = 15

/**
 * Union-Find for connected components
 */
function findComponents(nodes: GraphNode[], edges: GraphEdge[]): Map<string, number> {
  const parent = new Map<string, string>()
  for (const n of nodes) parent.set(n.id, n.id)

  function find(x: string): string {
    while (parent.get(x) !== x) {
      parent.set(x, parent.get(parent.get(x)!)!)
      x = parent.get(x)!
    }
    return x
  }

  for (const e of edges) {
    if (parent.has(e.source) && parent.has(e.target)) {
      const ra = find(e.source), rb = find(e.target)
      if (ra !== rb) parent.set(ra, rb)
    }
  }

  const groupMap = new Map<string, number>()
  const rootToGroup = new Map<string, number>()
  let idx = 0
  for (const n of nodes) {
    const root = find(n.id)
    if (!rootToGroup.has(root)) rootToGroup.set(root, idx++)
    groupMap.set(n.id, rootToGroup.get(root)!)
  }
  return groupMap
}

export function tick(nodes: GraphNode[], edges: GraphEdge[], alpha: number): void {
  const n = nodes.length
  if (n === 0) return

  const groups = findComponents(nodes, edges)

  // 1. Repulsion — strong within group, very weak between groups
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = nodes[i], b = nodes[j]
      let dx = b.x - a.x
      let dy = b.y - a.y
      let dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < MIN_DIST) dist = MIN_DIST

      const sameGroup = groups.get(a.id) === groups.get(b.id)
      const repStr = sameGroup ? REPULSION_SAME_GROUP : REPULSION_DIFF_GROUP

      const force = (repStr * alpha) / (dist * dist)
      const fx = (dx / dist) * force
      const fy = (dy / dist) * force

      a.vx -= fx; a.vy -= fy
      b.vx += fx; b.vy += fy
    }
  }

  // 2. Spring — pull connected nodes together
  const nodeMap = new Map<string, GraphNode>()
  for (const node of nodes) nodeMap.set(node.id, node)

  for (const edge of edges) {
    const source = nodeMap.get(edge.source)
    const target = nodeMap.get(edge.target)
    if (!source || !target) continue

    const isPlanetStar =
      (source.radius >= 14 && target.radius < 14) ||
      (target.radius >= 14 && source.radius < 14)
    const springLen = isPlanetStar ? 50 : SPRING_LENGTH

    let dx = target.x - source.x
    let dy = target.y - source.y
    let dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < 1) dist = 1

    const displacement = dist - springLen
    const force = displacement * SPRING_STRENGTH * alpha
    const fx = (dx / dist) * force
    const fy = (dy / dist) * force

    source.vx += fx; source.vy += fy
    target.vx -= fx; target.vy -= fy
  }

  // 3. Edge-node repulsion — edges push away nodes that aren't part of that edge
  for (const edge of edges) {
    const src = nodeMap.get(edge.source)
    const tgt = nodeMap.get(edge.target)
    if (!src || !tgt) continue

    const edgeGroup = groups.get(src.id)

    for (const node of nodes) {
      if (node.id === edge.source || node.id === edge.target) continue
      // Only repel nodes from OTHER groups
      if (groups.get(node.id) === edgeGroup) continue

      // Find closest point on edge segment to node
      const ex = tgt.x - src.x, ey = tgt.y - src.y
      const edgeLenSq = ex * ex + ey * ey
      if (edgeLenSq < 1) continue

      let t = ((node.x - src.x) * ex + (node.y - src.y) * ey) / edgeLenSq
      t = Math.max(0, Math.min(1, t))

      const closestX = src.x + t * ex
      const closestY = src.y + t * ey
      let dx = node.x - closestX
      let dy = node.y - closestY
      let dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < EDGE_REPULSION_DIST) {
        if (dist < 5) dist = 5
        const force = (EDGE_REPULSION * alpha) / (dist * dist)
        node.vx += (dx / dist) * force
        node.vy += (dy / dist) * force
      }
    }
  }

  // 4. Group cohesion — same group nodes pull toward their shared centroid — same group nodes pull toward their shared centroid
  const centroids = new Map<number, { cx: number; cy: number; count: number }>()
  for (const node of nodes) {
    const g = groups.get(node.id)!
    const c = centroids.get(g) || { cx: 0, cy: 0, count: 0 }
    c.cx += node.x; c.cy += node.y; c.count++
    centroids.set(g, c)
  }

  for (const node of nodes) {
    const g = groups.get(node.id)!
    const c = centroids.get(g)!
    const gcx = c.cx / c.count
    const gcy = c.cy / c.count
    node.vx -= (node.x - gcx) * GROUP_COHESION * alpha
    node.vy -= (node.y - gcy) * GROUP_COHESION * alpha
  }

  // 5. Global center gravity — pulls everything toward (0,0)
  for (const node of nodes) {
    node.vx -= node.x * GLOBAL_CENTER * alpha
    node.vy -= node.y * GLOBAL_CENTER * alpha
  }

  // 6. Apply damping and update
  for (const node of nodes) {
    node.vx *= DAMPING
    node.vy *= DAMPING

    if (node.fx !== null && node.fy !== null) {
      node.x = node.fx; node.y = node.fy
      node.vx = 0; node.vy = 0
    } else {
      node.x += node.vx
      node.y += node.vy
    }
  }
}

export const ALPHA_DECAY = 0.0015
export const ALPHA_MIN = 0.001
