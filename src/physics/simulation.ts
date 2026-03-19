import type { GraphNode, GraphEdge } from '../types/graph'

const SPRING_STRENGTH = 0.08
const SPRING_LENGTH = 70
const REPULSION_SAME_GROUP = 500    // Within same group — keeps nodes readable
const REPULSION_DIFF_GROUP = 300    // Between different groups — individual nodes
const EDGE_REPULSION = 800          // Edges push away non-connected nodes
const EDGE_REPULSION_DIST = 80      // Max distance for edge repulsion
const GLOBAL_CENTER = 0.002         // Pull ALL nodes toward (0,0) — gentle
const GROUP_COHESION = 0.025        // Pull within same group toward group center
const GROUP_REPULSION = 8000        // Centroid-level repulsion between different groups
const GROUP_MIN_DIST = 120          // Minimum distance between group centroids
const DAMPING = 0.8
const MIN_DIST = 25

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

    const springLen = Math.max(source.radius + target.radius + 30, SPRING_LENGTH)

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

  // 4. Group cohesion — same group nodes pull toward their shared centroid
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

  // 5. Group-centroid repulsion — push entire groups apart so they don't overlap
  const groupIds = [...centroids.keys()]
  for (let i = 0; i < groupIds.length; i++) {
    for (let j = i + 1; j < groupIds.length; j++) {
      const ga = centroids.get(groupIds[i])!
      const gb = centroids.get(groupIds[j])!
      const cax = ga.cx / ga.count, cay = ga.cy / ga.count
      const cbx = gb.cx / gb.count, cby = gb.cy / gb.count

      let dx = cbx - cax
      let dy = cby - cay
      let dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < GROUP_MIN_DIST) dist = GROUP_MIN_DIST

      // Strong inverse-distance repulsion between centroids
      const force = (GROUP_REPULSION * alpha) / (dist * dist)
      const fx = (dx / dist) * force
      const fy = (dy / dist) * force

      // Distribute centroid force equally to all nodes in each group
      const forcePerA = 1 / ga.count
      const forcePerB = 1 / gb.count

      for (const node of nodes) {
        const g = groups.get(node.id)!
        if (g === groupIds[i]) {
          node.vx -= fx * forcePerA
          node.vy -= fy * forcePerA
        } else if (g === groupIds[j]) {
          node.vx += fx * forcePerB
          node.vy += fy * forcePerB
        }
      }
    }
  }

  // 6. Global center gravity — pulls everything toward (0,0)
  for (const node of nodes) {
    node.vx -= node.x * GLOBAL_CENTER * alpha
    node.vy -= node.y * GLOBAL_CENTER * alpha
  }

  // 7. Apply damping and update
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

  // 8. Collision resolution — hard position-based separation
  const COLLISION_ITERATIONS = 3
  const COLLISION_PADDING = 8

  for (let iter = 0; iter < COLLISION_ITERATIONS; iter++) {
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = nodes[i], b = nodes[j]
        const aFixed = a.fx !== null && a.fy !== null
        const bFixed = b.fx !== null && b.fy !== null
        if (aFixed && bFixed) continue

        let dx = b.x - a.x
        let dy = b.y - a.y
        let distSq = dx * dx + dy * dy

        const aStatusPad = (a.statuses?.length > 0) ? 10 : 0
        const bStatusPad = (b.statuses?.length > 0) ? 10 : 0
        const minSep = a.radius + b.radius + COLLISION_PADDING + aStatusPad + bStatusPad
        const minSepSq = minSep * minSep

        if (distSq < minSepSq) {
          let dist = Math.sqrt(distSq)
          if (dist < 0.1) {
            dx = (Math.random() - 0.5) * 2
            dy = (Math.random() - 0.5) * 2
            dist = Math.sqrt(dx * dx + dy * dy)
          }

          const overlap = minSep - dist
          const nx = dx / dist
          const ny = dy / dist

          let aShare = 0.5, bShare = 0.5
          if (aFixed) { aShare = 0; bShare = 1 }
          if (bFixed) { aShare = 1; bShare = 0 }

          a.x -= nx * overlap * aShare
          a.y -= ny * overlap * aShare
          b.x += nx * overlap * bShare
          b.y += ny * overlap * bShare
        }
      }
    }
  }
}

export const ALPHA_DECAY = 0.0015
export const ALPHA_MIN = 0.001
