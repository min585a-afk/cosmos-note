import type { GraphNode, Viewport } from '../types/graph'
import { screenToWorld } from './viewport'

const HIT_PADDING = 8

export function hitTestNode(
  screenX: number,
  screenY: number,
  nodes: GraphNode[],
  viewport: Viewport
): GraphNode | null {
  const { x: wx, y: wy } = screenToWorld(screenX, screenY, viewport)

  // Iterate in reverse so topmost (last drawn) nodes are hit first
  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i]
    const dx = wx - node.x
    const dy = wy - node.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist <= node.radius + HIT_PADDING) {
      return node
    }
  }

  return null
}
