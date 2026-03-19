import type { GraphNode, GraphEdge } from '../types/graph'

const SPRING_STRENGTH = 0.04
const SPRING_LENGTH = 180
const REPULSION_STRENGTH = 1000
const CENTER_STRENGTH = 0.0003  // Very weak — just prevents drift off-screen
const GROUP_STRENGTH = 0.008    // Pull connected nodes toward their group centroid
const DAMPING = 0.82
const MIN_DIST = 30

/**
 * Find connected components — each component forms a cluster
 */
function findComponents(nodes: GraphNode[], edges: GraphEdge[]): Map<string, number> {
  const nodeIds = nodes.map(n => n.id)
  const parent = new Map<string, string>()
  for (const id of nodeIds) parent.set(id, id)

  function find(x: string): string {
    while (parent.get(x) !== x) {
      parent.set(x, parent.get(parent.get(x)!)!)
      x = parent.get(x)!
    }
    return x
  }

  function union(a: string, b: string) {
    const ra = find(a), rb = find(b)
    if (ra !== rb) parent.set(ra, rb)
  }

  for (const e of edges) {
    if (parent.has(e.source) && parent.has(e.target)) {
      union(e.source, e.target)
    }
  }

  // Assign group index
  const groupMap = new Map<string, number>()
  const rootToGroup = new Map<string, number>()
  let groupIdx = 0
  for (const id of nodeIds) {
    const root = find(id)
    if (!rootToGroup.has(root)) {
      rootToGroup.set(root, groupIdx++)
    }
    groupMap.set(id, rootToGroup.get(root)!)
  }
  return groupMap
}

export function tick(nodes: GraphNode[], edges: GraphEdge[], alpha: number): void {
  const n = nodes.length
  if (n === 0) return

  // Build adjacency for connected check
  const connected = new Set<string>()
  for (const e of edges) {
    connected.add(`${e.source}:${e.target}`)
    connected.add(`${e.target}:${e.source}`)
  }

  // Repulsion (all pairs) — stronger between unconnected nodes
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = nodes[i]
      const b = nodes[j]
      let dx = b.x - a.x
      let dy = b.y - a.y
      let dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < MIN_DIST) dist = MIN_DIST

      // Stronger repulsion between unconnected nodes
      const isLinked = connected.has(`${a.id}:${b.id}`)
      const repStr = isLinked ? REPULSION_STRENGTH : REPULSION_STRENGTH * 1.5

      const force = (repStr * alpha) / (dist * dist)
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

    // Planet-to-star edges use shorter spring
    const isPlanetStar =
      (source.radius >= 14 && target.radius < 14) ||
      (target.radius >= 14 && source.radius < 14)
    const springLen = isPlanetStar ? 100 : SPRING_LENGTH

    let dx = target.x - source.x
    let dy = target.y - source.y
    let dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < 1) dist = 1

    const displacement = dist - springLen
    const force = displacement * SPRING_STRENGTH * alpha
    const fx = (dx / dist) * force
    const fy = (dy / dist) * force

    source.vx += fx
    source.vy += fy
    target.vx -= fx
    target.vy -= fy
  }

  // Group gravity — pull each connected component toward its own centroid
  const groups = findComponents(nodes, edges)
  const groupCentroids = new Map<number, { cx: number; cy: number; count: number }>()

  for (const node of nodes) {
    const g = groups.get(node.id) ?? 0
    const c = groupCentroids.get(g) || { cx: 0, cy: 0, count: 0 }
    c.cx += node.x
    c.cy += node.y
    c.count++
    groupCentroids.set(g, c)
  }

  for (const node of nodes) {
    const g = groups.get(node.id) ?? 0
    const c = groupCentroids.get(g)!
    const gcx = c.cx / c.count
    const gcy = c.cy / c.count
    // Pull toward group centroid (connected nodes cluster together)
    node.vx -= (node.x - gcx) * GROUP_STRENGTH * alpha
    node.vy -= (node.y - gcy) * GROUP_STRENGTH * alpha
  }

  // Weak global center gravity — just prevents everything from drifting off-screen
  let cx = 0, cy = 0
  for (const node of nodes) { cx += node.x; cy += node.y }
  cx /= n; cy /= n
  for (const node of nodes) {
    node.vx -= (node.x - cx) * CENTER_STRENGTH * alpha
    node.vy -= (node.y - cy) * CENTER_STRENGTH * alpha
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
